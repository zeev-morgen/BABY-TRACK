import { useMemo, useState } from 'react';
import { MILESTONES } from '../data/milestones';
import { ageBreakdown, formatLong, isValidISO } from '../lib/date';
import { milestonesDone } from '../lib/progress';
import { useJournal } from '../store/JournalContext';
import { ProgressBar } from '../components/fields';

type Filter = 'all' | 'done' | 'open';

function typicalLabel(typical: [number, number] | null): string {
  if (!typical) return 'הטווח משתנה מאוד';
  const [from, to] = typical;
  return `בדרך כלל ${from}–${to} חודשים`;
}

export function MilestonesPage() {
  const { state, setMilestone, toggleMilestone } = useJournal();
  const [filter, setFilter] = useState<Filter>('all');
  const done = milestonesDone(state);
  const age = ageBreakdown(state.profile.birthDate);

  const visible = useMemo(() => {
    return MILESTONES.filter((milestone) => {
      const achieved = isValidISO(state.milestones[milestone.id]?.date ?? '');
      if (filter === 'done') return achieved;
      if (filter === 'open') return !achieved;
      return true;
    });
  }, [filter, state.milestones]);

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">אבני דרך ראשונות</div>
        <h1>כל "פעם ראשונה" עם התאריך שבו קרתה</h1>
        <p>
          לוחצים על העיגול כדי לסמן שהיום זה קרה, ואפשר לשנות את התאריך ולהוסיף מילה או שתיים. טווחי הגילאים כאן הם כיוון
          כללי בלבד — לכל תינוק/ת קצב משלו/ה, ואין "סדר נכון".
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span style={{ fontWeight: 700 }}>סומנו {done} אבני דרך</span>
          <span className="chip chip--accent">
            {done}/{MILESTONES.length}
          </span>
        </div>
        <ProgressBar value={(done / MILESTONES.length) * 100} label="אבני דרך שסומנו" />
        <div className="btn-row" style={{ marginTop: 12 }}>
          {(
            [
              ['all', 'הכול'],
              ['open', 'עוד לא סומנו'],
              ['done', 'כבר קרו'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn--sm${filter === key ? ' btn--primary' : ''}`}
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {visible.map((milestone) => {
          const entry = state.milestones[milestone.id] ?? { date: '', note: '' };
          const achieved = isValidISO(entry.date);
          const inRange =
            !achieved && age && milestone.typical
              ? age.months >= milestone.typical[0] && age.months <= milestone.typical[1]
              : false;

          return (
            <div className={`milestone${achieved ? ' milestone--done' : ''}`} key={milestone.id}>
              <button
                type="button"
                className="milestone__check"
                onClick={() => toggleMilestone(milestone.id)}
                aria-pressed={achieved}
                aria-label={achieved ? `ביטול הסימון של ${milestone.label}` : `סימון ${milestone.label} כהישג שקרה`}
                title={achieved ? 'ביטול סימון' : 'סימון שזה קרה'}
              >
                {achieved ? '✓' : milestone.emoji}
              </button>

              <div className="milestone__body">
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="milestone__label">{milestone.label}</span>
                  {achieved ? (
                    <span className="chip chip--done">{formatLong(entry.date)}</span>
                  ) : (
                    <span className="chip">{typicalLabel(milestone.typical)}</span>
                  )}
                  {inRange ? <span className="chip chip--accent">אולי בקרוב 👀</span> : null}
                </div>
                <p className="milestone__hint">{milestone.hint}</p>

                <div className="milestone__fields">
                  <input
                    className="input"
                    type="date"
                    value={entry.date}
                    aria-label={`תאריך — ${milestone.label}`}
                    onChange={(event) => setMilestone(milestone.id, { date: event.target.value })}
                  />
                  <input
                    className="input"
                    type="text"
                    value={entry.note}
                    placeholder="איפה זה קרה? מי היה שם?"
                    aria-label={`הערה — ${milestone.label}`}
                    onChange={(event) => setMilestone(milestone.id, { note: event.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
