import React, { useState } from 'react';
import {
  Ban,
  Calendar,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Loader2,
  Palmtree,
  Phone,
  Plus,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { Language, PresenceItem, ReservationItem } from '../../types';
import { t } from '../../i18n';
import {
  getHiddenCancelledReservationIds,
  hideCancelledReservationLocally,
  isReservationCancelled,
} from '../../services/api';
import { formatExactTimestamp, formatShortDate, todayIsoDate } from '../../utils/media';

interface PlanningModalProps {
  lang: Language;
  reservations: ReservationItem[];
  presences: PresenceItem[];
  onClose: () => void;
  onAddReservation: (payload: Record<string, unknown>) => Promise<void>;
  onCancelReservation: (payload: Record<string, unknown>) => Promise<void>;
  onAddPresence: (payload: Record<string, unknown>) => Promise<void>;
}

export const PlanningModal: React.FC<PlanningModalProps> = ({
  lang,
  reservations,
  presences,
  onClose,
  onAddReservation,
  onCancelReservation,
  onAddPresence,
}) => {
  const [tab, setTab] = useState<'bookings' | 'presence'>('bookings');
  const [showCancelledHistory, setShowCancelledHistory] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [hiddenCancelledIds, setHiddenCancelledIds] = useState<string[]>(() =>
    getHiddenCancelledReservationIds()
  );

  // Booking form
  const [date, setDate] = useState(todayIsoDate());
  const [heure, setHeure] = useState('08:00');
  const [client, setClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [lieu, setLieu] = useState('');
  const [dureeEstimee, setDureeEstimee] = useState('4');
  const [notes, setNotes] = useState('');

  // Presence form
  const [presDate, setPresDate] = useState(todayIsoDate());
  const [presStatus, setPresStatus] = useState<PresenceItem['Statut']>('Travail');
  const [presNotes, setPresNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const activeBookings = reservations.filter((bk) => !isReservationCancelled(bk));
  const cancelledBookings = reservations.filter(
    (bk) => isReservationCancelled(bk) && !hiddenCancelledIds.includes(bk.id)
  );

  const handleHideCancelledLocally = (id: string) => {
    setHiddenCancelledIds(hideCancelledReservationLocally(id));
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim()) return;
    setSubmitting(true);
    try {
      await onAddReservation({
        id: `res-${Date.now()}`,
        Date: date,
        Heure: heure,
        Client: client.trim(),
        Tel_Client: telClient.trim(),
        Lieu: lieu.trim(),
        Duree_Estimee: Number(dureeEstimee || 0),
        Notes: notes.trim(),
        Cree_Par: 'Chauffeur',
        Statut: 'Actif',
        Created_At: new Date().toISOString(),
      });
      setClient('');
      setTelClient('');
      setLieu('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bk: ReservationItem) => {
    setCancellingId(bk.id);
    try {
      await onCancelReservation({
        id: bk.id,
        Date: bk.Date,
        Heure: bk.Heure,
        Client: bk.Client,
        Tel_Client: bk.Tel_Client,
        Lieu: bk.Lieu,
        Duree_Estimee: bk.Duree_Estimee ?? 0,
        Notes: bk.Notes,
        Cree_Par: bk.Cree_Par,
        Created_At: bk.Created_At || '',
        Statut: 'Annulé',
        Statut_Label: 'Annulé / تم إلغاؤه',
        Cancelled_At: new Date().toISOString(),
        Cancelled_By: 'Chauffeur',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handlePresenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAddPresence({
        id: `pres-${Date.now()}`,
        Date: presDate,
        Statut: presStatus,
        Notes: presNotes.trim(),
      });
      setPresNotes('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const presenceOptions: Array<{
    value: PresenceItem['Statut'];
    label: string;
    icon: React.ReactNode;
    activeClass: string;
  }> = [
    {
      value: 'Travail',
      label: t(lang, 'statusWork'),
      icon: <UserCheck className="w-5 h-5" />,
      activeClass: 'bg-emerald-700 text-white border-emerald-800',
    },
    {
      value: 'Intempéries/Vent',
      label: t(lang, 'statusWeather'),
      icon: <CloudRain className="w-5 h-5" />,
      activeClass: 'bg-amber-500 text-slate-950 border-amber-600',
    },
    {
      value: 'Congé',
      label: t(lang, 'statusLeave'),
      icon: <Palmtree className="w-5 h-5" />,
      activeClass: 'bg-slate-800 text-white border-slate-900',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-amber-400 text-slate-950 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{t(lang, 'btnPlanning')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-950/10 hover:bg-slate-950/20 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTab('bookings')}
              className={`min-h-[42px] rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                tab === 'bookings' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(lang, 'tabBookings')}
            </button>
            <button
              type="button"
              onClick={() => setTab('presence')}
              className={`min-h-[42px] rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                tab === 'presence' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(lang, 'tabPresence')}
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {tab === 'bookings' ? (
            <>
              <form onSubmit={handleBookingSubmit} className="space-y-3 border-b border-slate-200 pb-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>{t(lang, 'addBooking')}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'time')}
                    </label>
                    <input
                      type="time"
                      value={heure}
                      onChange={(e) => setHeure(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                </div>

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
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'clientPhone')}
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={telClient}
                      onChange={(e) => setTelClient(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'siteLocation')}
                    </label>
                    <input
                      type="text"
                      value={lieu}
                      onChange={(e) => setLieu(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t(lang, 'estDuration')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={dureeEstimee}
                      onChange={(e) => setDureeEstimee(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t(lang, 'notes')}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[50px] rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t(lang, 'submitBooking')}</span>
                </button>
              </form>

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {t(lang, 'tabBookings')} ({activeBookings.length})
                </h3>
                {activeBookings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">{t(lang, 'noBookings')}</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                    {activeBookings.map((bk) => (
                      <div key={bk.id} className="p-3.5 bg-white flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{bk.Client}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            <span className="font-mono font-semibold">
                              {formatShortDate(bk.Date, lang)} {bk.Heure}
                            </span>
                            {bk.Lieu && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span>{bk.Lieu}</span>
                              </>
                            )}
                            <span aria-hidden="true"> · </span>
                            <span>{bk.Cree_Par}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {bk.Tel_Client && (
                            <a
                              href={`tel:${bk.Tel_Client}`}
                              className="min-h-[40px] min-w-[40px] rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(bk)}
                            disabled={cancellingId === bk.id}
                            className="min-h-[40px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60"
                          >
                            {cancellingId === bk.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            <span>{t(lang, 'cancelBooking')}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {cancelledBookings.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelledHistory((v) => !v)}
                      className="w-full min-h-[40px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between gap-2 transition-colors"
                    >
                      <span>
                        {t(lang, 'cancelledBookingsHistory')} ({cancelledBookings.length})
                      </span>
                      {showCancelledHistory ? (
                        <ChevronUp className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      )}
                    </button>

                    {showCancelledHistory && (
                      <div className="mt-2 divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                        {cancelledBookings.map((bk) => (
                          <div
                            key={bk.id}
                            className="p-3 bg-slate-50 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate line-through">
                                {bk.Client}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono">
                                  {formatShortDate(bk.Date, lang)} {bk.Heure}
                                </span>
                                {bk.Lieu && ` · ${bk.Lieu}`}
                              </p>
                              {bk.Cancelled_At && (
                                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  {t(lang, 'cancelledAtLabel')}: {formatExactTimestamp(bk.Cancelled_At, lang)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-bold text-red-700 whitespace-nowrap">
                                {t(lang, 'cancelledStatus')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleHideCancelledLocally(bk.id)}
                                title={t(lang, 'hideFromMyList')}
                                aria-label={t(lang, 'hideFromMyList')}
                                className="min-h-[36px] px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-red-50 hover:border-red-300 text-slate-600 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{t(lang, 'hideFromMyList')}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handlePresenceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'date')}
                </label>
                <input
                  type="date"
                  required
                  value={presDate}
                  onChange={(e) => setPresDate(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">{t(lang, 'dailyStatus')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {presenceOptions.map((opt) => {
                    const active = presStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPresStatus(opt.value)}
                        className={`min-h-[56px] p-3 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
                          active
                            ? opt.activeClass
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t(lang, 'notes')}
                </label>
                <textarea
                  rows={2}
                  value={presNotes}
                  onChange={(e) => setPresNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{t(lang, 'submitPresence')}</span>
              </button>

              {presences.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  {presences.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <span className="font-mono font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatShortDate(p.Date, lang)}
                      </span>
                      <span className="font-bold text-slate-900">{p.Statut}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
