import type { JournalState } from '../types';
import { normalizeState } from './state';
import { toISO } from './date';
import { canShareFiles } from './platform';

const FILE_TAG = 'baby-development-journal';

export interface BackupFile {
  app: string;
  exportedAt: string;
  state: JournalState;
}

export function buildBackup(state: JournalState): BackupFile {
  return { app: FILE_TAG, exportedAt: new Date().toISOString(), state };
}

export function backupFileName(state: JournalState): string {
  const name = state.profile.babyName.trim().replace(/[\\/:*?"<>|\s]+/g, '-');
  return `יומן-התפתחות${name ? `-${name}` : ''}-${toISO(new Date())}.json`;
}

function backupBlob(state: JournalState): Blob {
  return new Blob([JSON.stringify(buildBackup(state), null, 2)], { type: 'application/json;charset=utf-8' });
}

/** מוריד את היומן כקובץ JSON — גיבוי מלא כולל תמונות והקלטות. */
export function downloadBackup(state: JournalState): void {
  const url = URL.createObjectURL(backupBlob(state));
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(state);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * שמירת גיבוי בדרך שמתאימה למכשיר.
 * באייפון תפריט השיתוף הוא הדרך הטבעית לשמור ל"קבצים", ל-iCloud או לשלוח לעצמכם —
 * הורדה רגילה שם פחות נוחה. בכל מקום אחר פשוט מורידים קובץ.
 */
export async function saveBackup(state: JournalState): Promise<ShareResult> {
  const file = new File([backupBlob(state)], backupFileName(state), { type: 'application/json' });
  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title: 'גיבוי יומן ההתפתחות' });
      return 'shared';
    } catch (error) {
      // המשתמש סגר את תפריט השיתוף — לא מורידים קובץ שלא ביקשו
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBackup(state);
  return 'downloaded';
}

/** קורא קובץ גיבוי. תומך גם בקובץ שנשמר בגרסה שכללה רק את ה-state עצמו. */
export function parseBackup(text: string): JournalState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('הקובץ אינו קובץ גיבוי תקין (JSON פגום).');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('הקובץ אינו קובץ גיבוי תקין.');

  const candidate = parsed as Record<string, unknown>;
  const source = candidate.state && typeof candidate.state === 'object' ? candidate.state : candidate;
  if (!source || typeof source !== 'object' || !('profile' in source || 'months' in source)) {
    throw new Error('לא זוהו נתוני יומן בקובץ הזה.');
  }
  return normalizeState(source);
}
