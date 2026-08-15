import { useMemo, useState } from 'react';
import { buildTimeline, formatTimelineDate } from '../lib/progress';
import { Link } from '../lib/router';
import { useJournal } from '../store/JournalContext';
import { EmptyState } from '../components/fields';
import type { TimelineItem } from '../types';

const FILTERS: { key: TimelineItem['kind'] | 'all'; label: string }[] = [
  { key: 'all', label: 'הכול' },
  { key: 'milestone', label: 'אבני דרך' },
  { key: 'ability', label: 'יכולות חדשות' },
  { key: 'growth', label: 'מדידות' },
];

export function TimelinePage() {
  const { state } = useJournal();
  const [filter, setFilter] = useState<TimelineItem['kind'] | 'all'>('all');
  const all = useMemo(() => buildTimeline(state), [state]);
  const items = filter === 'all' ? all : all.filter((item) => item.kind === filter);

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">ציר זמן</div>
        <h1>כל ההישגים לפי הסדר שבו קרו</h1>
        <p>אבני דרך, יכולות חדשות ומדידות גדילה — הכול במקום אחד, מהחדש לישן.</p>
      </div>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`btn btn--sm${filter === item.key ? ' btn--primary' : ''}`}
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card">
        {items.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="עוד אין רשומות כאן"
            body="כל יכולת חדשה או אבן דרך שתסמנו תופיע כאן אוטומטית, לפי התאריך."
          />
        ) : (
          <div className="timeline">
            {items.map((item) => (
              <div className="timeline__item" key={item.id}>
                <div className="timeline__date">{formatTimelineDate(item.date)}</div>
                <a className="timeline__title" href={item.href}>
                  {item.title}
                </a>
                <div className="timeline__context">{item.context}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {all.length > 0 ? (
        <p className="small muted" style={{ marginTop: 12 }}>
          סה״כ {all.length} רשומות. אפשר להדפיס את היומן המלא מ<Link to="/settings">גיבוי והדפסה</Link>.
        </p>
      ) : null}
    </div>
  );
}
