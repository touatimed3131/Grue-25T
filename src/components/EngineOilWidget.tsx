import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets, SlidersHorizontal } from 'lucide-react';
import { AppStateData, Language } from '../types';
import { t } from '../i18n';
import { computeEngineOilStatus } from '../services/api';

interface EngineOilWidgetProps {
  lang: Language;
  state: AppStateData;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

export const EngineOilWidget: React.FC<EngineOilWidgetProps> = ({
  lang,
  state,
  onAction,
}) => {
  const oil = computeEngineOilStatus(state);
  const [editing, setEditing] = useState(false);
  const [machineHours, setMachineHours] = useState(String(oil.currentMachineHours));
  const [intervalHours, setIntervalHours] = useState(String(oil.oilIntervalHours));
  const [lastOilHours, setLastOilHours] = useState(String(oil.lastOilChangeHours));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setMachineHours(String(oil.currentMachineHours));
      setIntervalHours(String(oil.oilIntervalHours));
      setLastOilHours(String(oil.lastOilChangeHours));
    }
  }, [oil.currentMachineHours, oil.oilIntervalHours, oil.lastOilChangeHours, editing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAction('calibrate_oil_tracker', {
        calibratedHours: Number(machineHours || 0),
        oilIntervalHours: Math.max(1, Number(intervalHours || 250)),
        lastOilChangeHours: Number(lastOilHours || 0),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkOilDone = async () => {
    setSaving(true);
    try {
      const currentVal = editing ? Number(machineHours || oil.currentMachineHours) : oil.currentMachineHours;
      await onAction('calibrate_oil_tracker', {
        calibratedHours: currentVal,
        oilIntervalHours: Math.max(1, Number(intervalHours || oil.oilIntervalHours)),
        markOilDone: true,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const barColor = oil.isOverdue
    ? 'bg-red-600'
    : oil.isWarning
      ? 'bg-amber-500'
      : 'bg-emerald-600';

  const statusTone = oil.isOverdue
    ? 'text-red-700'
    : oil.isWarning
      ? 'text-amber-800'
      : 'text-emerald-700';

  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
        oil.isOverdue
          ? 'bg-red-50 border-red-200'
          : oil.isWarning
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              oil.isOverdue
                ? 'bg-red-100 text-red-700'
                : oil.isWarning
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
            }`}
          >
            {oil.isWarning ? <AlertTriangle className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 truncate">
              {t(lang, 'oilTrackerTitle')}
            </h3>
            <p className="text-xs text-slate-500">{t(lang, 'autoRuleHint')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{t(lang, 'calibrateHours')}</span>
        </button>
      </div>

      {/* Warning banner when < 25h or <= 0h */}
      {oil.isWarning && (
        <div
          className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
            oil.isOverdue
              ? 'bg-red-700 text-white'
              : 'bg-amber-500 text-slate-950'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {oil.isOverdue
              ? t(lang, 'oilWarningOverdue')
              : t(lang, 'oilWarningSoon').replace('{hours}', '25')}
          </span>
        </div>
      )}

      {/* Metrics & Progress */}
      <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
        <div>
          <span className="block text-[11px] font-semibold text-slate-500">
            {t(lang, 'currentMachineHours')}
          </span>
          <span className="font-mono tabular-nums font-extrabold text-slate-900 text-base sm:text-lg">
            {oil.currentMachineHours}
            {t(lang, 'hoursUnit')}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-slate-500">
            {t(lang, 'oilIntervalHours')}
          </span>
          <span className="font-mono tabular-nums font-bold text-slate-800 text-base sm:text-lg">
            {oil.oilIntervalHours}
            {t(lang, 'hoursUnit')}
          </span>
        </div>
        <div className="text-end">
          <span className="block text-[11px] font-semibold text-slate-500">
            {t(lang, 'remainingOilHours')}
          </span>
          <span className={`font-mono tabular-nums font-extrabold text-base sm:text-lg ${statusTone}`}>
            {oil.isOverdue
              ? `${oil.remainingHours}${t(lang, 'hoursUnit')}`
              : `${oil.remainingHours}${t(lang, 'hoursUnit')}`}
          </span>
        </div>
      </div>

      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${barColor}`}
          style={{ width: `${oil.progressPct}%` }}
        />
      </div>

      {/* Calibration Form */}
      {editing && (
        <form onSubmit={handleSave} className="pt-3 border-t border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t(lang, 'currentMachineHours')}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={machineHours}
                onChange={(e) => setMachineHours(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t(lang, 'oilIntervalHours')}
              </label>
              <input
                type="number"
                step="10"
                min="10"
                required
                value={intervalHours}
                onChange={(e) => setIntervalHours(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t(lang, 'lastOilChangeHours')}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={lastOilHours}
                onChange={(e) => setLastOilHours(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap"
            >
              {t(lang, 'saveCalibration')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleMarkOilDone}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t(lang, 'markOilDone')}</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
