import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Clock,
  FileCheck2,
  Fuel,
  MoreHorizontal,
  Navigation,
  PlusCircle,
} from 'lucide-react';
import { AppStateData, Language, TravailItem } from '../types';
import { t } from '../i18n';
import { getLastTravailEditWindow, isWithinLast60Days } from '../services/api';
import { formatAmount, formatShortDate } from '../utils/media';
import { EngineOilWidget } from './EngineOilWidget';
import { TravailModal } from './chauffeur/TravailModal';
import { RemiseModal } from './chauffeur/RemiseModal';
import { PlanningModal } from './chauffeur/PlanningModal';
import { PanneModal } from './chauffeur/PanneModal';
import { PlusDrawer } from './chauffeur/PlusDrawer';
import { AchatMaintenanceModal } from './chauffeur/AchatMaintenanceModal';
import { BonTravailModal } from './chauffeur/BonTravailModal';
import { ChauffeurMenuAction, ChauffeurMenuDrawer } from './chauffeur/ChauffeurMenuDrawer';

interface ChauffeurViewProps {
  lang: Language;
  state: AppStateData;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
  onCaptureSilentGps: () => Promise<string | undefined>;
  isMenuOpen?: boolean;
  onCloseMenu?: () => void;
  driverName?: string;
  driverAvatar?: string | null;
  onOpenDriverProfile?: () => void;
}

