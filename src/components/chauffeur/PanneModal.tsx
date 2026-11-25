import React, { useState } from 'react';
import { AlertOctagon, Camera, Check, Loader2, Plus, Trash2, Video, X } from 'lucide-react';
import { ChecklistConfigItem, ChecklistReportItem, Language } from '../../types';
import { t } from '../../i18n';
import { loadChecklistConfig, saveChecklistConfig } from '../../services/api';
import { compressImageToJpeg, todayIsoDate, validateAndReadVideo } from '../../utils/media';
import { AudioNoteRecorder } from '../VoiceControls';

interface PanneModalProps {
  lang: Language;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export const PanneModal: React.FC<PanneModalProps> = ({ lang, onClose, onSubmit }) => {
  const [checkItems, setCheckItems] = useState<ChecklistConfigItem[]>(() => loadChecklistConfig());
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of loadChecklistConfig()) {
      initial[item.id] = true;
    }
    return initial;
  });
  const [newCheckLabel, setNewCheckLabel] = useState('');

  const [hasPanne, setHasPanne] = useState(false);
  const [typePanne, setTypePanne] = useState('Hydraulique');
  const [gravite, setGravite] = useState<'Mineure' | 'Urgente' | 'Critique'>('Urgente');
  const [description, setDescription] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>();
  const [videoBase64, setVideoBase64] = useState<string | undefined>();
  const [audioBase64, setAudioBase64] = useState<string | undefined>();
  const [processingMedia, setProcessingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const breakdownTypes = [
    { value: 'Hydraulique', labelKey: 'breakdownHydraulic' },
    { value: 'Moteur / Boîte', labelKey: 'breakdownEngine' },
    { value: 'Électrique / LMI', labelKey: 'breakdownElectric' },
    { value: 'Câble / Flèche', labelKey: 'breakdownCableBoom' },
    { value: 'Pneumatique / Freins', labelKey: 'breakdownTiresBrakes' },
  ];

  const getItemLabel = (item: ChecklistConfigItem): string =>
    item.labelKey ? t(lang, item.labelKey) : item.customLabel || item.id;

  const toggleCheck = (id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const handleAddCheckItem = () => {
    const clean = newCheckLabel.trim();
    if (!clean) return;
    const newItem: ChecklistConfigItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customLabel: clean,
    };
    const updated = [...checkItems, newItem];
    setCheckItems(updated);
    saveChecklistConfig(updated);
    setCheckedMap((prev) => ({ ...prev, [newItem.id]: true }));
    setNewCheckLabel('');
  };

  const handleDeleteCheckItem = (id: string) => {
    const updated = checkItems.filter((item) => item.id !== id);
    setCheckItems(updated);
    saveChecklistConfig(updated);
    setCheckedMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingMedia(true);
    setMediaError(null);
    try {
      if (file.type.startsWith('video/')) {
        const vid = await validateAndReadVideo(file, 15, 15 * 1024 * 1024);
        setVideoBase64(vid);
        setPhotoBase64(undefined);
      } else {
        const img = await compressImageToJpeg(file, 1000, 0.8);
        setPhotoBase64(img);
        setVideoBase64(undefined);
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Media error');
    } finally {
      setProcessingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const checklistPayload: Record<string, boolean> = {};
      const checklistDetails: ChecklistReportItem[] = [];
      for (const item of checkItems) {
        const label = getItemLabel(item);
        const ok = checkedMap[item.id] ?? true;
        checklistPayload[item.labelKey ? item.id : label] = ok;
        checklistDetails.push({ id: item.id, label, ok });
      }

      await onSubmit({
        id: `pan-${Date.now()}`,
        Date: todayIsoDate(),
        Checklist: checklistPayload,
        Checklist_Details: checklistDetails,
        Has_Panne: hasPanne,
        Type_Panne: hasPanne ? typePanne : '',
        Gravite: hasPanne ? gravite : undefined,
        Description: hasPanne ? description.trim() : '',
        Photo_Base64: photoBase64 || '',
        Video_Base64: videoBase64 || '',
        Audio_Base64: audioBase64 || '',
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-red-700 text-white flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t(lang, 'btnBreakdown')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5">
          <div className="space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">
              {t(lang, 'dailySafetyChecks')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checkItems.map((item) => {
                const ok = checkedMap[item.id] ?? true;
                const label = getItemLabel(item);
                return (
                  <div
                    key={item.id}
                    className={`min-h-[48px] rounded-xl border flex items-stretch overflow-hidden transition-colors ${
                      ok
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-300 text-red-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className="flex-1 min-w-0 px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 text-start"
                    >
                      <span className="truncate">{label}</span>
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCheckItem(item.id)}
                      aria-label={t(lang, 'delete')}
                      title={t(lang, 'delete')}
                      className="px-2.5 flex items-center justify-center border-s border-slate-200/80 text-slate-500 hover:bg-red-100 hover:text-red-700 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newCheckLabel}
                onChange={(e) => setNewCheckLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCheckItem();
                  }
                }}
                placeholder={t(lang, 'addCheckItemPlaceholder')}
                className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleAddCheckItem}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t(lang, 'addCheckItemBtn')}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <button
              type="button"
              onClick={() => setHasPanne((v) => !v)}
              className={`w-full min-h-[50px] px-4 rounded-2xl border font-bold text-sm flex items-center justify-between transition-colors ${
                hasPanne
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5" />
                <span>{t(lang, 'reportEmergency')}</span>
              </span>
              <span>{hasPanne ? 'ON' : 'OFF'}</span>
            </button>

            {hasPanne && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'breakdownType')}
                    </label>
                    <select
                      value={typePanne}
                      onChange={(e) => setTypePanne(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                    >
                      {breakdownTypes.map((bt) => (
                        <option key={bt.value} value={bt.value}>
                          {t(lang, bt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'severity')}
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                      {(
                        [
                          { val: 'Mineure', key: 'sevMinor' },
                          { val: 'Urgente', key: 'sevUrgent' },
                          { val: 'Critique', key: 'sevCritical' },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.val}
                          type="button"
                          onClick={() => setGravite(s.val)}
                          className={`min-h-[36px] rounded-lg text-xs font-bold ${
                            gravite === s.val
                              ? 'bg-red-700 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t(lang, s.key)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'description')}
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-sm"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5">
                    {t(lang, 'voiceRecorder')}
                  </p>
                  <AudioNoteRecorder
                    lang={lang}
                    audioBase64={audioBase64}
                    onChangeAudio={setAudioBase64}
                  />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5">
                    {t(lang, 'photoOrVideo')}
                  </p>
                  <label className="min-h-[48px] px-4 py-2 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    {processingMedia ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <Video className="w-4 h-4" />
                      </>
                    )}
                    <span>
                      {photoBase64
                        ? t(lang, 'photoCompressed')
                        : videoBase64
                          ? t(lang, 'videoReady')
                          : t(lang, 'photoOrVideo')}
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      onChange={handleMediaChange}
                      className="hidden"
                    />
                  </label>
                  {mediaError && (
                    <p className="text-xs font-semibold text-red-600 mt-1">{mediaError}</p>
                  )}
                  {photoBase64 && (
                    <img
                      src={photoBase64}
                      alt={t(lang, 'reportEmergency')}
                      referrerPolicy="no-referrer"
                      className="mt-2 w-full max-h-40 object-cover rounded-xl border border-slate-200"
                    />
                  )}
                  {videoBase64 && (
                    <video
                      src={videoBase64}
                      controls
                      className="mt-2 w-full max-h-44 rounded-xl border border-slate-200 bg-black"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || processingMedia}
            className="w-full min-h-[54px] rounded-2xl bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{t(lang, 'submitChecklist')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
