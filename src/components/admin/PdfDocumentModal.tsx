import React, { useRef, useState } from 'react';
import { Download, Loader2, Printer, Share2, X } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../i18n';
import { exportElementToPdf, shareElementPdf } from '../../utils/pdf';
import { formatAmount, formatShortDate } from '../../utils/media';

export type PdfPayload =
  | {
      kind: 'bon';
      travail: {
        id: string;
        Date: string;
        Client: string;
        Tel_Client?: string;
        Lieu?: string;
        Duree: number;
        Heures_Travail?: string;
        Type_Tarif: string;
        Mode_Tarif?: string;
        Quantite_Tache?: number;
        Description_Tache?: string;
        Prix_Total: number;
        Montant_Encaisse: number;
        Notes: string;
        Distance_Km?: number;
        GPS_Link?: string;
      };
      stampPng?: string | null;
    }
  | {
      kind: 'devis';
      client: string;
      tel: string;
      location: string;
      description: string;
      hours: number;
      amountHt: number;
      includeTva: boolean;
      date: string;
      stampPng?: string | null;
    }
  | {
      kind: 'monthly';
      month: string;
      income: number;
      expenses: number;
      primes: number;
      avances: number;
      partsCost: number;
      totalKm: number;
      totalHours: number;
      jobsCount: number;
      netProfit: number;
      stampPng?: string | null;
    };

interface PdfDocumentModalProps {
  lang: Language;
  doc: PdfPayload;
  onClose: () => void;
}

