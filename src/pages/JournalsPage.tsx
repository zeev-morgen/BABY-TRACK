import { useState, type FormEvent } from 'react';
import { ageBreakdown, todayISO } from '../lib/date';
import { navigate } from '../lib/router';
import { useSession } from '../store/SessionContext';

export function JournalsPage() {
  const { journals, journalId, selectJournal, createJournal, joinJournal, leaveJournal } = useSession();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createJournal(name, birthDate);
      setName('');
      setBirthDate('');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירת היומן נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await joinJournal(code);
      setCode('');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההצטרפות נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">היומנים שלי</div>
        <h1>איזה יומן פתוח עכשיו?</h1>
        <p>אפשר לנהל יומן לכל ילד/ה, ולשתף כל יומן עם ההורה השני.</p>
      </div>

      {error ? <p className="notice notice--error">{error}</p> : null}

      {journals.length > 0 ? (
        <div className="card">
          <h2 className="card__title" style={{ marginBottom: 10 }}>
            יומנים פעילים
          </h2>
          {journals.map((journal) => {
            const age = ageBreakdown(journal.birthDate);
            const isCurrent = journal.id === journalId;
            return (
              <div className={`milestone${isCurrent ? ' milestone--done' : ''}`} key={journal.id}>
                <div className="milestone__check" aria-hidden="true">
                  {isCurrent ? '✓' : '📖'}
                </div>
                <div className="milestone__body">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span className="milestone__label">{journal.name.trim() || 'יומן ללא שם'}</span>
                    <span className="chip">{journal.role === 'owner' ? 'נוצר על ידך' : 'שותף/ה'}</span>
                  </div>
                  <p className="milestone__hint">{age ? `גיל: ${age.text}` : 'ללא תאריך לידה'}</p>
                  <div className="btn-row" style={{ marginTop: 8 }}>
                    {!isCurrent ? (
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        onClick={() => {
                          selectJournal(journal.id);
                          navigate('/');
                        }}
                      >
                        פתיחה
                      </button>
                    ) : (
                      <span className="chip chip--accent">פתוח עכשיו</span>
                    )}

                    {leaving === journal.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => {
                            void leaveJournal(journal.id)
                              .catch((err: Error) => setError(err.message))
                              .finally(() => setLeaving(null));
                          }}
                        >
                          כן, להסיר אותי
                        </button>
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setLeaving(null)}>
                          ביטול
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => setLeaving(journal.id)}>
                        עזיבת היומן
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="field__hint" style={{ marginTop: 10 }}>
            עזיבה מסירה רק אתכם מהיומן. התוכן נשאר אצל שאר השותפים.
          </p>
        </div>
      ) : (
        <p className="notice notice--warn">עדיין אין לכם יומן. אפשר ליצור אחד חדש, או להצטרף לקיים עם קוד הזמנה.</p>
      )}

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            ✨
          </div>
          <div>
            <h2 className="card__title">יומן חדש</h2>
            <p className="card__sub">אפשר להשלים את שאר הפרטים אחר כך</p>
          </div>
        </div>
        <form onSubmit={handleCreate}>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="new-name">
                שם התינוק/ת
              </label>
              <input
                id="new-name"
                className="input"
                type="text"
                required
                value={name}
                placeholder="למשל: מעיין"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="new-birth">
                תאריך לידה
              </label>
              <input
                id="new-birth"
                className="input"
                type="date"
                max={todayISO()}
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            יצירת יומן
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            🤝
          </div>
          <div>
            <h2 className="card__title">הצטרפות ליומן קיים</h2>
            <p className="card__sub">קיבלתם קוד הזמנה מההורה השני? הדביקו אותו כאן</p>
          </div>
        </div>
        <form onSubmit={handleJoin}>
          <div className="field">
            <label className="field__label" htmlFor="invite-code">
              קוד הזמנה
            </label>
            <input
              id="invite-code"
              className="input"
              type="text"
              required
              value={code}
              placeholder="למשל: A1B2C3D4"
              style={{ letterSpacing: '0.12em', fontWeight: 700 }}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </div>
          <button type="submit" className="btn" disabled={busy}>
            הצטרפות
          </button>
        </form>
      </div>
    </div>
  );
}
