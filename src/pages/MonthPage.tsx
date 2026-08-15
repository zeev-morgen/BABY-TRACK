import { useEffect, useRef } from 'react';
import { DOMAINS } from '../data/domains';
import { monthMeta, MONTHS } from '../data/months';
import { promptFor } from '../data/prompts';
import { currentJournalMonth, isValidISO, isWithinMonth, monthWindow, todayISO } from '../lib/date';
import { monthProgress } from '../lib/progress';
import { Link, useNavigate } from '../lib/router';
import { useJournal } from '../store/JournalContext';
import { AutoTextarea, ProgressBar } from '../components/fields';
import { MediaPicker } from '../components/MediaPicker';

export function MonthPage({ month }: { month: number }) {
  const { state, monthEntry, setMonthDomain, setMonthField, setMonthMedia, addAbility, updateAbility, removeAbility } =
    useJournal();
  const navigate = useNavigate();
  const meta = monthMeta(month);
  const entry = monthEntry(month);
  const window = monthWindow(state.profile.birthDate, month);
  const current = currentJournalMonth(state.profile.birthDate);
  const progress = monthProgress(entry);
  const focusAbilityId = useRef<string | null>(null);

  useEffect(() => {
    if (!focusAbilityId.current) return;
    const el = document.getElementById(`ability-text-${focusAbilityId.current}`);
    el?.focus();
    focusAbilityId.current = null;
  }, [entry.abilities.length]);

  const suggestedDate = window && !isWithinMonth(state.profile.birthDate, month, todayISO()) ? window.start : todayISO();

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">
          {meta.subtitle}
          {current === month ? ' · החודש הנוכחי' : ''}
        </div>
        <h1>{meta.title}</h1>
        <p>
          {window ? (
            <>
              טווח התאריכים: <strong>{window.label}</strong>
            </>
          ) : (
            <>
              כדי לראות את טווח התאריכים של החודש, <Link to="/profile">הוסיפו תאריך לידה</Link>.
            </>
          )}
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span className="small" style={{ fontWeight: 700 }}>
            מולאו {progress.done} מתוך {progress.total} חלקים בעמוד
          </span>
        </div>
        <ProgressBar value={progress.ratio * 100} label={`מילוי חודש ${month}`} />
      </div>

      {DOMAINS.map((domain) => (
        <div className={`card tone-${domain.tone}`} key={domain.key}>
          <div className="card__head">
            <div className="card__emoji" aria-hidden="true">
              {domain.emoji}
            </div>
            <div>
              <h2 className="card__title">{domain.title}</h2>
              <p className="card__sub">{domain.subtitle}</p>
            </div>
          </div>
          <AutoTextarea
            id={`domain-${domain.key}`}
            ariaLabel={`${domain.title} — חודש ${month}`}
            value={entry.domains[domain.key] ?? ''}
            onChange={(value) => setMonthDomain(month, domain.key, value)}
            placeholder={`למשל: ${promptFor(month, domain.key)}`}
          />
        </div>
      ))}

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            ⭐
          </div>
          <div>
            <h2 className="card__title">יכולות חדשות שגיליתי החודש</h2>
            <p className="card__sub">כל יכולת עם תאריך — כך נוצרת עם הזמן רשימה לפי סדר ההופעה</p>
          </div>
        </div>

        {entry.abilities.length === 0 ? (
          <p className="muted small" style={{ marginBottom: 10 }}>
            עוד לא נרשמו יכולות בחודש הזה.
          </p>
        ) : (
          entry.abilities.map((ability) => (
            <div className="ability" key={ability.id}>
              <input
                className="input input--date"
                type="date"
                value={ability.date}
                aria-label="תאריך היכולת"
                onChange={(event) => updateAbility(month, ability.id, { date: event.target.value })}
              />
              <input
                id={`ability-text-${ability.id}`}
                className="input input--text"
                type="text"
                value={ability.text}
                placeholder="מה גיליתם? למשל: הושיט/ה יד וסובב/ה את הרעשן"
                aria-label="תיאור היכולת"
                onChange={(event) => updateAbility(month, ability.id, { text: event.target.value })}
              />
              <button
                type="button"
                className="ability__remove"
                aria-label="מחיקת היכולת"
                title="מחיקה"
                onClick={() => removeAbility(month, ability.id)}
              >
                ✕
              </button>
            </div>
          ))
        )}

        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => {
            focusAbilityId.current = addAbility(month, suggestedDate);
          }}
        >
          + הוספת יכולת חדשה
        </button>

        {entry.abilities.some((a) => a.date && !isValidISO(a.date)) ? (
          <p className="notice notice--warn" style={{ marginTop: 10 }}>
            אחד התאריכים עדיין לא הושלם — אפשר להשאיר ריק ולחזור אליו אחר כך.
          </p>
        ) : null}
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            💫
          </div>
          <div>
            <h2 className="card__title">רגע מיוחד מהחודש</h2>
            <p className="card__sub">הרגע שתרצו לזכור גם בעוד עשרים שנה</p>
          </div>
        </div>
        <AutoTextarea
          ariaLabel={`רגע מיוחד מחודש ${month}`}
          value={entry.specialMoment}
          onChange={(value) => setMonthField(month, 'specialMoment', value)}
          placeholder="למשל: נרדמ/ה עלינו על החזה אחרי אמבטיה, עם יד אחת אוחזת באצבע"
        />
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            📷
          </div>
          <div>
            <h2 className="card__title">תמונה והקלטה מהחודש</h2>
            <p className="card__sub">התמונות נשמרות במכשיר שלכם בלבד ולא נשלחות לשום מקום</p>
          </div>
        </div>
        <MediaPicker
          kind="image"
          label="הוספת תמונה מהחודש"
          hint="התמונה תוקטן אוטומטית כדי לחסוך מקום"
          value={entry.photo}
          onChange={(value) => setMonthMedia(month, 'photo', value)}
        />
        <div style={{ height: 12 }} />
        <MediaPicker
          kind="audio"
          label="הוספת הקלטה קצרה"
          hint="צחוק, מלמול או המילה הראשונה — עד 4MB"
          value={entry.audio}
          onChange={(value) => setMonthMedia(month, 'audio', value)}
        />
      </div>

      <nav className="month-pager" aria-label="ניווט בין חודשים">
        {month > 1 ? (
          <button type="button" className="btn" onClick={() => navigate(`/month/${month - 1}`)}>
            → חודש {month - 1}
          </button>
        ) : (
          <span />
        )}
        {month < MONTHS.length ? (
          <button type="button" className="btn" onClick={() => navigate(`/month/${month + 1}`)}>
            חודש {month + 1} ←
          </button>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
