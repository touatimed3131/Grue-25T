import React, { useMemo, useState } from 'react';
import { Award, FileText, Phone } from 'lucide-react';
import { Language, TravailItem } from '../../types';
import { t } from '../../i18n';
import { formatAmount, formatShortDate, todayIsoDate } from '../../utils/media';
import { getSavedStampPng } from '../../services/api';
import { PdfPayload } from './PdfDocumentModal';

interface AdminClientsTabProps {
  lang: Language;
  travaux: TravailItem[];
  onOpenPdf: (doc: PdfPayload) => void;
}

export const AdminClientsTab: React.FC<AdminClientsTabProps> = ({
  lang,
  travaux,
  onOpenPdf,
}) => {
  const [client, setClient] = useState('');
  const [tel, setTel] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [amountHt, setAmountHt] = useState('');
  const [includeTva, setIncludeTva] = useState(true);

  const unpaidDebts = useMemo(() => {
    return travaux
      .map((tr) => ({
        ...tr,
        reste: Math.max(0, Number(tr.Prix_Total || 0) - Number(tr.Montant_Encaisse || 0)),
      }))
      .filter((tr) => tr.reste > 0);
  }, [travaux]);

  const topClients = useMemo(() => {
    const map = new Map<
      string,
      { name: string; tel: string; totalRevenue: number; totalHours: number; jobs: number }
    >();

    for (const tr of travaux) {
      const key = (tr.Client || 'Client').trim();
      const existing = map.get(key) || {
        name: key,
        tel: tr.Tel_Client || '',
        totalRevenue: 0,
        totalHours: 0,
        jobs: 0,
      };
      existing.totalRevenue += Number(tr.Prix_Total || 0);
      existing.totalHours += Number(tr.Duree || 0);
      existing.jobs += 1;
      if (!existing.tel && tr.Tel_Client) existing.tel = tr.Tel_Client;
      map.set(key, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8);
  }, [travaux]);

  const handleGenerateDevis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim()) return;
    onOpenPdf({
      kind: 'devis',
      client: client.trim(),
      tel: tel.trim(),
      location: location.trim(),
      description: description.trim() || t(lang, 'quoteDefaultService'),
      hours: Number(hours || 0),
      amountHt: Number(amountHt || 0),
      includeTva,
      date: todayIsoDate(),
      stampPng: getSavedStampPng(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-7 space-y-5">
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'unpaidDebts')}</h3>
            <span className="font-mono text-xs font-bold text-red-700">{unpaidDebts.length}</span>
          </div>

          {unpaidDebts.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">{t(lang, 'noUnpaidDebts')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {unpaidDebts.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.Client}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{formatShortDate(item.Date, lang)}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono text-red-700 font-bold">
                        {formatAmount(item.reste, lang)} {t(lang, 'currency')}
                      </span>
                    </p>
                  </div>

                  {item.Tel_Client && (
                    <a
                      href={`tel:${item.Tel_Client}`}
                      className="min-h-[42px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{t(lang, 'callNow')}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'topClients')}</h3>
          </div>

          {topClients.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">{t(lang, 'noClientData')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topClients.map((cl, idx) => (
                <div key={cl.name} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{cl.name}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {cl.jobs} · {cl.totalHours}{t(lang, 'hoursUnit')}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-sm text-slate-900 whitespace-nowrap">
                    {formatAmount(cl.totalRevenue, lang)} {t(lang, 'currency')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="lg:col-span-5">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-900" />
            <h3 className="text-sm font-extrabold text-slate-900">{t(lang, 'quickQuote')}</h3>
          </div>

          <form onSubmit={handleGenerateDevis} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'clientName')} *
              </label>
              <input
                type="text"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'clientPhone')}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'siteLocation')}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'quoteServices')}
              </label>
              <input
                type="text"
                required
                placeholder={t(lang, 'quoteDefaultService')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'durationHours')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'quoteAmount')}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={amountHt}
                  onChange={(e) => setAmountHt(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={includeTva}
                onChange={(e) => setIncludeTva(e.target.checked)}
                className="w-4 h-4 rounded accent-slate-900"
              />
              <span>{t(lang, 'includeTva')}</span>
            </label>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
            >
              {t(lang, 'generateQuotePdf')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
