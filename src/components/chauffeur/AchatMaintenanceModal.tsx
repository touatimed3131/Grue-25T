import React, { useState } from 'react';
import { Camera, DollarSign, Fuel, Loader2, Wrench, X } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../i18n';
import { compressImageToJpeg, currentMonthIso, todayIsoDate } from '../../utils/media';

interface AchatMaintenanceModalProps {
  lang: Language;
  creePar: 'Chauffeur' | 'Admin';
  allowMonthlyIncome?: boolean;
  initialTab?: 'Mazout' | 'Piece_Main_Oeuvre' | 'Revenu_Mensuel';
  onClose: () => void;
  onSubmitPurchase: (payload: Record<string, unknown>) => Promise<void>;
  onSubmitMonthlyIncome?: (payload: Record<string, unknown>) => Promise<void>;
}

export const AchatMaintenanceModal: React.FC<AchatMaintenanceModalProps> = ({
  lang,
  creePar,
  allowMonthlyIncome = true,
  initialTab = 'Mazout',
  onClose,
  onSubmitPurchase,
  onSubmitMonthlyIncome,
}) => {
  const [activeTab, setActiveTab] = useState<'Mazout' | 'Piece_Main_Oeuvre' | 'Revenu_Mensuel'>(
    initialTab
  );

  // Fuel / Purchase state
  const [date, setDate] = useState(todayIsoDate());
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>();
  const [compressing, setCompressing] = useState(false);

  // Monthly Income state
  const [mois, setMois] = useState(currentMonthIso());
  const [overtimeHours, setOvertimeHours] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [monthlyNotes, setMonthlyNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const jpg = await compressImageToJpeg(file, 1000, 0.8);
      setPhotoBase64(jpg);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === 'Revenu_Mensuel' && onSubmitMonthlyIncome) {
        if (!monthlyAmount || Number(monthlyAmount) <= 0) return;
        await onSubmitMonthlyIncome({
          id: `rev-${Date.now()}`,
          Mois: mois,
          Montant: Number(monthlyAmount),
          Heures_Supplementaires: overtimeHours ? Number(overtimeHours) : 0,
          Description: t(lang, 'catMonthlyIncome'),
          Notes: monthlyNotes.trim(),
        });
      } else {
        if (!montant || Number(montant) <= 0) return;
        await onSubmitPurchase({
          id: `ach-${Date.now()}`,
          Date: date,
          Categorie: activeTab === 'Mazout' ? 'Mazout' : 'Piece_Main_Oeuvre',
          Description:
            activeTab === 'Mazout'
              ? t(lang, 'catMazout')
              : description.trim() || t(lang, 'typeMaintPurchase'),
          Montant: Number(montant),
          Photo_Base64: photoBase64 || '',
          Notes: notes.trim(),
          Cree_Par: creePar,
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-lg font-bold">{t(lang, 'fuelMaintTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto overscroll-contain space-y-4">
          {/* 3-option Category / Tab Selector */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-1.5">
              {t(lang, 'purchaseCategory')}
            </p>
            <div
              className={`grid gap-2 ${
                allowMonthlyIncome && onSubmitMonthlyIncome
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab('Mazout')}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'Mazout'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Fuel className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'catMazout')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Piece_Main_Oeuvre')}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'Piece_Main_Oeuvre'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'catPartLabor')}</span>
              </button>

              {allowMonthlyIncome && onSubmitMonthlyIncome && (
                <button
                  type="button"
                  onClick={() => setActiveTab('Revenu_Mensuel')}
                  className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'Revenu_Mensuel'
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>{t(lang, 'catMonthlyIncome')}</span>
                </button>
              )}
            </div>
          </div>

          {activeTab === 'Revenu_Mensuel' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'month')}
                </label>
                <input
                  type="month"
                  required
                  value={mois}
                  onChange={(e) => setMois(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'overtimeHours')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'totalAmountTaken')} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    inputMode="numeric"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'notes')}
                </label>
                <textarea
                  rows={2}
                  value={monthlyNotes}
                  onChange={(e) => setMonthlyNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[52px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{t(lang, 'saveMonthlyIncome')}</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                {t(lang, 'deductNotice')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'amountPaid')} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    inputMode="numeric"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              {/* Automatically HIDE item field when Mazout (Diesel) is selected */}
              {activeTab === 'Piece_Main_Oeuvre' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'itemOrService')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-1.5">{t(lang, 'photoReceipt')}</p>
                <label className="min-h-[48px] px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  {compressing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <span>{photoBase64 ? t(lang, 'photoCompressed') : t(lang, 'takePhoto')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoBase64 && (
                  <img
                    src={photoBase64}
                    alt={t(lang, 'photoReceipt')}
                    referrerPolicy="no-referrer"
                    className="mt-2 w-full max-h-40 object-cover rounded-xl border border-slate-200"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || compressing}
                className="w-full min-h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{t(lang, 'submitPurchase')}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
