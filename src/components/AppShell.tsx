import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRoute } from '../lib/router';
import { useJournal } from '../store/JournalContext';
import { ageBreakdown } from '../lib/date';

const NAV = [
  { to: '/', label: 'בית', icon: '🏠' },
  { to: '/months', label: 'חודשים', icon: '📅' },
  { to: '/milestones', label: 'אבני דרך', icon: '⭐' },
  { to: '/growth', label: 'גדילה', icon: '📏' },
  { to: '/timeline', label: 'ציר זמן', icon: '🧵' },
  { to: '/profile', label: 'פרטי התינוק/ת', icon: '👶' },
  { to: '/guide', label: 'איך משתמשים', icon: '💡' },
  { to: '/settings', label: 'גיבוי והדפסה', icon: '⚙️' },
];

type Theme = 'light' | 'dark';
const THEME_KEY = 'baby-journal:theme';

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // אין גישה לאחסון — ממשיכים עם העדפת המערכת
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // לא קריטי אם ההעדפה לא נשמרת
    }
  }, [theme]);

  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))];
}

function SaveBadge() {
  const { saveStatus, saveError } = useJournal();
  if (saveStatus === 'idle') return null;
  if (saveStatus === 'error') {
    return (
      <span className="save-badge save-badge--error" title={saveError ?? undefined}>
        ⚠️ השמירה נכשלה
      </span>
    );
  }
  return <span className="save-badge">{saveStatus === 'saving' ? '⏳ שומר…' : '✓ נשמר'}</span>;
}

function isActive(route: string, to: string): boolean {
  if (to === '/') return route === '/';
  if (to === '/months') return route === '/months' || route.startsWith('/month/');
  return route === to || route.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const { state } = useJournal();

  const age = ageBreakdown(state.profile.birthDate);
  const name = state.profile.babyName.trim();

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        דילוג לתוכן
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              👶
            </span>
            <span className="brand__text">
              <span className="brand__title">{name || 'יומן התפתחות תינוק'}</span>
              <span className="brand__sub">{age ? age.text : 'השנה הראשונה — יום אחרי יום'}</span>
            </span>
          </Link>

          <div className="header-actions">
            <SaveBadge />
            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'מעבר למצב יום' : 'מעבר למצב לילה'}
              title={theme === 'dark' ? 'מצב יום' : 'מצב לילה'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <nav className="nav" aria-label="ניווט ראשי">
          <div className="nav__inner">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav__link${isActive(route, item.to) ? ' nav__link--active' : ''}`}
                aria-current={isActive(route, item.to) ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="main" id="main">
        {children}
      </main>
    </div>
  );
}
