import { describe, expect, it } from 'vitest';
import { createEmptyState, normalizeState } from '../lib/state';
import {
  abilitiesCount,
  buildTimeline,
  milestonesDone,
  milestonesTotal,
  monthProgress,
  overallProgress,
} from '../lib/progress';
import { resolveMilestones } from '../lib/milestones';
import { MILESTONES } from '../data/milestones';
import { parseLengthCm, parseNumber, parseWeightKg } from '../lib/measure';
import { parseBackup, buildBackup } from '../lib/backup';

describe('monthProgress', () => {
  it('עמוד ריק הוא אפס', () => {
    const state = createEmptyState();
    expect(monthProgress(state.months['1']).done).toBe(0);
  });

  it('סופר תחומים, יכולות, רגע מיוחד ומדיה', () => {
    const state = createEmptyState();
    const entry = state.months['1'];
    entry.domains.motor = 'מרים ראש';
    entry.domains.language = 'מגרגר';
    entry.abilities = [{ id: 'a1', date: '2026-01-05', text: 'חיוך' }];
    entry.specialMoment = 'נרדם עלינו';
    const progress = monthProgress(entry);
    expect(progress.done).toBe(4);
    expect(progress.total).toBe(7);
  });

  it('מתעלם מטקסט של רווחים בלבד', () => {
    const state = createEmptyState();
    state.months['2'].domains.social = '   ';
    expect(monthProgress(state.months['2']).done).toBe(0);
  });
});

describe('milestonesDone / abilitiesCount', () => {
  it('סופר רק אבני דרך עם תאריך תקין', () => {
    const state = createEmptyState();
    state.milestones['first-smile'].date = '2026-02-01';
    state.milestones['first-laugh'].date = 'בקרוב';
    expect(milestonesDone(state)).toBe(1);
  });

  it('סופר יכולות עם טקסט בלבד', () => {
    const state = createEmptyState();
    state.months['3'].abilities = [
      { id: 'a1', date: '2026-03-01', text: 'התהפך' },
      { id: 'a2', date: '2026-03-04', text: '   ' },
    ];
    expect(abilitiesCount(state)).toBe(1);
  });
});

describe('overallProgress', () => {
  it('יומן ריק הוא אפס אחוז', () => {
    expect(overallProgress(createEmptyState())).toBe(0);
  });

  it('עולה כשמוסיפים תוכן ולא עובר 100', () => {
    const state = createEmptyState();
    state.milestones['first-smile'].date = '2026-02-01';
    state.months['1'].domains.motor = 'מרים ראש';
    const value = overallProgress(state);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(100);
  });
});

describe('buildTimeline', () => {
  it('ממיין מהחדש לישן ומאחד מקורות', () => {
    const state = createEmptyState();
    state.profile.birthDate = '2026-01-01';
    state.profile.babyName = 'מעיין';
    state.milestones['first-smile'].date = '2026-02-10';
    state.months['3'].abilities = [{ id: 'a1', date: '2026-03-20', text: 'התהפך לראשונה' }];
    state.growth['m1'] = { date: '2026-02-01', weight: '4.2', length: '54', head: '37', notes: '' };

    const timeline = buildTimeline(state);
    expect(timeline.map((item) => item.date)).toEqual(['2026-03-20', '2026-02-10', '2026-02-01', '2026-01-01']);
    expect(timeline[0].kind).toBe('ability');
    expect(timeline[3].title).toContain('מעיין');
  });

  it('דוחף רשומות בלי תאריך לסוף', () => {
    const state = createEmptyState();
    state.months['2'].abilities = [{ id: 'a1', date: '', text: 'צחוק ראשון' }];
    state.milestones['first-smile'].date = '2026-02-10';
    const timeline = buildTimeline(state);
    expect(timeline[timeline.length - 1].title).toBe('צחוק ראשון');
  });
});

describe('parsing measurements', () => {
  it('קורא מספר מטקסט חופשי', () => {
    expect(parseNumber('3.240 ק״ג')).toBe(3.24);
    expect(parseNumber('50 ס"מ')).toBe(50);
    expect(parseNumber('3,5')).toBe(3.5);
    expect(parseNumber('בלי מספר')).toBeNull();
  });

  it('מתרגם גרמים לקילוגרמים', () => {
    expect(parseWeightKg('3240')).toBe(3.24);
    expect(parseWeightKg('3.24')).toBe(3.24);
    expect(parseWeightKg('0')).toBeNull();
  });

  it('מתרגם מטרים לסנטימטרים', () => {
    expect(parseLengthCm('0.5')).toBe(50);
    expect(parseLengthCm('50')).toBe(50);
  });
});

