import { MONTHS } from '../data/months';
import { currentJournalMonth, monthWindow } from '../lib/date';
import { monthProgress } from '../lib/progress';
import { Link } from '../lib/router';
import { useJournal } from '../store/JournalContext';

/** רשת 12 החודשים — משמשת גם בעמוד הבית וגם בעמוד "חודשים". */
export function MonthGrid() {
  const { state } = useJournal();
  const current = currentJournalMonth(state.profile.birthDate);

  return (
    <div className="month-grid">
      {MONTHS.map((meta) => {
        const progress = monthProgress(state.months[String(meta.month)]);
        const isCurrent = current === meta.month;
        const isFuture = current !== null && meta.month > current && progress.done === 0;
        const window = monthWindow(state.profile.birthDate, meta.month);

        return (
          <Link
            key={meta.month}
            to={`/month/${meta.month}`}
            className={`month-tile${isCurrent ? ' month-tile--current' : ''}${isFuture ? ' month-tile--future' : ''}`}
            title={window ? `${meta.subtitle} · ${window.label}` : meta.subtitle}
          >
            <div className="month-tile__num">{meta.month}</div>
            <div className="month-tile__label">{isCurrent ? 'החודש הנוכחי' : `חודש ${meta.month}`}</div>
            <div className="month-tile__dots" aria-label={`מולאו ${progress.done} מתוך ${progress.total} חלקים`}>
              {Array.from({ length: progress.total }, (_, index) => (
                <span key={index} className={`dot${index < progress.done ? ' dot--on' : ''}`} />
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function MonthsPage() {
  const { state } = useJournal();
  const hasBirthDate = !!state.profile.birthDate;

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">השנה הראשונה</div>
        <h1>12 העמודים החודשיים</h1>
        <p>
          בכל חודש מחכים לכם ארבעה תחומי התפתחות, מקום ליכולות חדשות עם תאריך, רגע מיוחד ותמונה. אין חובה למלא הכול —
          כותבים רק את מה שמרגיש נכון.
        </p>
      </div>

      {!hasBirthDate ? (
        <p className="notice notice--warn" style={{ marginBottom: 14 }}>
          עדיין לא הוזן תאריך לידה, ולכן לא מוצגים טווחי תאריכים לכל חודש. <Link to="/profile">אפשר להוסיף אותו כאן</Link>.
        </p>
      ) : null}

      <MonthGrid />
    </div>
  );
}
