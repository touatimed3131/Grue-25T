import React, { useState } from 'react';
import {
  Anchor,
  BookOpen,
  Edit2,
  Phone,
  Plus,
  Wrench,
  X,
} from 'lucide-react';
import {
  CraneSpecItem,
  DepannageContact,
  Language,
  LiftingAccessoryItem,
  StandardAccessoryCode,
} from '../../types';
import { getAccessoryLabel, STANDARD_ACCESSORIES, t } from '../../i18n';

interface PlusDrawerProps {
  lang: Language;
  specs: CraneSpecItem[];
  accessories: LiftingAccessoryItem[];
  contacts: DepannageContact[];
  initialSection?: 'contacts' | 'gear' | 'specs';
  onClose: () => void;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

export const PlusDrawer: React.FC<PlusDrawerProps> = ({
  lang,
  specs,
  accessories,
  contacts,
  initialSection = 'contacts',
  onClose,
  onAction,
}) => {
  const [section, setSection] = useState<'contacts' | 'gear' | 'specs'>(initialSection);

  // Add/Edit Contact state
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<DepannageContact | null>(null);
  const [contactNom, setContactNom] = useState('');
  const [contactSpec, setContactSpec] = useState('');
  const [contactTel, setContactTel] = useState('');

  // Add/Edit Accessory state
  const [showAccForm, setShowAccForm] = useState(false);
  const [editingAcc, setEditingAcc] = useState<LiftingAccessoryItem | null>(null);
  const [accCode, setAccCode] = useState<StandardAccessoryCode>('elingue_chaine');
  const [accCustomName, setAccCustomName] = useState('');
  const [accDetails, setAccDetails] = useState('');

  // Add/Edit Spec state
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<CraneSpecItem | null>(null);
  const [specLabel, setSpecLabel] = useState('');
  const [specValue, setSpecValue] = useState('');

  const tabs = [
    { id: 'contacts' as const, label: t(lang, 'emergencyContacts'), icon: Wrench },
    { id: 'gear' as const, label: t(lang, 'liftingGear'), icon: Anchor },
    { id: 'specs' as const, label: t(lang, 'craneSpecs'), icon: BookOpen },
  ];

  // Contacts submit (optimistic + pending approval)
  const openEditContact = (c: DepannageContact) => {
    setEditingContact(c);
    setContactNom(c.nom);
    setContactSpec(c.specialite);
    setContactTel(c.telephone);
    setShowContactForm(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactNom.trim() || !contactTel.trim()) return;
    const contact: DepannageContact = editingContact
      ? {
          id: editingContact.id,
          nom: contactNom.trim(),
          specialite: contactSpec.trim(),
          telephone: contactTel.trim(),
          approvalStatus: 'pending',
          pendingAction: editingContact.pendingAction === 'add' ? 'add' : 'edit',
          previousSnapshot:
            editingContact.previousSnapshot ||
            (editingContact.pendingAction === 'add'
              ? undefined
              : {
                  nom: editingContact.nom,
                  specialite: editingContact.specialite,
                  telephone: editingContact.telephone,
                }),
        }
      : {
          id: `cnt-${Date.now()}`,
          nom: contactNom.trim(),
          specialite: contactSpec.trim(),
          telephone: contactTel.trim(),
          approvalStatus: 'pending',
          pendingAction: 'add',
        };

    await onAction('save_contact', { contact });
    setShowContactForm(false);
    setEditingContact(null);
    setContactNom('');
    setContactSpec('');
    setContactTel('');
  };

  // Accessories submit (optimistic + pending approval)
  const openEditAcc = (a: LiftingAccessoryItem) => {
    setEditingAcc(a);
    setAccCode(a.code);
    setAccCustomName(a.customName || '');
    setAccDetails(a.details || '');
    setShowAccForm(true);
  };

  const handleSaveAccessory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accCode === 'custom' && !accCustomName.trim()) return;
    const accessory: LiftingAccessoryItem = editingAcc
      ? {
          id: editingAcc.id,
          code: accCode,
          customName: accCode === 'custom' ? accCustomName.trim() : undefined,
          details: accDetails.trim() || undefined,
          approvalStatus: 'pending',
          pendingAction: editingAcc.pendingAction === 'add' ? 'add' : 'edit',
          previousSnapshot:
            editingAcc.previousSnapshot ||
            (editingAcc.pendingAction === 'add'
              ? undefined
              : {
                  code: editingAcc.code,
                  customName: editingAcc.customName,
                  details: editingAcc.details,
                }),
        }
      : {
          id: `acc-${Date.now()}`,
          code: accCode,
          customName: accCode === 'custom' ? accCustomName.trim() : undefined,
          details: accDetails.trim() || undefined,
          approvalStatus: 'pending',
          pendingAction: 'add',
        };

