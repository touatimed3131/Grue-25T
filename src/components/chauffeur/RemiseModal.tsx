import React, { useState } from 'react';
import { Loader2, MessageCircle, X } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../i18n';
import { formatAmount, todayIsoDate } from '../../utils/media';

interface RemiseModalProps {
  lang: Language;
  soldeChauffeur: number;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export const RemiseModal: React.FC<RemiseModalProps> = ({
  lang,
  soldeChauffeur,
  onClose,
  onSubmit,
}) => {
  const [montantRemis, setMontantRemis] = useState(
    soldeChauffeur > 0 ? String(soldeChauffeur) : ''
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountNum = Number(montantRemis || 0);
  const whatsappSummaryText = encodeURIComponent(
    `${t(lang, 'waSummaryHeader')}\n${t(lang, 'date')}: ${todayIsoDate()}\n${t(lang, 'waAmountHanded')}: ${formatAmount(amountNum, lang)} ${t(lang, 'currency')}\n${t(lang, 'waRemainingBalance')}: ${formatAmount(Math.max(0, soldeChauffeur - amountNum), lang)} ${t(lang, 'currency')}${notes ? `\n${t(lang, 'notes')}: ${notes}` : ''}`
  );
  const whatsappSummaryUrl = `https://wa.me/213662678784?text=${whatsappSummaryText}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        id: `rem-${Date.now()}`,
        Date: todayIsoDate(),
        Montant_Remis: amountNum,
        Notes: notes.trim(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-blue-700 text-white flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t(lang, 'btnHandoverCash')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">{t(lang, 'cashHeld')}</span>
            <span className="text-lg font-extrabold font-mono text-slate-900">
              {formatAmount(soldeChauffeur, lang)} {t(lang, 'currency')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t(lang, 'amountHandedOver')} *
            </label>
            <input
              type="number"
              required
              min="1"
              inputMode="numeric"
              value={montantRemis}
              onChange={(e) => setMontantRemis(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl border border-slate-300 text-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t(lang, 'notes')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <a
            href={whatsappSummaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors text-center"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>{t(lang, 'sendWhatsAppSummary')}</span>
          </a>

          <button
            type="submit"
            disabled={submitting || amountNum <= 0}
            className="w-full min-h-[54px] rounded-2xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{t(lang, 'submitHandover')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
