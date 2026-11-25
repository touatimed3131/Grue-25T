import React, { useMemo, useState } from 'react';
import { Ban, Check, Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { AppStateData, Language, ReservationItem } from '../types';
import { t } from '../i18n';
import { computeAdminKPIs, isReservationCancelled } from '../services/api';
import { formatAmount, formatExactTimestamp, formatShortDate, todayIsoDate } from '../utils/media';
import { EngineOilWidget } from './EngineOilWidget';
import { AdminWorkLogTab } from './admin/AdminWorkLogTab';
import { AdminClientsTab } from './admin/AdminClientsTab';
import { AdminFleetTab } from './admin/AdminFleetTab';
import { AdminFuelMaintTab } from './admin/AdminFuelMaintTab';
import { PdfDocumentModal, PdfPayload } from './admin/PdfDocumentModal';

interface AdminDashboardProps {
  lang: Language;
  state: AppStateData;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
  onChangeAdminPin: (pin: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  state,
  onAction,
  onChangeAdminPin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'finance' | 'worklog' | 'fuelmaint' | 'clients' | 'fleet'
  >('finance');
  const [pdfDoc, setPdfDoc] = useState<PdfPayload | null>(null);

  const [avanceMontant, setAvanceMontant] = useState('');
  const [avanceMotif, setAvanceMotif] = useState('');
  const [avanceType, setAvanceType] = useState<'Avance' | 'Salaire'>('Avance');
  const [deletingResId, setDeletingResId] = useState<string | null>(null);

  const kpis = useMemo(() => computeAdminKPIs(state), [state]);

  const handlePermanentDeleteReservation = async (bk: ReservationItem) => {
    setDeletingResId(bk.id);
    try {
      await onAction('delete_reservation_admin', {
        id: bk.id,
        Date: bk.Date,
        Heure: bk.Heure,
        Client: bk.Client,
        Tel_Client: bk.Tel_Client,
        Lieu: bk.Lieu,
        Duree_Estimee: bk.Duree_Estimee ?? 0,
        Notes: bk.Notes,
        Cree_Par: bk.Cree_Par,
        Statut: bk.Statut || 'Annulé',
        Created_At: bk.Created_At || '',
        Cancelled_At: bk.Cancelled_At || '',
        Cancelled_By: bk.Cancelled_By || 'Chauffeur',
      });
    } finally {
      setDeletingResId(null);
    }
  };

  const handleAddAvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avanceMontant) return;
    await onAction('add_avance', {
      id: `av-${Date.now()}`,
      Date: todayIsoDate(),
      Montant: Number(avanceMontant),
      Motif: avanceMotif.trim(),
      Type_Paiement: avanceType,
    });
    setAvanceMontant('');
    setAvanceMotif('');
  };

  const kpiCards: Array<{ label: string; value: string; tone: string; sub?: string }> = [
    { label: t(lang, 'kpiCollected'), value: `${formatAmount(kpis.Total_Encaisse, lang)} ${t(lang, 'currency')}`, tone: 'text-emerald-700' },
    { label: t(lang, 'kpiExpenses'), value: `${formatAmount(kpis.Total_Depenses, lang)} ${t(lang, 'currency')}`, tone: 'text-red-700' },
    { label: t(lang, 'kpiBonuses'), value: `${formatAmount(kpis.Total_Primes, lang)} ${t(lang, 'currency')}`, tone: 'text-slate-900' },
    { label: t(lang, 'kpiAdvances'), value: `${formatAmount(kpis.Total_Avances, lang)} ${t(lang, 'currency')}`, tone: 'text-slate-900' },
    { label: t(lang, 'kpiConfirmed'), value: `${formatAmount(kpis.Total_Confirmes, lang)} ${t(lang, 'currency')}`, tone: 'text-emerald-700' },
    { label: t(lang, 'kpiClientDebt'), value: `${formatAmount(kpis.Reste_Clients, lang)} ${t(lang, 'currency')}`, tone: 'text-red-700' },
    { label: t(lang, 'kpiAnnualRevenue'), value: `${formatAmount(kpis.Chiffre_Affaires_Annuel, lang)} ${t(lang, 'currency')}`, tone: 'text-slate-900' },
    {
      label: t(lang, 'kpiHourlyCost'),
      value: `${formatAmount(kpis.Cout_Horaire_Reel, lang)} ${t(lang, 'currency')}/${t(lang, 'hoursUnit')}`,
      tone: 'text-amber-800',
      sub: `${formatAmount(kpis.Monthly_Fuel_Maint_Expenses ?? 0, lang)} ${t(lang, 'currency')} / ${kpis.Monthly_Operating_Hours ?? 0}${t(lang, 'hoursUnit')}`,
    },
    { label: t(lang, 'kpiOccupancy'), value: `${kpis.Taux_Occupation}%`, tone: 'text-blue-700' },
    { label: t(lang, 'kpiTotalKm'), value: `${formatAmount(kpis.Total_Km, lang)} ${t(lang, 'kmUnit')}`, tone: 'text-slate-900' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-5 pb-12 space-y-5">
      {/* 10-Metric Financial & Operations Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-slate-200 rounded-2xl p-3.5"
          >
            <p className="text-[11px] font-bold text-slate-500 truncate">{item.label}</p>
            <p className={`text-base sm:text-lg font-extrabold font-mono tabular-nums mt-1 ${item.tone}`}>
              {item.value}
            </p>
            {item.sub && (
              <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5 truncate">
                {item.sub}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Shared Engine Oil Hour-Counter Tracker */}
      <EngineOilWidget lang={lang} state={state} onAction={onAction} />

      {/* Permanent Cancelled Bookings Audit Trail (Prominently visible in Red to Admin) */}
      {state.reservations.some(isReservationCancelled) && (
        <section className="bg-red-50 border border-red-300 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-red-900 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-700 shrink-0" />
              <span>{t(lang, 'cancelledAlertsTitle')}</span>
            </h3>
            <span className="text-xs font-mono font-extrabold text-red-800">
              {state.reservations.filter(isReservationCancelled).length}
            </span>
          </div>
          <div className="divide-y divide-red-200 border border-red-200 rounded-xl bg-white overflow-hidden">
            {state.reservations.filter(isReservationCancelled).map((bk) => (
              <div
                key={bk.id}
                className="p-3.5 bg-red-50/60 flex flex-wrap items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-extrabold text-red-950">{bk.Client}</span>
                    <span className="text-xs font-mono font-bold text-red-800">
                      {formatShortDate(bk.Date, lang)} {bk.Heure}
                    </span>
                    {bk.Lieu && (
                      <span className="text-xs font-semibold text-red-900">· {bk.Lieu}</span>
                    )}
                  </div>
                  <p className="text-xs font-extrabold text-red-700">
                    {t(lang, 'cancelledByDriver')}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="text-[11px] font-mono text-red-900 space-y-0.5 sm:text-end">
                    <p>
                      {t(lang, 'createdAtLabel')}: {formatExactTimestamp(bk.Created_At || bk.Date, lang)}
                    </p>
                    <p className="font-bold">
                      {t(lang, 'cancelledAtLabel')}: {formatExactTimestamp(bk.Cancelled_At, lang)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePermanentDeleteReservation(bk)}
                    disabled={deletingResId === bk.id}
                    className="min-h-[38px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    {deletingResId === bk.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{t(lang, 'deletePermanently')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        {(
          [
            { id: 'finance', label: t(lang, 'tabFinance') },
            {
              id: 'worklog',
              label: `${t(lang, 'tabWorkLog')}${
                state.bons_travail.filter((b) => b.Statut === 'En attente').length > 0
                  ? ` (${state.bons_travail.filter((b) => b.Statut === 'En attente').length})`
                  : ''
              }`,
            },
            { id: 'fuelmaint', label: t(lang, 'tabFuelMaint') },
            { id: 'clients', label: t(lang, 'tabClients') },
            { id: 'fleet', label: t(lang, 'tabFleet') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab 1: Finance, Cash Confirmations & Advances */}
      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t(lang, 'pendingHandovers')}
              </h3>
              <span className="text-xs font-mono text-slate-500">{state.remises.length}</span>
            </div>

            {state.remises.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">{t(lang, 'noHandovers')}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {state.remises.map((rem) => {
                  const isConfirmed = rem.Statut === 'Confirmé';
                  return (
                    <div
                      key={rem.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-extrabold font-mono text-slate-900">
                          {formatAmount(rem.Montant_Remis, lang)} {t(lang, 'currency')}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">{formatShortDate(rem.Date, lang)}</span>
                          {rem.Chauffeur && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="font-bold text-slate-700">{rem.Chauffeur}</span>
                            </>
                          )}
                          {rem.Notes && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{rem.Notes}</span>
                            </>
                          )}
                        </p>
                      </div>

                      {isConfirmed ? (
                        <div className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t(lang, 'confirmedLocked')}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAction('confirmer_reception', { id: rem.id })}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Check className="w-4 h-4" />
                          <span>{t(lang, 'confirmReceipt')}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'driverAdvances')}</h3>

              <form onSubmit={handleAddAvance} className="space-y-2.5 border-b border-slate-200 pb-4">
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(
                    [
                      { val: 'Avance', label: t(lang, 'paymentTypeAdvance') },
                      { val: 'Salaire', label: t(lang, 'paymentTypeSalary') },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setAvanceType(opt.val)}
                      className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
                        avanceType === opt.val
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={t(lang, 'amount')}
                    value={avanceMontant}
                    onChange={(e) => setAvanceMontant(e.target.value)}
                    className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                  <input
                    type="text"
                    placeholder={t(lang, 'reason')}
                    value={avanceMotif}
                    onChange={(e) => setAvanceMotif(e.target.value)}
                    className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t(lang, 'addAdvance')}</span>
                </button>
              </form>

              {state.avances.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">{t(lang, 'noAdvances')}</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {state.avances.map((av) => (
                    <div key={av.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          <span className="text-blue-700">
                            {av.Type_Paiement === 'Salaire'
                              ? t(lang, 'paymentTypeSalary')
                              : t(lang, 'paymentTypeAdvance')}
                          </span>
                          {av.Motif ? ` · ${av.Motif}` : ''}
                        </p>
                        <p className="font-mono text-slate-500">{formatShortDate(av.Date, lang)}</p>
                      </div>
                      <span className="font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatAmount(av.Montant, lang)} {t(lang, 'currency')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {state.revenus_mensuels.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {t(lang, 'catMonthlyIncome')} ({state.revenus_mensuels.length})
                </h3>
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {state.revenus_mensuels.map((rev) => (
                    <div key={rev.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-slate-900">
                          {rev.Mois}
                          {rev.Chauffeur ? ` · ${rev.Chauffeur}` : ''}
                        </p>
                        <p className="text-slate-500 truncate">
                          {rev.Heures_Supplementaires !== undefined && rev.Heures_Supplementaires > 0
                            ? `${t(lang, 'overtimeHours')}: ${rev.Heures_Supplementaires}${t(lang, 'hoursUnit')}`
                            : ''}
                          {rev.Heures_Supplementaires && rev.Notes ? ' · ' : ''}
                          {rev.Notes || ''}
                        </p>
                      </div>
                      <span className="font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                        {formatAmount(rev.Montant, lang)} {t(lang, 'currency')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'worklog' && (
        <AdminWorkLogTab
          lang={lang}
          travaux={state.travaux}
          bonsTravail={state.bons_travail}
          onAction={onAction}
          onOpenPdf={setPdfDoc}
        />
      )}

      {activeTab === 'fuelmaint' && (
        <AdminFuelMaintTab
          lang={lang}
          achats={state.achats_maintenance}
          onAction={onAction}
        />
      )}

      {activeTab === 'clients' && (
        <AdminClientsTab
          lang={lang}
          travaux={state.travaux}
          onOpenPdf={setPdfDoc}
        />
      )}

      {activeTab === 'fleet' && (
        <AdminFleetTab
          lang={lang}
          state={state}
          onAction={onAction}
          onOpenPdf={setPdfDoc}
          onChangeAdminPin={onChangeAdminPin}
        />
      )}

      {pdfDoc && (
        <PdfDocumentModal
          lang={lang}
          doc={pdfDoc}
          onClose={() => setPdfDoc(null)}
        />
      )}
    </main>
  );
};
