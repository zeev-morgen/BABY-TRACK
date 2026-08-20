/** מבני הנתונים של היומן. הכל נשמר מקומית במכשיר של המשתמש. */

/** ארבעת תחומי ההתפתחות שמופיעים בכל עמוד חודשי ביומן. */
export type DomainKey = 'motor' | 'language' | 'social' | 'cognitive';

/** יכולת חדשה שהתגלתה — טקסט חופשי + תאריך. */
export interface Ability {
  id: string;
  /** תאריך בפורמט ISO קצר: YYYY-MM-DD */
  date: string;
  text: string;
}

/** קובץ מצורף — תמונה או שמע. */
export interface Attachment {
  /**
   * כתובת להצגה: data URL במצב מקומי, או קישור חתום מ-Supabase Storage בענן.
   * הקישור החתום פג אחרי כמה שעות ונוצר מחדש בכל טעינה של היומן.
   */
  dataUrl: string;
  name: string;
  /** גודל משוער בבתים אחרי הדחיסה */
  size: number;
  /** נתיב הקובץ ב-Storage — קיים רק במצב ענן */
  path?: string;
}

/** עמוד חודשי אחד (חודשים 1–12). */
export interface MonthEntry {
  domains: Record<DomainKey, string>;
  abilities: Ability[];
  specialMoment: string;
  photo: Attachment | null;
  audio: Attachment | null;
}

/** רישום של אבן דרך ראשונה. */
export interface MilestoneEntry {
  date: string;
  note: string;
  /**
   * כותרת. ריקה לפריטים הקבועים מהיומן המודפס — שם הכותרת מגיעה מ-data/milestones —
   * ומלאה לאבני דרך שההורים הגדירו בעצמם.
   */
  label?: string;
}

/** שורה בטבלת מעקב הגדילה. */
export interface GrowthEntry {
  date: string;
  weight: string;
  length: string;
  head: string;
  notes: string;
}

/** פרטי התינוק/ת — עמוד השער של היומן. */
export interface Profile {
  babyName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  birthWeight: string;
  birthLength: string;
  author: string;
  coverPhoto: Attachment | null;
}

export interface JournalState {
  /** גרסת סכימה — מאפשרת מיגרציה של גיבויים ישנים */
  version: number;
  profile: Profile;
  /** מפתח = מספר החודש (1–12) כמחרוזת */
  months: Record<string, MonthEntry>;
  /** מפתח = מזהה אבן הדרך */
  milestones: Record<string, MilestoneEntry>;
  /** מפתח = מזהה שורת הגדילה */
  growth: Record<string, GrowthEntry>;
  growthNotes: string;
  updatedAt: string;
}

/** רשומה מאוחדת לתצוגת ציר הזמן. */
export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  kind: 'milestone' | 'ability' | 'growth' | 'birth';
  context: string;
  href: string;
}
