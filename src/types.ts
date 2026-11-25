export type Language = 'ar' | 'fr' | 'en';

export type CraneStatus = 'Disponible' | 'En Chantier' | 'En Maintenance';

export type TariffType = 'Normal' | 'Nuit/Week-end' | 'Jour + Nuit';

export type PricingMode = 'Horaire/Journalier' | 'A la tache/Par camion';

export interface TravailItem {
  id: string;
  Date: string;
  Heure_Debut?: string;
  Heure_Fin?: string;
  Duree: number;
  Mode_Tarif?: PricingMode;
  Quantite_Tache?: number;
  Description_Tache?: string;
  Type_Tarif: TariffType;
  Client: string;
  Tel_Client: string;
  Prix_Total: number;
  Montant_Encaisse: number;
  Depenses: number;
  Prime_Chauffeur: number;
  Tags?: string[];
  Notes: string;
  Audio_Base64?: string;
  Photo_Base64?: string;
  GPS_Link?: string;
  Distance_Km?: number;
  Valide_Bon?: boolean;
  Date_Validation?: string;
  Chauffeur?: string;
  CreatedAtMs?: number;
  isOffline?: boolean;
}

export type AchatMaintenanceCategory = 'Mazout' | 'Piece_Main_Oeuvre';

export interface AchatMaintenanceItem {
  id: string;
  Date: string;
  Categorie: AchatMaintenanceCategory;
  Description: string;
  Montant: number;
  Photo_Base64?: string;
  Notes: string;
  Cree_Par?: 'Chauffeur' | 'Admin';
  isOffline?: boolean;
}

export interface RemiseItem {
  id: string;
  Date: string;
  Montant_Remis: number;
  Notes: string;
  Statut: 'En attente' | 'Confirmé';
  Date_Confirmation?: string;
  Chauffeur?: string;
  isOffline?: boolean;
}

export interface AvanceItem {
  id: string;
  Date: string;
  Montant: number;
  Motif: string;
  Type_Paiement?: 'Avance' | 'Salaire';
  isOffline?: boolean;
}

export interface ReservationItem {
  id: string;
  Date: string;
  Heure: string;
  Client: string;
  Tel_Client: string;
  Lieu: string;
  Duree_Estimee?: number;
  Notes: string;
  Cree_Par: 'Chauffeur' | 'Admin';
  Chauffeur?: string;
  Statut?: 'Actif' | 'Annulé';
  Created_At?: string;
  Cancelled_At?: string;
  Cancelled_By?: 'Chauffeur' | 'Admin';
  isOffline?: boolean;
}

export interface PresenceItem {
  id: string;
  Date: string;
  Statut: 'Travail' | 'Intempéries/Vent' | 'Congé';
  Notes: string;
  Chauffeur?: string;
  isOffline?: boolean;
}

export interface ChecklistConfigItem {
  id: string;
  labelKey?: string;
  customLabel?: string;
}

export interface ChecklistReportItem {
  id: string;
  label: string;
  ok: boolean;
}

export type ChecklistStates = Record<string, boolean>;

export interface PanneChecklistItem {
  id: string;
  Date: string;
  Checklist: ChecklistStates;
  Checklist_Details?: ChecklistReportItem[];
  Has_Panne: boolean;
  Type_Panne?: string;
  Gravite?: 'Mineure' | 'Urgente' | 'Critique';
  Description?: string;
  Photo_Base64?: string;
  Video_Base64?: string;
  Audio_Base64?: string;
  Chauffeur?: string;
  isOffline?: boolean;
}

export interface MaintenanceDocItem {
  id: string;
  Nom: string;
  Categorie: 'Maintenance' | 'Document';
  Type_Alerte?: 'Vidange' | 'Graissage' | 'Document';
  Date_Echeance: string;
  Heures_Restantes?: number;
  Km_Restants?: number;
  Notes?: string;
}

export interface PieceReparationItem {
  id: string;
  Date: string;
  Nom_Piece: string;
  Fournisseur: string;
  Cout: number;
  Compteur?: string;
  Notes: string;
  Photo_Base64?: string;
  isOffline?: boolean;
}

export interface RevenuMensuelItem {
  id: string;
  Mois: string;
  Montant: number;
  Heures_Supplementaires?: number;
  Description: string;
  Notes: string;
  Chauffeur?: string;
  isOffline?: boolean;
}

export type ApprovalStatus = 'approved' | 'pending';

export interface DepannageContact {
  id: string;
  nom: string;
  specialite: string;
  telephone: string;
  approvalStatus?: ApprovalStatus;
  pendingAction?: 'add' | 'edit';
  previousSnapshot?: {
    nom: string;
    specialite: string;
    telephone: string;
  };
}

export interface CraneSpecItem {
  id: string;
  label: string;
  value: string;
  approvalStatus?: ApprovalStatus;
  pendingAction?: 'add' | 'edit';
  previousSnapshot?: {
    label: string;
    value: string;
  };
}

export type StandardAccessoryCode =
  | 'elingue_chaine'
  | 'sangle_textile'
  | 'cable_acier'
  | 'manille'
  | 'palonnier'
  | 'plaques_calage'
  | 'custom';

export interface LiftingAccessoryItem {
  id: string;
  code: StandardAccessoryCode;
  customName?: string;
  details?: string;
  approvalStatus?: ApprovalStatus;
  pendingAction?: 'add' | 'edit';
  previousSnapshot?: {
    code: StandardAccessoryCode;
    customName?: string;
    details?: string;
  };
}

export interface PaymentNotification {
  id: string;
  amount: number;
  date: string;
  type: 'Avance' | 'Salaire';
  motif?: string;
}

export interface EngineOilTracker {
  calibratedHours: number;
  lastOilChangeHours: number;
  oilIntervalHours: number;
  lastCalibrationDate: string;
  lastCalibrationAtMs: number;
  initialized?: boolean;
}

export interface BonTravailRequestItem {
  id: string;
  Date: string;
  Client: string;
  Lieu: string;
  Heures_Travail: string;
  Statut: 'En attente' | 'Validé';
  Date_Validation?: string;
  isOffline?: boolean;
}

export interface OfflineQueueItem {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminKPIs {
  Total_Encaisse: number;
  Total_Depenses: number;
  Total_Primes: number;
  Total_Avances: number;
  Total_Confirmes: number;
  Reste_Clients: number;
  Chiffre_Affaires_Annuel: number;
  Cout_Horaire_Reel: number;
  Monthly_Fuel_Maint_Expenses?: number;
  Monthly_Operating_Hours?: number;
  Taux_Occupation: number;
  Total_Km: number;
  Solde_Chez_Chauffeur: number;
}

export interface AppStateData {
  Statut_Grue: CraneStatus;
  Solde_Chez_Chauffeur: number;
  Last_GPS_Link?: string;
  Last_GPS_Time?: string;
  oilTracker: EngineOilTracker;
  travaux: TravailItem[];
  bons_travail: BonTravailRequestItem[];
  achats_maintenance: AchatMaintenanceItem[];
  remises: RemiseItem[];
  avances: AvanceItem[];
  reservations: ReservationItem[];
  presences: PresenceItem[];
  pannes: PanneChecklistItem[];
  maintenance: MaintenanceDocItem[];
  pieces: PieceReparationItem[];
  revenus_mensuels: RevenuMensuelItem[];
  contacts: DepannageContact[];
  specs: CraneSpecItem[];
  accessories: LiftingAccessoryItem[];
  customTags: string[];
  hiddenDefaultTags: string[];
  kpis?: Partial<AdminKPIs>;
}
