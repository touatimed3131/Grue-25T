import React, { useRef, useState } from 'react';
import {
  Banknote,
  BellRing,
  CalendarClock,
  Camera,
  Clock3,
  Lock,
  LockOpen,
  LogOut,
  Menu,
  RefreshCw,
  Trash2,
  User,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import {
  CraneStatus,
  Language,
  MaintenanceDocItem,
  PaymentNotification,
  ReservationItem,
} from '../types';
import { t } from '../i18n';
import {
  ComputedEngineOilStatus,
  getRawDriverName,
  getSavedDriverAvatar,
  isReservationCancelled,
} from '../services/api';
import { compressAvatarToSquareJpeg, formatAmount, formatShortDate } from '../utils/media';

interface TopBarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  isAdmin: boolean;
  craneStatus: CraneStatus;
  onChangeStatus: (status: CraneStatus) => void;
  soldeChauffeur: number;
  maintenance: MaintenanceDocItem[];
  oilStatus?: ComputedEngineOilStatus;
  reservations: ReservationItem[];
  newBookingBanner: ReservationItem | null;
  onDismissBookingBanner?: () => void;
  paymentNotification?: PaymentNotification | null;
  onDismissPaymentNotif?: (id: string) => void;
  showEodReminder?: boolean;
  onDismissEodReminder?: () => void;
  notificationPermission?: NotificationPermission | 'unsupported';
  onRequestNotifications?: () => void;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
  childPinConfigured: boolean;
  onOpenChildLock: () => void;
  onOpenMenu?: () => void;
  driverName?: string;
  onSaveDriverName?: (name: string) => void;
  driverAvatar?: string | null;
  onSaveDriverAvatar?: (dataUrl: string | null) => void;
  openDriverModalTick?: number;
  onTriggerAdminAuth?: () => void;
  onExitAdmin?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  lang,
  onChangeLang,
  isAdmin,
  craneStatus,
  onChangeStatus,
  soldeChauffeur,
  maintenance,
  oilStatus,
  reservations,
  newBookingBanner,
  onDismissBookingBanner,
  paymentNotification,
  onDismissPaymentNotif,
  showEodReminder,
  onDismissEodReminder,
  notificationPermission,
  onRequestNotifications,
  isOnline,
  pendingCount,
  isSyncing,
  onSyncNow,
  childPinConfigured,
  onOpenChildLock,
  onOpenMenu,
  driverName = 'Principal',
  onSaveDriverName,
  driverAvatar = null,
  onSaveDriverAvatar,
  openDriverModalTick = 0,
  onTriggerAdminAuth,
  onExitAdmin,
}) => {
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverDraft, setDriverDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [avatarCompressing, setAvatarCompressing] = useState(false);
  const logoTapTimestampsRef = useRef<number[]>([]);

  const handleLogoTap = () => {
    if (isAdmin || !onTriggerAdminAuth) return;
    const nowMs = Date.now();
    const recent = logoTapTimestampsRef.current.filter((ts) => nowMs - ts <= 3000);
    recent.push(nowMs);
    logoTapTimestampsRef.current = recent;
    if (recent.length >= 5) {
      logoTapTimestampsRef.current = [];
      onTriggerAdminAuth();
    }
  };

  const handleOpenDriverModal = React.useCallback(() => {
    setDriverDraft(getRawDriverName());
    setAvatarDraft(driverAvatar ?? getSavedDriverAvatar());
    setDriverModalOpen(true);
  }, [driverAvatar]);

  React.useEffect(() => {
    if (openDriverModalTick > 0) {
      handleOpenDriverModal();
    }
  }, [openDriverModalTick, handleOpenDriverModal]);

  const handlePickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarCompressing(true);
    try {
      const compressed = await compressAvatarToSquareJpeg(file, 150, 0.82);
      setAvatarDraft(compressed);
    } catch {
      // Ignore invalid/unreadable image files
    } finally {
      setAvatarCompressing(false);
    }
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDriverName?.(driverDraft);
    onSaveDriverAvatar?.(avatarDraft);
    setDriverModalOpen(false);
  };
  const now = new Date();
  const oilAndMaintAlerts = maintenance.filter((item) => {
    const isOilOrGrease =
      item.Type_Alerte === 'Vidange' ||
      item.Type_Alerte === 'Graissage' ||
      item.Categorie === 'Maintenance';
    if (!isOilOrGrease) return false;
    const due = new Date(item.Date_Echeance);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    return diffDays <= 14 || (item.Heures_Restantes !== undefined && item.Heures_Restantes <= 25);
  });

  const upcomingBookings = reservations
    .filter((r) => {
      if (!r.Date || isReservationCancelled(r)) return false;
      const d = new Date(r.Date);
      return d.getTime() >= now.getTime() - 86400000;
    })
    .slice(0, 3);

  const statuses: Array<{ value: CraneStatus; label: string; activeClass: string; dotClass: string }> = [
    {
      value: 'Disponible',
      label: t(lang, 'statusAvailable'),
      activeClass: 'bg-emerald-600 text-white border-emerald-700',
      dotClass: 'bg-emerald-500',
    },
    {
      value: 'En Chantier',
      label: t(lang, 'statusOnSite'),
      activeClass: 'bg-blue-600 text-white border-blue-700',
      dotClass: 'bg-blue-500',
    },
    {
      value: 'En Maintenance',
      label: t(lang, 'statusMaintenance'),
      activeClass: 'bg-red-600 text-white border-red-700',
      dotClass: 'bg-red-500',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isAdmin && onOpenMenu && (
              <button
                type="button"
                onClick={onOpenMenu}
                aria-label={t(lang, 'navMenu')}
                title={t(lang, 'navMenu')}
                className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="25T"
              className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shrink-0 select-none"
            >
              25T
            </button>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap truncate">
              {isAdmin ? t(lang, 'adminTitle') : t(lang, 'appTitle')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(!isOnline || pendingCount > 0) && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={!isOnline || isSyncing}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border whitespace-nowrap shrink-0 transition-colors ${
                  !isOnline
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {!isOnline ? (
                  <WifiOff className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                )}
                <span>
                  {!isOnline
                    ? `${t(lang, 'savedOffline')}${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                    : isSyncing
                      ? t(lang, 'syncing')
                      : `${t(lang, 'syncNow')} (${pendingCount})`}
                </span>
              </button>
            )}

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['ar', 'fr', 'en'] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLang(code)}
                  className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    lang === code
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            {!isAdmin && onSaveDriverName && (
              <button
                type="button"
                onClick={handleOpenDriverModal}
                title={`${t(lang, 'driverProfile')}: ${driverName}`}
                aria-label={t(lang, 'driverProfile')}
                className={`min-h-[40px] ${
                  driverAvatar ? 'p-1.5 sm:px-2.5' : 'px-2.5'
                } flex items-center justify-center gap-2 rounded-lg border transition-colors shrink-0 ${
                  driverName !== 'Principal' || driverAvatar
                    ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {driverAvatar ? (
                  <img
                    src={driverAvatar}
                    alt={driverName}
                    className="w-7 h-7 rounded-full object-cover border border-blue-200 shrink-0"
                  />
                ) : (
                  <User className="w-4 h-4 shrink-0" />
                )}
                {driverName !== 'Principal' && (
                  <span className="hidden md:inline text-xs font-bold whitespace-nowrap">
                    {driverName}
                  </span>
                )}
              </button>
            )}

            {!isAdmin && (
              <button
                type="button"
                onClick={onOpenChildLock}
                title={t(lang, 'childLock')}
                aria-label={t(lang, 'childLock')}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors shrink-0 ${
                  childPinConfigured
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {childPinConfigured ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <LockOpen className="w-4 h-4" />
                )}
              </button>
            )}
            {isAdmin && onExitAdmin && (
              <button
                type="button"
                onClick={onExitAdmin}
                title={t(lang, 'exitAdmin')}
                aria-label={t(lang, 'exitAdmin')}
                className="min-h-[40px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold shrink-0"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t(lang, 'exitAdmin')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 pt-4 space-y-3">
        {!isAdmin && onSaveDriverName && (driverName !== 'Principal' || Boolean(driverAvatar)) && (
          <button
            type="button"
            onClick={handleOpenDriverModal}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-start transition-colors"
          >
            {driverAvatar ? (
              <img
                src={driverAvatar}
                alt={driverName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900 whitespace-normal break-words">
                {t(lang, 'driverGreeting').replace('{name}', driverName)}
              </p>
            </div>
          </button>
        )}

        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-950">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{t(lang, 'offlineModeBanner')}</span>
            </div>
            {pendingCount > 0 && (
              <span className="font-mono font-bold whitespace-nowrap">
                {pendingCount} {t(lang, 'syncPending')}
              </span>
            )}
          </div>
        )}

        {/* Prominent End-of-Day 18:00 Auto Reminder Banner for Chauffeur */}
        {!isAdmin && showEodReminder && (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                <Clock3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-amber-900">
                  {t(lang, 'eodReminderTitle')}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {t(lang, 'eodReminderBody')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {notificationPermission === 'default' && onRequestNotifications && (
                <button
                  type="button"
                  onClick={onRequestNotifications}
                  className="min-h-[40px] px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <BellRing className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(lang, 'enableNotifications')}</span>
                </button>
              )}
              {onDismissEodReminder && (
                <button
                  type="button"
                  onClick={onDismissEodReminder}
                  aria-label={t(lang, 'close')}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Prominent Payment / Advance Notification Banner for Chauffeur */}
        {!isAdmin && paymentNotification && (
          <div className="bg-emerald-700 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-100">
                  {t(lang, 'paymentNotifTitle')} ·{' '}
                  {paymentNotification.type === 'Salaire'
                    ? t(lang, 'paymentTypeSalary')
                    : t(lang, 'paymentTypeAdvance')}
                </p>
                <p className="text-sm font-extrabold">
                  {t(lang, 'paymentNotifText')
                    .replace('{amount}', formatAmount(paymentNotification.amount, lang))
                    .replace('{date}', formatShortDate(paymentNotification.date, lang))}
                </p>
              </div>
            </div>
            {onDismissPaymentNotif && (
              <button
                type="button"
                onClick={() => onDismissPaymentNotif(paymentNotification.id)}
                aria-label={t(lang, 'close')}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Shared KPI + Live Status Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">{t(lang, 'cashHeld')}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
                {formatAmount(soldeChauffeur, lang)}{' '}
                <span className="text-sm font-semibold text-slate-500">
                  {t(lang, 'currency')}
                </span>
              </p>
            </div>
            <div className="text-end text-xs text-slate-500 font-medium">
              <span className="block text-slate-700 font-semibold">{t(lang, 'craneModelLabel')}</span>
              <span>
                {craneStatus === 'Disponible'
                  ? t(lang, 'statusAvailable')
                  : craneStatus === 'En Chantier'
                    ? t(lang, 'statusOnSite')
                    : t(lang, 'statusMaintenance')}
              </span>
            </div>
          </div>

          <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 mb-2">{t(lang, 'craneStatus')}</p>
            <div className="grid grid-cols-3 gap-2">
              {statuses.map((st) => {
                const isActive = craneStatus === st.value;
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => onChangeStatus(st.value)}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                      isActive
                        ? st.activeClass
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isActive ? 'bg-white' : st.dotClass
                      }`}
                    />
                    <span className="truncate">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shared Oil & Maintenance + Mutual Booking Alerts */}
        {(oilAndMaintAlerts.length > 0 || oilStatus?.isWarning || upcomingBookings.length > 0 || newBookingBanner) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(oilAndMaintAlerts.length > 0 || oilStatus?.isWarning) && (
              <div
                className={`border rounded-2xl p-3.5 flex items-start gap-3 ${
                  oilStatus?.isOverdue
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    oilStatus?.isOverdue
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-amber-950">{t(lang, 'oilAlertTitle')}</p>
                  <div className="mt-1 space-y-1">
                    {oilStatus?.isWarning && (
                      <div className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-bold text-slate-900">{t(lang, 'oilTrackerTitle')}</span>
                        <span aria-hidden="true">·</span>
                        <span className={oilStatus.isOverdue ? 'font-extrabold text-red-700' : 'font-bold text-amber-900'}>
                          {oilStatus.isOverdue
                            ? t(lang, 'oilWarningOverdue')
                            : t(lang, 'oilWarningSoon').replace('{hours}', '25')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-bold text-slate-800">
                          {oilStatus.remainingHours}{t(lang, 'hoursUnit')}
                        </span>
                      </div>
                    )}
                    {oilAndMaintAlerts.slice(0, 2).map((alert) => {
                      const diffDays = Math.ceil(
                        (new Date(alert.Date_Echeance).getTime() - now.getTime()) / 86400000
                      );
                      const isOverdue =
                        diffDays < 0 || (alert.Heures_Restantes !== undefined && alert.Heures_Restantes <= 0);
                      return (
                        <div
                          key={alert.id}
                          className="text-xs text-amber-900 flex flex-wrap items-center gap-x-2 gap-y-0.5"
                        >
                          <span className="font-semibold">{alert.Nom}</span>
                          <span aria-hidden="true">·</span>
                          <span className={isOverdue ? 'font-bold text-red-700' : 'font-medium'}>
                            {isOverdue
                              ? t(lang, 'overdue')
                              : `${diffDays} ${t(lang, 'daysLeft')}`}
                          </span>
                          {alert.Heures_Restantes !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{alert.Heures_Restantes}{t(lang, 'hoursUnit')}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {(upcomingBookings.length > 0 || newBookingBanner) && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-blue-950">
                      {newBookingBanner
                        ? t(lang, 'newBookingAdded')
                        : t(lang, 'bookingAlertTitle')}
                    </p>
                    {newBookingBanner && onDismissBookingBanner && (
                      <button
                        type="button"
                        onClick={onDismissBookingBanner}
                        className="text-xs font-semibold text-blue-800 underline"
                      >
                        {t(lang, 'close')}
                      </button>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {(newBookingBanner ? [newBookingBanner] : upcomingBookings.slice(0, 2)).map(
                      (bk) => (
                        <div
                          key={bk.id}
                          className="text-xs text-blue-900 flex flex-wrap items-center gap-x-2 gap-y-0.5"
                        >
                          <span className="font-mono font-semibold">
                            {formatShortDate(bk.Date, lang)} {bk.Heure}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold">{bk.Client}</span>
                          {bk.Lieu && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{bk.Lieu}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-700">{bk.Cree_Par}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {driverModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDriverModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl"
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold">{t(lang, 'driverProfile')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDriverModalOpen(false)}
                aria-label={t(lang, 'close')}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDriver} className="p-5 space-y-4">
              <div>
                <p className="block text-xs font-bold text-slate-700 mb-2">
                  {t(lang, 'driverPhotoLabel')}
                </p>
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarDraft ? (
                      <img
                        src={avatarDraft}
                        alt={driverDraft || driverName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="min-h-[42px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>{t(lang, 'pickAvatarPhoto')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePickAvatar}
                        disabled={avatarCompressing}
                        className="sr-only"
                      />
                    </label>
                    {avatarDraft && (
                      <button
                        type="button"
                        onClick={() => setAvatarDraft(null)}
                        className="min-h-[42px] px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>{t(lang, 'removeAvatarPhoto')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t(lang, 'driverNameLabel')}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={driverDraft}
                  onChange={(e) => setDriverDraft(e.target.value)}
                  placeholder={t(lang, 'driverNamePlaceholder')}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={avatarCompressing}
                  className="flex-1 min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-bold"
                >
                  {t(lang, 'save')}
                </button>
                <button
                  type="button"
                  onClick={() => setDriverModalOpen(false)}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50"
                >
                  {t(lang, 'cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
