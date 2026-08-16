import { useState, type FormEvent } from 'react';
import { useSession } from '../store/SessionContext';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName);
        setNotice(
          'נרשמת! אם הגיע אליכם מייל אישור — צריך ללחוץ על הקישור שבו, ואז לחזור לכאן ולהתחבר.',
        );
        setMode('signin');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההתחברות נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <div className="hero" style={{ marginBottom: 18 }}>
        <div className="hero__photo hero__photo--empty" aria-hidden="true">
          👶
        </div>
        <div className="hero__body">
          <div className="hero__name">יומן התפתחות תינוק</div>
          <p className="hero__tagline">כל רגע קטן הוא הישג גדול ✨</p>
        </div>
      </div>

      <div className="card">
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`btn btn--sm${mode === 'signin' ? ' btn--primary' : ''}`}
            onClick={() => setMode('signin')}
            aria-pressed={mode === 'signin'}
          >
            כניסה
          </button>
          <button
            type="button"
            className={`btn btn--sm${mode === 'signup' ? ' btn--primary' : ''}`}
            onClick={() => setMode('signup')}
            aria-pressed={mode === 'signup'}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' ? (
            <div className="field">
              <label className="field__label" htmlFor="display-name">
                איך לקרוא לך?
              </label>
              <input
                id="display-name"
                className="input"
                type="text"
                value={displayName}
                autoComplete="name"
                placeholder="למשל: אמא"
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <p className="field__hint">מופיע להורה השני ברשימת השותפים ליומן</p>
            </div>
          ) : null}

          <div className="field">
            <label className="field__label" htmlFor="email">
              אימייל
            </label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">
              סיסמה
            </label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === 'signup' ? <p className="field__hint">לפחות 6 תווים</p> : null}
          </div>

          {error ? <p className="notice notice--error">{error}</p> : null}
          {notice ? <p className="notice notice--ok">{notice}</p> : null}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? 'רגע…' : mode === 'signup' ? 'יצירת חשבון' : 'כניסה'}
          </button>
        </form>
      </div>

      <p className="notice" style={{ marginTop: 14 }}>
        🔒 היומן שלכם פרטי. רק מי שהזמנתם אליו במפורש יכול לראות או לכתוב בו — ההרשאות נאכפות בדאטהבייס עצמו, לא
        באפליקציה.
      </p>
    </div>
  );
}
