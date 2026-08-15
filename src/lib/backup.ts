import type { JournalState } from '../types';
import { normalizeState } from './state';
import { toISO } from './date';

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

/** מוריד את היומן כקובץ JSON — גיבוי מלא כולל תמונות והקלטות. */
export function downloadBackup(state: JournalState): void {
  const blob = new Blob([JSON.stringify(buildBackup(state), null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(state);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
