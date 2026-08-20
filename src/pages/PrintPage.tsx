import { DOMAINS } from '../data/domains';
import { GROWTH_ROWS } from '../data/growth';
import { resolveMilestones } from '../lib/milestones';
import { MONTHS } from '../data/months';
import { formatLong, formatShort, monthWindow } from '../lib/date';
import { monthProgress } from '../lib/progress';
import { useNavigate } from '../lib/router';
import { useJournal } from '../store/JournalContext';

function Block({ value }: { value: string }) {
  const text = value.trim();
  return <div className={`print-block${text ? '' : ' print-block--empty'}`}>{text || '—'}</div>;
}

export function PrintPage() {
  const { state } = useJournal();
  const navigate = useNavigate();
  const { profile } = state;
  const filledMonths = MONTHS.filter((meta) => monthProgress(state.months[String(meta.month)]).done > 0);
  const achievedMilestones = resolveMilestones(state).filter((milestone) => state.milestones[milestone.key]?.date);
  const growthRows = GROWTH_ROWS.filter((row) => {
    const entry = state.growth[row.id];
    return entry && (entry.weight || entry.length || entry.head || entry.notes);
  });

  return (
    <div className="print-sheet">
      <div className="print-toolbar card no-print" style={{ marginBottom: 16 }}>
        <h2 className="card__title">תצוגת הדפסה</h2>
        <p className="card__sub" style={{ marginBottom: 10 }}>
          מודפסים רק עמודים שיש בהם תוכן. בחלון ההדפסה אפשר לבחור "שמירה כ-PDF" כדי לקבל קובץ.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => window.print()}>
            🖨️ הדפסה / שמירה כ-PDF
          </button>
          <button type="button" className="btn" onClick={() => navigate('/settings')}>
            חזרה
          </button>
        </div>
      </div>

      <section className="print-page print-cover">
        <div className="print-page__kicker">יומן התפתחות תינוק</div>
        <h1>{profile.babyName.trim() || 'התינוק/ת שלנו'}</h1>
        <p className="print-cover__tagline">כל רגע קטן הוא הישג גדול</p>
        {profile.coverPhoto ? <img src={profile.coverPhoto.dataUrl} alt="" /> : null}
        <div className="print-facts">
          <div className="print-fact">
            <div className="print-fact__label">תאריך לידה</div>
            <div className="print-fact__value">{formatLong(profile.birthDate) || '—'}</div>
          </div>
          <div className="print-fact">
            <div className="print-fact__label">משקל בלידה</div>
            <div className="print-fact__value">{profile.birthWeight || '—'}</div>
          </div>
          <div className="print-fact">
            <div className="print-fact__label">אורך בלידה</div>
            <div className="print-fact__value">{profile.birthLength || '—'}</div>
          </div>
          <div className="print-fact">
            <div className="print-fact__label">היומן נכתב על ידי</div>
            <div className="print-fact__value">{profile.author || '—'}</div>
          </div>
        </div>
      </section>

      {achievedMilestones.length > 0 ? (
        <section className="print-page">
          <div className="print-page__kicker">אבני דרך ראשונות</div>
          <h2>כל "פעם ראשונה" והתאריך שבו קרתה</h2>
          <ul className="print-list">
            {achievedMilestones.map((milestone) => {
              const entry = state.milestones[milestone.key];
              return (
                <li key={milestone.key}>
                  <strong>{milestone.label}</strong> — {formatShort(entry.date)}
                  {entry.note.trim() ? ` · ${entry.note.trim()}` : ''}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {growthRows.length > 0 ? (
        <section className="print-page">
          <div className="print-page__kicker">מעקב גדילה</div>
          <h2>משקל, אורך והיקף ראש</h2>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="growth">
              <thead>
                <tr>
                  <th scope="col">גיל</th>
                  <th scope="col">תאריך</th>
                  <th scope="col">משקל</th>
                  <th scope="col">אורך</th>
                  <th scope="col">היקף ראש</th>
                  <th scope="col">הערות</th>
                </tr>
              </thead>
              <tbody>
                {growthRows.map((row) => {
                  const entry = state.growth[row.id];
                  return (
                    <tr key={row.id}>
                      <td className="row-label">{row.label}</td>
                      <td>{formatShort(entry.date) || '—'}</td>
                      <td>{entry.weight || '—'}</td>
                      <td>{entry.length || '—'}</td>
                      <td>{entry.head || '—'}</td>
                      <td>{entry.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {state.growthNotes.trim() ? (
            <>
              <h3>הערות נוספות</h3>
              <Block value={state.growthNotes} />
            </>
          ) : null}
        </section>
      ) : null}

      {filledMonths.map((meta) => {
        const entry = state.months[String(meta.month)];
        const window = monthWindow(profile.birthDate, meta.month);
        const abilities = entry.abilities.filter((ability) => ability.text.trim());

        return (
          <section className="print-page" key={meta.month}>
            <div className="print-page__kicker">{meta.subtitle}</div>
            <h2>
              {meta.title}
              {window ? <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}> · {window.label}</span> : null}
            </h2>

            {DOMAINS.map((domain) =>
              entry.domains[domain.key]?.trim() ? (
                <div key={domain.key}>
                  <h3>
                    {domain.emoji} {domain.title}
                  </h3>
                  <Block value={entry.domains[domain.key]} />
                </div>
              ) : null,
            )}

            {abilities.length > 0 ? (
              <>
                <h3>⭐ יכולות חדשות שגיליתי החודש</h3>
                <ul className="print-list">
                  {abilities.map((ability) => (
                    <li key={ability.id}>
                      {ability.date ? <strong>{formatShort(ability.date)} — </strong> : null}
                      {ability.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {entry.specialMoment.trim() ? (
              <>
                <h3>💫 רגע מיוחד מהחודש</h3>
                <Block value={entry.specialMoment} />
              </>
            ) : null}

            {entry.photo ? <img className="print-photo" src={entry.photo.dataUrl} alt={`תמונה מחודש ${meta.month}`} /> : null}
            {entry.audio ? <p className="small muted">🎙️ לחודש הזה מצורפת גם הקלטה — אפשר להאזין לה באפליקציה.</p> : null}
          </section>
        );
      })}

      {filledMonths.length === 0 && achievedMilestones.length === 0 && growthRows.length === 0 ? (
        <p className="notice no-print">היומן עדיין ריק — אחרי שתמלאו תוכן, הוא יופיע כאן מוכן להדפסה.</p>
      ) : null}
    </div>
  );
}
