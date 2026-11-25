import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Volume2 } from 'lucide-react';
import { Language } from '../types';
import { t } from '../i18n';

interface SpeechDictationButtonProps {
  lang: Language;
  onTranscript: (text: string) => void;
}

export const SpeechDictationButton: React.FC<SpeechDictationButtonProps> = ({
  lang,
  onTranscript,
}) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRec) {
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'ar-DZ';
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0]?.transcript || '';
      }
      if (combined.trim()) {
        onTranscript(combined.trim());
      }
    };

    rec.onerror = () => {
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <button
      type="button"
      onClick={toggleDictation}
      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
        listening
          ? 'bg-red-600 text-white border-red-700'
          : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
      }`}
    >
      {listening ? <Square className="w-4 h-4 shrink-0" /> : <Mic className="w-4 h-4 shrink-0" />}
      <span>{listening ? t(lang, 'listening') : t(lang, 'voiceToText')}</span>
    </button>
  );
};

interface AudioNoteRecorderProps {
  lang: Language;
  audioBase64?: string;
  onChangeAudio: (base64: string | undefined) => void;
}

export const AudioNoteRecorder: React.FC<AudioNoteRecorderProps> = ({
  lang,
  audioBase64,
  onChangeAudio,
}) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onChangeAudio(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setMicError(err instanceof Error ? err.message : 'Microphone unavailable');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 whitespace-nowrap"
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>{t(lang, 'startRecord')} (30s)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-red-700 bg-red-600 text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap"
          >
            <Square className="w-4 h-4 shrink-0" />
            <span>
              {t(lang, 'stopRecord')} · {String(seconds).padStart(2, '0')}s / 30s
            </span>
          </button>
        )}

        {audioBase64 && !recording && (
          <button
            type="button"
            onClick={() => onChangeAudio(undefined)}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t(lang, 'delete')}</span>
          </button>
        )}
      </div>

      {micError && <p className="text-xs text-red-600 font-medium">{micError}</p>}

      {audioBase64 && !recording && (
        <audio controls src={audioBase64} className="w-full h-10 rounded-lg" />
      )}
    </div>
  );
};
