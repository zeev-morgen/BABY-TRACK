import { DOMAIN_KEYS } from '../data/domains';
import { GROWTH_ROW_IDS } from '../data/growth';
import { MILESTONE_IDS } from '../data/milestones';
import { MONTH_NUMBERS } from '../data/months';
import type { Ability, Attachment, DomainKey, GrowthEntry, JournalState, MilestoneEntry, MonthEntry } from '../types';

export const SCHEMA_VERSION = 1;

export function emptyMonth(): MonthEntry {
  const domains = {} as Record<DomainKey, string>;
  for (const key of DOMAIN_KEYS) domains[key] = '';
  return { domains, abilities: [], specialMoment: '', photo: null, audio: null };
}

export function createEmptyState(): JournalState {
  const months: Record<string, MonthEntry> = {};
  for (const month of MONTH_NUMBERS) months[String(month)] = emptyMonth();

  const milestones: Record<string, MilestoneEntry> = {};
  for (const id of MILESTONE_IDS) milestones[id] = { date: '', note: '' };

  const growth: Record<string, GrowthEntry> = {};
  for (const id of GROWTH_ROW_IDS) growth[id] = { date: '', weight: '', length: '', head: '', notes: '' };

  return {
    version: SCHEMA_VERSION,
    profile: {
      babyName: '',
      birthDate: '',
      birthWeight: '',
      birthLength: '',
      author: '',
      coverPhoto: null,
    },
    months,
    milestones,
    growth,
    growthNotes: '',
    updatedAt: new Date().toISOString(),
  };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function attachment(value: unknown): Attachment | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Attachment>;
  if (typeof raw.dataUrl !== 'string' || !raw.dataUrl.startsWith('data:')) return null;
  return {
    dataUrl: raw.dataUrl,
    name: str(raw.name) || 'attachment',
    size: typeof raw.size === 'number' && raw.size >= 0 ? raw.size : raw.dataUrl.length,
  };
}

function abilities(value: unknown): Ability[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: str(item.id) || `ability_${index}`,
      date: str(item.date),
      text: str(item.text),
    }))
    .filter((item) => item.text.trim() !== '' || item.date !== '');
}

/**
 * ממזג נתונים שהגיעו מקובץ גיבוי או מאחסון ישן לתוך מבנה תקין ומלא.
 * כל שדה חסר או פגום מוחלף בערך ריק — כך יבוא לא נופל על קובץ חלקי.
 */
export function normalizeState(raw: unknown): JournalState {
  const base = createEmptyState();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<JournalState> & Record<string, unknown>;

  const profileRaw = (input.profile ?? {}) as Record<string, unknown>;
  base.profile = {
    babyName: str(profileRaw.babyName),
    birthDate: str(profileRaw.birthDate),
    birthWeight: str(profileRaw.birthWeight),
    birthLength: str(profileRaw.birthLength),
    author: str(profileRaw.author),
    coverPhoto: attachment(profileRaw.coverPhoto),
  };

  const monthsRaw = (input.months ?? {}) as Record<string, unknown>;
  for (const month of MONTH_NUMBERS) {
    const key = String(month);
    const entryRaw = (monthsRaw[key] ?? {}) as Record<string, unknown>;
    const domainsRaw = (entryRaw.domains ?? {}) as Record<string, unknown>;
    const entry = emptyMonth();
    for (const domain of DOMAIN_KEYS) entry.domains[domain] = str(domainsRaw[domain]);
    entry.abilities = abilities(entryRaw.abilities);
    entry.specialMoment = str(entryRaw.specialMoment);
    entry.photo = attachment(entryRaw.photo);
    entry.audio = attachment(entryRaw.audio);
    base.months[key] = entry;
  }

  const milestonesRaw = (input.milestones ?? {}) as Record<string, unknown>;
  for (const id of MILESTONE_IDS) {
    const item = (milestonesRaw[id] ?? {}) as Record<string, unknown>;
    base.milestones[id] = { date: str(item.date), note: str(item.note) };
  }
  // אבני דרך שההורים הגדירו בעצמם — כל מפתח שאינו ברשימה הקבועה
  for (const [key, value] of Object.entries(milestonesRaw)) {
    if (MILESTONE_IDS.includes(key)) continue;
    const item = (value ?? {}) as Record<string, unknown>;
    const label = str(item.label).trim();
    if (!label) continue;
    base.milestones[key] = { date: str(item.date), note: str(item.note), label };
  }

  const growthRaw = (input.growth ?? {}) as Record<string, unknown>;
  for (const id of GROWTH_ROW_IDS) {
    const item = (growthRaw[id] ?? {}) as Record<string, unknown>;
    base.growth[id] = {
      date: str(item.date),
      weight: str(item.weight),
      length: str(item.length),
      head: str(item.head),
      notes: str(item.notes),
    };
  }

  base.growthNotes = str(input.growthNotes);
  base.updatedAt = str(input.updatedAt) || new Date().toISOString();
  base.version = SCHEMA_VERSION;
  return base;
}