describe('backup', () => {
  it('סבב ייצוא-ייבוא משמר תוכן', () => {
    const state = createEmptyState();
    state.profile.babyName = 'מעיין';
    state.months['1'].domains.motor = 'מרים ראש';
    const restored = parseBackup(JSON.stringify(buildBackup(state)));
    expect(restored.profile.babyName).toBe('מעיין');
    expect(restored.months['1'].domains.motor).toBe('מרים ראש');
  });

  it('מקבל גם קובץ שמכיל רק את ה-state', () => {
    const state = createEmptyState();
    state.profile.babyName = 'עומר';
    const restored = parseBackup(JSON.stringify(state));
    expect(restored.profile.babyName).toBe('עומר');
  });

  it('זורק שגיאה קריאה על קובץ לא תקין', () => {
    expect(() => parseBackup('{{{')).toThrow();
    expect(() => parseBackup('{"hello":"world"}')).toThrow();
  });
});

describe('normalizeState', () => {
  it('משלים שדות חסרים ומסנן מדיה פגומה', () => {
    const normalized = normalizeState({
      profile: { babyName: 'נועה', coverPhoto: { dataUrl: 'https://example.com/x.jpg' } },
      months: { '1': { domains: { motor: 'מרים ראש' }, abilities: [{ text: 'חיוך', date: '2026-02-01' }] } },
    });
    expect(normalized.profile.babyName).toBe('נועה');
    expect(normalized.profile.coverPhoto).toBeNull();
    expect(normalized.months['1'].domains.language).toBe('');
    expect(normalized.months['12']).toBeDefined();
    expect(normalized.months['1'].abilities[0].id).toBeTruthy();
  });

  it('לא נופל על קלט זבל', () => {
    expect(normalizeState(null).version).toBe(1);
    expect(normalizeState('טקסט').months['5']).toBeDefined();
  });
});

describe('אבני דרך משלנו', () => {
  function withCustom() {
    const state = createEmptyState();
    state.milestones['3f2a1b4c-0000-4000-8000-000000000001'] = {
      date: '2026-07-04',
      note: 'בחוף בת ים',
      label: 'הפעם הראשונה בים',
    };
    return state;
  }

  it('מצטרפות לרשימה אחרי הפריטים הקבועים', () => {
    const resolved = resolveMilestones(withCustom());
    expect(resolved).toHaveLength(MILESTONES.length + 1);
    const last = resolved[resolved.length - 1];
    expect(last.custom).toBe(true);
    expect(last.label).toBe('הפעם הראשונה בים');
    expect(resolved.filter((m) => m.custom)).toHaveLength(1);
  });

  it('נספרות בהתקדמות ובסך הכול', () => {
    const state = withCustom();
    expect(milestonesTotal(state)).toBe(MILESTONES.length + 1);
    expect(milestonesDone(state)).toBe(1);
  });

  it('מופיעות בציר הזמן עם התאריך וההערה', () => {
    const timeline = buildTimeline(withCustom());
    const item = timeline.find((entry) => entry.title.includes('הפעם הראשונה בים'));
    expect(item).toBeDefined();
    expect(item!.date).toBe('2026-07-04');
    expect(item!.context).toBe('בחוף בת ים');
  });

  it('שורדות סבב גיבוי-שחזור', () => {
    const restored = parseBackup(JSON.stringify(buildBackup(withCustom())));
    const resolved = resolveMilestones(restored);
    expect(resolved.some((m) => m.custom && m.label === 'הפעם הראשונה בים')).toBe(true);
  });

  it('רשומה בלי כותרת נזרקת בייבוא, כדי שלא תופיע שורה ריקה', () => {
    const normalized = normalizeState({ milestones: { 'some-key': { date: '2026-01-01', note: '', label: '  ' } } });
    expect(resolveMilestones(normalized).filter((m) => m.custom)).toHaveLength(0);
  });

  it('פריט קבוע נשאר לא-custom', () => {
    const resolved = resolveMilestones(createEmptyState());
    expect(resolved.every((m) => !m.custom)).toBe(true);
    expect(resolved).toHaveLength(MILESTONES.length);
  });
});
