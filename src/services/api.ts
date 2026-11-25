import {
  AchatMaintenanceItem,
  AdminKPIs,
  AppStateData,
  AvanceItem,
  BonTravailRequestItem,
  ChecklistConfigItem,
  ChecklistReportItem,
  CraneSpecItem,
  CraneStatus,
  DepannageContact,
  EngineOilTracker,
  LiftingAccessoryItem,
  MaintenanceDocItem,
  OfflineQueueItem,
  PanneChecklistItem,
  PaymentNotification,
  PieceReparationItem,
  PresenceItem,
  RemiseItem,
  ReservationItem,
  RevenuMensuelItem,
  TariffType,
  TravailItem,
} from '../types';

export const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyoAIMDxOENvDKSBhxAU3A408RPdU67Inr3M5SQsmT2r-_H70Vv6G6ePvZfg2XigDJU/exec';

const CACHE_KEY = 'grue25t_state_cache_v2';
const QUEUE_KEY = 'grue25t_offline_queue_v1';
const STAMP_KEY = 'grue25t_company_stamp_png_v1';
const ADMIN_PIN_KEY = 'grue25t_admin_pin_v1';
const CHILD_PIN_KEY = 'grue25t_child_pin_v1';
const CHILD_LOCKED_KEY = 'grue25t_child_locked_v1';
const LAST_TRAVAIL_TS_KEY = 'grue25t_last_travail_meta_v1';
const DISMISSED_PAYMENT_NOTIFS_KEY = 'grue25t_dismissed_payment_notifs_v1';
const HIDDEN_CANCELLED_RES_KEY = 'grue25t_hidden_cancelled_res_v1';
const DRIVER_NAME_KEY = 'grue25t_driver_name_v1';
const DRIVER_AVATAR_KEY = 'grue25t_driver_avatar_v1';
const CHECKLIST_CONFIG_KEY = 'grue25t_checklist_config_v1';

export const DEFAULT_ADMIN_PIN = '1234';

function localTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createDefaultOilTracker(): EngineOilTracker {
  return {
    calibratedHours: 0,
    lastOilChangeHours: 0,
    oilIntervalHours: 250,
    lastCalibrationDate: localTodayIso(),
    lastCalibrationAtMs: Date.now(),
    initialized: false,
  };
}

export function createEmptyState(): AppStateData {
  return {
    Statut_Grue: 'Disponible',
    Solde_Chez_Chauffeur: 0,
    oilTracker: createDefaultOilTracker(),
    travaux: [],
    bons_travail: [],
    achats_maintenance: [],
    remises: [],
    avances: [],
    reservations: [],
    presences: [],
    pannes: [],
    maintenance: [],
    pieces: [],
    revenus_mensuels: [],
    contacts: [],
    specs: [],
    accessories: [],
    customTags: [],
    hiddenDefaultTags: [],
  };
}

export function isReservationCancelled(r: ReservationItem): boolean {
  const statut = String(r.Statut || '').toLowerCase();
  return statut.includes('annul') || statut.includes('cancel') || Boolean(r.Cancelled_At);
}

export function isWithinLast60Days(dateStr: string | undefined): boolean {
  if (!dateStr) return true;
  const normalized = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return true;
  const diffMs = Date.now() - parsed.getTime();
  return diffMs <= 60 * 24 * 60 * 60 * 1000;
}

export function loadCachedState(): AppStateData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as Partial<AppStateData>;
    const defaults = createEmptyState();
    return {
      ...defaults,
      ...parsed,
      oilTracker: {
        ...defaults.oilTracker,
        ...(parsed.oilTracker || {}),
      },
      bons_travail: Array.isArray(parsed.bons_travail) ? parsed.bons_travail : [],
      customTags: Array.isArray(parsed.customTags) ? parsed.customTags : [],
      hiddenDefaultTags: Array.isArray(parsed.hiddenDefaultTags) ? parsed.hiddenDefaultTags : [],
    };
  } catch {
    return createEmptyState();
  }
}

export function saveCachedState(state: AppStateData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota overflow on large base64 media
  }
}

export function loadOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getSavedStampPng(): string | null {
  return localStorage.getItem(STAMP_KEY);
}

export function saveStampPng(dataUrl: string): void {
  localStorage.setItem(STAMP_KEY, dataUrl);
}