export const PdfDocumentModal: React.FC<PdfDocumentModalProps> = ({ lang, doc, onClose }) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const isRtl = lang === 'ar';

  const getFilename = () =>
    doc.kind === 'bon'
      ? `Bon_Travail_${doc.travail.Client.replace(/\s+/g, '_')}_${doc.travail.Date}.pdf`
      : doc.kind === 'devis'
        ? `Devis_Grue25T_${doc.client.replace(/\s+/g, '_')}_${doc.date}.pdf`
        : `Rapport_Mensuel_Grue25T_${doc.month}.pdf`;

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      await exportElementToPdf(sheetRef.current, getFilename());
    } finally {
      setDownloading(false);
    }
  };

  const handleSharePdf = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const title =
        doc.kind === 'bon'
          ? labels.bonTitle
          : doc.kind === 'devis'
            ? labels.devisTitle
            : labels.monthlyTitle;
      await shareElementPdf(sheetRef.current, getFilename(), title);
    } catch {
      // User dismissed share sheet
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const labels = {
    company:
      lang === 'ar'
        ? 'خدمات الرفع - رافعة متنقلة 25 طن'
        : lang === 'en'
          ? 'Heavy Lifting Services — 25T Mobile Crane'
          : 'Entreprise de Levage — Grue Mobile 25T',
    subtitle:
      lang === 'ar'
        ? 'السعة الاسمية: 25 طن'
        : lang === 'en'
          ? 'Nominal Capacity: 25 Tons'
          : 'Capacité nominale : 25 Tonnes',
    bonTitle:
      lang === 'ar'
        ? 'سند عمل مؤكد'
        : lang === 'en'
          ? 'CERTIFIED WORK CERTIFICATE'
          : 'BON DE TRAVAIL CERTIFIÉ',
    devisTitle:
      lang === 'ar'
        ? 'عرض سعر / فاتورة أولية'
        : lang === 'en'
          ? 'QUOTATION / ESTIMATE'
          : 'DEVIS ESTIMATIF',
    monthlyTitle:
      lang === 'ar'
        ? 'التقرير المالي والتشغيلي الشهري'
        : lang === 'en'
          ? 'MONTHLY OPERATIONS & FINANCE REPORT'
          : 'RAPPORT MENSUEL D’ACTIVITÉ & FINANCES',
    stampCaption:
      lang === 'ar'
        ? 'الختم والتوقيع'
        : lang === 'en'
          ? 'Company Stamp & Signature'
          : 'Cachet & Signature',
    periodLabel: lang === 'ar' ? 'الفترة' : lang === 'en' ? 'Period' : 'Période',
    distanceLabel: lang === 'ar' ? 'المسافة' : lang === 'en' ? 'Distance' : 'Distance',
    totalHtLabel: lang === 'ar' ? 'المجموع خارج الرسم' : lang === 'en' ? 'Subtotal (Excl. Tax)' : 'Total HT',
    tvaLabel: lang === 'ar' ? 'الرسم على القيمة المضافة (19%)' : lang === 'en' ? 'VAT (19%)' : 'TVA (19%)',
    totalTtcLabel: lang === 'ar' ? 'المجموع شامل كل الرسوم' : lang === 'en' ? 'Total (Incl. Tax)' : 'Total TTC',
    footerNote:
      lang === 'ar'
        ? 'رافعة متنقلة 25 طن · وثيقة صادرة رقمياً'
        : lang === 'en'
          ? '25T Mobile Crane · Digitally generated document'
          : 'Grue Mobile 25T · Document généré numériquement',
    serviceDesc:
      lang === 'ar'
        ? 'خدمة الرفع برافعة متنقلة 25 طن'
        : lang === 'en'
          ? '25T Mobile Crane Lifting Service'
          : 'Prestation de levage Grue Mobile 25T',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-4xl bg-slate-100 rounded-3xl border border-slate-300 max-h-[94vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            {doc.kind === 'bon'
              ? labels.bonTitle
              : doc.kind === 'devis'
                ? labels.devisTitle
                : labels.monthlyTitle}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{t(lang, 'printDirect')}</span>
            </button>
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={downloading}
              aria-label="Share PDF"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{t(lang, 'printOrDownloadPdf')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center">
          <div
            id="print-document-root"
            ref={sheetRef}
            dir={isRtl ? 'rtl' : 'ltr'}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              width: '794px',
              minHeight: '1020px',
              padding: '48px',
              boxSizing: 'border-box',
              fontFamily: isRtl ? 'Cairo, sans-serif' : 'Plus Jakarta Sans, sans-serif',
            }}
            className="border border-slate-300 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div
                style={{ borderBottom: '2px solid #0F172A', paddingBottom: '20px', marginBottom: '28px' }}
                className="flex items-start justify-between gap-6"
              >
                <div>
                  <div
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#FBBF24',
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '14px',
                      marginBottom: '10px',
                    }}
                  >
                    25T
                  </div>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {labels.company}
                  </h1>
                  <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                    {labels.subtitle}
                  </p>
                </div>

                <div className={isRtl ? 'text-left' : 'text-right'}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {doc.kind === 'bon'
                      ? labels.bonTitle
                      : doc.kind === 'devis'
                        ? labels.devisTitle
                        : labels.monthlyTitle}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
                    {doc.kind === 'bon'
                      ? `#${doc.travail.id} · ${formatShortDate(doc.travail.Date, lang)}`
                      : doc.kind === 'devis'
                        ? `${t(lang, 'date')}: ${formatShortDate(doc.date, lang)}`
                        : `${labels.periodLabel}: ${doc.month}`}
                  </p>
                </div>
              </div>

              {doc.kind === 'bon' && (
                <div className="space-y-6">
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '18px',
                    }}
                    className="grid grid-cols-2 gap-4 text-sm"
                  >
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'clientName')}</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{doc.travail.Client}</p>
                      {doc.travail.Tel_Client && (
                        <p style={{ fontSize: '12px', color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
                          {doc.travail.Tel_Client}
                        </p>
                      )}
                      {doc.travail.Lieu && (
                        <p style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          {t(lang, 'siteLocation')}: {doc.travail.Lieu}
                        </p>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'tariffType')}</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                        {doc.travail.Type_Tarif === 'Normal'
                          ? t(lang, 'tariffNormal')
                          : doc.travail.Type_Tarif === 'Jour + Nuit'
                            ? t(lang, 'tariffDayNight')
                            : t(lang, 'tariffNightWeekend')}
                      </p>
                      {doc.travail.Distance_Km !== undefined && doc.travail.Distance_Km > 0 && (
                        <p style={{ fontSize: '12px', color: '#334155' }}>
                          {labels.distanceLabel}: {doc.travail.Distance_Km} {t(lang, 'kmUnit')}
                        </p>
                      )}
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                        <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>
                          {t(lang, 'quoteServices')}
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t(lang, 'durationHours')}</th>
                        <th style={{ padding: '10px 12px', textAlign: isRtl ? 'left' : 'right' }}>
                          {t(lang, 'totalPrice')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '14px 12px' }}>
                          {labels.serviceDesc}
                          {doc.travail.Heures_Travail ? ` · ${doc.travail.Heures_Travail}` : ''}
                          {doc.travail.Description_Tache ? ` · ${doc.travail.Description_Tache}` : ''}
                          {doc.travail.Notes && (
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                              {doc.travail.Notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          {doc.travail.Heures_Travail && !doc.travail.Duree
                            ? doc.travail.Heures_Travail
                            : `${doc.travail.Duree} ${t(lang, 'hoursUnit')}`}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: isRtl ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>
                          {doc.travail.Prix_Total > 0
                            ? `${formatAmount(doc.travail.Prix_Total, lang)} ${t(lang, 'currency')}`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {doc.travail.Prix_Total > 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-2">
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px' }}>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'totalPrice')}</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatAmount(doc.travail.Prix_Total, lang)} {t(lang, 'currency')}
                      </p>
                    </div>
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px' }}>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'amountCollected')}</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: '#15803D', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatAmount(doc.travail.Montant_Encaisse, lang)} {t(lang, 'currency')}
                      </p>
                    </div>
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px' }}>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'kpiClientDebt')}</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: '#B91C1C', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatAmount(Math.max(0, doc.travail.Prix_Total - doc.travail.Montant_Encaisse), lang)}{' '}
                        {t(lang, 'currency')}
                      </p>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {doc.kind === 'devis' && (
                <div className="space-y-6">
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '18px',
                    }}
                    className="grid grid-cols-2 gap-4 text-sm"
                  >
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'clientName')}</p>
                      <p style={{ fontSize: '16px', fontWeight: 800 }}>{doc.client}</p>
                      {doc.tel && <p style={{ fontSize: '12px', color: '#334155' }}>{doc.tel}</p>}
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{t(lang, 'siteLocation')}</p>
                      <p style={{ fontSize: '15px', fontWeight: 700 }}>{doc.location || '—'}</p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                        <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>{t(lang, 'quoteServices')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t(lang, 'durationHours')}</th>
                        <th style={{ padding: '10px 12px', textAlign: isRtl ? 'left' : 'right' }}>{t(lang, 'quoteAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '14px 12px' }}>{doc.description}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          {doc.hours} {t(lang, 'hoursUnit')}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: isRtl ? 'left' : 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          {formatAmount(doc.amountHt, lang)} {t(lang, 'currency')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div style={{ width: '280px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '16px' }} className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: '#475569' }}>{labels.totalHtLabel}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          {formatAmount(doc.amountHt, lang)} {t(lang, 'currency')}
                        </span>
                      </div>
                      {doc.includeTva && (
                        <div className="flex justify-between">
                          <span style={{ color: '#475569' }}>{labels.tvaLabel}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                            {formatAmount(Math.round(doc.amountHt * 0.19), lang)} {t(lang, 'currency')}
                          </span>
                        </div>
                      )}
                      <div style={{ borderTop: '2px solid #0F172A', paddingTop: '8px' }} className="flex justify-between">
                        <span style={{ fontWeight: 800 }}>{labels.totalTtcLabel}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '16px' }}>
                          {formatAmount(doc.includeTva ? Math.round(doc.amountHt * 1.19) : doc.amountHt, lang)}{' '}
                          {t(lang, 'currency')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {doc.kind === 'monthly' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      [t(lang, 'kpiCollected'), `${formatAmount(doc.income, lang)} ${t(lang, 'currency')}`, '#15803D'],
                      [t(lang, 'kpiExpenses'), `${formatAmount(doc.expenses, lang)} ${t(lang, 'currency')}`, '#B91C1C'],
                      [t(lang, 'kpiBonuses'), `${formatAmount(doc.primes, lang)} ${t(lang, 'currency')}`, '#0F172A'],
                      [t(lang, 'kpiAdvances'), `${formatAmount(doc.avances, lang)} ${t(lang, 'currency')}`, '#0F172A'],
                      [t(lang, 'partsRepairs'), `${formatAmount(doc.partsCost, lang)} ${t(lang, 'currency')}`, '#B45309'],
                      [t(lang, 'kpiTotalKm'), `${formatAmount(doc.totalKm, lang)} ${t(lang, 'kmUnit')}`, '#1D4ED8'],
                      [t(lang, 'durationHours'), `${formatAmount(doc.totalHours, lang)} ${t(lang, 'hoursUnit')} (${doc.jobsCount})`, '#0F172A'],
                      [t(lang, 'netProfit'), `${formatAmount(doc.netProfit, lang)} ${t(lang, 'currency')}`, doc.netProfit >= 0 ? '#15803D' : '#B91C1C'],
                    ].map(([label, value, color]) => (
                      <div
                        key={String(label)}
                        style={{ border: '1px solid #CBD5E1', borderRadius: '10px', padding: '16px', backgroundColor: '#F8FAFC' }}
                      >
                        <p style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>{label}</p>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: String(color), fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px', marginTop: '40px' }} className="flex items-end justify-between">
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                <p>{labels.footerNote}</p>
              </div>

              <div className="text-center" style={{ minWidth: '200px', position: 'relative' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  {labels.stampCaption}
                </p>
                {doc.stampPng ? (
                  <img
                    src={doc.stampPng}
                    alt={labels.stampCaption}
                    referrerPolicy="no-referrer"
                    style={{
                      maxHeight: '110px',
                      maxWidth: '180px',
                      objectFit: 'contain',
                      margin: '0 auto',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: '80px',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      color: '#94A3B8',
                    }}
                  >
                    {labels.stampCaption}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
