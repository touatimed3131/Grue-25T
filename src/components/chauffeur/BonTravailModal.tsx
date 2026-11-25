import React, { useState } from 'react';
import { CheckCircle2, Clock, FileCheck2, Loader2, X } from 'lucide-react';
import { BonTravailRequestItem, Language } from '../../types';
import { t } from '../../i18n';
import { formatShortDate, todayIsoDate } from '../../utils/media';

interface BonTravailModalProps {
  lang: Language;
  bonsTravail: BonTravailRequestItem[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export const BonTravailModal: React.FC<BonTravailModalProps> = ({
  lang,
  bonsTravail,
  onClose,
  onSubmit,
}) => {
  const [date, setDate] = useState(todayIsoDate());
  const [client, setClient] = useState('');
  const [lieu, setLieu] = useState('');
  const [heuresTravail, setHeuresTravail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim() || !heuresTravail.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        id: `bon-${Date.now()}`,
        Date: date,
        Client: client.trim(),
        Lieu: lieu.trim(),
        Heures_Travail: heuresTravail.trim(),
      });
      setClient('');
      setLieu('');
      setHeuresTravail('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCheck2 className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg font-bold truncate">{t(lang, 'bonTravailModalTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto overscroll-contain space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'clientName')} *
              </label>
              <input
                type="text"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'siteLocation')}
                </label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'date')} *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'workDoneHours')} *
              </label>
              <textarea
                rows={2}
                required
                placeholder={t(lang, 'workDonePlaceholder')}
                value={heuresTravail}
                onChange={(e) => setHeuresTravail(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[52px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{t(lang, 'submitBonTravail')}</span>
            </button>
          </form>

          {bonsTravail.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500">
                {t(lang, 'bonTravailModalTitle')} ({bonsTravail.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {bonsTravail.slice(0, 8).map((bon) => {
                  const isValidated = bon.Statut === 'Validé';
                  return (
                    <div key={bon.id} className="p-3.5 bg-white flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{bon.Client}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <span className="font-mono">{formatShortDate(bon.Date, lang)}</span>
                          {bon.Lieu && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{bon.Lieu}</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-slate-800 mt-1">{bon.Heures_Travail}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0 ${
                          isValidated ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isValidated ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isValidated ? t(lang, 'bonValidatedStatus') : t(lang, 'bonPendingStatus')}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
