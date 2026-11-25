import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppStateData, CraneStatus, Language, ReservationItem } from './types';
import {
  applyOptimisticUpdate,
  computeEngineOilStatus,
  dismissPaymentNotif,
  fetchAppState,
  getAdminPin,
  getChildPin,
  getLatestUnreadPaymentNotif,
  getSavedDriverAvatar,
  getSavedDriverName,
  isChildLocked,
  loadCachedState,
  loadOfflineQueue,
  postGasAction,
  setAdminPin,
  setChildLocked,
  setChildPin,
  setSavedDriverAvatar,
  setSavedDriverName,
  syncOfflineQueue,
} from './services/api';
import { t } from './i18n';
import { todayIsoDate } from './utils/media';
import { TopBar } from './components/TopBar';
import { PinModal } from './components/PinModal';
import { ChauffeurView } from './components/ChauffeurView';
import { AdminDashboard } from './components/AdminDashboard';

const LANG_KEY = 'grue25t_lang_v1';

export default function App() {
  const isAdminRoute =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('role') === 'admin';

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'ar' || saved === 'en' || saved === 'fr' ? saved : 'fr';
  });

  const [state, setState] = useState<AppStateData>(() => loadCachedState());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(() => loadOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  // Admin PIN gate (?role=admin or secret 5-tap on '25T' badge, default '1234' in localStorage)
  const [adminPin, setAdminPinState] = useState<string>(() => getAdminPin());
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminPinPrompt, setShowAdminPinPrompt] = useState(false);
  const isAdminActive = isAdminRoute || adminUnlocked;

  // Driver optional Child Lock PIN (bypassed when ?role=admin)
  const [childPinValue, setChildPinValue] = useState<string | null>(() => getChildPin());
  const [childLocked, setChildLockedState] = useState<boolean>(() =>
    !isAdminRoute && Boolean(getChildPin()) && isChildLocked()
  );
  const [showChildPinSetup, setShowChildPinSetup] = useState(false);
  const [chauffeurMenuOpen, setChauffeurMenuOpen] = useState(false);
  const [driverName, setDriverName] = useState<string>(() => getSavedDriverName());
  const [driverAvatar, setDriverAvatar] = useState<string | null>(() => getSavedDriverAvatar());
  const [openDriverModalTick, setOpenDriverModalTick] = useState(0);

  // Mutual Booking Notification Banner & Payment Notification Banner
  const [newBookingBanner, setNewBookingBanner] = useState<ReservationItem | null>(null);
  const [notifTick, setNotifTick] = useState(0);
  const lastGpsPingAtRef = useRef<number>(0);

  // End-of-Day 18:00 Reminder & Browser Notification State
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [eodDismissedDate, setEodDismissedDate] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));

  const paymentNotification = useMemo(
    () => getLatestUnreadPaymentNotif(state),
    [state, notifTick]
  );

  const oilStatus = useMemo(() => computeEngineOilStatus(state), [state]);

  const todayStr = todayIsoDate();
  const isAfter1800 = new Date(nowMs).getHours() >= 18;
  const hasTodayLog = useMemo(
    () =>
      state.travaux.some((tr) => tr.Date === todayStr) ||
      state.presences.some((p) => p.Date === todayStr),
    [state.travaux, state.presences, todayStr]
  );
  const showEodReminder =
    !isAdminActive && isAfter1800 && !hasTodayLog && eodDismissedDate !== todayStr;

  // Sync HTML dir and lang attribute for AR RTL / FR & EN LTR
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // Load initial state & refresh periodically
  const refreshData = useCallback(async () => {
    const { state: latest } = await fetchAppState();
    setState(latest);
    setPendingCount(loadOfflineQueue().length);
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      setPendingCount(loadOfflineQueue().length);
      await refreshData();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    refreshData();
    if (navigator.onLine && loadOfflineQueue().length > 0) {
      handleSyncNow();
    }
  }, [refreshData, handleSyncNow]);

  // Network online/offline listeners with auto-sync
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      handleSyncNow();
    };
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [handleSyncNow]);

  // 100% SILENT GPS on app load & visibilitychange (never displays any UI/text/icon to driver)
  const captureSilentGps = useCallback(async (): Promise<string | undefined> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

          setState((prev) => applyOptimisticUpdate(prev, 'auto_ping_gps', { GPS_Link: mapsLink }, false));

          const now = Date.now();
          if (now - lastGpsPingAtRef.current > 20000) {
            lastGpsPingAtRef.current = now;
            postGasAction(
              'auto_ping_gps',
              {
                GPS_Link: mapsLink,
                Latitude: lat,
                Longitude: lng,
                Timestamp: new Date().toISOString(),
              },
              { queueOnFail: false }
            ).catch(() => {});
          }
          resolve(mapsLink);
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, []);

  useEffect(() => {
    captureSilentGps();
    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
        captureSilentGps();
        refreshData();
      }
    };
    const interval = window.setInterval(() => setNowMs(Date.now()), 60000);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [captureSilentGps, refreshData]);

  // Trigger one-time daily local browser Notification at/after 18:00 if permitted and nothing logged today
  useEffect(() => {
    if (!showEodReminder || notifPermission !== 'granted') return;
    if (typeof Notification === 'undefined') return;
    const sentKey = `grue25t_eod_notif_${todayStr}`;
    try {
      if (localStorage.getItem(sentKey) === '1') return;
      new Notification(t(lang, 'eodReminderTitle'), {
        body: t(lang, 'eodReminderBody'),
      });
      localStorage.setItem(sentKey, '1');
    } catch {
      // Ignore Notification constructor errors on restricted mobile WebViews
    }
  }, [showEodReminder, notifPermission, todayStr, lang]);

  const handleRequestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    } catch {
      // Ignore permission request failure
    }
  }, []);

  // Unified action dispatcher with offline queue & optimistic local state
  const DRIVER_ATTRIBUTED_ACTIONS = useMemo(
    () =>
      new Set([
        'add_travail',
        'edit_last_travail',
        'remettre_argent',
        'add_revenu_mensuel',
        'add_presence',
        'add_reservation',
        'add_panne_checklist',
        'add_achat_maintenance',
        'add_bon_travail',
      ]),
    []
  );

  const handleAction = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const shouldAttachDriver = !isAdminActive && DRIVER_ATTRIBUTED_ACTIONS.has(action);
      const finalPayload = shouldAttachDriver
        ? { ...payload, Chauffeur: payload.Chauffeur || driverName }
        : payload;

      const result = await postGasAction(action, finalPayload, { queueOnFail: true });
      setState((prev) => applyOptimisticUpdate(prev, action, finalPayload, result.queuedOffline));
      setPendingCount(loadOfflineQueue().length);

      if (action === 'add_reservation') {
        setNewBookingBanner({
          id: String(finalPayload.id || Date.now()),
          Date: String(finalPayload.Date || ''),
          Heure: String(finalPayload.Heure || '08:00'),
          Client: String(finalPayload.Client || ''),
          Tel_Client: String(finalPayload.Tel_Client || ''),
          Lieu: String(finalPayload.Lieu || ''),
          Notes: String(finalPayload.Notes || ''),
          Cree_Par: (finalPayload.Cree_Par as 'Chauffeur' | 'Admin') || 'Chauffeur',
          Chauffeur: finalPayload.Chauffeur ? String(finalPayload.Chauffeur) : undefined,
          Statut: 'Actif',
          Created_At: String(finalPayload.Created_At || new Date().toISOString()),
        });
      } else if (action === 'cancel_reservation') {
        const cancelledId = String(finalPayload.id || '');
        setNewBookingBanner((prev) => (prev && prev.id === cancelledId ? null : prev));
      }
    },
    [DRIVER_ATTRIBUTED_ACTIONS, driverName, isAdminActive]
  );

  const handleChangeStatus = (status: CraneStatus) => {
    handleAction('set_statut_grue', { Statut_Grue: status });
  };

  const handleOpenChildLock = () => {
    setShowChildPinSetup(true);
  };

  // If ?role=admin is active and not yet unlocked, prompt for Admin PIN immediately
  if (isAdminRoute && !adminUnlocked) {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <PinModal
          lang={lang}
          mode="admin_verify"
          expectedPin={adminPin}
          onSuccess={() => setAdminUnlocked(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#0F172A]">
      <TopBar
        lang={lang}
        onChangeLang={setLang}
        isAdmin={isAdminActive}
        craneStatus={state.Statut_Grue}
        onChangeStatus={handleChangeStatus}
        soldeChauffeur={state.Solde_Chez_Chauffeur}
        maintenance={state.maintenance}
        oilStatus={oilStatus}
        reservations={state.reservations}
        newBookingBanner={newBookingBanner}
        onDismissBookingBanner={() => setNewBookingBanner(null)}
        paymentNotification={paymentNotification}
        onDismissPaymentNotif={(id) => {
          dismissPaymentNotif(id);
          setNotifTick((n) => n + 1);
        }}
        showEodReminder={showEodReminder}
        onDismissEodReminder={() => setEodDismissedDate(todayStr)}
        notificationPermission={notifPermission}
        onRequestNotifications={handleRequestNotifications}
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        childPinConfigured={Boolean(childPinValue)}
        onOpenChildLock={handleOpenChildLock}
        onOpenMenu={!isAdminActive ? () => setChauffeurMenuOpen(true) : undefined}
        driverName={driverName}
        onSaveDriverName={(name) => setDriverName(setSavedDriverName(name))}
        driverAvatar={driverAvatar}
        onSaveDriverAvatar={(dataUrl) => {
          setSavedDriverAvatar(dataUrl);
          setDriverAvatar(dataUrl);
        }}
        openDriverModalTick={openDriverModalTick}
        onTriggerAdminAuth={!isAdminActive ? () => setShowAdminPinPrompt(true) : undefined}
        onExitAdmin={!isAdminRoute && adminUnlocked ? () => setAdminUnlocked(false) : undefined}
      />

      {isAdminActive ? (
        <AdminDashboard
          lang={lang}
          state={state}
          onAction={handleAction}
          onChangeAdminPin={(newPin) => {
            const saved = setAdminPin(newPin);
            setAdminPinState(saved);
          }}
        />
      ) : (
        <ChauffeurView
          lang={lang}
          state={state}
          onAction={handleAction}
          onCaptureSilentGps={captureSilentGps}
          isMenuOpen={chauffeurMenuOpen}
          onCloseMenu={() => setChauffeurMenuOpen(false)}
          driverName={driverName}
          driverAvatar={driverAvatar}
          onOpenDriverProfile={() => setOpenDriverModalTick((n) => n + 1)}
        />
      )}

      {/* Secret 5-tap Admin PIN Prompt Modal */}
      {!isAdminActive && showAdminPinPrompt && (
        <PinModal
          lang={lang}
          mode="admin_verify"
          expectedPin={adminPin}
          onSuccess={() => {
            setShowAdminPinPrompt(false);
            setAdminUnlocked(true);
          }}
          onClose={() => setShowAdminPinPrompt(false)}
        />
      )}

      {/* Driver Child Lock Unlock Screen */}
      {!isAdminActive && childLocked && childPinValue && (
        <PinModal
          lang={lang}
          mode="child_unlock"
          expectedPin={childPinValue}
          onSuccess={() => {
            setChildLocked(false);
            setChildLockedState(false);
          }}
        />
      )}

      {/* Driver Child Lock PIN Setup / Lock / Disable Modal */}
      {!isAdminActive && showChildPinSetup && (
        <PinModal
          lang={lang}
          mode="child_setup"
          childLockAlreadySet={Boolean(childPinValue)}
          onSuccess={(newPin) => {
            setChildPin(newPin);
            setChildPinValue(newPin);
            setChildLocked(true);
            setChildLockedState(true);
            setShowChildPinSetup(false);
          }}
          onLockNow={() => {
            setChildLocked(true);
            setChildLockedState(true);
            setShowChildPinSetup(false);
          }}
          onDisableChildLock={() => {
            setChildPin(null);
            setChildPinValue(null);
            setChildLocked(false);
            setChildLockedState(false);
            setShowChildPinSetup(false);
          }}
          onClose={() => setShowChildPinSetup(false)}
        />
      )}
    </div>
  );
}