export function getAdminPin(): string {
  try {
    const raw = localStorage.getItem(ADMIN_PIN_KEY);
    if (raw && /^\d{4}$/.test(raw)) {
      return raw;
    }
    localStorage.setItem(ADMIN_PIN_KEY, DEFAULT_ADMIN_PIN);
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_ADMIN_PIN;
}

export function setAdminPin(pin: string): string {
  const cleaned = pin.trim();
  if (!/^\d{4}$/.test(cleaned)) {
    return getAdminPin();
  }
  try {
    localStorage.setItem(ADMIN_PIN_KEY, cleaned);
  } catch {
    // Ignore storage errors
  }
  return cleaned;
}

export function getChildPin(): string | null {
  return localStorage.getItem(CHILD_PIN_KEY);
}

export function setChildPin(pin: string | null): void {
  if (pin) {
    localStorage.setItem(CHILD_PIN_KEY, pin);
  } else {
    localStorage.removeItem(CHILD_PIN_KEY);
    localStorage.removeItem(CHILD_LOCKED_KEY);
  }
}

export function isChildLocked(): boolean {
  return localStorage.getItem(CHILD_LOCKED_KEY) === 'true';
}

export function setChildLocked(locked: boolean): void {
  localStorage.setItem(CHILD_LOCKED_KEY, locked ? 'true' : 'false');
}

export function getLastTravailEditWindow(): { id: string; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(LAST_TRAVAIL_TS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id: string; timestamp: number };
    const elapsedMs = Date.now() - parsed.timestamp;
    if (elapsedMs > 15 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setLastTravailEditWindow(id: string): void {
  localStorage.setItem(LAST_TRAVAIL_TS_KEY, JSON.stringify({ id, timestamp: Date.now() }));
}

export function getDismissedPaymentNotifs(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_PAYMENT_NOTIFS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function dismissPaymentNotif(id: string): void {
  const prev = getDismissedPaymentNotifs();
  if (!prev.includes(id)) {
    localStorage.setItem(DISMISSED_PAYMENT_NOTIFS_KEY, JSON.stringify([...prev, id]));
  }
}

export function getHiddenCancelledReservationIds(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_CANCELLED_RES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hideCancelledReservationLocally(id: string): string[] {
  const prev = getHiddenCancelledReservationIds();
  if (prev.includes(id)) return prev;
  const next = [...prev, id];
  localStorage.setItem(HIDDEN_CANCELLED_RES_KEY, JSON.stringify(next));
  return next;
}

export function getRawDriverName(): string {
  try {
    return localStorage.getItem(DRIVER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function getSavedDriverName(): string {
  const raw = getRawDriverName().trim();
  return raw || 'Principal';
}

export function setSavedDriverName(name: string): string {
  const trimmed = name.trim();
  try {
    if (trimmed) {
      localStorage.setItem(DRIVER_NAME_KEY, trimmed);
    } else {
      localStorage.removeItem(DRIVER_NAME_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  return trimmed || 'Principal';
}

export function getSavedDriverAvatar(): string | null {
  try {
    return localStorage.getItem(DRIVER_AVATAR_KEY);
  } catch {
    return null;
  }
}

export function setSavedDriverAvatar(dataUrl: string | null): void {
  try {
    if (dataUrl) {
      localStorage.setItem(DRIVER_AVATAR_KEY, dataUrl);
    } else {
      localStorage.removeItem(DRIVER_AVATAR_KEY);
    }
  } catch {
    // Ignore storage quota overflow
  }
}

export const DEFAULT_CHECKLIST_ITEMS: ChecklistConfigItem[] = [
  { id: 'huileMoteur', labelKey: 'checkEngineOil' },
  { id: 'huileHydraulique', labelKey: 'checkHydraulicOil' },
  { id: 'cablesCrochets', labelKey: 'checkCablesHooks' },
  { id: 'stabilisateurs', labelKey: 'checkOutriggers' },
  { id: 'freinsAir', labelKey: 'checkBrakesAir' },
  { id: 'eclairageGyrophare', labelKey: 'checkLightsBeacon' },
];

export function loadChecklistConfig(): ChecklistConfigItem[] {
  try {
    const raw = localStorage.getItem(CHECKLIST_CONFIG_KEY);
    if (!raw) return DEFAULT_CHECKLIST_ITEMS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_CHECKLIST_ITEMS;
    return parsed.filter(
      (it): it is ChecklistConfigItem =>
        Boolean(it && typeof it === 'object' && typeof (it as ChecklistConfigItem).id === 'string')
    );
  } catch {
    return DEFAULT_CHECKLIST_ITEMS;
  }
}

export function saveChecklistConfig(items: ChecklistConfigItem[]): void {
  try {
    localStorage.setItem(CHECKLIST_CONFIG_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

export function getLatestUnreadPaymentNotif(state: AppStateData): PaymentNotification | null {
  const dismissed = new Set(getDismissedPaymentNotifs());
  const candidates: PaymentNotification[] = state.avances
    .filter((a) => !dismissed.has(a.id))
    .map((a) => ({
      id: a.id,
      amount: Number(a.Montant || 0),
      date: a.Date,
      type: a.Type_Paiement || 'Avance',
      motif: a.Motif,
    }));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return candidates[0];
}

function normalizeRemotePayload(raw: Record<string, unknown>, current: AppStateData): AppStateData {
  const pickArray = <T>(...keys: string[]): T[] | undefined => {
    for (const k of keys) {
      if (Array.isArray(raw[k])) return raw[k] as T[];
    }
    return undefined;
  };

  const statusVal = (raw.Statut_Grue || raw.statut_grue || raw.statut) as CraneStatus | undefined;
  const soldeVal = raw.Solde_Chez_Chauffeur ?? raw.solde_chez_chauffeur;

  return {
    ...current,
    Statut_Grue: statusVal || current.Statut_Grue,
    Solde_Chez_Chauffeur:
      typeof soldeVal === 'number' || typeof soldeVal === 'string'
        ? Number(soldeVal)
        : current.Solde_Chez_Chauffeur,
    Last_GPS_Link: (raw.Last_GPS_Link as string) || current.Last_GPS_Link,
    oilTracker:
      raw.oilTracker && typeof raw.oilTracker === 'object'
        ? { ...current.oilTracker, ...(raw.oilTracker as Partial<EngineOilTracker>) }
        : current.oilTracker,
    travaux: pickArray<TravailItem>('travaux', 'Travaux') ?? current.travaux,
    bons_travail:
      pickArray<BonTravailRequestItem>('bons_travail', 'Bons_Travail') ?? current.bons_travail,
    achats_maintenance:
      pickArray<AchatMaintenanceItem>('achats_maintenance', 'Achats_Maintenance') ??
      current.achats_maintenance,
    remises: pickArray<RemiseItem>('remises', 'Remises') ?? current.remises,
    avances: pickArray<AvanceItem>('avances', 'Avances') ?? current.avances,
    reservations: pickArray<ReservationItem>('reservations', 'Reservations') ?? current.reservations,
    presences: pickArray<PresenceItem>('presences', 'Presences', 'Presence') ?? current.presences,
    pannes: pickArray<PanneChecklistItem>('pannes', 'Pannes', 'Pannes_Checklist') ?? current.pannes,
    maintenance: pickArray<MaintenanceDocItem>('maintenance', 'Maintenance') ?? current.maintenance,
    pieces: pickArray<PieceReparationItem>('pieces', 'Pieces', 'Pieces_Reparations') ?? current.pieces,
    revenus_mensuels:
      pickArray<RevenuMensuelItem>('revenus_mensuels', 'Revenus_Mensuels') ??
      current.revenus_mensuels,
    contacts: pickArray<DepannageContact>('contacts', 'Contacts') ?? current.contacts,
    specs: pickArray<CraneSpecItem>('specs', 'Specs', 'Fiche_Technique') ?? current.specs,
    accessories:
      pickArray<LiftingAccessoryItem>('accessories', 'Accessories', 'Accessoires') ??
      current.accessories,
    customTags: pickArray<string>('customTags', 'Custom_Tags') ?? current.customTags,
    hiddenDefaultTags:
      pickArray<string>('hiddenDefaultTags', 'Hidden_Default_Tags') ?? current.hiddenDefaultTags,
    kpis: (raw.kpis as Partial<AdminKPIs>) || current.kpis,
  };
}

export async function fetchAppState(): Promise<{ state: AppStateData; synced: boolean }> {
  const local = loadCachedState();
  if (!navigator.onLine) {
    return { state: local, synced: false };
  }

  try {
    const res = await fetch('/api/gas', { method: 'GET' });
    if (!res.ok) return { state: local, synced: false };
    const json = (await res.json()) as { ok: boolean; data?: Record<string, unknown> };
    if (json.ok && json.data && typeof json.data === 'object') {
      const merged = normalizeRemotePayload(json.data, local);
      saveCachedState(merged);
      return { state: merged, synced: true };
    }
    return { state: local, synced: false };
  } catch {
    return { state: local, synced: false };
  }
}

export function applyOptimisticUpdate(
  state: AppStateData,
  action: string,
  payload: Record<string, unknown>,
  isOffline: boolean
): AppStateData {
  const next: AppStateData = {
    ...state,
    oilTracker: { ...state.oilTracker },
    travaux: [...state.travaux],
    bons_travail: [...state.bons_travail],
    achats_maintenance: [...state.achats_maintenance],
    remises: [...state.remises],
    avances: [...state.avances],
    reservations: [...state.reservations],
    presences: [...state.presences],
    pannes: [...state.pannes],
    maintenance: [...state.maintenance],
    pieces: [...state.pieces],
    revenus_mensuels: [...state.revenus_mensuels],
    contacts: [...state.contacts],
    specs: [...state.specs],
    accessories: [...state.accessories],
    customTags: [...state.customTags],
    hiddenDefaultTags: [...state.hiddenDefaultTags],
  };

  if (action === 'set_statut_grue' && payload.Statut_Grue) {
    next.Statut_Grue = payload.Statut_Grue as CraneStatus;
  } else if (action === 'auto_ping_gps' && payload.GPS_Link) {
    next.Last_GPS_Link = String(payload.GPS_Link);
    next.Last_GPS_Time = new Date().toISOString();
  } else if (action === 'add_travail') {
    const id = String(payload.id || `tr-${Date.now()}`);
    const encaisse = Number(payload.Montant_Encaisse || 0);
    const depenses = Number(payload.Depenses || 0);
    const item: TravailItem = {
      id,
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Heure_Debut: payload.Heure_Debut ? String(payload.Heure_Debut) : undefined,
      Heure_Fin: payload.Heure_Fin ? String(payload.Heure_Fin) : undefined,
      Duree: Number(payload.Duree || 0),
      Mode_Tarif: (payload.Mode_Tarif as TravailItem['Mode_Tarif']) || 'Horaire/Journalier',
      Quantite_Tache: payload.Quantite_Tache ? Number(payload.Quantite_Tache) : undefined,
      Description_Tache: payload.Description_Tache ? String(payload.Description_Tache) : undefined,
      Client: String(payload.Client || ''),
      Tel_Client: String(payload.Tel_Client || ''),
      Type_Tarif: (payload.Type_Tarif as TariffType) || 'Normal',
      Prix_Total: Number(payload.Prix_Total || 0),
      Montant_Encaisse: encaisse,
      Depenses: depenses,
      Prime_Chauffeur: Number(payload.Prime_Chauffeur || 0),
      Tags: Array.isArray(payload.Tags) ? (payload.Tags as string[]) : [],
      Notes: String(payload.Notes || ''),
      Audio_Base64: payload.Audio_Base64 ? String(payload.Audio_Base64) : undefined,
      Photo_Base64: payload.Photo_Base64 ? String(payload.Photo_Base64) : undefined,
      GPS_Link: payload.GPS_Link ? String(payload.GPS_Link) : undefined,
      Distance_Km: Number(payload.Distance_Km || 0),
      Chauffeur: payload.Chauffeur ? String(payload.Chauffeur) : undefined,
      CreatedAtMs: Date.now(),
      isOffline,
    };
    next.travaux.unshift(item);
    next.Solde_Chez_Chauffeur = Math.max(0, next.Solde_Chez_Chauffeur + encaisse - depenses);
    setLastTravailEditWindow(id);
  } else if (action === 'edit_last_travail') {
    const targetId = String(payload.id || '');
    const idx = next.travaux.findIndex((t) => t.id === targetId);
    if (idx !== -1) {
      const prev = next.travaux[idx];
      const prevNet = prev.Montant_Encaisse - prev.Depenses;
      const newEncaisse = Number(payload.Montant_Encaisse ?? prev.Montant_Encaisse);
      const newDepenses = Number(payload.Depenses ?? prev.Depenses);
      const newNet = newEncaisse - newDepenses;
      next.travaux[idx] = {
        ...prev,
        ...payload,
        Montant_Encaisse: newEncaisse,
        Depenses: newDepenses,
        isOffline,
      } as TravailItem;
      next.Solde_Chez_Chauffeur = Math.max(0, next.Solde_Chez_Chauffeur - prevNet + newNet);
    }
  } else if (action === 'save_custom_tag') {
    const tag = String(payload.tag || '').trim();
    if (tag && !next.customTags.includes(tag)) {
      next.customTags.push(tag);
    }
  } else if (action === 'delete_custom_tag') {
    const tag = String(payload.tag || '').trim();
    next.customTags = next.customTags.filter((t) => t !== tag);
  } else if (action === 'delete_default_tag') {
    const tag = String(payload.tag || '').trim();
    if (tag && !next.hiddenDefaultTags.includes(tag)) {
      next.hiddenDefaultTags.push(tag);
    }
  } else if (action === 'calibrate_oil_tracker') {
    const computedBefore = computeEngineOilStatus(state);
    const newCalibrated =
      payload.calibratedHours !== undefined
        ? Number(payload.calibratedHours)
        : computedBefore.currentMachineHours;
    const newInterval = Math.max(
      1,
      Number(payload.oilIntervalHours ?? next.oilTracker.oilIntervalHours ?? 250)
    );
    const markDone = Boolean(payload.markOilDone);
    const explicitLastOil =
      payload.lastOilChangeHours !== undefined ? Number(payload.lastOilChangeHours) : undefined;
    const newLastOil = markDone
      ? newCalibrated
      : explicitLastOil !== undefined
        ? explicitLastOil
        : !next.oilTracker.initialized
          ? newCalibrated
          : next.oilTracker.lastOilChangeHours;

    next.oilTracker = {
      calibratedHours: newCalibrated,
      lastOilChangeHours: newLastOil,
      oilIntervalHours: newInterval,
      lastCalibrationDate: localTodayIso(),
      lastCalibrationAtMs: Date.now(),
      initialized: true,
    };
  } else if (action === 'add_bon_travail') {
    const bon: BonTravailRequestItem = {
      id: String(payload.id || `bon-${Date.now()}`),
      Date: String(payload.Date || localTodayIso()),
      Client: String(payload.Client || ''),
      Lieu: String(payload.Lieu || ''),
      Heures_Travail: String(payload.Heures_Travail || ''),
      Statut: 'En attente',
      isOffline,
    };
    next.bons_travail.unshift(bon);
  } else if (action === 'update_bon_travail') {
    const id = String(payload.id || '');
    next.bons_travail = next.bons_travail.map((b) =>
      b.id === id
        ? {
            ...b,
            Date: payload.Date ? String(payload.Date) : b.Date,
            Client: payload.Client !== undefined ? String(payload.Client) : b.Client,
            Lieu: payload.Lieu !== undefined ? String(payload.Lieu) : b.Lieu,
            Heures_Travail:
              payload.Heures_Travail !== undefined
                ? String(payload.Heures_Travail)
                : b.Heures_Travail,
          }
        : b
    );
  } else if (action === 'valider_bon_demande') {
    const id = String(payload.id || '');
    next.bons_travail = next.bons_travail.map((b) =>
      b.id === id
        ? {
            ...b,
            Date: payload.Date ? String(payload.Date) : b.Date,
            Client: payload.Client !== undefined ? String(payload.Client) : b.Client,
            Lieu: payload.Lieu !== undefined ? String(payload.Lieu) : b.Lieu,
            Heures_Travail:
              payload.Heures_Travail !== undefined
                ? String(payload.Heures_Travail)
                : b.Heures_Travail,
            Statut: 'Validé',
            Date_Validation: localTodayIso(),
          }
        : b
    );
  } else if (action === 'add_achat_maintenance') {
    const montant = Number(payload.Montant || 0);
    const achat: AchatMaintenanceItem = {
      id: String(payload.id || `ach-${Date.now()}`),
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Categorie:
        (payload.Categorie as AchatMaintenanceItem['Categorie']) || 'Mazout',
      Description: String(payload.Description || ''),
      Montant: montant,
      Photo_Base64: payload.Photo_Base64 ? String(payload.Photo_Base64) : undefined,
      Notes: String(payload.Notes || ''),
      Cree_Par: (payload.Cree_Par as 'Chauffeur' | 'Admin') || 'Chauffeur',
      isOffline,
    };
    next.achats_maintenance.unshift(achat);
    next.Solde_Chez_Chauffeur = Math.max(0, next.Solde_Chez_Chauffeur - montant);
  } else if (action === 'remettre_argent') {
    const montant = Number(payload.Montant_Remis || 0);
    const remise: RemiseItem = {
      id: String(payload.id || `rem-${Date.now()}`),
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Montant_Remis: montant,
      Notes: String(payload.Notes || ''),
      Statut: 'En attente',
      Chauffeur: payload.Chauffeur ? String(payload.Chauffeur) : undefined,
      isOffline,
    };
    next.remises.unshift(remise);
    next.Solde_Chez_Chauffeur = Math.max(0, next.Solde_Chez_Chauffeur - montant);
  } else if (action === 'confirmer_reception') {
    const id = String(payload.id || '');
    next.remises = next.remises.map((r) =>
      r.id === id
        ? { ...r, Statut: 'Confirmé', Date_Confirmation: new Date().toISOString().slice(0, 10) }
        : r
    );
  } else if (action === 'add_avance') {
    const montant = Number(payload.Montant || 0);
    const typePaiement = (payload.Type_Paiement as AvanceItem['Type_Paiement']) || 'Avance';
    const avance: AvanceItem = {
      id: String(payload.id || `av-${Date.now()}`),
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Montant: montant,
      Motif: String(payload.Motif || ''),
      Type_Paiement: typePaiement,
      isOffline,
    };
    next.avances.unshift(avance);
    if (typePaiement === 'Avance') {
      next.Solde_Chez_Chauffeur += montant;
    }
  } else if (action === 'add_reservation') {
    const resItem: ReservationItem = {
      id: String(payload.id || `res-${Date.now()}`),
      Date: String(payload.Date || ''),
      Heure: String(payload.Heure || '08:00'),
      Client: String(payload.Client || ''),
      Tel_Client: String(payload.Tel_Client || ''),
      Lieu: String(payload.Lieu || ''),
      Duree_Estimee: Number(payload.Duree_Estimee || 0),
      Notes: String(payload.Notes || ''),
      Cree_Par: (payload.Cree_Par as 'Chauffeur' | 'Admin') || 'Chauffeur',
      Chauffeur: payload.Chauffeur ? String(payload.Chauffeur) : undefined,
      Statut: 'Actif',
      Created_At: String(payload.Created_At || new Date().toISOString()),
      isOffline,
    };
    next.reservations.unshift(resItem);
  } else if (action === 'cancel_reservation') {
    const id = String(payload.id || '');
    const cancelledAt = String(payload.Cancelled_At || new Date().toISOString());
    const cancelledBy = (payload.Cancelled_By as 'Chauffeur' | 'Admin') || 'Chauffeur';
    next.reservations = next.reservations.map((r) =>
      r.id === id
        ? {
            ...r,
            Statut: 'Annulé',
            Cancelled_At: cancelledAt,
            Cancelled_By: cancelledBy,
            isOffline,
          }
        : r
    );
  } else if (action === 'delete_reservation_admin') {
    const id = String(payload.id || '');
    next.reservations = next.reservations.filter((r) => r.id !== id);
  } else if (action === 'add_presence') {
    const pres: PresenceItem = {
      id: String(payload.id || `pres-${Date.now()}`),
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Statut: (payload.Statut as PresenceItem['Statut']) || 'Travail',
      Notes: String(payload.Notes || ''),
      Chauffeur: payload.Chauffeur ? String(payload.Chauffeur) : undefined,
      isOffline,
    };
    next.presences.unshift(pres);
  } else if (action === 'add_panne_checklist') {
    const panne: PanneChecklistItem = {
      id: String(payload.id || `pan-${Date.now()}`),
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Checklist: payload.Checklist as PanneChecklistItem['Checklist'],
      Checklist_Details: Array.isArray(payload.Checklist_Details)
        ? (payload.Checklist_Details as ChecklistReportItem[])
        : undefined,
      Has_Panne: Boolean(payload.Has_Panne),
      Type_Panne: payload.Type_Panne ? String(payload.Type_Panne) : undefined,
      Gravite: payload.Gravite as PanneChecklistItem['Gravite'],
      Description: payload.Description ? String(payload.Description) : undefined,
      Photo_Base64: payload.Photo_Base64 ? String(payload.Photo_Base64) : undefined,
      Video_Base64: payload.Video_Base64 ? String(payload.Video_Base64) : undefined,
      Audio_Base64: payload.Audio_Base64 ? String(payload.Audio_Base64) : undefined,
      Chauffeur: payload.Chauffeur ? String(payload.Chauffeur) : undefined,
      isOffline,
    };
    next.pannes.unshift(panne);
    if (panne.Has_Panne && panne.Gravite === 'Critique') {
      next.Statut_Grue = 'En Maintenance';
    }
  } else if (action === 'add_revenu_mensuel') {
    const rev: RevenuMensuelItem = {
      id: String(payload.id || `rev-${Date.now()}`),
      Mois: String(payload.Mois || new Date().toISOString().slice(0, 7)),
      Montant: Number(payload.Montant || 0),
      Heures_Supplementaires: payload.Heures_Supplementaires
        ? Number(payload.Heures_Supplementaires)
        : 0,
      Description: String(payload.Description || ''),
      Notes: String(payload.Notes || ''),
      Chauffeur: payload.Chauffeur ? String(payload.Chauffeur) : undefined,
      isOffline,
    };
    next.revenus_mensuels.unshift(rev);
  } else if (action === 'update_note_text') {
    const id = String(payload.id || '');
    next.travaux = next.travaux.map((t) =>
      t.id === id ? { ...t, Notes: String(payload.Notes || '') } : t
    );
  } else if (action === 'valider_bon_travail') {
    const id = String(payload.id || '');
    next.travaux = next.travaux.map((t) =>
      t.id === id
        ? { ...t, Valide_Bon: true, Date_Validation: new Date().toISOString().slice(0, 10) }
        : t
    );
  } else if (action === 'add_piece') {
    const piece: PieceReparationItem = {
      id: String(payload.id || `pc-${Date.now()}`),
      Date: String(payload.Date || new Date().toISOString().slice(0, 10)),
      Nom_Piece: String(payload.Nom_Piece || ''),
      Fournisseur: String(payload.Fournisseur || ''),
      Cout: Number(payload.Cout || 0),
      Compteur: payload.Compteur ? String(payload.Compteur) : undefined,
      Notes: String(payload.Notes || ''),
      Photo_Base64: payload.Photo_Base64 ? String(payload.Photo_Base64) : undefined,
      isOffline,
    };
    next.pieces.unshift(piece);
  } else if (action === 'update_maintenance') {
    const item = payload.item as MaintenanceDocItem;
    const exists = next.maintenance.some((m) => m.id === item.id);
    if (exists) {
      next.maintenance = next.maintenance.map((m) => (m.id === item.id ? item : m));
    } else {
      next.maintenance.unshift(item);
    }
  } else if (action === 'save_contact') {
    const contact = payload.contact as DepannageContact;
    const exists = next.contacts.some((c) => c.id === contact.id);
    next.contacts = exists
      ? next.contacts.map((c) => (c.id === contact.id ? contact : c))
      : [contact, ...next.contacts];
  } else if (action === 'delete_contact') {
    const id = String(payload.id || '');
    next.contacts = next.contacts.filter((c) => c.id !== id);
  } else if (action === 'approve_contact') {
    const id = String(payload.id || '');
    next.contacts = next.contacts.map((c) =>
      c.id === id
        ? { nom: c.nom, specialite: c.specialite, telephone: c.telephone, id: c.id, approvalStatus: 'approved' }
        : c
    );
  } else if (action === 'reject_contact') {
    const id = String(payload.id || '');
    const target = next.contacts.find((c) => c.id === id);
    if (target) {
      if (target.pendingAction === 'edit' && target.previousSnapshot) {
        next.contacts = next.contacts.map((c) =>
          c.id === id
            ? {
                id: c.id,
                ...target.previousSnapshot!,
                approvalStatus: 'approved',
              }
            : c
        );
      } else {
        next.contacts = next.contacts.filter((c) => c.id !== id);
      }
    }
  } else if (action === 'save_spec') {
    const spec = payload.spec as CraneSpecItem;
    const exists = next.specs.some((s) => s.id === spec.id);
    next.specs = exists
      ? next.specs.map((s) => (s.id === spec.id ? spec : s))
      : [...next.specs, spec];
  } else if (action === 'delete_spec') {
    const id = String(payload.id || '');
    next.specs = next.specs.filter((s) => s.id !== id);
  } else if (action === 'approve_spec') {
    const id = String(payload.id || '');
    next.specs = next.specs.map((s) =>
      s.id === id
        ? { id: s.id, label: s.label, value: s.value, approvalStatus: 'approved' }
        : s
    );
  } else if (action === 'reject_spec') {
    const id = String(payload.id || '');
    const target = next.specs.find((s) => s.id === id);
    if (target) {
      if (target.pendingAction === 'edit' && target.previousSnapshot) {
        next.specs = next.specs.map((s) =>
          s.id === id
            ? { id: s.id, ...target.previousSnapshot!, approvalStatus: 'approved' }
            : s
        );
      } else {
        next.specs = next.specs.filter((s) => s.id !== id);
      }
    }
  } else if (action === 'save_accessory') {
    const accessory = payload.accessory as LiftingAccessoryItem;
    const exists = next.accessories.some((a) => a.id === accessory.id);
    next.accessories = exists
      ? next.accessories.map((a) => (a.id === accessory.id ? accessory : a))
      : [...next.accessories, accessory];
  } else if (action === 'delete_accessory') {
    const id = String(payload.id || '');
    next.accessories = next.accessories.filter((a) => a.id !== id);
  } else if (action === 'approve_accessory') {
    const id = String(payload.id || '');
    next.accessories = next.accessories.map((a) =>
      a.id === id
        ? {
            id: a.id,
            code: a.code,
            customName: a.customName,
            details: a.details,
            approvalStatus: 'approved',
          }
        : a
    );
  } else if (action === 'reject_accessory') {
    const id = String(payload.id || '');
    const target = next.accessories.find((a) => a.id === id);
    if (target) {
      if (target.pendingAction === 'edit' && target.previousSnapshot) {
        next.accessories = next.accessories.map((a) =>
          a.id === id
            ? { id: a.id, ...target.previousSnapshot!, approvalStatus: 'approved' }
            : a
        );
      } else {
        next.accessories = next.accessories.filter((a) => a.id !== id);
      }
    }
  }

  saveCachedState(next);
  return next;
}

export async function postGasAction(
  action: string,
  payload: Record<string, unknown>,
  options?: { queueOnFail?: boolean }
): Promise<{ ok: boolean; queuedOffline: boolean }> {
  const body = { action, ...payload };
  const queueOnFail = options?.queueOnFail ?? true;

  if (!navigator.onLine) {
    if (queueOnFail) {
      enqueueOffline(action, payload);
      return { ok: true, queuedOffline: true };
    }
    return { ok: false, queuedOffline: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok && res.status >= 500) {
      if (queueOnFail) {
        enqueueOffline(action, payload);
        return { ok: true, queuedOffline: true };
      }
      return { ok: false, queuedOffline: false };
    }

    return { ok: true, queuedOffline: false };
  } catch {
    if (queueOnFail) {
      enqueueOffline(action, payload);
      return { ok: true, queuedOffline: true };
    }
    return { ok: false, queuedOffline: false };
  }
}

function enqueueOffline(action: string, payload: Record<string, unknown>): void {
  const queue = loadOfflineQueue();
  queue.push({
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    payload,
    createdAt: new Date().toISOString(),
  });
  saveOfflineQueue(queue);
}

export async function syncOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  if (!navigator.onLine) {
    return { synced: 0, remaining: loadOfflineQueue().length };
  }

  const queue = loadOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining: OfflineQueueItem[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: item.action, ...item.payload }),
      });
      if (res.ok) {
        synced += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);

  if (synced > 0) {
    const state = loadCachedState();
    const cleaned: AppStateData = {
      ...state,
      travaux: state.travaux.map((t) => ({ ...t, isOffline: false })),
      bons_travail: state.bons_travail.map((b) => ({ ...b, isOffline: false })),
      achats_maintenance: state.achats_maintenance.map((a) => ({ ...a, isOffline: false })),
      remises: state.remises.map((r) => ({ ...r, isOffline: false })),
      avances: state.avances.map((a) => ({ ...a, isOffline: false })),
      reservations: state.reservations.map((r) => ({ ...r, isOffline: false })),
      presences: state.presences.map((p) => ({ ...p, isOffline: false })),
      pannes: state.pannes.map((p) => ({ ...p, isOffline: false })),
      pieces: state.pieces.map((p) => ({ ...p, isOffline: false })),
      revenus_mensuels: state.revenus_mensuels.map((r) => ({ ...r, isOffline: false })),
    };
    saveCachedState(cleaned);
  }

  return { synced, remaining: remaining.length };
}

export async function transcribeAudioNote(
  audioBase64: string,
  languageHint: string
): Promise<string> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, languageHint }),
  });

  const data = (await res.json()) as { transcription?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Transcription error');
  }
  return data.transcription || '';
}

export function computeAdminKPIs(state: AppStateData): AdminKPIs {
  const remote = state.kpis || {};
  const travauxEncaisse = state.travaux.reduce((s, t) => s + Number(t.Montant_Encaisse || 0), 0);
  const travauxTotal = state.travaux.reduce((s, t) => s + Number(t.Prix_Total || 0), 0);
  const travauxDepenses = state.travaux.reduce((s, t) => s + Number(t.Depenses || 0), 0);
  const achatsDepenses = state.achats_maintenance.reduce((s, a) => s + Number(a.Montant || 0), 0);
  const piecesDepenses = state.pieces.reduce((s, p) => s + Number(p.Cout || 0), 0);
  const totalPrimes = state.travaux.reduce((s, t) => s + Number(t.Prime_Chauffeur || 0), 0);
  const totalAvances = state.avances.reduce((s, a) => s + Number(a.Montant || 0), 0);
  const totalConfirmes = state.remises
    .filter((r) => r.Statut === 'Confirmé')
    .reduce((s, r) => s + Number(r.Montant_Remis || 0), 0);
  const resteClients = state.travaux.reduce(
    (s, t) => s + Math.max(0, Number(t.Prix_Total || 0) - Number(t.Montant_Encaisse || 0)),
    0
  );
  const revenusManuels = state.revenus_mensuels.reduce((s, r) => s + Number(r.Montant || 0), 0);
  const totalKm = state.travaux.reduce((s, t) => s + Number(t.Distance_Km || 0), 0);

  const totalDepenses = travauxDepenses + achatsDepenses + piecesDepenses;

  // Monthly True Hourly Operating Cost:
  // (Current month fuel + maintenance/parts) / (Current month logged hours + 7h fallback per unlogged passed working day)
  const today = localTodayIso();
  const currentMonth = today.slice(0, 7);
  const monthlyAchats = state.achats_maintenance
    .filter((a) => (a.Date || '').startsWith(currentMonth))
    .reduce((s, a) => s + Number(a.Montant || 0), 0);
  const monthlyPieces = state.pieces
    .filter((p) => (p.Date || '').startsWith(currentMonth))
    .reduce((s, p) => s + Number(p.Cout || 0), 0);
  const monthlyFuelMaintExpenses = monthlyAchats + monthlyPieces;

  const monthHoursByDate = new Map<string, number>();
  const monthHasEntryOnDate = new Set<string>();
  let futureMonthHours = 0;

  for (const tr of state.travaux) {
    if (!tr.Date || !tr.Date.startsWith(currentMonth)) continue;
    monthHasEntryOnDate.add(tr.Date);
    const hrs = Number(tr.Duree || 0);
    if (tr.Date > today) {
      futureMonthHours += hrs;
    } else if (hrs > 0) {
      monthHoursByDate.set(tr.Date, (monthHoursByDate.get(tr.Date) || 0) + hrs);
    }
  }

  const presenceByDate = new Map<string, PresenceItem['Statut']>();
  for (const p of state.presences) {
    if (p.Date && p.Date.startsWith(currentMonth)) {
      presenceByDate.set(p.Date, p.Statut);
    }
  }

  let monthlyHours = futureMonthHours;
  const monthStart = new Date(`${currentMonth}-01T12:00:00`);
  const monthEnd = new Date(`${today}T12:00:00`);
  if (!Number.isNaN(monthStart.getTime()) && !Number.isNaN(monthEnd.getTime())) {
    const cursor = new Date(monthStart);
    let guard = 0;
    while (cursor <= monthEnd && guard < 32) {
      guard += 1;
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;

      const loggedHrs = monthHoursByDate.get(iso) || 0;
      if (loggedHrs > 0) {
        monthlyHours += loggedHrs;
      } else if (iso < today) {
        const presence = presenceByDate.get(iso);
        const dayOfWeek = cursor.getDay(); // 5 = Friday
        const isExplicitOff = presence === 'Congé' || presence === 'Intempéries/Vent';
        const isWorkingDay =
          !isExplicitOff &&
          (dayOfWeek !== 5 || presence === 'Travail' || monthHasEntryOnDate.has(iso));
        if (isWorkingDay) {
          monthlyHours += 7;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const roundedMonthlyHours = Math.round(monthlyHours * 10) / 10;
  const coutHoraireReel =
    roundedMonthlyHours > 0 ? Math.round(monthlyFuelMaintExpenses / roundedMonthlyHours) : 0;

  const workDaysLogged = state.presences.filter((p) => p.Statut === 'Travail').length;
  const uniqueWorkDates = new Set(state.travaux.map((t) => t.Date)).size;
  const activeDays = Math.max(workDaysLogged, uniqueWorkDates);
  const tauxOccupation = Math.min(100, Math.round((activeDays / 26) * 100));

  return {
    Total_Encaisse: remote.Total_Encaisse ?? travauxEncaisse,
    Total_Depenses: remote.Total_Depenses ?? totalDepenses,
    Total_Primes: remote.Total_Primes ?? totalPrimes,
    Total_Avances: remote.Total_Avances ?? totalAvances,
    Total_Confirmes: remote.Total_Confirmes ?? totalConfirmes,
    Reste_Clients: remote.Reste_Clients ?? resteClients,
    Chiffre_Affaires_Annuel: remote.Chiffre_Affaires_Annuel ?? travauxTotal + revenusManuels,
    Cout_Horaire_Reel: coutHoraireReel,
    Monthly_Fuel_Maint_Expenses: Math.round(monthlyFuelMaintExpenses),
    Monthly_Operating_Hours: roundedMonthlyHours,
    Taux_Occupation: remote.Taux_Occupation ?? tauxOccupation,
    Total_Km: remote.Total_Km ?? totalKm,
    Solde_Chez_Chauffeur: state.Solde_Chez_Chauffeur,
  };
}

export interface ComputedEngineOilStatus {
  currentMachineHours: number;
  lastOilChangeHours: number;
  oilIntervalHours: number;
  hoursSinceOilChange: number;
  remainingHours: number;
  progressPct: number;
  isWarning: boolean;
  isOverdue: boolean;
  addedSinceCalibration: number;
}

export function computeEngineOilStatus(state: AppStateData): ComputedEngineOilStatus {
  const tracker = state.oilTracker || createDefaultOilTracker();
  const calibratedHours = Number(tracker.calibratedHours || 0);
  const lastOilChangeHours = Number(tracker.lastOilChangeHours || 0);
  const oilIntervalHours = Math.max(1, Number(tracker.oilIntervalHours || 250));
  const calibrationDate = tracker.lastCalibrationDate || localTodayIso();
  const calibrationAtMs = Number(tracker.lastCalibrationAtMs || 0);
  const today = localTodayIso();

  const hoursByDate = new Map<string, number>();
  const hasAnyEntryOnDate = new Set<string>();

  for (const tr of state.travaux) {
    if (!tr.Date || tr.Date < calibrationDate) continue;
    if (tr.Date === calibrationDate && (tr.CreatedAtMs ?? 0) <= calibrationAtMs) continue;
    hasAnyEntryOnDate.add(tr.Date);
    const hrs = Number(tr.Duree || 0);
    if (hrs > 0) {
      hoursByDate.set(tr.Date, (hoursByDate.get(tr.Date) || 0) + hrs);
    }
  }

  const presenceByDate = new Map<string, PresenceItem['Statut']>();
  for (const p of state.presences) {
    if (p.Date) presenceByDate.set(p.Date, p.Statut);
  }

  let added = 0;

  if (calibrationDate <= today) {
    const start = new Date(`${calibrationDate}T12:00:00`);
    const end = new Date(`${today}T12:00:00`);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 366) {
        guard += 1;
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const d = String(cursor.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;

        const loggedHrs = hoursByDate.get(iso) || 0;
        if (iso === today) {
          added += loggedHrs;
        } else {
          // Passed calendar day since calibration
          if (loggedHrs > 0) {
            added += loggedHrs;
          } else {
            const presence = presenceByDate.get(iso);
            const dayOfWeek = cursor.getDay(); // 5 = Friday
            const isExplicitOff = presence === 'Congé' || presence === 'Intempéries/Vent';
            const isWorkingDay =
              !isExplicitOff &&
              (dayOfWeek !== 5 || presence === 'Travail' || hasAnyEntryOnDate.has(iso));
            if (isWorkingDay) {
              added += 7;
            }
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  const addedSinceCalibration = Math.round(added * 10) / 10;
  const currentMachineHours = Math.round((calibratedHours + addedSinceCalibration) * 10) / 10;
  const hoursSinceOilChange = Math.max(
    0,
    Math.round((currentMachineHours - lastOilChangeHours) * 10) / 10
  );
  const remainingHours = Math.round((oilIntervalHours - hoursSinceOilChange) * 10) / 10;
  const progressPct = Math.min(100, Math.max(0, Math.round((hoursSinceOilChange / oilIntervalHours) * 100)));

  return {
    currentMachineHours,
    lastOilChangeHours,
    oilIntervalHours,
    hoursSinceOilChange,
    remainingHours,
    progressPct,
    isWarning: remainingHours < 25,
    isOverdue: remainingHours <= 0,
    addedSinceCalibration,
  };
}
