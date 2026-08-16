/** מזהה קצר וייחודי לרשומות מקומיות. */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${randomChunk()}`;
}

function randomChunk(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

/**
 * UUID תקני. משמש למזהים שנשמרים גם בדאטהבייס (עמודות uuid),
 * ולכן חייב להיות בפורמט מלא ולא במזהה המקוצר של uid().
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // גיבוי לדפדפנים ישנים או להקשר לא מאובטח, שבהם randomUUID אינו זמין
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** האם המחרוזת היא UUID תקין — נדרש לפני כתיבה לעמודת uuid. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
