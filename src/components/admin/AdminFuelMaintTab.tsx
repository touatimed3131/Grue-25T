import React, { useMemo, useState } from 'react';
import { Fuel, Image as ImageIcon, Plus, Wrench } from 'lucide-react';
import { AchatMaintenanceCategory, AchatMaintenanceItem, Language } from '../../types';
import { t } from '../../i18n';
import { formatAmount, formatShortDate } from '../../utils/media';
import { AchatMaintenanceModal } from '../chauffeur/AchatMaintenanceModal';

interface AdminFuelMaintTabProps {
  lang: Language;
  achats: AchatMaintenanceItem[];
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

export const AdminFuelMaintTab: React.FC<AdminFuelMaintTabProps> = ({
  lang,
  achats,
  onAction,
}) => {
  const [filterCat, setFilterCat] = useState<'all' | AchatMaintenanceCategory>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filterCat === 'all') return achats;
    return achats.filter((a) => a.Categorie === filterCat);
  }, [achats, filterCat]);

  const totalFuel = useMemo(
    () =>
      achats
        .filter((a) => a.Categorie === 'Mazout')
        .reduce((s, a) => s + Number(a.Montant || 0), 0),
    [achats]
  );

  const totalPartsLabor = useMemo(
    () =>
      achats
        .filter((a) => a.Categorie === 'Piece_Main_Oeuvre')
        .reduce((s, a) => s + Number(a.Montant || 0), 0),
    [achats]
  );

  return (
    <div className="space-y-4">
      {/* Summary & Action Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{t(lang, 'catMazout')}</p>
            <p className="text-lg font-extrabold font-mono text-amber-700 mt-0.5">
              {formatAmount(totalFuel, lang)} {t(lang, 'currency')}
            </p>
          </div>
          <Fuel className="w-6 h-6 text-amber-600" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{t(lang, 'typeMaintPurchase')}</p>
            <p className="text-lg font-extrabold font-mono text-red-700 mt-0.5">
              {formatAmount(totalPartsLabor, lang)} {t(lang, 'currency')}
            </p>
          </div>
          <Wrench className="w-6 h-6 text-red-600" />
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="min-h-[68px] p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{t(lang, 'submitPurchase')}</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-fit">
        {(
          [
            { id: 'all', label: `${t(lang, 'fuelMaintTitle')} (${achats.length})` },
            { id: 'Mazout', label: t(lang, 'typeFuel') },
            { id: 'Piece_Main_Oeuvre', label: t(lang, 'typeMaintPurchase') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterCat(tab.id)}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterCat === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Full Permanent History Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">{t(lang, 'noFuelMaint')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-bold text-start">{t(lang, 'colDate')}</th>
                  <th className="py-3 px-4 font-bold text-start">{t(lang, 'purchaseCategory')}</th>
                  <th className="py-3 px-4 font-bold text-start">{t(lang, 'itemOrService')}</th>
                  <th className="py-3 px-4 font-bold text-start">{t(lang, 'notes')}</th>
                  <th className="py-3 px-4 font-bold text-start">{t(lang, 'photoReceipt')}</th>
                  <th className="py-3 px-4 font-bold text-end">{t(lang, 'colAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatShortDate(item.Date, lang)}
                    </td>
                    <td className="py-3 px-4 font-bold text-xs whitespace-nowrap">
                      <span
                        className={
                          item.Categorie === 'Mazout' ? 'text-amber-700' : 'text-red-700'
                        }
                      >
                        {item.Categorie === 'Mazout'
                          ? t(lang, 'typeFuel')
                          : t(lang, 'typeMaintPurchase')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.Description}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{item.Notes || '—'}</td>
                    <td className="py-3 px-4">
                      {item.Photo_Base64 ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(item.Photo_Base64 || null)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>{t(lang, 'photoReceipt')}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-red-700 text-end whitespace-nowrap">
                      {formatAmount(item.Montant, lang)} {t(lang, 'currency')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAddModal && (
        <AchatMaintenanceModal
          lang={lang}
          creePar="Admin"
          allowMonthlyIncome={false}
          onClose={() => setShowAddModal(false)}
          onSubmitPurchase={(payload) => onAction('add_achat_maintenance', payload)}
        />
      )}

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
        >
          <img
            src={previewPhoto}
            alt={t(lang, 'photoReceipt')}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
