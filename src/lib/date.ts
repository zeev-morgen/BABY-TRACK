/** עזרי תאריך וגיל. כל התאריכים נשמרים כמחרוזת ISO קצרה: YYYY-MM-DD. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ממיר מחרוזת ISO לתאריך מקומי (בלי הפתעות של אזורי זמן). */
export function fromISO(value: string): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidISO(value: string): boolean {
  return fromISO(value) !== null;
}

/** מוסיף חודשים ושומר על סוף חודש הגיוני (31.1 + חודש = 28/29.2). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return result;
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export interface AgeBreakdown {
  totalDays: number;
  months: number;
  days: number;
  /** תיאור קריא בעברית, למשל "4 חודשים ו-12 ימים" */
  text: string;
}

/** מחשב גיל מלא בחודשים ובימים. מחזיר null אם תאריך הלידה לא תקין או עתידי. */
export function ageBreakdown(birthISO: string, now: Date = new Date()): AgeBreakdown | null {
  const birth = fromISO(birthISO);
  if (!birth) return null;
  const totalDays = daysBetween(birth, now);
  if (totalDays < 0) return null;

  let months = 0;
  while (addMonths(birth, months + 1).getTime() <= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    months += 1;
    if (months > 600) break;
  }
  const days = daysBetween(addMonths(birth, months), now);
  return { totalDays, months, days, text: describeAge(months, days) };
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`;
}

export function describeAge(months: number, days: number): string {
  if (months === 0) {
    if (days === 0) return 'נולד/ה היום';
    return plural(days, 'יום אחד', 'ימים');
  }

  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const parts: string[] = [];

  if (years > 0) parts.push(plural(years, 'שנה', 'שנים'));
  if (restMonths > 0) parts.push(plural(restMonths, 'חודש אחד', 'חודשים'));
  if (years === 0 && days > 0) parts.push(plural(days, 'יום אחד', 'ימים'));

  return parts.join(' ו־');
}

const longFormatter = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFormatter = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatLong(iso: string): string {
  const date = fromISO(iso);
  return date ? longFormatter.format(date) : '';
}

export function formatShort(iso: string): string {
  const date = fromISO(iso);
  return date ? shortFormatter.format(date) : '';
}

export interface MonthWindow {
  start: string;
  end: string;
  label: string;
}

/**
 * חלון התאריכים של עמוד חודשי מסוים.
 * חודש 1 = מהלידה ועד יום לפני "חודש" מלא, וכן הלאה.
 */
export function monthWindow(birthISO: string, month: number): MonthWindow | null {
  const birth = fromISO(birthISO);
  if (!birth || month < 1) return null;
  const start = addMonths(birth, month - 1);
  const end = addDays(addMonths(birth, month), -1);
  return {
    start: toISO(start),
    end: toISO(end),
    label: `${shortFormatter.format(start)} – ${shortFormatter.format(end)}`,
  };
}

/** מספר העמוד החודשי הרלוונטי היום (1–12), או null אם אין תאריך לידה. */
export function currentJournalMonth(birthISO: string, now: Date = new Date()): number | null {
  const age = ageBreakdown(birthISO, now);
  if (!age) return null;
  return Math.min(12, Math.max(1, age.months + 1));
}

/** האם התאריך נמצא בתוך חלון החודש הנתון. */
export function isWithinMonth(birthISO: string, month: number, iso: string): boolean {
  const window = monthWindow(birthISO, month);
  if (!window || !isValidISO(iso)) return false;
  return iso >= window.start && iso <= window.end;
}
