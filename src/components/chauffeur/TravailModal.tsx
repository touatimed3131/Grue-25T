import React, { useState } from 'react';
import { Camera, Check, FileCheck2, Loader2, Plus, X } from 'lucide-react';
import { Language, PricingMode, TariffType, TravailItem } from '../../types';
import { t } from '../../i18n';
import { compressImageToJpeg, todayIsoDate } from '../../utils/media';
import { AudioNoteRecorder, SpeechDictationButton } from '../VoiceControls';

interface TravailModalProps {
  lang: Language;
  initialItem?: TravailItem | null;
  customTags: string[];
  hiddenDefaultTags: string[];
  onSaveCustomTag: (tag: string) => Promise<void>;
  onDeleteCustomTag: (tag: string) => Promise<void>;
  onDeleteDefaultTag: (tag: string) => Promise<void>;
  onOpenBonTravail?: () => void;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>, isEdit: boolean) => Promise<void>;
}

const DEFAULT_TAG_KEYS = [
  { key: 'tagDiesel', value: 'Mazout' },
  { key: 'tagWaiting', value: 'Attente Client' },
  { key: 'tagDifficultSoil', value: 'Sol Difficile' },
  { key: 'tagHalfDay', value: 'Demi-journée' },
];

function calcHoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins < startMins) endMins += 24 * 60;
  return Math.round(((endMins - startMins) / 60) * 100) / 100;
}

