import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * חיבור ל-Supabase.
 *
 * המפתח כאן הוא ה-anon key והוא ציבורי בכוונה — הוא לא מעניק גישה לשום דבר
 * בפני עצמו. כל ההגנה על הנתונים נמצאת ב-Row Level Security בדאטהבייס:
 * כל שאילתה עוברת דרך is_baby_member(), כך שאפשר לקרוא ולכתוב רק יומנים
 * שהמשתמש המחובר חבר בהם.
 *
 * אם המשתנים לא מוגדרים, האפליקציה עוברת למצב מקומי (IndexedDB) כמו קודם.
 */

/**
 * מנקה את כתובת הפרויקט לפני השימוש בה.
 *
 * קל מאוד להעתיק מלוח הבקרה כתובת עם לוכסן בסוף או עם נתיב כמו /rest/v1,
 * ואז הלקוח בונה כתובת כפולה והשרת מחזיר "Invalid path specified in request URL".
 * לוקחים רק את המקור (סכימה + דומיין) וזורקים כל נתיב, פרמטר או לוכסן עודף.
 */
export function normalizeProjectUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return undefined;
  }
}

const url = normalizeProjectUrl(import.meta.env.VITE_SUPABASE_URL);
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isCloudConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'baby-journal:auth',
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('החיבור לשרת לא מוגדר באפליקציה הזו');
  return supabase;
}

/** הופך שגיאה של Supabase להודעה קריאה בעברית. */
export function describeError(error: unknown): string {
  if (!error) return 'משהו השתבש';
  const message = error instanceof Error ? error.message : String(error);

  const table: [RegExp, string][] = [
    [/Invalid login credentials/i, 'האימייל או הסיסמה לא נכונים'],
    [/Email not confirmed/i, 'צריך לאשר את כתובת האימייל לפני ההתחברות'],
    [/User already registered/i, 'כבר קיים חשבון עם האימייל הזה — אפשר פשוט להתחבר'],
    [/Password should be at least/i, 'הסיסמה צריכה להיות באורך 6 תווים לפחות'],
    [/rate limit|too many requests/i, 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'],
    [/Failed to fetch|NetworkError|network/i, 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב'],
    [/duplicate key/i, 'הרשומה כבר קיימת'],
    [/row-level security|permission denied/i, 'אין לך הרשאה לפעולה הזו'],
    [
      /invalid path specified/i,
      'כתובת הפרויקט שהוגדרה לאפליקציה אינה תקינה. בדקו את VITE_SUPABASE_URL — היא צריכה להיות רק https://xxxx.supabase.co',
    ],
    [
      /Invalid API key|JWSError|invalid claim/i,
      'מפתח ה-anon שהוגדר לאפליקציה אינו תקין. בדקו את VITE_SUPABASE_ANON_KEY',
    ],
  ];

  for (const [pattern, hebrew] of table) {
    if (pattern.test(message)) return hebrew;
  }
  return message;
}
