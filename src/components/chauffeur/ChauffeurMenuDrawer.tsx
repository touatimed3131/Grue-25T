import React, { useEffect } from 'react';
import {
  AlertTriangle,
  Anchor,
  Banknote,
  BookOpen,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Droplets,
  FileCheck2,
  Fuel,
  Navigation,
  PlusCircle,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../i18n';

export type ChauffeurMenuAction =
  | 'travail'
  | 'remise'
  | 'planning'
  | 'achat'
  | 'panne'
  | 'bon_travail'
  | 'send_location'
  | 'vidange'
  | 'revenu_mensuel'
  | 'specs'
  | 'gear'
  | 'contacts';

interface ChauffeurMenuDrawerProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (action: ChauffeurMenuAction) => void;
  driverName?: string;
  driverAvatar?: string | null;
  onOpenDriverProfile?: () => void;
}

export const ChauffeurMenuDrawer: React.FC<ChauffeurMenuDrawerProps> = ({
  lang,
  isOpen,
  onClose,
  onSelect,
  driverName = 'Principal',
  driverAvatar = null,
  onOpenDriverProfile,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const operationItems: Array<{
    id: ChauffeurMenuAction;
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
  }> = [
    {
      id: 'travail',
      label: t(lang, 'btnNewWork'),
      icon: <PlusCircle className="w-5 h-5" />,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'remise',
      label: t(lang, 'btnHandoverCash'),
      icon: <Banknote className="w-5 h-5" />,
      badgeClass: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'planning',
      label: t(lang, 'btnPlanning'),
      icon: <CalendarDays className="w-5 h-5" />,
      badgeClass: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'achat',
      label: t(lang, 'btnFuelMaint'),
      icon: <Fuel className="w-5 h-5" />,
      badgeClass: 'bg-slate-200 text-slate-900',
    },
    {
      id: 'panne',
      label: t(lang, 'btnBreakdown'),
      icon: <AlertTriangle className="w-5 h-5" />,
      badgeClass: 'bg-red-100 text-red-800',
    },
    {
      id: 'bon_travail',
      label: t(lang, 'btnBonTravailClient'),
      icon: <FileCheck2 className="w-5 h-5" />,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'send_location',
      label: t(lang, 'sendLocationClient'),
      icon: <Navigation className="w-5 h-5" />,
      badgeClass: 'bg-blue-100 text-blue-800',
    },
  ];

  const equipmentItems: Array<{
    id: ChauffeurMenuAction;
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
  }> = [
    {
      id: 'vidange',
      label: t(lang, 'oilTrackerTitle'),
      icon: <Droplets className="w-5 h-5" />,
      badgeClass: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'revenu_mensuel',
      label: t(lang, 'monthlyRevenue'),
      icon: <DollarSign className="w-5 h-5" />,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'specs',
      label: t(lang, 'craneSpecs'),
      icon: <BookOpen className="w-5 h-5" />,
      badgeClass: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'gear',
      label: t(lang, 'liftingGear'),
      icon: <Anchor className="w-5 h-5" />,
      badgeClass: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'contacts',
      label: t(lang, 'emergencyContacts'),
      icon: <Wrench className="w-5 h-5" />,
      badgeClass: 'bg-slate-100 text-slate-800',
    },
  ];

  const handlePick = (id: ChauffeurMenuAction) => {
    onClose();
    onSelect(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex"
      onClick={onClose}
    >
      <aside
        aria-label={t(lang, 'navMenu')}
        onClick={(e) => e.stopPropagation()}
        className="w-[86vw] max-w-xs h-full bg-white border-e border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-4 h-14 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shrink-0">
              25T
            </div>
            <span className="font-extrabold text-sm tracking-tight truncate">
              {t(lang, 'navMenu')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(lang, 'close')}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDriverProfile?.();
            }}
            className="w-full flex items-center gap-3 text-start rounded-xl p-1.5 -m-1.5 hover:bg-slate-100 transition-colors"
          >
            {driverAvatar ? (
              <img
                src={driverAvatar}
                alt={driverName}
                className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <span className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900 whitespace-normal break-words leading-snug">
                {t(lang, 'driverGreeting').replace('{name}', driverName)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {t(lang, 'driverProfile')}
              </p>
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-5">
          <div className="space-y-1">
            <p className="px-2.5 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
              {t(lang, 'menuGroupOperations')}
            </p>
            {operationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item.id)}
                className="w-full min-h-[48px] px-2.5 py-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 flex items-center justify-between gap-3 text-start transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.badgeClass}`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 rtl:rotate-180" />
              </button>
            ))}
          </div>

          <div className="space-y-1 border-t border-slate-200 pt-4">
            <p className="px-2.5 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
              {t(lang, 'menuGroupEquipment')}
            </p>
            {equipmentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item.id)}
                className="w-full min-h-[48px] px-2.5 py-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 flex items-center justify-between gap-3 text-start transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.badgeClass}`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 rtl:rotate-180" />
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </div>
  );
};
