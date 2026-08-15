import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { routeParam, useRoute, navigate } from './lib/router';
import { MONTHS } from './data/months';
import { useJournal } from './store/JournalContext';
import { HomePage } from './pages/HomePage';
import { MonthsPage } from './pages/MonthsPage';
import { MonthPage } from './pages/MonthPage';
import { MilestonesPage } from './pages/MilestonesPage';
import { GrowthPage } from './pages/GrowthPage';
import { TimelinePage } from './pages/TimelinePage';
import { ProfilePage } from './pages/ProfilePage';
import { GuidePage } from './pages/GuidePage';
import { SettingsPage } from './pages/SettingsPage';
import { PrintPage } from './pages/PrintPage';

function NotFound({ route }: { route: string }) {
  return (
    <div className="card">
      <h1 className="card__title">לא מצאנו את העמוד הזה</h1>
      <p className="card__sub" style={{ marginBottom: 12 }}>
        הכתובת <code>{route}</code> לא קיימת ביומן.
      </p>
      <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
        חזרה לעמוד הבית
      </button>
    </div>
  );
}

function Routes() {
  const route = useRoute();

  // גלילה לראש העמוד בכל מעבר — אחרת נוחתים באמצע עמוד ארוך
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  const monthParam = routeParam(route, '/month');
  if (monthParam !== null) {
    const month = Number(monthParam);
    if (Number.isInteger(month) && month >= 1 && month <= MONTHS.length) return <MonthPage month={month} />;
    return <NotFound route={route} />;
  }

  switch (route) {
    case '/':
      return <HomePage />;
    case '/months':
      return <MonthsPage />;
    case '/milestones':
      return <MilestonesPage />;
    case '/growth':
      return <GrowthPage />;
    case '/timeline':
      return <TimelinePage />;
    case '/profile':
      return <ProfilePage />;
    case '/guide':
      return <GuidePage />;
    case '/settings':
      return <SettingsPage />;
    case '/print':
      return <PrintPage />;
    default:
      return <NotFound route={route} />;
  }
}

export function App() {
  const { loading } = useJournal();

  if (loading) {
    return (
      <div className="app">
        <div className="main">
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="muted">טוענים את היומן…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes />
    </AppShell>
  );
}
