import { useCallback, useEffect, useState } from 'react';
import { formatShort } from '../lib/date';
import { describeError, supabase } from '../lib/supabase';
import { Link } from '../lib/router';
import { useSession } from '../store/SessionContext';
import { EmptyState } from '../components/fields';

interface Member {
  user_id: string;
  display_name: string;
  role: string;
  joined_at: string;
}

/** תפריט השיתוף של המערכת קיים בטלפונים, לא בכל דפדפן שולחני. */
const canUseShareSheet = typeof navigator !== 'undefined' && 'share' in navigator;

export function SharePage() {
  const { journalId, currentJournal, user } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!supabase || !journalId) return;
    const { data, error: memberError } = await supabase.rpc('baby_member_names', { p_baby_id: journalId });
    if (memberError) {
      setError(describeError(memberError));
      return;
    }
    setMembers((data ?? []) as Member[]);
  }, [journalId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function createCode() {
    if (!supabase || !journalId) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_baby_invite', { p_baby_id: journalId });
      if (rpcError) throw rpcError;
      setCode(String(data));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!code) return;
    const message = `הזמנה ליומן ההתפתחות של ${currentJournal?.name?.trim() || 'התינוק/ת שלנו'}.\nהקוד: ${code}\n\nנכנסים לאפליקציה, נרשמים, ואז "היומנים שלי" ← הצטרפות ליומן קיים.`;
    try {
      if (canUseShareSheet) {
        await navigator.share({ text: message });
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // המשתמש סגר את תפריט השיתוף — אין מה לעשות
    }
  }

  if (!journalId) {
    return (
      <div className="card">
        <EmptyState icon="📖" title="לא נבחר יומן" body="בחרו יומן כדי לשתף אותו." />
        <Link to="/journals" className="btn btn--primary">
          ליומנים שלי
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">שיתוף</div>
        <h1>שני הורים, יומן אחד</h1>
        <p>
          כל מי שמצטרף עם קוד הזמנה רואה וכותב את אותו יומן בדיוק, מהמכשיר שלו. כל שינוי מופיע אצל השני בטעינה הבאה.
        </p>
      </div>

      {error ? <p className="notice notice--error">{error}</p> : null}

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            👥
          </div>
          <div>
            <h2 className="card__title">מי כותב ביומן</h2>
            <p className="card__sub">{currentJournal?.name?.trim() || 'היומן הנוכחי'}</p>
          </div>
        </div>

        {members.length === 0 ? (
          <p className="muted small">טוענים…</p>
        ) : (
          members.map((member) => (
            <div className="ability" key={member.user_id} style={{ alignItems: 'center' }}>
              <span className="chip">{member.role === 'owner' ? 'בעלים' : 'שותף/ה'}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>
                {member.display_name}
                {member.user_id === user?.id ? ' (אתם)' : ''}
              </span>
              <span className="small muted">הצטרף/ה {formatShort(member.joined_at.slice(0, 10))}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            🎟️
          </div>
          <div>
            <h2 className="card__title">הזמנת ההורה השני</h2>
            <p className="card__sub">קוד חד־פעמי שתקף לשבועיים</p>
          </div>
        </div>

        {code ? (
          <>
            <div
              className="notice notice--ok"
              style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.18em' }}
            >
              {code}
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn--primary" onClick={() => void share()}>
                {canUseShareSheet ? 'שליחת ההזמנה' : 'העתקת הקוד'}
              </button>
              <button type="button" className="btn" onClick={() => void createCode()} disabled={busy}>
                קוד חדש
              </button>
            </div>
            {copied ? <p className="field__hint">הקוד הועתק ✓</p> : null}
            <p className="field__hint" style={{ marginTop: 8 }}>
              הקוד תקף לשימוש אחד בלבד. אחרי שההורה השני מצטרף, אפשר להנפיק קוד חדש למישהו נוסף.
            </p>
          </>
        ) : (
          <>
            <p className="small muted" style={{ marginBottom: 12 }}>
              הקוד לא נשמר במקום גלוי — מי שמקבל אותו יכול להצטרף פעם אחת, וזהו.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => void createCode()} disabled={busy}>
              {busy ? 'רגע…' : 'יצירת קוד הזמנה'}
            </button>
          </>
        )}
      </div>

      <p className="notice" style={{ marginTop: 14 }}>
        ℹ️ שלחו את הקוד רק למי שאתם רוצים שיראה את היומן. מי שמחזיק בקוד תקף יכול להצטרף אליו.
      </p>
    </div>
  );
}
