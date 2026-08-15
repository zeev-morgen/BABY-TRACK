import { describe, expect, it } from 'vitest';
import {
  addMonths,
  ageBreakdown,
  currentJournalMonth,
  daysBetween,
  describeAge,
  fromISO,
  isValidISO,
  isWithinMonth,
  monthWindow,
  toISO,
} from '../lib/date';

describe('fromISO / isValidISO', () => {
  it('קורא תאריך תקין', () => {
    expect(toISO(fromISO('2026-03-15')!)).toBe('2026-03-15');
  });

  it('דוחה מחרוזות פגומות ותאריכים שלא קיימים', () => {
    expect(fromISO('')).toBeNull();
    expect(fromISO('15/03/2026')).toBeNull();
    expect(fromISO('2026-02-30')).toBeNull();
    expect(isValidISO('2026-13-01')).toBe(false);
  });
});

describe('addMonths', () => {
  it('שומר על יום בחודש כשאפשר', () => {
    expect(toISO(addMonths(new Date(2026, 0, 15), 1))).toBe('2026-02-15');
  });

  it('מקצר לסוף החודש כשהיום לא קיים', () => {
    expect(toISO(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
  });

  it('מטפל בשנה מעוברת', () => {
    expect(toISO(addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29');
  });
});

describe('ageBreakdown', () => {
  it('מחשב חודשים וימים מלאים', () => {
    const age = ageBreakdown('2026-01-10', new Date(2026, 4, 22));
    expect(age).not.toBeNull();
    expect(age!.months).toBe(4);
    expect(age!.days).toBe(12);
  });

  it('מחזיר אפס חודשים בשבועות הראשונים', () => {
    const age = ageBreakdown('2026-05-01', new Date(2026, 4, 12));
    expect(age!.months).toBe(0);
    expect(age!.days).toBe(11);
    expect(age!.totalDays).toBe(11);
  });

  it('מחזיר null לתאריך עתידי או לא תקין', () => {
    expect(ageBreakdown('2027-01-01', new Date(2026, 0, 1))).toBeNull();
    expect(ageBreakdown('לא-תאריך')).toBeNull();
  });

  it('סופר חודש מלא ביום ההולדת החודשי עצמו', () => {
    const age = ageBreakdown('2026-01-31', new Date(2026, 1, 28));
    expect(age!.months).toBe(1);
    expect(age!.days).toBe(0);
  });
});

describe('describeAge', () => {
  it('מנסח יחיד ורבים בעברית', () => {
    expect(describeAge(0, 1)).toBe('יום אחד');
    expect(describeAge(0, 9)).toBe('9 ימים');
    expect(describeAge(1, 0)).toBe('חודש אחד');
    expect(describeAge(4, 12)).toBe('4 חודשים ו־12 ימים');
    expect(describeAge(12, 3)).toBe('שנה');
    expect(describeAge(15, 0)).toBe('שנה ו־3 חודשים');
  });
});

describe('monthWindow', () => {
  it('חודש 1 מתחיל ביום הלידה', () => {
    const window = monthWindow('2026-03-10', 1);
    expect(window!.start).toBe('2026-03-10');
    expect(window!.end).toBe('2026-04-09');
  });

  it('חודש 5 מכסה את התקופה הנכונה', () => {
    const window = monthWindow('2026-03-10', 5);
    expect(window!.start).toBe('2026-07-10');
    expect(window!.end).toBe('2026-08-09');
  });

  it('מחזיר null בלי תאריך לידה', () => {
    expect(monthWindow('', 3)).toBeNull();
  });
});

describe('currentJournalMonth', () => {
  it('ביום הלידה נמצאים בחודש 1', () => {
    expect(currentJournalMonth('2026-06-01', new Date(2026, 5, 1))).toBe(1);
  });

  it('אחרי ארבעה חודשים נמצאים בעמוד החמישי', () => {
    expect(currentJournalMonth('2026-01-01', new Date(2026, 4, 3))).toBe(5);
  });

  it('לא עובר את חודש 12', () => {
    expect(currentJournalMonth('2020-01-01', new Date(2026, 0, 1))).toBe(12);
  });
});

describe('isWithinMonth', () => {
  it('מזהה תאריך בתוך החודש ומחוצה לו', () => {
    expect(isWithinMonth('2026-03-10', 2, '2026-04-15')).toBe(true);
    expect(isWithinMonth('2026-03-10', 2, '2026-03-15')).toBe(false);
  });
});

describe('daysBetween', () => {
  it('מתעלם משעות ומעבר שעון', () => {
    expect(daysBetween(new Date(2026, 2, 1, 23, 30), new Date(2026, 2, 3, 1, 15))).toBe(2);
  });
});