export const ChauffeurView: React.FC<ChauffeurViewProps> = ({
  lang,
  state,
  onAction,
  onCaptureSilentGps,
  isMenuOpen = false,
  onCloseMenu,
  driverName = 'Principal',
  driverAvatar = null,
  onOpenDriverProfile,
}) => {
  const [activeModal, setActiveModal] = useState<
    null | 'travail' | 'edit_travail' | 'remise' | 'planning' | 'panne' | 'achat' | 'bon_travail' | 'plus'
  >(null);
  const [achatInitialTab, setAchatInitialTab] = useState<
    'Mazout' | 'Piece_Main_Oeuvre' | 'Revenu_Mensuel'
  >('Mazout');
  const [plusInitialSection, setPlusInitialSection] = useState<'contacts' | 'gear' | 'specs'>(
    'contacts'
  );

  const editWindow = getLastTravailEditWindow();
  const editableTravail: TravailItem | null = editWindow
    ? state.travaux.find((tr) => tr.id === editWindow.id) || state.travaux[0] || null
    : null;
  const minutesLeft = editWindow
    ? Math.max(1, Math.ceil((15 * 60 * 1000 - (Date.now() - editWindow.timestamp)) / 60000))
    : 0;

  // Auto-cleanup for Driver View: strictly filter to last 60 days (2 months)
  const driverLogEntries = useMemo(() => {
    const workRows = state.travaux
      .filter((tr) => isWithinLast60Days(tr.Date))
      .map((tr) => ({
        id: tr.id,
        date: tr.Date,
        isMonthOnly: false,
        kind: 'work' as const,
        title: tr.Client,
        details:
          tr.Mode_Tarif === 'A la tache/Par camion'
            ? `${t(lang, 'pricingPerTask')}${tr.Quantite_Tache ? ` (${tr.Quantite_Tache})` : ''}`
            : `${tr.Heure_Debut && tr.Heure_Fin ? `${tr.Heure_Debut}-${tr.Heure_Fin} · ` : ''}${tr.Duree}${t(lang, 'hoursUnit')}`,
        amount: tr.Montant_Encaisse,
        isExpense: false,
        isOffline: tr.isOffline,
      }));

    const achatRows = state.achats_maintenance
      .filter((a) => isWithinLast60Days(a.Date))
      .map((a) => ({
        id: a.id,
        date: a.Date,
        isMonthOnly: false,
        kind: a.Categorie === 'Mazout' ? ('fuel' as const) : ('maint' as const),
        title: a.Description,
        details: a.Notes || (a.Categorie === 'Mazout' ? t(lang, 'catMazout') : t(lang, 'typeMaintPurchase')),
        amount: a.Montant,
        isExpense: true,
        isOffline: a.isOffline,
      }));

    const avanceRows = state.avances
      .filter((av) => isWithinLast60Days(av.Date))
      .map((av) => ({
        id: av.id,
        date: av.Date,
        isMonthOnly: false,
        kind: 'advance' as const,
        title:
          av.Type_Paiement === 'Salaire'
            ? t(lang, 'paymentTypeSalary')
            : t(lang, 'paymentTypeAdvance'),
        details: av.Motif || t(lang, 'driverAdvances'),
        amount: av.Montant,
        isExpense: false,
        isOffline: av.isOffline,
      }));

    const revenuRows = state.revenus_mensuels
      .filter((rev) => isWithinLast60Days(rev.Mois))
      .map((rev) => ({
        id: rev.id,
        date: rev.Mois,
        isMonthOnly: true,
        kind: 'monthly' as const,
        title: rev.Mois,
        details:
          [
            rev.Heures_Supplementaires
              ? `${t(lang, 'overtimeHours')}: ${rev.Heures_Supplementaires}${t(lang, 'hoursUnit')}`
              : '',
            rev.Notes,
          ]
            .filter(Boolean)
            .join(' · ') || t(lang, 'catMonthlyIncome'),
        amount: rev.Montant,
        isExpense: false,
        isOffline: rev.isOffline,
      }));

    return [...workRows, ...achatRows, ...avanceRows, ...revenuRows].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '')
    );
  }, [state.travaux, state.achats_maintenance, state.avances, state.revenus_mensuels, lang]);

  const handleSubmitTravail = async (payload: Record<string, unknown>, isEdit: boolean) => {
    const gps = state.Last_GPS_Link || (await onCaptureSilentGps());
    await onAction(isEdit ? 'edit_last_travail' : 'add_travail', {
      ...payload,
      GPS_Link: gps || payload.GPS_Link || '',
    });
  };

  const handleShareLocation = async () => {
    let link = state.Last_GPS_Link;
    if (!link) {
      link = await onCaptureSilentGps();
    }
    const text = encodeURIComponent(
      link ? `${t(lang, 'waCurrentLocation')} : ${link}` : t(lang, 'waOnTheWay')
    );
    const anchor = document.createElement('a');
    anchor.href = `https://wa.me/?text=${text}`;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  const handleMenuSelect = (action: ChauffeurMenuAction) => {
    if (action === 'send_location') {
      void handleShareLocation();
      return;
    }
    if (action === 'vidange') {
      const el = document.getElementById('engine-oil-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action === 'achat') {
      setAchatInitialTab('Mazout');
      setActiveModal('achat');
      return;
    }
    if (action === 'revenu_mensuel') {
      setAchatInitialTab('Revenu_Mensuel');
      setActiveModal('achat');
      return;
    }
    if (action === 'specs' || action === 'gear' || action === 'contacts') {
      setPlusInitialSection(action);
      setActiveModal('plus');
      return;
    }
    setActiveModal(action);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-5 pb-24 space-y-5">
      {/* 15-minute Edit Last Entry Banner */}
      {editableTravail && (
        <button
          type="button"
          onClick={() => setActiveModal('edit_travail')}
          className="w-full min-h-[54px] px-4 py-3 rounded-2xl bg-white border border-emerald-300 hover:bg-emerald-50 flex items-center justify-between gap-3 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 text-start">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {t(lang, 'editLastWork')} · {editableTravail.Client}
              </p>
              <p className="text-xs text-emerald-700 font-mono font-semibold">
                {minutesLeft} {t(lang, 'editWindowLeft')}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 px-3 py-1.5 rounded-lg bg-emerald-100 whitespace-nowrap shrink-0">
            {t(lang, 'edit')}
          </span>
        </button>
      )}

      {/* 4 Large ATM-Style Color-Coded Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveModal('travail')}
          className="min-h-[132px] sm:min-h-[152px] p-6 rounded-3xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white flex items-center justify-between gap-4 transition-all text-start shadow-sm"
        >
          <div className="space-y-1.5">
            <span className="block text-xl sm:text-2xl font-extrabold tracking-tight">
              {t(lang, 'btnNewWork')}
            </span>
            <span className="block text-xs sm:text-sm text-emerald-100 font-medium">
              {t(lang, 'btnNewWorkSub')}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <PlusCircle className="w-8 h-8" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('remise')}
          className="min-h-[132px] sm:min-h-[152px] p-6 rounded-3xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white flex items-center justify-between gap-4 transition-all text-start shadow-sm"
        >
          <div className="space-y-1.5">
            <span className="block text-xl sm:text-2xl font-extrabold tracking-tight">
              {t(lang, 'btnHandoverCash')}
            </span>
            <span className="block text-xs sm:text-sm text-blue-100 font-medium">
              {t(lang, 'btnHandoverCashSub')}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Banknote className="w-8 h-8" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('planning')}
          className="min-h-[132px] sm:min-h-[152px] p-6 rounded-3xl bg-amber-400 hover:bg-amber-500 active:scale-[0.99] text-slate-950 flex items-center justify-between gap-4 transition-all text-start shadow-sm"
        >
          <div className="space-y-1.5">
            <span className="block text-xl sm:text-2xl font-extrabold tracking-tight">
              {t(lang, 'btnPlanning')}
            </span>
            <span className="block text-xs sm:text-sm text-slate-800 font-semibold">
              {t(lang, 'btnPlanningSub')}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-slate-950/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-8 h-8" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('panne')}
          className="min-h-[132px] sm:min-h-[152px] p-6 rounded-3xl bg-red-700 hover:bg-red-800 active:scale-[0.99] text-white flex items-center justify-between gap-4 transition-all text-start shadow-sm"
        >
          <div className="space-y-1.5">
            <span className="block text-xl sm:text-2xl font-extrabold tracking-tight">
              {t(lang, 'btnBreakdown')}
            </span>
            <span className="block text-xs sm:text-sm text-red-100 font-medium">
              {t(lang, 'btnBreakdownSub')}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </button>
      </div>

      {/* Dedicated Fuel (Mazout) & Maintenance Purchases Button */}
      <button
        type="button"
        onClick={() => {
          setAchatInitialTab('Mazout');
          setActiveModal('achat');
        }}
        className="w-full min-h-[82px] p-5 rounded-3xl bg-slate-900 hover:bg-slate-800 active:scale-[0.995] text-white flex items-center justify-between gap-4 transition-all text-start shadow-sm"
      >
        <div className="space-y-1">
          <span className="block text-lg font-extrabold tracking-tight">
            {t(lang, 'btnFuelMaint')}
          </span>
          <span className="block text-xs text-slate-300 font-medium">
            {t(lang, 'btnFuelMaintSub')}
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
          <Fuel className="w-6 h-6" />
        </div>
      </button>

      {/* Quick Actions: Client Work Certificate & Send Location to Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveModal('bon_travail')}
          className="min-h-[68px] p-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.995] text-slate-900 flex items-center justify-between gap-3 transition-all text-start"
        >
          <div className="min-w-0">
            <span className="block text-sm font-extrabold truncate">
              {t(lang, 'btnBonTravailClient')}
            </span>
            <span className="block text-xs text-slate-500 truncate">
              {t(lang, 'btnBonTravailClientSub')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={handleShareLocation}
          className="min-h-[68px] p-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.995] text-slate-900 flex items-center justify-between gap-3 transition-all text-start"
        >
          <div className="min-w-0">
            <span className="block text-sm font-extrabold truncate">
              {t(lang, 'sendLocationClient')}
            </span>
            <span className="block text-xs text-slate-500 truncate">
              WhatsApp
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Engine Oil Hour-Counter Tracker */}
      <div id="engine-oil-section">
        <EngineOilWidget lang={lang} state={state} onAction={onAction} />
      </div>

      {/* Driver Work & Expense Log Table (Auto-cleaned > 60 days) */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'driverLogTitle')}</h3>
          <span className="text-xs font-medium text-slate-500">
            {t(lang, 'driverLogBadge')} · {driverLogEntries.length}
          </span>
        </div>

        {driverLogEntries.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">{t(lang, 'noRecentEntries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-start">
                  <th className="py-2.5 px-3 font-bold text-start whitespace-nowrap">
                    {t(lang, 'colDate')}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-start whitespace-nowrap">
                    {t(lang, 'colType')}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-start">
                    {t(lang, 'colClientItem')}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-start hidden sm:table-cell">
                    {t(lang, 'colDetails')}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-end whitespace-nowrap">
                    {t(lang, 'colAmount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverLogEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {row.isMonthOnly ? row.date : formatShortDate(row.date, lang)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-xs">
                      <span
                        className={
                          row.kind === 'work' || row.kind === 'monthly'
                            ? 'text-emerald-700'
                            : row.kind === 'advance'
                              ? 'text-blue-700'
                              : row.kind === 'fuel'
                                ? 'text-amber-700'
                                : 'text-red-700'
                        }
                      >
                        {row.kind === 'work'
                          ? t(lang, 'typeWork')
                          : row.kind === 'advance'
                            ? t(lang, 'typeAdvanceSalary')
                            : row.kind === 'monthly'
                              ? t(lang, 'typeMonthlyIncome')
                              : row.kind === 'fuel'
                                ? t(lang, 'typeFuel')
                                : t(lang, 'typeMaintPurchase')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="block truncate max-w-[160px] sm:max-w-xs">{row.title}</span>
                      <span className="block sm:hidden text-[11px] text-slate-500 truncate max-w-[160px]">
                        {row.details}
                      </span>
                      {row.isOffline && (
                        <span className="block text-[11px] text-amber-700 font-semibold">
                          {t(lang, 'savedOffline')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 hidden sm:table-cell max-w-[200px] truncate">
                      {row.details}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono font-bold text-end whitespace-nowrap ${
                        row.isExpense ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {row.isExpense ? '-' : '+'}
                      {formatAmount(row.amount, lang)} {t(lang, 'currency')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom 'Plus' Drawer Trigger */}
      <div className="fixed bottom-4 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
        <button
          type="button"
          onClick={() => {
            setPlusInitialSection('contacts');
            setActiveModal('plus');
          }}
          className="pointer-events-auto min-h-[48px] px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shadow-lg"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>{t(lang, 'moreDrawer')}</span>
        </button>
      </div>

      {/* Modals */}
      {activeModal === 'travail' && (
        <TravailModal
          lang={lang}
          customTags={state.customTags}
          hiddenDefaultTags={state.hiddenDefaultTags}
          onSaveCustomTag={(tag) => onAction('save_custom_tag', { tag })}
          onDeleteCustomTag={(tag) => onAction('delete_custom_tag', { tag })}
          onDeleteDefaultTag={(tag) => onAction('delete_default_tag', { tag })}
          onOpenBonTravail={() => setActiveModal('bon_travail')}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSubmitTravail}
        />
      )}

      {activeModal === 'edit_travail' && editableTravail && (
        <TravailModal
          lang={lang}
          initialItem={editableTravail}
          customTags={state.customTags}
          hiddenDefaultTags={state.hiddenDefaultTags}
          onSaveCustomTag={(tag) => onAction('save_custom_tag', { tag })}
          onDeleteCustomTag={(tag) => onAction('delete_custom_tag', { tag })}
          onDeleteDefaultTag={(tag) => onAction('delete_default_tag', { tag })}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSubmitTravail}
        />
      )}

      {activeModal === 'achat' && (
        <AchatMaintenanceModal
          lang={lang}
          creePar="Chauffeur"
          allowMonthlyIncome
          initialTab={achatInitialTab}
          onClose={() => setActiveModal(null)}
          onSubmitPurchase={(payload) => onAction('add_achat_maintenance', payload)}
          onSubmitMonthlyIncome={(payload) => onAction('add_revenu_mensuel', payload)}
        />
      )}

      {activeModal === 'remise' && (
        <RemiseModal
          lang={lang}
          soldeChauffeur={state.Solde_Chez_Chauffeur}
          onClose={() => setActiveModal(null)}
          onSubmit={(payload) => onAction('remettre_argent', payload)}
        />
      )}

      {activeModal === 'planning' && (
        <PlanningModal
          lang={lang}
          reservations={state.reservations}
          presences={state.presences}
          onClose={() => setActiveModal(null)}
          onAddReservation={(payload) => onAction('add_reservation', payload)}
          onCancelReservation={(payload) => onAction('cancel_reservation', payload)}
          onAddPresence={(payload) => onAction('add_presence', payload)}
        />
      )}

      {activeModal === 'bon_travail' && (
        <BonTravailModal
          lang={lang}
          bonsTravail={state.bons_travail}
          onClose={() => setActiveModal(null)}
          onSubmit={(payload) => onAction('add_bon_travail', payload)}
        />
      )}

      {activeModal === 'panne' && (
        <PanneModal
          lang={lang}
          onClose={() => setActiveModal(null)}
          onSubmit={(payload) => onAction('add_panne_checklist', payload)}
        />
      )}

      {activeModal === 'plus' && (
        <PlusDrawer
          lang={lang}
          specs={state.specs}
          accessories={state.accessories}
          contacts={state.contacts}
          initialSection={plusInitialSection}
          onClose={() => setActiveModal(null)}
          onAction={onAction}
        />
      )}

      <ChauffeurMenuDrawer
        lang={lang}
        isOpen={isMenuOpen}
        onClose={() => onCloseMenu?.()}
        onSelect={handleMenuSelect}
        driverName={driverName}
        driverAvatar={driverAvatar}
        onOpenDriverProfile={onOpenDriverProfile}
      />
    </main>
  );
};
