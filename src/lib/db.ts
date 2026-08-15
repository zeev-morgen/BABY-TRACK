import type { JournalState } from '../types';
import { normalizeState } from './state';

/**
 * שכבת אחסון מקומית.
 * ברירת המחדל היא IndexedDB (מחזיק בקלות תמונות והקלטות),
 * ואם הדפדפן חוסם אותה — נופלים חזרה ל-localStorage.
 */

const DB_NAME = 'baby-journal';
const DB_VERSION = 1;
const STORE = 'journal';
const RECORD_KEY = 'state';
const LS_KEY = 'baby-journal:state';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB blocked'));
  });

  // כישלון פותח לא "נתקע" — הניסיון הבא יפתח מחדש ולא יחזור לפרומיס דחוי
  const guarded = opening.catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  dbPromise = guarded;
  return guarded;
}

function idbGet(): Promise<unknown> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(RECORD_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

function idbSet(value: JournalState): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, RECORD_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

function lsGet(): unknown {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(value: JournalState): void {
  localStorage.setItem(LS_KEY, JSON.stringify(value));
}

/** טוען את היומן מהאחסון המקומי. מחזיר null כשעדיין אין נתונים. */
export async function loadJournal(): Promise<JournalState | null> {
  let raw: unknown = null;
  try {
    raw = await idbGet();
  } catch {
    raw = null;
  }
  if (!raw) raw = lsGet();
  if (!raw) return null;
  return normalizeState(raw);
}

/** שומר את היומן. זורק שגיאה קריאה כשנגמר מקום האחסון. */
export async function saveJournal(state: JournalState): Promise<void> {
  try {
    await idbSet(state);
    return;
  } catch {
    // ממשיכים ל-localStorage
  }
  try {
    lsSet(state);
  } catch {
    throw new Error('לא הצלחנו לשמור — ייתכן שנגמר מקום האחסון בדפדפן. נסו למחוק תמונה או שתיים, או לייצא גיבוי.');
  }
}

/** מוחק את כל הנתונים המקומיים. */
export async function clearJournal(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // אין IndexedDB — מספיק לנקות את localStorage
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // מתעלמים: אין מה לנקות
  }
}
