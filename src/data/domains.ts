import type { DomainKey } from '../types';

export interface DomainMeta {
  key: DomainKey;
  title: string;
  subtitle: string;
  emoji: string;
  /** משמש לצביעת הכרטיס — מפתח של משתנה CSS */
  tone: string;
}

/** ארבעת תחומי ההתפתחות, בדיוק כפי שהם מופיעים ביומן המודפס. */
export const DOMAINS: DomainMeta[] = [
  {
    key: 'motor',
    title: 'מוטורי גס ועדין',
    subtitle: 'תנועה, שיווי משקל, אחיזה וזריזות ידיים',
    emoji: '🤲',
    tone: 'peach',
  },
  {
    key: 'language',
    title: 'שפה ותקשורת',
    subtitle: 'הברות, מילים, הבנה ותגובה לקול',
    emoji: '💬',
    tone: 'sky',
  },
  {
    key: 'social',
    title: 'חברתי-רגשי',
    subtitle: 'חיוך, קשר עין, שעשועים וקשר עם הסביבה',
    emoji: '💞',
    tone: 'rose',
  },
  {
    key: 'cognitive',
    title: 'קוגניטיבי וחשיבה',
    subtitle: 'סקרנות, משחק, זיכרון ופתרון בעיות',
    emoji: '🧩',
    tone: 'sage',
  },
];

export const DOMAIN_KEYS: DomainKey[] = DOMAINS.map((d) => d.key);
