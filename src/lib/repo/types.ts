import type { Ability, Attachment, DomainKey, GrowthEntry, JournalState, MilestoneEntry, Profile } from '../../types';

export type MediaTarget =
  | { kind: 'cover' }
  | { kind: 'photo'; month: number }
  | { kind: 'audio'; month: number };

/**
 * תיאור של שינוי בודד ביומן.
 *
 * המימוש המקומי מתעלם מהתיאור וכותב את המצב המלא;
 * המימוש בענן מתעלם מהמצב המלא ומחיל רק את השינוי הזה על השורה הרלוונטית.
 * כך אותו זרם אירועים משרת את שני המצבים בלי לוגיקה כפולה בממשק.
 */
export type Change =
  | { kind: 'profile'; patch: Partial<Profile> }
  | { kind: 'month-domain'; month: number; domain: DomainKey; value: string }
  | { kind: 'month-moment'; month: number; value: string }
  | { kind: 'month-media'; month: number; field: 'photo' | 'audio'; value: Attachment | null }
  | { kind: 'ability-upsert'; month: number; ability: Ability }
  | { kind: 'ability-delete'; id: string }
  | { kind: 'milestone'; key: string; patch: Partial<MilestoneEntry> }
  | { kind: 'milestone-delete'; key: string }
  | { kind: 'growth'; rowId: string; patch: Partial<GrowthEntry> }
  | { kind: 'growth-notes'; value: string }
  | { kind: 'replace-all' };

/**
 * מפתח קיבוץ: שינויים עם אותו מפתח דורסים זה את זה בתור הכתיבה,
 * כך שהקלדה רצופה בשדה אחד נשמרת פעם אחת ולא בכל תו.
 */
export function changeKey(change: Change): string {
  switch (change.kind) {
    case 'profile':
      return 'profile';
    case 'month-domain':
      return `month-domain:${change.month}:${change.domain}`;
    case 'month-moment':
      return `month-moment:${change.month}`;
    case 'month-media':
      return `month-media:${change.month}:${change.field}`;
    case 'ability-upsert':
      return `ability:${change.ability.id}`;
    case 'ability-delete':
      return `ability:${change.id}`;
    case 'milestone':
    case 'milestone-delete':
      return `milestone:${change.key}`;
    case 'growth':
      return `growth:${change.rowId}`;
    case 'growth-notes':
      return 'growth-notes';
    case 'replace-all':
      return 'replace-all';
  }
}

export interface JournalRepo {
  readonly mode: 'local' | 'cloud';
  /** טוען יומן שלם. */
  load(journalId: string): Promise<JournalState>;
  /** שומר שינוי בודד. מקבל גם את המצב המלא עבור המימוש המקומי. */
  persist(journalId: string, change: Change, nextState: JournalState): Promise<void>;
  /** מעלה תמונה או הקלטה ומחזיר קובץ מצורף מוכן לתצוגה. */
  uploadMedia(journalId: string, target: MediaTarget, attachment: Attachment): Promise<Attachment>;
  /** מוחק מדיה שהוסרה. */
  removeMedia(journalId: string, attachment: Attachment): Promise<void>;
  /** מוחק את כל תוכן היומן (לא את היומן עצמו). */
  clear(journalId: string): Promise<void>;
}
