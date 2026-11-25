import React, { useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  Ban,
  BookOpen,
  CalendarPlus,
  Camera,
  Check,
  Edit2,
  Eye,
  EyeOff,
  FileBarChart2,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  AppStateData,
  CraneSpecItem,
  DepannageContact,
  Language,
  LiftingAccessoryItem,
  MaintenanceDocItem,
  ReservationItem,
  StandardAccessoryCode,
} from '../../types';
import { getAccessoryLabel, STANDARD_ACCESSORIES, t } from '../../i18n';
import {
  compressImageToJpeg,
  currentMonthIso,
  formatAmount,
  formatExactTimestamp,
  formatShortDate,
  todayIsoDate,
} from '../../utils/media';
import { getSavedStampPng, isReservationCancelled } from '../../services/api';
import { PdfPayload } from './PdfDocumentModal';

interface AdminFleetTabProps {
  lang: Language;
  state: AppStateData;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
  onOpenPdf: (doc: PdfPayload) => void;
  onChangeAdminPin: (pin: string) => void;
}

export const AdminFleetTab: React.FC<AdminFleetTabProps> = ({
  lang,
  state,
  onAction,
  onOpenPdf,
  onChangeAdminPin,
}) => {
  // Repair Workshops & Contacts state
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactNom, setContactNom] = useState('');
  const [contactSpec, setContactSpec] = useState('');
  const [contactTel, setContactTel] = useState('');

  // Crane Technical Specs state
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [specLabel, setSpecLabel] = useState('');
  const [specValue, setSpecValue] = useState('');

  // Lifting Accessories state
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [accCode, setAccCode] = useState<StandardAccessoryCode>('elingue_chaine');
  const [accCustomName, setAccCustomName] = useState('');
  const [accDetails, setAccDetails] = useState('');

  // Maintenance / Document form
  const [maintNom, setMaintNom] = useState('');
  const [maintCat, setMaintCat] = useState<'Maintenance' | 'Document'>('Maintenance');
  const [maintType, setMaintType] = useState<'Vidange' | 'Graissage' | 'Document'>('Vidange');
  const [maintDate, setMaintDate] = useState(todayIsoDate());
  const [maintHours, setMaintHours] = useState('');

  // Parts & Repairs form
  const [partName, setPartName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [partCost, setPartCost] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [partPhoto, setPartPhoto] = useState<string | undefined>();
  const [submittingPart, setSubmittingPart] = useState(false);

  // Admin Booking form
  const [bkDate, setBkDate] = useState(todayIsoDate());
  const [bkHeure, setBkHeure] = useState('08:00');
  const [bkClient, setBkClient] = useState('');
  const [bkTel, setBkTel] = useState('');
  const [bkLieu, setBkLieu] = useState('');
  const [deletingResId, setDeletingResId] = useState<string | null>(null);

  // Monthly Report selector
  const [reportMonth, setReportMonth] = useState(currentMonthIso());

  // Admin PIN Settings form
  const [newAdminPin, setNewAdminPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pinSavedNotice, setPinSavedNotice] = useState(false);

  const handleSaveNewAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newAdminPin.trim();
    if (!/^\d{4}$/.test(cleaned)) {
      setPinError(true);
      setPinSavedNotice(false);
      return;
    }
    onChangeAdminPin(cleaned);
    setNewAdminPin('');
    setPinError(false);
    setPinSavedNotice(true);
    window.setTimeout(() => setPinSavedNotice(false), 3500);
  };

  // Contacts handlers
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactNom.trim() || !contactTel.trim()) return;
    const contact: DepannageContact = {
      id: editingContactId || `cnt-${Date.now()}`,
      nom: contactNom.trim(),
      specialite: contactSpec.trim(),
      telephone: contactTel.trim(),
    };
    await onAction('save_contact', { contact });
    setEditingContactId(null);
    setContactNom('');
    setContactSpec('');
    setContactTel('');
  };

  const handleEditContact = (c: DepannageContact) => {
    setEditingContactId(c.id);
    setContactNom(c.nom);
    setContactSpec(c.specialite);
    setContactTel(c.telephone);
  };

  // Specs handlers
  const handleSaveSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specLabel.trim() || !specValue.trim()) return;
    const spec: CraneSpecItem = {
      id: editingSpecId || `spec-${Date.now()}`,
      label: specLabel.trim(),
      value: specValue.trim(),
    };
    await onAction('save_spec', { spec });
    setEditingSpecId(null);
    setSpecLabel('');
    setSpecValue('');
  };

  const handleEditSpec = (s: CraneSpecItem) => {
    setEditingSpecId(s.id);
    setSpecLabel(s.label);
    setSpecValue(s.value);
  };

  // Accessories handlers
  const handleSaveAccessory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accCode === 'custom' && !accCustomName.trim()) return;
    const accessory: LiftingAccessoryItem = {
      id: editingAccId || `acc-${Date.now()}`,
      code: accCode,
      customName: accCode === 'custom' ? accCustomName.trim() : undefined,
      details: accDetails.trim() || undefined,
    };
    await onAction('save_accessory', { accessory });
    setEditingAccId(null);
    setAccCode('elingue_chaine');
    setAccCustomName('');
    setAccDetails('');
  };

  const handleEditAccessory = (a: LiftingAccessoryItem) => {
    setEditingAccId(a.id);
    setAccCode(a.code);
    setAccCustomName(a.customName || '');
    setAccDetails(a.details || '');
  };

  // Maintenance handlers
  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintNom.trim()) return;
    const item: MaintenanceDocItem = {
      id: `maint-${Date.now()}`,
      Nom: maintNom.trim(),
      Categorie: maintCat,
      Type_Alerte: maintCat === 'Document' ? 'Document' : maintType,
      Date_Echeance: maintDate,
      Heures_Restantes: maintHours ? Number(maintHours) : undefined,
    };
    await onAction('update_maintenance', { item });
    setMaintNom('');
    setMaintHours('');
  };

  const handleUpdateMaintDate = async (item: MaintenanceDocItem, newDate: string) => {
    await onAction('update_maintenance', {
      item: { ...item, Date_Echeance: newDate },
    });
  };

  const handlePartPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const jpg = await compressImageToJpeg(file, 1000, 0.8);
    setPartPhoto(jpg);
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) return;
    setSubmittingPart(true);
    try {
      await onAction('add_piece', {
        id: `pc-${Date.now()}`,
        Date: todayIsoDate(),
        Nom_Piece: partName.trim(),
        Fournisseur: supplier.trim(),
        Cout: Number(partCost || 0),
        Notes: partNotes.trim(),
        Photo_Base64: partPhoto || '',
      });
      setPartName('');
      setSupplier('');
      setPartCost('');
      setPartNotes('');
      setPartPhoto(undefined);
    } finally {
      setSubmittingPart(false);
    }
  };

  const handleAdminBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkClient.trim()) return;
    await onAction('add_reservation', {
      id: `res-${Date.now()}`,
      Date: bkDate,
      Heure: bkHeure,
      Client: bkClient.trim(),
      Tel_Client: bkTel.trim(),
      Lieu: bkLieu.trim(),
      Cree_Par: 'Admin',
      Statut: 'Actif',
      Created_At: new Date().toISOString(),
    });
    setBkClient('');
    setBkTel('');
    setBkLieu('');
  };

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

  const handleOpenMonthlyReport = () => {
    const monthJobs = state.travaux.filter((tr) => (tr.Date || '').startsWith(reportMonth));
    const monthAchats = state.achats_maintenance.filter((a) =>
      (a.Date || '').startsWith(reportMonth)
    );
    const monthParts = state.pieces.filter((p) => (p.Date || '').startsWith(reportMonth));
    const monthAvances = state.avances.filter((a) => (a.Date || '').startsWith(reportMonth));
    const monthManual = state.revenus_mensuels.filter((r) => r.Mois === reportMonth);

    const income =
      monthJobs.reduce((s, tr) => s + Number(tr.Montant_Encaisse || 0), 0) +
      monthManual.reduce((s, r) => s + Number(r.Montant || 0), 0);
    const expenses =
      monthJobs.reduce((s, tr) => s + Number(tr.Depenses || 0), 0) +
      monthAchats.reduce((s, a) => s + Number(a.Montant || 0), 0);
    const primes = monthJobs.reduce((s, tr) => s + Number(tr.Prime_Chauffeur || 0), 0);
    const avances = monthAvances.reduce((s, a) => s + Number(a.Montant || 0), 0);
    const partsCost = monthParts.reduce((s, p) => s + Number(p.Cout || 0), 0);
    const totalKm = monthJobs.reduce((s, tr) => s + Number(tr.Distance_Km || 0), 0);
    const totalHours = monthJobs.reduce((s, tr) => s + Number(tr.Duree || 0), 0);
    const netProfit = income - expenses - primes - partsCost;

    onOpenPdf({
      kind: 'monthly',
      month: reportMonth,
      income,
      expenses,
      primes,
      avances,
      partsCost,
      totalKm,
      totalHours,
      jobsCount: monthJobs.length,
      netProfit,
      stampPng: getSavedStampPng(),
    });
  };

  const galleryPhotos = [
    ...state.travaux
      .filter((tr) => tr.Photo_Base64)
      .map((tr) => ({ id: tr.id, title: tr.Client, date: tr.Date, src: tr.Photo_Base64! })),
    ...state.achats_maintenance
      .filter((a) => a.Photo_Base64)
      .map((a) => ({ id: a.id, title: a.Description, date: a.Date, src: a.Photo_Base64! })),
    ...state.pannes
      .filter((p) => p.Photo_Base64)
      .map((p) => ({ id: p.id, title: p.Type_Panne || t(lang, 'btnBreakdown'), date: p.Date, src: p.Photo_Base64! })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Row: Monthly PDF Report + Latest GPS + Admin Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4" />
              <span>{t(lang, 'monthlyReportTitle')}</span>
            </h3>
            {state.Last_GPS_Link && (
              <a
                href={state.Last_GPS_Link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t(lang, 'craneGpsLabel')}</span>
              </a>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono"
            />
            <button
              type="button"
              onClick={handleOpenMonthlyReport}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap"
            >
              {t(lang, 'generateMonthlyReport')}
            </button>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4" />
            <span>{t(lang, 'addAdminBooking')}</span>
          </h3>
          <form onSubmit={handleAdminBooking} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input
              type="date"
              required
              value={bkDate}
              onChange={(e) => setBkDate(e.target.value)}
              className="min-h-[42px] px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <input
              type="time"
              value={bkHeure}
              onChange={(e) => setBkHeure(e.target.value)}
              className="min-h-[42px] px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <input
              type="text"
              required
              placeholder={t(lang, 'clientName')}
              value={bkClient}
              onChange={(e) => setBkClient(e.target.value)}
              className="min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs"
            />
            <input
              type="text"
              placeholder={t(lang, 'siteLocation')}
              value={bkLieu}
              onChange={(e) => setBkLieu(e.target.value)}
              className="min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs"
            />
            <button
              type="submit"
              className="col-span-2 sm:col-span-1 min-h-[42px] px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs"
            >
              {t(lang, 'save')}
            </button>
          </form>

          {/* Complete Permanent Audit Trail of Active & Cancelled Reservations */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700">
              {t(lang, 'reservationsAuditTitle')} ({state.reservations.length})
            </h4>
            {state.reservations.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">{t(lang, 'noBookings')}</p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                {state.reservations.map((bk) => {
                  const cancelled = isReservationCancelled(bk);
                  return (
                    <div
                      key={bk.id}
                      className={`p-3 flex flex-wrap items-start justify-between gap-2 ${
                        cancelled ? 'bg-red-50' : 'bg-white'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span
                            className={`text-xs font-extrabold ${
                              cancelled ? 'text-red-950' : 'text-slate-900'
                            }`}
                          >
                            {bk.Client}
                          </span>
                          <span
                            className={`text-[11px] font-mono font-semibold ${
                              cancelled ? 'text-red-800' : 'text-slate-600'
                            }`}
                          >
                            {formatShortDate(bk.Date, lang)} {bk.Heure}
                          </span>
                          {bk.Lieu && (
                            <span
                              className={`text-[11px] ${
                                cancelled ? 'text-red-800' : 'text-slate-600'
                              }`}
                            >
                              · {bk.Lieu}
                            </span>
                          )}
                        </div>
                        {cancelled ? (
                          <p className="text-[11px] font-extrabold text-red-700 flex items-center gap-1">
                            <Ban className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {t(lang, 'cancelledByDriver')}
                              {bk.Chauffeur ? ` (${bk.Chauffeur})` : ''}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-emerald-700">
                            {t(lang, 'activeStatus')} · {bk.Chauffeur || bk.Cree_Par}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                        <div
                          className={`text-[10px] font-mono sm:text-end space-y-0.5 ${
                            cancelled ? 'text-red-900' : 'text-slate-500'
                          }`}
                        >
                          <p>
                            {t(lang, 'createdAtLabel')}: {formatExactTimestamp(bk.Created_At || bk.Date, lang)}
                          </p>
                          {cancelled && (
                            <p className="font-bold">
                              {t(lang, 'cancelledAtLabel')}: {formatExactTimestamp(bk.Cancelled_At, lang)}
                            </p>
                          )}
                        </div>
                        {cancelled && (
                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteReservation(bk)}
                            disabled={deletingResId === bk.id}
                            className="min-h-[34px] px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-60"
                          >
                            {deletingResId === bk.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>{t(lang, 'deletePermanently')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Admin Settings: Change 4-Digit Admin PIN */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t(lang, 'changeAdminPinTitle')}</span>
        </h3>
        <form onSubmit={handleSaveNewAdminPin} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t(lang, 'newAdminPinLabel')}
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                dir="ltr"
                value={newAdminPin}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewAdminPin(digitsOnly);
                  setPinError(false);
                }}
                placeholder={t(lang, 'newAdminPinPlaceholder')}
                className="w-full min-h-[44px] ps-3.5 pe-11 rounded-xl border border-slate-300 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowNewPin((prev) => !prev)}
                aria-label="Toggle PIN visibility"
                className="absolute end-1.5 min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap"
          >
            {t(lang, 'save')}
          </button>
        </form>
        {pinError && (
          <p className="text-xs font-bold text-red-600">{t(lang, 'adminPinInvalidError')}</p>
        )}
        {pinSavedNotice && (
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{t(lang, 'adminPinSaved')}</span>
          </p>
        )}
      </section>

      {/* Custom Admin Lists: Contacts, Crane Specs, Lifting Accessories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* a) Repair Workshops & Contacts */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{t(lang, 'manageContactsTitle')}</span>
          </h3>

          <form onSubmit={handleSaveContact} className="space-y-2 border-b border-slate-200 pb-4">
            <input
              type="text"
              required
              placeholder={t(lang, 'contactName')}
              value={contactNom}
              onChange={(e) => setContactNom(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
            />
            <input
              type="text"
              placeholder={t(lang, 'contactSpecialty')}
              value={contactSpec}
              onChange={(e) => setContactSpec(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
            />
            <div className="flex gap-2">
              <input
                type="tel"
                required
                dir="ltr"
                placeholder={t(lang, 'contactPhone')}
                value={contactTel}
                onChange={(e) => setContactTel(e.target.value)}
                className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap"
              >
                {editingContactId ? t(lang, 'save') : t(lang, 'add')}
              </button>
            </div>
          </form>

          {state.contacts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">{t(lang, 'noContactsDefined')}</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {state.contacts.map((c) => (
                <div key={c.id} className="py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{c.nom}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.specialite}</p>
                      <p className="text-[11px] font-mono text-slate-700" dir="ltr">
                        {c.telephone}
                      </p>
                      {c.approvalStatus === 'pending' && (
                        <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                          {t(lang, 'pendingApproval')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditContact(c)}
                        className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('delete_contact', { id: c.id })}
                        className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {c.approvalStatus === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAction('approve_contact', { id: c.id })}
                        className="flex-1 min-h-[36px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t(lang, 'accept')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('reject_contact', { id: c.id })}
                        className="flex-1 min-h-[36px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t(lang, 'reject')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* b) Crane Technical Specs */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{t(lang, 'manageSpecsTitle')}</span>
          </h3>

          <form onSubmit={handleSaveSpec} className="space-y-2 border-b border-slate-200 pb-4">
            <input
              type="text"
              required
              placeholder={t(lang, 'specLabel')}
              value={specLabel}
              onChange={(e) => setSpecLabel(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder={t(lang, 'specValue')}
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap"
              >
                {editingSpecId ? t(lang, 'save') : t(lang, 'add')}
              </button>
            </div>
          </form>

          {state.specs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">{t(lang, 'noSpecsDefined')}</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {state.specs.map((s) => (
                <div key={s.id} className="py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{s.label}</p>
                      <p className="text-[11px] font-mono text-slate-600 truncate">{s.value}</p>
                      {s.approvalStatus === 'pending' && (
                        <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                          {t(lang, 'pendingApproval')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditSpec(s)}
                        className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('delete_spec', { id: s.id })}
                        className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {s.approvalStatus === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAction('approve_spec', { id: s.id })}
                        className="flex-1 min-h-[36px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t(lang, 'accept')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('reject_spec', { id: s.id })}
                        className="flex-1 min-h-[36px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t(lang, 'reject')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* c) Lifting Accessories (Quick-select standard gear + custom input) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Anchor className="w-4 h-4" />
            <span>{t(lang, 'manageAccessoriesTitle')}</span>
          </h3>

          <form onSubmit={handleSaveAccessory} className="space-y-2 border-b border-slate-200 pb-4">
            <select
              value={accCode}
              onChange={(e) => setAccCode(e.target.value as StandardAccessoryCode)}
              aria-label={t(lang, 'standardGearSelect')}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
            >
              {STANDARD_ACCESSORIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.labels[lang]}
                </option>
              ))}
              <option value="custom">{t(lang, 'customGearOption')}</option>
            </select>

            {accCode === 'custom' && (
              <input
                type="text"
                required
                placeholder={t(lang, 'customGearPlaceholder')}
                value={accCustomName}
                onChange={(e) => setAccCustomName(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
              />
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t(lang, 'gearDetailsPlaceholder')}
                value={accDetails}
                onChange={(e) => setAccDetails(e.target.value)}
                className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap"
              >
                {editingAccId ? t(lang, 'save') : t(lang, 'add')}
              </button>
            </div>
          </form>

          {state.accessories.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">{t(lang, 'noGearDefined')}</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {state.accessories.map((acc) => (
                <div key={acc.id} className="py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {getAccessoryLabel(acc.code, lang, acc.customName)}
                      </p>
                      {acc.details && (
                        <p className="text-[11px] font-mono text-slate-600 truncate">
                          {acc.details}
                        </p>
                      )}
                      {acc.approvalStatus === 'pending' && (
                        <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                          {t(lang, 'pendingApproval')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditAccessory(acc)}
                        className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('delete_accessory', { id: acc.id })}
                        className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {acc.approvalStatus === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAction('approve_accessory', { id: acc.id })}
                        className="flex-1 min-h-[36px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t(lang, 'accept')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('reject_accessory', { id: acc.id })}
                        className="flex-1 min-h-[36px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t(lang, 'reject')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Maintenance & Documents Expiration + Parts & Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            <span>{t(lang, 'maintenanceDocs')}</span>
          </h3>

          {state.maintenance.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">{t(lang, 'noMaintItems')}</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {state.maintenance.map((m) => (
                <div key={m.id} className="p-3 flex flex-wrap items-center justify-between gap-2 bg-white">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{m.Nom}</p>
                    <p className="text-[11px] text-slate-500">
                      {m.Categorie === 'Document' ? t(lang, 'catDocument') : t(lang, 'catMaintenance')}
                      {m.Heures_Restantes !== undefined && ` · ${m.Heures_Restantes}${t(lang, 'hoursUnit')}`}
                    </p>
                  </div>
                  <input
                    type="date"
                    value={m.Date_Echeance}
                    onChange={(e) => handleUpdateMaintDate(m, e.target.value)}
                    className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddMaintenance} className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              required
              placeholder={t(lang, 'maintItemPlaceholder')}
              value={maintNom}
              onChange={(e) => setMaintNom(e.target.value)}
              className="col-span-2 min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
            />
            <select
              value={maintCat}
              onChange={(e) => setMaintCat(e.target.value as 'Maintenance' | 'Document')}
              className="min-h-[40px] px-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="Maintenance">{t(lang, 'catMaintenance')}</option>
              <option value="Document">{t(lang, 'catDocument')}</option>
            </select>
            <input
              type="date"
              value={maintDate}
              onChange={(e) => setMaintDate(e.target.value)}
              className="min-h-[40px] px-2 rounded-xl border border-slate-300 text-xs font-mono"
            />
            {maintCat === 'Maintenance' && (
              <>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value as 'Vidange' | 'Graissage')}
                  className="min-h-[40px] px-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="Vidange">{t(lang, 'typeOilChange')}</option>
                  <option value="Graissage">{t(lang, 'typeGreasing')}</option>
                </select>
                <input
                  type="number"
                  placeholder={t(lang, 'maintHoursPlaceholder')}
                  value={maintHours}
                  onChange={(e) => setMaintHours(e.target.value)}
                  className="min-h-[40px] px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </>
            )}
            <button
              type="submit"
              className="col-span-2 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t(lang, 'addMaintenanceItem')}</span>
            </button>
          </form>
        </section>

        {/* Parts & Repairs Archive */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'partsRepairs')}</h3>

          <form onSubmit={handleAddPart} className="space-y-2.5 border-b border-slate-200 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder={t(lang, 'partName')}
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                placeholder={t(lang, 'supplier')}
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="number"
                min="0"
                required
                placeholder={t(lang, 'cost')}
                value={partCost}
                onChange={(e) => setPartCost(e.target.value)}
                className="min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="min-h-[40px] px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                <Camera className="w-4 h-4" />
                <span>{partPhoto ? t(lang, 'photoCompressed') : t(lang, 'invoicePhoto')}</span>
                <input type="file" accept="image/*" onChange={handlePartPhoto} className="hidden" />
              </label>

              <button
                type="submit"
                disabled={submittingPart}
                className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {submittingPart && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t(lang, 'addPart')}</span>
              </button>
            </div>
          </form>

          {state.pieces.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">{t(lang, 'noPartsRecorded')}</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {state.pieces.map((pc) => (
                <div key={pc.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {pc.Photo_Base64 && (
                      <img
                        src={pc.Photo_Base64}
                        alt={pc.Nom_Piece}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{pc.Nom_Piece}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {formatShortDate(pc.Date, lang)}
                        {pc.Fournisseur && ` · ${pc.Fournisseur}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs text-red-700 whitespace-nowrap">
                    {formatAmount(pc.Cout, lang)} {t(lang, 'currency')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Reported Breakdowns & Checklists */}
      {state.pannes.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{t(lang, 'btnBreakdown')} ({state.pannes.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.pannes.map((pan) => (
              <div key={pan.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-600">
                    {formatShortDate(pan.Date, lang)}
                    {pan.Chauffeur ? ` · ${pan.Chauffeur}` : ''}
                  </span>
                  <span
                    className={`font-bold ${
                      pan.Has_Panne ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {pan.Has_Panne ? `${pan.Type_Panne} (${pan.Gravite})` : t(lang, 'checklistOk')}
                  </span>
                </div>
                {pan.Checklist_Details && pan.Checklist_Details.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {pan.Checklist_Details.map((chk) => (
                      <div
                        key={chk.id}
                        className={`flex items-center gap-1 truncate font-medium ${
                          chk.ok ? 'text-emerald-800' : 'text-red-700 font-bold'
                        }`}
                      >
                        <span>{chk.ok ? '✓' : '✗'}</span>
                        <span className="truncate">{chk.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pan.Description && <p className="text-xs text-slate-800">{pan.Description}</p>}
                {pan.Audio_Base64 && <audio controls src={pan.Audio_Base64} className="w-full h-9" />}
                {pan.Photo_Base64 && (
                  <img
                    src={pan.Photo_Base64}
                    alt={t(lang, 'btnBreakdown')}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-40 object-cover rounded-lg border border-slate-200"
                  />
                )}
                {pan.Video_Base64 && (
                  <video
                    src={pan.Video_Base64}
                    controls
                    className="w-full max-h-44 rounded-lg bg-black"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio Gallery of Work Photos */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'portfolioGallery')}</h3>
        {galleryPhotos.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t(lang, 'noGalleryPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {galleryPhotos.map((ph) => (
              <div key={ph.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={ph.src}
                  alt={ph.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover"
                />
                <div className="p-2 text-xs">
                  <p className="font-bold text-slate-900 truncate">{ph.title}</p>
                  <p className="text-[11px] font-mono text-slate-500">
                    {formatShortDate(ph.date, lang)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
