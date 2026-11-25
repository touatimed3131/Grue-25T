import React, { useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';
import { Language } from '../types';
import { t } from '../i18n';

interface PinModalProps {
  lang: Language;
  mode: 'admin_verify' | 'child_unlock' | 'child_setup';
  expectedPin?: string;
  onSuccess: (pin: string) => void;
  onLockNow?: () => void;
  onDisableChildLock?: () => void;
  onClose?: () => void;
  childLockAlreadySet?: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({
  lang,
  mode,
  expectedPin,
  onSuccess,
  onLockNow,
  onDisableChildLock,
  onClose,
  childLockAlreadySet,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (mode === 'child_setup') {
        setTimeout(() => onSuccess(next), 120);
      } else if (next === expectedPin) {
        setTimeout(() => onSuccess(next), 120);
      } else {
        setTimeout(() => {
          setError(true);
          setPin('');
        }, 160);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const title =
    mode === 'admin_verify'
      ? t(lang, 'adminAuthTitle')
      : mode === 'child_unlock'
        ? t(lang, 'childLockActive')
        : t(lang, 'childLockSetPin');

  const subtitle =
    mode === 'admin_verify'
      ? t(lang, 'adminAuthSubtitle')
      : mode === 'child_unlock'
        ? t(lang, 'childLockEnterPin')
        : t(lang, 'childLockSetPin');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
            {mode === 'admin_verify' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          {onClose && mode !== 'child_unlock' && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t(lang, 'close')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-3 my-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                error
                  ? 'border-red-600 bg-red-100'
                  : idx < pin.length
                    ? 'border-slate-900 bg-slate-900'
                    : 'border-slate-300 bg-white'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-xs font-semibold text-red-600 mb-3">
            {t(lang, 'childLockWrongPin')}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="min-h-[52px] rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-lg font-bold font-mono text-slate-900 transition-transform"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[52px] rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-lg font-bold font-mono text-slate-900 transition-transform"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="min-h-[52px] rounded-xl bg-slate-50 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-transform"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {mode === 'child_setup' && childLockAlreadySet && (
          <div className="mt-4 space-y-2">
            {onLockNow && (
              <button
                type="button"
                onClick={onLockNow}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t(lang, 'childLock')}</span>
              </button>
            )}
            {onDisableChildLock && (
              <button
                type="button"
                onClick={onDisableChildLock}
                className="w-full min-h-[44px] rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100"
              >
                {t(lang, 'childLockDisable')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