export const TravailModal: React.FC<TravailModalProps> = ({
  lang,
  initialItem,
  customTags,
  hiddenDefaultTags,
  onSaveCustomTag,
  onDeleteCustomTag,
  onDeleteDefaultTag,
  onOpenBonTravail,
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(initialItem);

  const [workDate, setWorkDate] = useState(initialItem?.Date || todayIsoDate());
  const [heureDebut, setHeureDebut] = useState(initialItem?.Heure_Debut || '08:00');
  const [heureFin, setHeureFin] = useState(initialItem?.Heure_Fin || '12:00');
  const [duree, setDuree] = useState(
    initialItem ? String(initialItem.Duree) : String(calcHoursBetween('08:00', '12:00'))
  );
  const [modeTarif, setModeTarif] = useState<PricingMode>(
    initialItem?.Mode_Tarif || 'Horaire/Journalier'
  );
  const [quantiteTache, setQuantiteTache] = useState(
    initialItem?.Quantite_Tache ? String(initialItem.Quantite_Tache) : '1'
  );
  const [descriptionTache, setDescriptionTache] = useState(
    initialItem?.Description_Tache || ''
  );

  const [client, setClient] = useState(initialItem?.Client || '');
  const [telClient, setTelClient] = useState(initialItem?.Tel_Client || '');
  const [typeTarif, setTypeTarif] = useState<TariffType>(initialItem?.Type_Tarif || 'Normal');
  const [prixTotal, setPrixTotal] = useState(initialItem ? String(initialItem.Prix_Total) : '');
  const [montantEncaisse, setMontantEncaisse] = useState(
    initialItem ? String(initialItem.Montant_Encaisse) : ''
  );
  const [depenses, setDepenses] = useState(initialItem ? String(initialItem.Depenses) : '0');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialItem?.Tags || []);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  const [notes, setNotes] = useState(initialItem?.Notes || '');
  const [audioBase64, setAudioBase64] = useState<string | undefined>(initialItem?.Audio_Base64);
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(initialItem?.Photo_Base64);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartChange = (val: string) => {
    setHeureDebut(val);
    const hrs = calcHoursBetween(val, heureFin);
    if (hrs > 0) setDuree(String(hrs));
  };

  const handleEndChange = (val: string) => {
    setHeureFin(val);
    const hrs = calcHoursBetween(heureDebut, val);
    if (hrs > 0) setDuree(String(hrs));
  };

  const toggleTag = (val: string) => {
    setSelectedTags((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const handleCreateCustomTag = async () => {
    const clean = newTagText.trim();
    if (!clean) return;
    await onSaveCustomTag(clean);
    if (!selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
    }
    setNewTagText('');
    setShowAddTag(false);
  };

  const handleRemoveCustomTag = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    await onDeleteCustomTag(tag);
    setSelectedTags((prev) => prev.filter((tItem) => tItem !== tag));
  };

  const handleRemoveDefaultTag = async (e: React.MouseEvent, tagValue: string) => {
    e.stopPropagation();
    await onDeleteDefaultTag(tagValue);
    setSelectedTags((prev) => prev.filter((tItem) => tItem !== tagValue));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setErrorMsg(null);
    try {
      const compressed = await compressImageToJpeg(file, 1000, 0.8);
      setPhotoBase64(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Photo error');
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim()) {
      setErrorMsg(t(lang, 'clientName'));
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    const tagPrefix = selectedTags.length > 0 ? `[${selectedTags.join(', ')}] ` : '';
    const finalNotes =
      notes.trim() || !tagPrefix
        ? tagPrefix && !notes.includes(tagPrefix)
          ? `${tagPrefix}${notes}`
          : notes
        : tagPrefix.trim();

    try {
      await onSubmit(
        {
          id: initialItem?.id || `tr-${Date.now()}`,
          Date: workDate,
          Heure_Debut: heureDebut,
          Heure_Fin: heureFin,
          Duree: Number(duree || 0),
          Mode_Tarif: modeTarif,
          Quantite_Tache: modeTarif === 'A la tache/Par camion' ? Number(quantiteTache || 1) : undefined,
          Description_Tache:
            modeTarif === 'A la tache/Par camion' ? descriptionTache.trim() : undefined,
          Client: client.trim(),
          Tel_Client: telClient.trim(),
          Type_Tarif: typeTarif,
          Prix_Total: Number(prixTotal || 0),
          Montant_Encaisse: Number(montantEncaisse || 0),
          Depenses: Number(depenses || 0),
          Prime_Chauffeur: initialItem?.Prime_Chauffeur || 0,
          Tags: selectedTags,
          Notes: finalNotes.trim(),
          Audio_Base64: audioBase64 || '',
          Photo_Base64: photoBase64 || '',
        },
        isEdit
      );
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submit error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-lg font-bold">
            {isEdit ? t(lang, 'editLastWork') : t(lang, 'btnNewWork')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto overscroll-contain space-y-4">
          {!isEdit && onOpenBonTravail && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBonTravail();
              }}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <span>{t(lang, 'btnBonTravailClient')}</span>
            </button>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Client & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'clientName')} *
              </label>
              <input
                type="text"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'clientPhone')}
              </label>
              <input
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={telClient}
                onChange={(e) => setTelClient(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Date, Start Time, End Time -> Auto-calculated Hours */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'date')}
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full min-h-[46px] px-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'startTime')}
              </label>
              <input
                type="time"
                value={heureDebut}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full min-h-[46px] px-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'endTime')}
              </label>
              <input
                type="time"
                value={heureFin}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full min-h-[46px] px-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'durationHours')}
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                inputMode="decimal"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                className="w-full min-h-[46px] px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-mono font-extrabold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Pricing Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t(lang, 'pricingMode')}
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { val: 'Horaire/Journalier', key: 'pricingHourlyDaily' },
                  { val: 'A la tache/Par camion', key: 'pricingPerTask' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.val}
                  type="button"
                  onClick={() => setModeTarif(mode.val)}
                  className={`min-h-[40px] px-2 rounded-lg text-xs font-bold transition-colors truncate ${
                    modeTarif === mode.val
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(lang, mode.key)}
                </button>
              ))}
            </div>
          </div>

          {modeTarif === 'A la tache/Par camion' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'taskQuantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantiteTache}
                  onChange={(e) => setQuantiteTache(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'taskDescription')}
                </label>
                <input
                  type="text"
                  value={descriptionTache}
                  onChange={(e) => setDescriptionTache(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>
            </div>
          )}

          {/* Shift / Period Selector (3 options including Jour + Nuit) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t(lang, 'tariffType')}
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { val: 'Normal', key: 'tariffNormal' },
                  { val: 'Nuit/Week-end', key: 'tariffNightWeekend' },
                  { val: 'Jour + Nuit', key: 'tariffDayNight' },
                ] as const
              ).map((tarif) => (
                <button
                  key={tarif.val}
                  type="button"
                  onClick={() => setTypeTarif(tarif.val)}
                  className={`min-h-[42px] px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-colors truncate ${
                    typeTarif === tarif.val
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(lang, tarif.key)}
                </button>
              ))}
            </div>
          </div>

          {/* Financials (No Prime_Chauffeur input) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'totalPrice')}
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={prixTotal}
                onChange={(e) => setPrixTotal(e.target.value)}
                className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'amountCollected')}
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={montantEncaisse}
                onChange={(e) => setMontantEncaisse(e.target.value)}
                className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t(lang, 'expenses')}
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={depenses}
                onChange={(e) => setDepenses(e.target.value)}
                className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Quick-tap interactive tag buttons + custom tags with '+' and 'x' */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">{t(lang, 'quickTags')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {DEFAULT_TAG_KEYS.filter((tag) => !hiddenDefaultTags.includes(tag.value)).map((tag) => {
                const active = selectedTags.includes(tag.value);
                return (
                  <div
                    key={tag.value}
                    className={`min-h-[40px] rounded-xl border text-xs font-bold flex items-center overflow-hidden transition-colors ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTag(tag.value)}
                      className="px-3 py-1.5 flex items-center gap-1.5 min-h-[38px]"
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{t(lang, tag.key)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveDefaultTag(e, tag.value)}
                      aria-label={t(lang, 'delete')}
                      className={`px-2 min-h-[38px] flex items-center justify-center border-s ${
                        active
                          ? 'border-emerald-600 hover:bg-emerald-800 text-white'
                          : 'border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {customTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <div
                    key={tag}
                    className={`min-h-[40px] rounded-xl border text-xs font-bold flex items-center overflow-hidden transition-colors ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1.5 flex items-center gap-1.5 min-h-[38px]"
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{tag}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveCustomTag(e, tag)}
                      aria-label={t(lang, 'delete')}
                      className={`px-2 min-h-[38px] flex items-center justify-center border-s ${
                        active
                          ? 'border-emerald-600 hover:bg-emerald-800 text-white'
                          : 'border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAddTag((v) => !v)}
                aria-label={t(lang, 'add')}
                className="min-h-[40px] min-w-[40px] px-3 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddTag && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCustomTag();
                    }
                  }}
                  placeholder={t(lang, 'newCustomTagPlaceholder')}
                  className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomTag}
                  className="min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                  {t(lang, 'add')}
                </button>
              </div>
            )}
          </div>

          {/* Notes + Voice-to-Text + 30s Voice Recorder */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">{t(lang, 'notes')}</label>
              <SpeechDictationButton
                lang={lang}
                onTranscript={(txt) => setNotes((prev) => (prev ? `${prev} ${txt}` : txt))}
              />
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1.5">{t(lang, 'voiceRecorder')}</p>
              <AudioNoteRecorder
                lang={lang}
                audioBase64={audioBase64}
                onChangeAudio={setAudioBase64}
              />
            </div>
          </div>

          {/* Camera input compressed to 1000px / 80% JPEG */}
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
              <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={photoBase64}
                  alt={t(lang, 'photoReceipt')}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoBase64(undefined)}
                  className="absolute top-2 right-2 min-h-[36px] min-w-[36px] rounded-lg bg-slate-900/80 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || compressing}
            className="w-full min-h-[54px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{isEdit ? t(lang, 'save') : t(lang, 'submitWork')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
