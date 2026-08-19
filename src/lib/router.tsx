import { useCallback, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

/**
 * ניתוב מבוסס hash — עובד ללא הגדרות שרת,
 * כולל ב-GitHub Pages וגם כשפותחים את הקובץ ישירות.
 */

function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function useRoute(): string {
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(path: string): void {
  const next = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === next) return;
  window.location.hash = next;
}

export function useNavigate(): (path: string) => void {
  return useCallback((path: string) => navigate(path), []);
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a href={`#${to}`} {...rest}>
      {children}
    </a>
  );
}

/** מחזיר את הפרמטר של הנתיב, למשל "/month/3" → 3. */
export function routeParam(route: string, prefix: string): string | null {
  // ההתאמה חייבת להסתיים בגבול מקטע: בלי זה "/months" נתפס כקידומת של
  // "/month" ומתפרש כחודש בשם "s", והעמוד של רשימת החודשים לא נטען לעולם.
  if (route !== prefix && !route.startsWith(`${prefix}/`)) return null;
  const rest = route.slice(prefix.length).replace(/^\//, '');
  return rest.split('/')[0] || null;
}