    await onAction('save_accessory', { accessory });
    setShowAccForm(false);
    setEditingAcc(null);
    setAccCode('elingue_chaine');
    setAccCustomName('');
    setAccDetails('');
  };

  // Specs submit (optimistic + pending approval)
  const openEditSpec = (s: CraneSpecItem) => {
    setEditingSpec(s);
    setSpecLabel(s.label);
    setSpecValue(s.value);
    setShowSpecForm(true);
  };

  const handleSaveSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specLabel.trim() || !specValue.trim()) return;
    const spec: CraneSpecItem = editingSpec
      ? {
          id: editingSpec.id,
          label: specLabel.trim(),
          value: specValue.trim(),
          approvalStatus: 'pending',
          pendingAction: editingSpec.pendingAction === 'add' ? 'add' : 'edit',
          previousSnapshot:
            editingSpec.previousSnapshot ||
            (editingSpec.pendingAction === 'add'
              ? undefined
              : {
                  label: editingSpec.label,
                  value: editingSpec.value,
                }),
        }
      : {
          id: `spec-${Date.now()}`,
          label: specLabel.trim(),
          value: specValue.trim(),
          approvalStatus: 'pending',
          pendingAction: 'add',
        };

    await onAction('save_spec', { spec });
    setShowSpecForm(false);
    setEditingSpec(null);
    setSpecLabel('');
    setSpecValue('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl border-t border-slate-200 max-h-[88dvh] flex flex-col overflow-hidden">
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0" />

        <div className="px-5 pb-3 flex items-center justify-between border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-extrabold text-slate-900">{t(lang, 'moreDrawer')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-200 flex gap-1.5 overflow-x-auto shrink-0">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable body with smooth mobile scroll to bottom */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pb-12 space-y-4">
          <p className="text-[11px] text-slate-500 font-medium">
            {t(lang, 'driverApprovalHint')}
          </p>

          {section === 'contacts' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setContactNom('');
                    setContactSpec('');
                    setContactTel('');
                    setShowContactForm((v) => !v);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t(lang, 'add')}</span>
                </button>
              </div>

              {showContactForm && (
                <form
                  onSubmit={handleSaveContact}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                >
                  <input
                    type="text"
                    required
                    placeholder={t(lang, 'contactName')}
                    value={contactNom}
                    onChange={(e) => setContactNom(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder={t(lang, 'contactSpecialty')}
                    value={contactSpec}
                    onChange={(e) => setContactSpec(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder={t(lang, 'contactPhone')}
                    value={contactTel}
                    onChange={(e) => setContactTel(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[42px] rounded-xl bg-emerald-700 text-white text-xs font-bold"
                    >
                      {t(lang, 'save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                    >
                      {t(lang, 'cancel')}
                    </button>
                  </div>
                </form>
              )}

              {contacts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  {t(lang, 'noContactsDefined')}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{c.nom}</p>
                        {c.specialite && (
                          <p className="text-xs text-slate-500 truncate">{c.specialite}</p>
                        )}
                        <p className="text-xs font-mono text-slate-700 mt-0.5" dir="ltr">
                          {c.telephone}
                        </p>
                        {c.approvalStatus === 'pending' && (
                          <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                            {t(lang, 'pendingApproval')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditContact(c)}
                          className="min-h-[42px] min-w-[42px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <a
                          href={`tel:${c.telephone}`}
                          className="min-h-[42px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{t(lang, 'callNow')}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'gear' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAcc(null);
                    setAccCode('elingue_chaine');
                    setAccCustomName('');
                    setAccDetails('');
                    setShowAccForm((v) => !v);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t(lang, 'add')}</span>
                </button>
              </div>

              {showAccForm && (
                <form
                  onSubmit={handleSaveAccessory}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                >
                  <select
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value as StandardAccessoryCode)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                  >
                    {STANDARD_ACCESSORIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.labels[lang]}
                      </option>
                    ))}
                    <option value="custom">{t(lang, 'customGearOption')}</option>
                  </select>
                  {accCode === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder={t(lang, 'customGearPlaceholder')}
                      value={accCustomName}
                      onChange={(e) => setAccCustomName(e.target.value)}
                      className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  )}
                  <input
                    type="text"
                    placeholder={t(lang, 'gearDetailsPlaceholder')}
                    value={accDetails}
                    onChange={(e) => setAccDetails(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[42px] rounded-xl bg-emerald-700 text-white text-xs font-bold"
                    >
                      {t(lang, 'save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAccForm(false)}
                      className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                    >
                      {t(lang, 'cancel')}
                    </button>
                  </div>
                </form>
              )}

              {accessories.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  {t(lang, 'noGearDefined')}
                </p>
              ) : (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden text-sm">
                  {accessories.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 bg-white flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          {getAccessoryLabel(acc.code, lang, acc.customName)}
                        </p>
                        {acc.details && (
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{acc.details}</p>
                        )}
                        {acc.approvalStatus === 'pending' && (
                          <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                            {t(lang, 'pendingApproval')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditAcc(acc)}
                        className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center shrink-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'specs' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSpec(null);
                    setSpecLabel('');
                    setSpecValue('');
                    setShowSpecForm((v) => !v);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t(lang, 'add')}</span>
                </button>
              </div>

              {showSpecForm && (
                <form
                  onSubmit={handleSaveSpec}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                >
                  <input
                    type="text"
                    required
                    placeholder={t(lang, 'specLabel')}
                    value={specLabel}
                    onChange={(e) => setSpecLabel(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder={t(lang, 'specValue')}
                    value={specValue}
                    onChange={(e) => setSpecValue(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[42px] rounded-xl bg-emerald-700 text-white text-xs font-bold"
                    >
                      {t(lang, 'save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSpecForm(false)}
                      className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                    >
                      {t(lang, 'cancel')}
                    </button>
                  </div>
                </form>
              )}

              {specs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  {t(lang, 'noSpecsDefined')}
                </p>
              ) : (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden text-sm">
                  {specs.map((spec) => (
                    <div
                      key={spec.id}
                      className="p-3.5 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-slate-600">{spec.label}</span>
                          <span className="font-mono font-bold text-slate-900 text-end">
                            {spec.value}
                          </span>
                        </div>
                        {spec.approvalStatus === 'pending' && (
                          <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                            {t(lang, 'pendingApproval')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditSpec(spec)}
                        className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center shrink-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
