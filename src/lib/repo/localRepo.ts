import type { Attachment, JournalState } from '../../types';
import { clearJournal, loadJournal, saveJournal } from '../db';
import { createEmptyState } from '../state';
import type { Change, JournalRepo, MediaTarget } from './types';

/**
 * אחסון מקומי בלבד (IndexedDB) — מצב ברירת המחדל כשאין חיבור לענן מוגדר.
 * הכתיבה כאן היא של המצב המלא, ולכן תיאור השינוי אינו נחוץ.
 */
export const localRepo: JournalRepo = {
  mode: 'local',

  async load(): Promise<JournalState> {
    const stored = await loadJournal();
    return stored ?? createEmptyState();
  },

  async persist(_journalId: string, _change: Change, nextState: JournalState): Promise<void> {
    await saveJournal(nextState);
  },

  async uploadMedia(_journalId: string, _target: MediaTarget, attachment: Attachment): Promise<Attachment> {
    // במצב מקומי הקובץ כבר נמצא בזיכרון כ-data URL, אין לאן להעלות אותו
    return attachment;
  },

  async removeMedia(): Promise<void> {
    // אין קובץ נפרד למחוק — הוא נשמר בתוך המצב עצמו
  },

  async clear(): Promise<void> {
    await clearJournal();
  },
};
