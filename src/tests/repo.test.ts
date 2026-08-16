import { describe, expect, it } from 'vitest';
import { changeKey, type Change } from '../lib/repo/types';
import { isUuid, uuid } from '../lib/id';

describe('changeKey', () => {
  it('מקבץ הקלדות באותו שדה תחת מפתח אחד', () => {
    const first: Change = { kind: 'month-domain', month: 3, domain: 'motor', value: 'מרים' };
    const second: Change = { kind: 'month-domain', month: 3, domain: 'motor', value: 'מרים ראש' };
    expect(changeKey(first)).toBe(changeKey(second));
  });

  it('מפריד בין תחומים, חודשים ושדות שונים', () => {
    const keys = new Set(
      (
        [
          { kind: 'month-domain', month: 3, domain: 'motor', value: '' },
          { kind: 'month-domain', month: 3, domain: 'language', value: '' },
          { kind: 'month-domain', month: 4, domain: 'motor', value: '' },
          { kind: 'month-moment', month: 3, value: '' },
          { kind: 'month-media', month: 3, field: 'photo', value: null },
          { kind: 'month-media', month: 3, field: 'audio', value: null },
        ] as Change[]
      ).map(changeKey),
    );
    expect(keys.size).toBe(6);
  });

  it('שינוי ומחיקה של אותה יכולת חולקים מפתח, כדי שהמחיקה תנצח', () => {
    const upsert: Change = {
      kind: 'ability-upsert',
      month: 2,
      ability: { id: 'abc', date: '2026-02-01', text: 'חיוך' },
    };
    const remove: Change = { kind: 'ability-delete', id: 'abc' };
    expect(changeKey(upsert)).toBe(changeKey(remove));
  });

  it('אבני דרך ושורות גדילה מופרדות לפי מזהה', () => {
    expect(changeKey({ kind: 'milestone', key: 'first-smile', patch: {} })).not.toBe(
      changeKey({ kind: 'milestone', key: 'first-laugh', patch: {} }),
    );
    expect(changeKey({ kind: 'growth', rowId: 'birth', patch: {} })).not.toBe(
      changeKey({ kind: 'growth', rowId: 'm1', patch: {} }),
    );
  });

  it('פרופיל והערות גדילה הם מפתח יחיד', () => {
    expect(changeKey({ kind: 'profile', patch: { babyName: 'א' } })).toBe(
      changeKey({ kind: 'profile', patch: { author: 'ב' } }),
    );
    expect(changeKey({ kind: 'growth-notes', value: 'x' })).toBe(changeKey({ kind: 'growth-notes', value: 'y' }));
  });
});

describe('uuid', () => {
  it('מייצר מזהה בפורמט שהדאטהבייס מקבל', () => {
    const value = uuid();
    expect(isUuid(value)).toBe(true);
    expect(uuid()).not.toBe(value);
  });

  it('דוחה מזהים מקוצרים מהפורמט הישן', () => {
    expect(isUuid('ability_lz3k_1a2b3c4d')).toBe(false);
  });
});
