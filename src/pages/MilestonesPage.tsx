import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ageBreakdown, formatLong, isValidISO } from '../lib/date';
import { resolveMilestones } from '../lib/milestones';
import { milestonesDone, milestonesTotal } from '../lib/progress';
import { useJournal } from '../store/JournalContext';
import { ProgressBar } from '../components/fields';

type Filter = 'all' | 'done' | 'open' | 'custom';

function typicalLabel(typical: [number, number] | null): string {
  if (!typical) return 'הטווח משתנה מאוד';
  const [from, to] = typical;
  return `בדרך כלל ${from}–${to} חודשים`;
}

export function MilestonesPage() {
  const { state, setMilestone, toggleMilestone, addCustomMilestone, removeMilestone } = useJournal();
  const [filter, setFilter] = useState<Filter>('all');
  const [newLabel, setNewLabel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const focusKey = useRef<string | null>(null);

  const done = milestonesDone(state);
  const total = milestonesTotal(state);
  const age = ageBreakdown(state.profile.birthDate);
  const all = useMemo(() => resolveMilestones(state), [state]);

  const visible = all.filter((milestone) => {
    const achieved = isValidISO(state.milestones[milestone.key]?.date ?? '');
    if (filter === 'done') return achieved;
    if (filter === 'open') return !achieved;
    if (filter === 'custom') return milestone.custom;
    return true;
  });

  const customCount = all.filter((milestone) => milestone.custom).length;

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    focusKey.current = addCustomMilestone(label);
    setNewLabel('');
    setFilter('all');
  }

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
            {done}/{total}
          </span>
        </div>
        <ProgressBar value={total > 0 ? (done / total) * 100 : 0} label="אבני דרך שסומנו" />
        <div className="btn-row" style={{ marginTop: 12 }}>
          {(
            [
              ['all', 'הכול'],
              ['open', 'עוד לא סומנו'],
              ['done', 'כבר קרו'],
              ...(customCount > 0 ? ([['custom', `משלנו (${customCount})`]] as [Filter, string][]) : []),
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

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            ✨
          </div>
          <div>
            <h2 className="card__title">אבן דרך משלכם</h2>
            <p className="card__sub">רגע שחשוב לכם ולא נמצא ברשימה — הפעם הראשונה בים, המילה המצחיקה, כל דבר</p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="milestone__fields" style={{ marginTop: 0 }}>
          <input
            className="input"
            type="text"
            value={newLabel}
            placeholder="למשל: הפעם הראשונה בים"
            aria-label="שם אבן הדרך החדשה"
            onChange={(event) => setNewLabel(event.target.value)}
          />
          <button type="submit" className="btn btn--primary" disabled={!newLabel.trim()}>
            + הוספה
          </button>
        </form>
        <p className="field__hint">היא תיווצר עם תאריך היום, ואפשר לשנות אותו מיד אחר כך.</p>
      </div>

      <div style={{ marginTop: 14 }}>
        {visible.map((milestone) => {
          const entry = state.milestones[milestone.key] ?? { date: '', note: '' };
          const achieved = isValidISO(entry.date);
          const inRange =
            !achieved && age && milestone.typical
              ? age.months >= milestone.typical[0] && age.months <= milestone.typical[1]
              : false;

          return (
            <div className={`milestone${achieved ? ' milestone--done' : ''}`} key={milestone.key}>
              <button
                type="button"
                className="milestone__check"
                onClick={() => toggleMilestone(milestone.key)}
                aria-pressed={achieved}
                aria-label={achieved ? `ביטול הסימון של ${milestone.label}` : `סימון ${milestone.label} כהישג שקרה`}
                title={achieved ? 'ביטול סימון' : 'סימון שזה קרה'}
              >
                {achieved ? '✓' : milestone.emoji}
              </button>

              <div className="milestone__body">
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  {milestone.custom ? (
                    <input
                      className="input"
                      type="text"
                      value={entry.label ?? ''}
                      autoFocus={focusKey.current === milestone.key}
                      aria-label="שם אבן הדרך"
                      style={{ fontWeight: 700, flex: '1 1 200px', padding: '6px 10px' }}
                      onChange={(event) => setMilestone(milestone.key, { label: event.target.value })}
                    />
                  ) : (
                    <span className="milestone__label">{milestone.label}</span>
                  )}

                  {achieved ? (
                    <span className="chip chip--done">{formatLong(entry.date)}</span>
                  ) : milestone.custom ? null : (
                    <span className="chip">{typicalLabel(milestone.typical)}</span>
                  )}
                  {inRange ? <span className="chip chip--accent">אולי בקרוב 👀</span> : null}
                </div>
                {milestone.hint ? <p className="milestone__hint">{milestone.hint}</p> : null}

                <div className="milestone__fields">
                  <input
                    className="input"
                    type="date"
                    value={entry.date}
                    aria-label={`תאריך — ${milestone.label}`}
                    onChange={(event) => setMilestone(milestone.key, { date: event.target.value })}
                  />
                  <input
                    className="input"
                    type="text"
                    value={entry.note}
                    placeholder="איפה זה קרה? מי היה שם?"
                    aria-label={`הערה — ${milestone.label}`}
                    onChange={(event) => setMilestone(milestone.key, { note: event.target.value })}
                  />
                </div>

                {milestone.custom ? (
                  <div className="btn-row" style={{ marginTop: 8 }}>
                    {confirmDelete === milestone.key ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => {
                            removeMilestone(milestone.key);
                            setConfirmDelete(null);
                          }}
                        >
                          כן, למחוק
                        </button>
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirmDelete(null)}>
                          ביטול
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => setConfirmDelete(milestone.key)}
                      >
                        מחיקת אבן הדרך
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {visible.length === 0 ? (
          <div className="card">
            <p className="muted small">אין כאן פריטים בסינון הזה.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
