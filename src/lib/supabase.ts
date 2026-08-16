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

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
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
  ];

  for (const [pattern, hebrew] of table) {
    if (pattern.test(message)) return hebrew;
  }
  return message;
}
