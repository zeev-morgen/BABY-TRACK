import { useRef, useState } from 'react';
import { downloadBackup, parseBackup } from '../lib/backup';
import { formatBytes } from '../lib/media';
import { Link, useNavigate } from '../lib/router';
import { useJournal } from '../store/JournalContext';

type Message = { tone: 'ok' | 'error' | 'warn'; text: string } | null;

export function SettingsPage() {
  const { state, replaceState, resetAll, saveError } = useJournal();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const approximateSize = JSON.stringify(state).length;

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseBackup(text);
      replaceState(imported);
      setMessage({ tone: 'ok', text: 'הגיבוי נטען בהצלחה. כל התוכן הקודם באפליקציה הוחלף בתוכן מהקובץ.' });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'הייבוא נכשל' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">גיבוי והדפסה</div>
        <h1>הנתונים שלכם, בשליטה שלכם</h1>
        <p>
          היומן נשמר בדפדפן של המכשיר הזה בלבד — אין שרת, אין חשבון ואין העלאה לאינטרנט. לכן כדאי לייצא גיבוי מדי פעם,
          וגם לפני החלפת מכשיר או ניקוי היסטוריית הדפדפן.
        </p>
      </div>

      {message ? (
        <p className={`notice notice--${message.tone === 'ok' ? 'ok' : message.tone === 'warn' ? 'warn' : 'error'}`}>
          {message.text}
        </p>
      ) : null}

      {saveError ? <p className="notice notice--error">⚠️ {saveError}</p> : null}

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            💾
          </div>
          <div>
            <h2 className="card__title">ייצוא גיבוי</h2>
            <p className="card__sub">קובץ אחד שמכיל את כל הטקסטים, התמונות וההקלטות</p>
          </div>
        </div>
        <p className="small muted" style={{ marginBottom: 12 }}>
          גודל משוער של היומן כרגע: {formatBytes(approximateSize)}
        </p>
        <button type="button" className="btn btn--primary" onClick={() => downloadBackup(state)}>
          הורדת קובץ גיבוי
        </button>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            📥
          </div>
          <div>
            <h2 className="card__title">ייבוא גיבוי</h2>
            <p className="card__sub">שחזור במכשיר חדש או חזרה לגיבוי קודם</p>
          </div>
        </div>
        <p className="notice notice--warn" style={{ marginBottom: 12 }}>
          שימו לב: ייבוא מחליף את כל התוכן שנמצא כרגע באפליקציה. אם יש לכם תוכן שלא נמצא בקובץ — ייצאו קודם גיבוי.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          בחירת קובץ גיבוי
        </button>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            🖨️
          </div>
          <div>
            <h2 className="card__title">הדפסה או שמירה כ-PDF</h2>
            <p className="card__sub">היומן המלא, עמוד לכל חודש — בדיוק כמו החוברת המקורית</p>
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/print')}>
            מעבר לתצוגת הדפסה
          </button>
          <Link to="/print" className="btn">
            פתיחה בלשונית הנוכחית
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            🗑️
          </div>
          <div>
            <h2 className="card__title">מחיקת כל התוכן</h2>
            <p className="card__sub">פעולה שלא ניתן לבטל</p>
          </div>
        </div>
        {confirmingReset ? (
          <>
            <p className="notice notice--error" style={{ marginBottom: 12 }}>
              זה ימחק לצמיתות את כל הטקסטים, התמונות וההקלטות מהמכשיר הזה. בטוחים?
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  void resetAll().then(() => {
                    setConfirmingReset(false);
                    setMessage({ tone: 'warn', text: 'כל התוכן נמחק. אפשר להתחיל יומן חדש.' });
                  });
                }}
              >
                כן, למחוק הכול
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmingReset(false)}>
                ביטול
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="btn btn--danger" onClick={() => setConfirmingReset(true)}>
            מחיקת כל התוכן
          </button>
        )}
      </div>

      <p className="notice" style={{ marginTop: 14 }}>
        🔒 פרטיות: האפליקציה לא שולחת שום מידע לשרת. הכול נשמר ב-IndexedDB של הדפדפן במכשיר הזה, וניקוי נתוני האתר
        בדפדפן ימחק גם את היומן — לכן שווה לשמור גיבוי במקום בטוח.
      </p>
    </div>
  );
}
