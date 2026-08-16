import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { routeParam, useRoute, navigate } from './lib/router';
import { MONTHS } from './data/months';
import { useJournal } from './store/JournalContext';
import { useSession } from './store/SessionContext';
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
import { AuthPage } from './pages/AuthPage';
import { JournalsPage } from './pages/JournalsPage';
import { SharePage } from './pages/SharePage';

function Splash({ text }: { text: string }) {
  return (
    <div className="app">
      <div className="main">
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted">{text}</p>
        </div>
      </div>
    </div>
  );
}

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
  const { mode } = useSession();
  const { loading, loadError, reload } = useJournal();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  if (route === '/journals') return <JournalsPage />;
  if (route === '/share') return mode === 'cloud' ? <SharePage /> : <NotFound route={route} />;

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p className="muted">טוענים את היומן…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card">
        <h1 className="card__title">לא הצלחנו לטעון את היומן</h1>
        <p className="notice notice--error" style={{ margin: '10px 0' }}>
          {loadError}
        </p>
        <button type="button" className="btn btn--primary" onClick={() => void reload()}>
          ניסיון נוסף
        </button>
      </div>
    );
  }

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
  const { mode, ready, user, journals, journalId } = useSession();

  if (!ready) return <Splash text="רגע, מתחברים…" />;

  // במצב ענן חייבים חשבון לפני שרואים משהו
  if (mode === 'cloud' && !user) {
    return (
      <div className="app">
        <main className="main" id="main">
          <AuthPage />
        </main>
      </div>
    );
  }

  // מחוברים אבל אין עדיין יומן לפתוח — מפנים ליצירה או להצטרפות
  if (mode === 'cloud' && (journals.length === 0 || !journalId)) {
    return (
      <AppShell>
        <JournalsPage />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Routes />
    </AppShell>
  );
}
