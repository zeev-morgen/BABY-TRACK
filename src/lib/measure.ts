/** קריאת מספרים משדות טקסט חופשי כמו "3.240 ק״ג" או "50 ס"מ". */

export function parseNumber(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, '.').replace(/[^\d.\-]/g, ' ').trim();
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * משקל — מקבל ק"ג או גרם ומחזיר תמיד ק"ג.
 * מספר גדול מ-100 מתפרש כגרמים (3200 → 3.2).
 */
export function parseWeightKg(value: string): number | null {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed > 100 ? Number((parsed / 1000).toFixed(3)) : parsed;
}

/** אורך או היקף ראש — מוחזר בסנטימטרים. מספר קטן מ-3 מתפרש כמטרים. */
export function parseLengthCm(value: string): number | null {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed < 3 ? Number((parsed * 100).toFixed(1)) : parsed;
}
