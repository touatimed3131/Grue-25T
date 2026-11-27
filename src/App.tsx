import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppStateData, CraneStatus, Language, ReservationItem } from './types';
import {
  applyOptimisticUpdate,
  computeEngineOilStatus,
  dismissPaymentNotif,
  fetchAppState,
  getAdminPin,
  getChildPin,
  getLatestUnreadPaymentNotif,
  getSavedDriverAvatar,
  getSavedDriverName,
  isChildLocked,
  loadCachedState,
  loadOfflineQueue,
  postGasAction,
  setAdminPin,
  setChildLocked,
  setChildPin,
  setSavedDriverAvatar,
  setSavedDriverName,
  syncOfflineQueue,
} from './services/api';
import { t } from './i18n';
import { todayIsoDate } from './utils/media';
import { TopBar } from './components/TopBar';
import { PinModal } from './components/PinModal';
import { ChauffeurView } from './components/ChauffeurView';
import { AdminDashboard } from './components/AdminDashboard';

const LANG_KEY = 'grue25t_lang_v1';
const WELCOME_SEEN_KEY = 'grue25t_welcome_seen_v2';

export default function App() {
  const isAdminRoute =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('role') === 'admin';

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'ar' || saved === 'en' || saved === 'fr' ? saved : 'fr';
  });

  const [state, setState] = useState<AppStateData>(() => loadCachedState());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(() => loadOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  // Admin PIN gate (?role=admin or secret 5-tap on '25T' badge, default '1234' in localStorage)
  const [adminPin, setAdminPinState] = useState<string>(() => getAdminPin());
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminPinPrompt, setShowAdminPinPrompt] = useState(false);
  const isAdminActive = isAdminRoute || adminUnlocked;

  // Driver optional Child Lock PIN (bypassed when ?role=admin)
  const [childPinValue, setChildPinValue] = useState<string | null>(() => getChildPin());
  const [childLocked, setChildLockedState] = useState<boolean>(() =>
    !isAdminRoute && Boolean(getChildPin()) && isChildLocked()
  );
  const [showChildPinSetup, setShowChildPinSetup] = useState(false);
  const [chauffeurMenuOpen, setChauffeurMenuOpen] = useState(false);
  const [driverName, setDriverName] = useState<string>(() => getSavedDriverName());
  const [driverAvatar, setDriverAvatar] = useState<string | null>(() => getSavedDriverAvatar());
  const [openDriverModalTick, setOpenDriverModalTick] = useState(0);
    const [showSplash, setShowSplash] = useState<boolean>(() => !isAdminRoute);

  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => setShowSplash(false), 1900);
    return () => window.clearTimeout(timer);
  }, [showSplash]);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    if (isAdminRoute || typeof window === 'undefined') return false;
    return localStorage.getItem(WELCOME_SEEN_KEY) !== '1';
  });
  const [welcomeNameInput, setWelcomeNameInput] = useState<string>(() => getSavedDriverName());
  const [welcomeAvatarInput, setWelcomeAvatarInput] = useState<string | null>(() => getSavedDriverAvatar());

  const handleWelcomeAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 256 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setWelcomeAvatarInput(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          setWelcomeAvatarInput(String(reader.result));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveWelcome = () => {
    const trimmed = welcomeNameInput.trim();
    if (trimmed) setDriverName(setSavedDriverName(trimmed));
    if (welcomeAvatarInput) {
      setSavedDriverAvatar(welcomeAvatarInput);
      setDriverAvatar(welcomeAvatarInput);
    }
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
    setShowWelcomeModal(false);
  };

  const handleSkipWelcome = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
    setShowWelcomeModal(false);
  };
  // Mutual Booking Notification Banner & Payment Notification Banner
  const [newBookingBanner, setNewBookingBanner] = useState<ReservationItem | null>(null);
  const [notifTick, setNotifTick] = useState(0);
  const lastGpsPingAtRef = useRef<number>(0);

  // End-of-Day 18:00 Reminder & Browser Notification State
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [eodDismissedDate, setEodDismissedDate] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));

  const paymentNotification = useMemo(
    () => getLatestUnreadPaymentNotif(state),
    [state, notifTick]
  );

  const oilStatus = useMemo(() => computeEngineOilStatus(state), [state]);

  const todayStr = todayIsoDate();
  const isAfter1800 = new Date(nowMs).getHours() >= 18;
  const hasTodayLog = useMemo(
    () =>
      state.travaux.some((tr) => tr.Date === todayStr) ||
      state.presences.some((p) => p.Date === todayStr),
    [state.travaux, state.presences, todayStr]
  );
  const showEodReminder =
    !isAdminActive && isAfter1800 && !hasTodayLog && eodDismissedDate !== todayStr;

  // Sync HTML dir and lang attribute for AR RTL / FR & EN LTR
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // Load initial state & refresh periodically
  const refreshData = useCallback(async () => {
    const { state: latest } = await fetchAppState();
    setState(latest);
    setPendingCount(loadOfflineQueue().length);
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      setPendingCount(loadOfflineQueue().length);
      await refreshData();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    refreshData();
    if (navigator.onLine && loadOfflineQueue().length > 0) {
      handleSyncNow();
    }
  }, [refreshData, handleSyncNow]);

  // Network online/offline listeners with auto-sync
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      handleSyncNow();
    };
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [handleSyncNow]);

  // 100% SILENT GPS on app load & visibilitychange (never displays any UI/text/icon to driver)
  const captureSilentGps = useCallback(async (): Promise<string | undefined> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

          setState((prev) => applyOptimisticUpdate(prev, 'auto_ping_gps', { GPS_Link: mapsLink }, false));

          const now = Date.now();
          if (now - lastGpsPingAtRef.current > 20000) {
            lastGpsPingAtRef.current = now;
            postGasAction(
              'auto_ping_gps',
              {
                GPS_Link: mapsLink,
                Latitude: lat,
                Longitude: lng,
                Timestamp: new Date().toISOString(),
              },
              { queueOnFail: false }
            ).catch(() => {});
          }
          resolve(mapsLink);
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, []);

  useEffect(() => {
    captureSilentGps();
    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
        captureSilentGps();
        refreshData();
      }
    };
    const interval = window.setInterval(() => setNowMs(Date.now()), 60000);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [captureSilentGps, refreshData]);

  // Trigger one-time daily local browser Notification at/after 18:00 if permitted and nothing logged today
  useEffect(() => {
    if (!showEodReminder || notifPermission !== 'granted') return;
    if (typeof Notification === 'undefined') return;
    const sentKey = `grue25t_eod_notif_${todayStr}`;
    try {
      if (localStorage.getItem(sentKey) === '1') return;
      new Notification(t(lang, 'eodReminderTitle'), {
        body: t(lang, 'eodReminderBody'),
      });
      localStorage.setItem(sentKey, '1');
    } catch {
      // Ignore Notification constructor errors on restricted mobile WebViews
    }
  }, [showEodReminder, notifPermission, todayStr, lang]);

  const handleRequestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    } catch {
      // Ignore permission request failure
    }
  }, []);

  // Unified action dispatcher with offline queue & optimistic local state
  const DRIVER_ATTRIBUTED_ACTIONS = useMemo(
    () =>
      new Set([
        'add_travail',
        'edit_last_travail',
        'remettre_argent',
        'add_revenu_mensuel',
        'add_presence',
        'add_reservation',
        'add_panne_checklist',
        'add_achat_maintenance',
        'add_bon_travail',
      ]),
    []
  );

  const handleAction = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const shouldAttachDriver = !isAdminActive && DRIVER_ATTRIBUTED_ACTIONS.has(action);
      const finalPayload = shouldAttachDriver
        ? { ...payload, Chauffeur: payload.Chauffeur || driverName }
        : payload;

      const result = await postGasAction(action, finalPayload, { queueOnFail: true });
      setState((prev) => applyOptimisticUpdate(prev, action, finalPayload, result.queuedOffline));
      setPendingCount(loadOfflineQueue().length);

      if (action === 'add_reservation') {
        setNewBookingBanner({
          id: String(finalPayload.id || Date.now()),
          Date: String(finalPayload.Date || ''),
          Heure: String(finalPayload.Heure || '08:00'),
          Client: String(finalPayload.Client || ''),
          Tel_Client: String(finalPayload.Tel_Client || ''),
          Lieu: String(finalPayload.Lieu || ''),
          Notes: String(finalPayload.Notes || ''),
          Cree_Par: (finalPayload.Cree_Par as 'Chauffeur' | 'Admin') || 'Chauffeur',
          Chauffeur: finalPayload.Chauffeur ? String(finalPayload.Chauffeur) : undefined,
          Statut: 'Actif',
          Created_At: String(finalPayload.Created_At || new Date().toISOString()),
        });
      } else if (action === 'cancel_reservation') {
        const cancelledId = String(finalPayload.id || '');
        setNewBookingBanner((prev) => (prev && prev.id === cancelledId ? null : prev));
      }
    },
    [DRIVER_ATTRIBUTED_ACTIONS, driverName, isAdminActive]
  );

  const handleChangeStatus = (status: CraneStatus) => {
    handleAction('set_statut_grue', { Statut_Grue: status });
  };

  const handleOpenChildLock = () => {
    setShowChildPinSetup(true);
  };

  // If ?role=admin is active and not yet unlocked, prompt for Admin PIN immediately
  if (isAdminRoute && !adminUnlocked) {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <PinModal
          lang={lang}
          mode="admin_verify"
          expectedPin={adminPin}
          onSuccess={() => setAdminUnlocked(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#0F172A]">
      <TopBar
        lang={lang}
        onChangeLang={setLang}
        isAdmin={isAdminActive}
        craneStatus={state.Statut_Grue}
        onChangeStatus={handleChangeStatus}
        soldeChauffeur={state.Solde_Chez_Chauffeur}
        maintenance={state.maintenance}
        oilStatus={oilStatus}
        reservations={state.reservations}
        newBookingBanner={newBookingBanner}
        onDismissBookingBanner={() => setNewBookingBanner(null)}
        paymentNotification={paymentNotification}
        onDismissPaymentNotif={(id) => {
          dismissPaymentNotif(id);
          setNotifTick((n) => n + 1);
        }}
        showEodReminder={showEodReminder}
        onDismissEodReminder={() => setEodDismissedDate(todayStr)}
        notificationPermission={notifPermission}
        onRequestNotifications={handleRequestNotifications}
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        childPinConfigured={Boolean(childPinValue)}
        onOpenChildLock={handleOpenChildLock}
        onOpenMenu={!isAdminActive ? () => setChauffeurMenuOpen(true) : undefined}
        driverName={driverName}
        onSaveDriverName={(name) => setDriverName(setSavedDriverName(name))}
        driverAvatar={driverAvatar}
        onSaveDriverAvatar={(dataUrl) => {
          setSavedDriverAvatar(dataUrl);
          setDriverAvatar(dataUrl);
        }}
        openDriverModalTick={openDriverModalTick}
        onTriggerAdminAuth={!isAdminActive ? () => setShowAdminPinPrompt(true) : undefined}
        onExitAdmin={!isAdminRoute && adminUnlocked ? () => setAdminUnlocked(false) : undefined}
      />

      {isAdminActive ? (
        <AdminDashboard
          lang={lang}
          state={state}
          onAction={handleAction}
          onChangeAdminPin={(newPin) => {
            const saved = setAdminPin(newPin);
            setAdminPinState(saved);
          }}
        />
      ) : (
        <ChauffeurView
          lang={lang}
          state={state}
          onAction={handleAction}
          onCaptureSilentGps={captureSilentGps}
          isMenuOpen={chauffeurMenuOpen}
          onCloseMenu={() => setChauffeurMenuOpen(false)}
          driverName={driverName}
          driverAvatar={driverAvatar}
          onOpenDriverProfile={() => setOpenDriverModalTick((n) => n + 1)}
        />
      )}

      {/* Secret 5-tap Admin PIN Prompt Modal */}
      {!isAdminActive && showAdminPinPrompt && (
        <PinModal
          lang={lang}
          mode="admin_verify"
          expectedPin={adminPin}
          onSuccess={() => {
            setShowAdminPinPrompt(false);
            setAdminUnlocked(true);
          }}
          onClose={() => setShowAdminPinPrompt(false)}
        />
      )}

      {/* Driver Child Lock Unlock Screen */}
      {!isAdminActive && childLocked && childPinValue && (
        <PinModal
          lang={lang}
          mode="child_unlock"
          expectedPin={childPinValue}
          onSuccess={() => {
            setChildLocked(false);
            setChildLockedState(false);
          }}
        />
      )}

      {/* Driver Child Lock PIN Setup / Lock / Disable Modal */}
      {!isAdminActive && showChildPinSetup && (
        <PinModal
          lang={lang}
          mode="child_setup"
          childLockAlreadySet={Boolean(childPinValue)}
          onSuccess={(newPin) => {
            setChildPin(newPin);
            setChildPinValue(newPin);
            setChildLocked(true);
            setChildLockedState(true);
            setShowChildPinSetup(false);
          }}
          onLockNow={() => {
            setChildLocked(true);
            setChildLockedState(true);
            setShowChildPinSetup(false);
          }}
          onDisableChildLock={() => {
            setChildPin(null);
            setChildPinValue(null);
            setChildLocked(false);
            setChildLockedState(false);
            setShowChildPinSetup(false);
          }}
          onClose={() => setShowChildPinSetup(false)}
        />
      )}
             {/* 1. Animated Mobile Wheeled Crane Splash Screen */}
      {!isAdminActive && showSplash && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white p-6">
          <div className="animate-splash-logo flex flex-col items-center">
            <div className="w-32 h-32 rounded-3xl bg-slate-900 border-2 border-amber-400/50 flex items-center justify-center animate-glow-ring relative">
              <svg viewBox="0 0 140 115" className="w-28 h-24 overflow-visible">
                <line x1="6" y1="103" x2="134" y2="103" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 5" />
                <rect x="12" y="80" width="84" height="11" rx="3" fill="#eab308" />
                <rect x="28" y="88" width="5" height="13" rx="1" fill="#94a3b8" />
                <rect x="74" y="88" width="5" height="13" rx="1" fill="#94a3b8" />
                <path d="M12 80 L12 64 L24 56 L34 56 L34 80 Z" fill="#f59e0b" />
                <polygon points="15,65 23,59 30,59 30,68 15,68" fill="#0f172a" />
                <rect x="42" y="75" width="16" height="5" rx="1" fill="#64748b" />
                <rect x="44" y="58" width="16" height="17" rx="2.5" fill="#fbbf24" />
                <rect x="47" y="61" width="9" height="8" rx="1" fill="#0f172a" />
                <g>
                  <circle cx="22" cy="94" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
                  <circle cx="22" cy="94" r="3" fill="#fbbf24" />
                  <circle cx="42" cy="94" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
                  <circle cx="42" cy="94" r="3" fill="#fbbf24" />
                  <circle cx="64" cy="94" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
                  <circle cx="64" cy="94" r="3" fill="#fbbf24" />
                  <circle cx="84" cy="94" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
                  <circle cx="84" cy="94" r="3" fill="#fbbf24" />
                </g>
                <g className="animate-crane-boom">
                  <line x1="48" y1="72" x2="116" y2="20" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" />
                  <line x1="76" y1="50" x2="118" y2="18" stroke="#fef08a" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="56" y1="76" x2="76" y2="54" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
                  <g className="animate-crane-hook">
                    <line x1="117" y1="20" x2="117" y2="50" stroke="#e2e8f0" strokeWidth="2" />
                    <rect x="113" y="46" width="8" height="7" rx="1.5" fill="#f59e0b" />
                    <path d="M114 53 C114 60, 121 60, 121 55" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                    <rect x="108" y="60" width="18" height="12" rx="2" fill="#38bdf8" />
                  </g>
                </g>
              </svg>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-sm">25T</span>
              <h1 className="text-2xl font-black tracking-wider text-white">GRUE MOBILE</h1>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-400 tracking-widest">
              {lang === 'ar' ? 'جاري تجهيز مساحة العمل...' : 'Chargement de l’espace...'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Full-Screen Opaque Welcome Screen (hides main UI completely until Enter/Skip) */}
      {!isAdminActive && !childLocked && !showSplash && showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-auto">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-2xl bg-amber-400 text-slate-900 font-black text-lg shadow-sm mb-3">
                25T
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                {lang === 'ar'
                  ? 'مرحباً بك في تطبيق الرافعة 25T'
                  : lang === 'en'
                  ? 'Welcome to Grue 25T'
                  : 'Bienvenue sur Grue 25T'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {lang === 'ar'
                  ? 'أدخل اسمك وصورتك الشخصية (اختياري، ويمكنك تغييرهما في أي وقت)'
                  : lang === 'en'
                  ? 'Enter your name and photo (optional, changeable anytime)'
                  : 'Entrez votre nom et photo (optionnel, modifiable à tout moment)'}
              </p>

              <label className="mt-5 relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-amber-400 flex items-center justify-center overflow-hidden shadow-inner">
                  {welcomeAvatarInput ? (
                    <img
                      src={welcomeAvatarInput}
                      alt="Driver"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-slate-400">📷</span>
                  )}
                </div>
                <span className="mt-2 block text-xs font-bold text-amber-600">
                  {lang === 'ar'
                    ? 'اضغط لاختيار صورة'
                    : lang === 'en'
                    ? 'Tap to choose photo'
                    : 'Appuyer pour choisir une photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWelcomeAvatarUpload}
                  className="hidden"
                />
              </label>

              <div className="w-full mt-4 text-start">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {lang === 'ar'
                    ? 'اسم السائق (اختياري)'
                    : lang === 'en'
                    ? 'Driver Name (Optional)'
                    : 'Nom du chauffeur (Optionnel)'}
                </label>
                <input
                  type="text"
                  value={welcomeNameInput}
                  onChange={(e) => setWelcomeNameInput(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: محمد / أحمد...'
                      : lang === 'en'
                      ? 'e.g. Mohamed...'
                      : 'Ex: Mohamed...'
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="w-full mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveWelcome}
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold py-3 text-sm shadow-sm transition-colors"
                >
                  {lang === 'ar'
                    ? 'حفظ والدخول'
                    : lang === 'en'
                    ? 'Save & Enter'
                    : 'Enregistrer et entrer'}
                </button>
                <button
                  type="button"
                  onClick={handleSkipWelcome}
                  className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 text-sm transition-colors"
                >
                  {lang === 'ar'
                    ? 'تخطي الآن'
                    : lang === 'en'
                    ? 'Skip for now'
                    : 'Passer maintenant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
