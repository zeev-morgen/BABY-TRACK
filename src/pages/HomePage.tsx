
import { MONTHS, monthMeta } from '../data/months';
import { ageBreakdown, currentJournalMonth, monthWindow } from '../lib/date';
import {
  abilitiesCount,
  buildTimeline,
  formatTimelineDate,
  milestonesDone,
  milestonesTotal,
  monthProgress,
  overallProgress,
  photosCount,
} from '../lib/progress';
import { Link } from '../lib/router';
import { useJournal } from '../store/JournalContext';
import { ProgressBar } from '../components/fields';
import { InstallHint } from '../components/InstallHint';
import { MonthGrid } from './MonthsPage';

export function HomePage() {
  const { state } = useJournal();
  const { profile } = state;
  const age = ageBreakdown(profile.birthDate);
  const current = currentJournalMonth(profile.birthDate);
  const timeline = buildTimeline(state).slice(0, 4);
  const overall = overallProgress(state);

  const needsSetup = !profile.babyName.trim() || !profile.birthDate;

  return (
    <div>
      <InstallHint />

      <section className="hero">
        {profile.coverPhoto ? (
          <img className="hero__photo" src={profile.coverPhoto.dataUrl} alt={profile.babyName || 'תמונת התינוק/ת'} />
        ) : (
          <div className="hero__photo hero__photo--empty" aria-hidden="true">
            👶
          </div>
        )}
        <div className="hero__body">
          <div className="hero__name">{profile.babyName.trim() || 'יומן התפתחות תינוק'}</div>
          <div className="hero__age">{age ? `גיל: ${age.text}` : 'הוסיפו תאריך לידה כדי לראות את הגיל'}</div>
          <p className="hero__tagline">כל רגע קטן הוא הישג גדול ✨</p>
        </div>
      </section>

      {needsSetup ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card__head">
            <div className="card__emoji" aria-hidden="true">
              ✍️
            </div>
            <div>
              <h2 className="card__title">נתחיל מההתחלה</h2>
              <p className="card__sub">כמה פרטים קצרים והיומן מתאים את עצמו לתינוק/ת שלכם</p>
            </div>
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>
            אחרי שתמלאו שם ותאריך לידה, כל עמוד חודשי יקבל את טווח התאריכים המדויק שלו, והיומן יסמן לכם איפה אתם נמצאים
            עכשיו.
          </p>
          <Link to="/profile" className="btn btn--primary">
            מילוי פרטי התינוק/ת ←
          </Link>
        </div>
      ) : null}

      <h2 className="section-title">מבט מהיר</h2>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span style={{ fontWeight: 700 }}>מילוי היומן</span>
          <span className="chip chip--accent">{Math.round(overall)}%</span>
        </div>
        <ProgressBar value={overall} label="אחוז מילוי היומן" />
        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat">
            <div className="stat__value">
              {milestonesDone(state)}
              <span className="muted" style={{ fontSize: '0.9rem' }}>
                /{milestonesTotal(state)}
              </span>
            </div>
            <div className="stat__label">אבני דרך</div>
          </div>
          <div className="stat">
            <div className="stat__value">{abilitiesCount(state)}</div>
            <div className="stat__label">יכולות חדשות</div>
          </div>
          <div className="stat">
            <div className="stat__value">{photosCount(state)}</div>
            <div className="stat__label">תמונות ביומן</div>
          </div>
          <div className="stat">
            <div className="stat__value">{MONTHS.filter((m) => monthProgress(state.months[String(m.month)]).done > 0).length}</div>
            <div className="stat__label">חודשים שהתחלתם</div>
          </div>
        </div>
      </div>

      {current ? (
        <>
          <h2 className="section-title">החודש הנוכחי</h2>
          <div className="card">
            <div className="card__head">
              <div className="card__emoji" aria-hidden="true">
                {monthProgress(state.months[String(current)]).done > 0 ? '📖' : '📝'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="card__title">
                  {monthMeta(current).title} — {monthMeta(current).subtitle}
                </h3>
                <p className="card__sub">{monthWindow(profile.birthDate, current)?.label}</p>
              </div>
            </div>
            <ProgressBar
              value={monthProgress(state.months[String(current)]).ratio * 100}
              label={`מילוי עמוד חודש ${current}`}
            />
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Link to={`/month/${current}`} className="btn btn--primary">
                כתיבה בעמוד של החודש ←
              </Link>
              <Link to="/milestones" className="btn">
                סימון אבן דרך ⭐
              </Link>
            </div>
          </div>
        </>
      ) : null}

      <h2 className="section-title">12 החודשים</h2>
      <MonthGrid />

      <h2 className="section-title">הישגים אחרונים</h2>
      <div className="card">
        {timeline.length === 0 ? (
          <p className="muted small">
            עוד לא נרשמו הישגים. אפשר להתחיל מאבן דרך אחת — {' '}
            <Link to="/milestones">החיוך הראשון, למשל</Link>.
          </p>
        ) : (
          <div className="timeline">
            {timeline.map((item) => (
              <div className="timeline__item" key={item.id}>
                <div className="timeline__date">{formatTimelineDate(item.date)}</div>
                <a className="timeline__title" href={item.href}>
                  {item.title}
                </a>
                <div className="timeline__context">{item.context}</div>
              </div>
            ))}
            <Link to="/timeline" className="btn btn--sm">
              לציר הזמן המלא ←
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
