import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  FileCheck2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react';
import { BonTravailRequestItem, Language, TravailItem } from '../../types';
import { t } from '../../i18n';
import { formatAmount, formatShortDate, readPngDataUrl } from '../../utils/media';
import { getSavedStampPng, saveStampPng, transcribeAudioNote } from '../../services/api';
import { PdfPayload } from './PdfDocumentModal';

interface AdminWorkLogTabProps {
  lang: Language;
  travaux: TravailItem[];
  bonsTravail: BonTravailRequestItem[];
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
  onOpenPdf: (doc: PdfPayload) => void;
}

export const AdminWorkLogTab: React.FC<AdminWorkLogTabProps> = ({
  lang,
  travaux,
  bonsTravail,
  onAction,
  onOpenPdf,
}) => {
  const [stampPng, setStampPng] = useState<string | null>(() => getSavedStampPng());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Editing state for driver Bon de Travail requests
  const [editingBonId, setEditingBonId] = useState<string | null>(null);
  const [bonDraftClient, setBonDraftClient] = useState('');
  const [bonDraftLieu, setBonDraftLieu] = useState('');
  const [bonDraftDate, setBonDraftDate] = useState('');
  const [bonDraftHours, setBonDraftHours] = useState('');

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const pngUrl = await readPngDataUrl(file, 600);
    saveStampPng(pngUrl);
    setStampPng(pngUrl);
  };

  const handleTranscribe = async (tr: TravailItem) => {
    if (!tr.Audio_Base64) return;
    setTranscribingId(tr.id);
    setTranscribeError(null);
    try {
      const text = await transcribeAudioNote(tr.Audio_Base64, lang);
      setNoteDrafts((prev) => ({
        ...prev,
        [tr.id]: prev[tr.id] ? `${prev[tr.id]}\n${text}` : tr.Notes ? `${tr.Notes}\n${text}` : text,
      }));
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : 'Transcription error');
    } finally {
      setTranscribingId(null);
    }
  };

  const handleSaveNote = async (tr: TravailItem) => {
    const updated = noteDrafts[tr.id] ?? tr.Notes;
    setSavingId(tr.id);
    try {
      await onAction('update_note_text', { id: tr.id, Notes: updated });
    } finally {
      setSavingId(null);
    }
  };

  const handleValidateAndStamp = async (tr: TravailItem) => {
    await onAction('valider_bon_travail', { id: tr.id });
    onOpenPdf({
      kind: 'bon',
      travail: {
        ...tr,
        Notes: noteDrafts[tr.id] ?? tr.Notes,
      },
      stampPng,
    });
  };

  const handleStartEditBon = (bon: BonTravailRequestItem) => {
    setEditingBonId(bon.id);
    setBonDraftClient(bon.Client);
    setBonDraftLieu(bon.Lieu);
    setBonDraftDate(bon.Date);
    setBonDraftHours(bon.Heures_Travail);
  };

  const handleSaveBonEdit = async (id: string) => {
    await onAction('update_bon_travail', {
      id,
      Client: bonDraftClient.trim(),
      Lieu: bonDraftLieu.trim(),
      Date: bonDraftDate,
      Heures_Travail: bonDraftHours.trim(),
    });
    setEditingBonId(null);
  };

  const handleAcceptStampSignBon = async (bon: BonTravailRequestItem) => {
    const isEditingThis = editingBonId === bon.id;
    const finalClient = isEditingThis ? bonDraftClient.trim() : bon.Client;
    const finalLieu = isEditingThis ? bonDraftLieu.trim() : bon.Lieu;
    const finalDate = isEditingThis ? bonDraftDate : bon.Date;
    const finalHours = isEditingThis ? bonDraftHours.trim() : bon.Heures_Travail;

    await onAction('valider_bon_demande', {
      id: bon.id,
      Client: finalClient,
      Lieu: finalLieu,
      Date: finalDate,
      Heures_Travail: finalHours,
    });
    setEditingBonId(null);

    const numericHours = parseFloat(finalHours);
    onOpenPdf({
      kind: 'bon',
      travail: {
        id: bon.id,
        Date: finalDate,
        Client: finalClient,
        Lieu: finalLieu,
        Duree: Number.isFinite(numericHours) ? numericHours : 0,
        Heures_Travail: finalHours,
        Type_Tarif: 'Normal',
        Prix_Total: 0,
        Montant_Encaisse: 0,
        Notes: '',
      },
      stampPng,
    });
  };

  return (
    <div className="space-y-4">
      {/* Company Stamp & Signature PNG Uploader */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {stampPng ? (
            <img
              src={stampPng}
              alt={t(lang, 'stampUploadLabel')}
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-slate-900">{t(lang, 'stampUploadLabel')}</p>
            <p className="text-xs text-slate-500">
              {stampPng ? t(lang, 'stampLoaded') : t(lang, 'stampHint')}
            </p>
          </div>
        </div>

        <label className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <Upload className="w-4 h-4" />
          <span>{t(lang, 'uploadStamp')}</span>
          <input type="file" accept="image/png,image/*" onChange={handleStampUpload} className="hidden" />
        </label>
      </div>

      {transcribeError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {transcribeError}
        </div>
      )}

      {/* Dedicated Section: Bons de Travail à Valider */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
            <span>{t(lang, 'bonsToValidateTitle')}</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">{bonsTravail.length}</span>
        </div>

        {bonsTravail.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t(lang, 'noBonsToValidate')}</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {bonsTravail.map((bon) => {
              const isValidated = bon.Statut === 'Validé';
              const isEditing = editingBonId === bon.id;

              return (
                <div key={bon.id} className="p-3.5 sm:p-4 bg-white space-y-3">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={bonDraftClient}
                        onChange={(e) => setBonDraftClient(e.target.value)}
                        placeholder={t(lang, 'clientName')}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={bonDraftLieu}
                        onChange={(e) => setBonDraftLieu(e.target.value)}
                        placeholder={t(lang, 'siteLocation')}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
                      />
                      <input
                        type="date"
                        value={bonDraftDate}
                        onChange={(e) => setBonDraftDate(e.target.value)}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={bonDraftHours}
                        onChange={(e) => setBonDraftHours(e.target.value)}
                        placeholder={t(lang, 'workDoneHours')}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">{bon.Client}</h4>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
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
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">{formatShortDate(bon.Date, lang)}</span>
                          {bon.Lieu && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{bon.Lieu}</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">
                          {bon.Heures_Travail}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditBon(bon)}
                          className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{t(lang, 'edit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptStampSignBon(bon)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>{t(lang, 'acceptStampSign')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveBonEdit(bon.id)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
                      >
                        {t(lang, 'save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptStampSignBon(bon)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>{t(lang, 'acceptStampSign')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBonId(null)}
                        className="min-h-[38px] px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                      >
                        {t(lang, 'cancel')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {travaux.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
          {t(lang, 'noWorkLogs')}
        </div>
      ) : (
        <div className="space-y-3">
          {travaux.map((tr) => {
            const currentNote = noteDrafts[tr.id] ?? tr.Notes ?? '';
            const reste = Math.max(0, Number(tr.Prix_Total || 0) - Number(tr.Montant_Encaisse || 0));

            return (
              <article
                key={tr.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{tr.Client}</h3>
                      {tr.Valide_Bon && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t(lang, 'bonValidated')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{formatShortDate(tr.Date, lang)}</span>
                      {tr.Heure_Debut && tr.Heure_Fin && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{tr.Heure_Debut}-{tr.Heure_Fin}</span>
                        </>
                      )}
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{tr.Duree}{t(lang, 'hoursUnit')}</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {tr.Mode_Tarif === 'A la tache/Par camion'
                          ? `${t(lang, 'pricingPerTask')}${tr.Quantite_Tache ? ` (${tr.Quantite_Tache})` : ''}`
                          : t(lang, 'pricingHourlyDaily')}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {tr.Type_Tarif === 'Normal'
                          ? t(lang, 'tariffNormal')
                          : tr.Type_Tarif === 'Jour + Nuit'
                            ? t(lang, 'tariffDayNight')
                            : t(lang, 'tariffNightWeekend')}
                      </span>
                      {tr.Distance_Km !== undefined && tr.Distance_Km > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{tr.Distance_Km} {t(lang, 'kmUnit')}</span>
                        </>
                      )}
                      {tr.Chauffeur && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-bold text-slate-700">
                            {t(lang, 'driverLabel')}: {tr.Chauffeur}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {tr.GPS_Link && (
                      <a
                        href={tr.GPS_Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t(lang, 'viewMap')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleValidateAndStamp(tr)}
                      className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>{t(lang, 'validateStampBon')}</span>
                    </button>
                  </div>
                </div>

                {/* Financials strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">{t(lang, 'totalPrice')}</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatAmount(tr.Prix_Total, lang)} {t(lang, 'currency')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t(lang, 'amountCollected')}</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {formatAmount(tr.Montant_Encaisse, lang)} {t(lang, 'currency')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t(lang, 'expenses')}</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {formatAmount(tr.Depenses, lang)} {t(lang, 'currency')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t(lang, 'kpiClientDebt')}</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        reste > 0 ? 'text-red-700' : 'text-slate-600'
                      }`}
                    >
                      {formatAmount(reste, lang)} {t(lang, 'currency')}
                    </span>
                  </div>
                </div>

                {/* Audio Note + Transcription + Editable Note */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  {tr.Audio_Base64 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <audio controls src={tr.Audio_Base64} className="h-10 flex-1" />
                      <button
                        type="button"
                        onClick={() => handleTranscribe(tr)}
                        disabled={transcribingId === tr.id}
                        className="min-h-[40px] px-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        {transcribingId === tr.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>
                          {transcribingId === tr.id
                            ? t(lang, 'transcribing')
                            : t(lang, 'transcribeText')}
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea
                      rows={2}
                      value={currentNote}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [tr.id]: e.target.value }))
                      }
                      placeholder={t(lang, 'notes')}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNote(tr)}
                      disabled={savingId === tr.id}
                      className="min-h-[42px] px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {savingId === tr.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{t(lang, 'saveNote')}</span>
                    </button>
                  </div>
                </div>

                {tr.Photo_Base64 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(tr.Photo_Base64 || null)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>{t(lang, 'photoReceipt')}</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
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
