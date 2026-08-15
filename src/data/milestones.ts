export interface MilestoneMeta {
  id: string;
  label: string;
  emoji: string;
  /** טווח גילאים מקובל בחודשים — לתצוגה עדינה בלבד, לא אבחון */
  typical: [number, number] | null;
  hint: string;
}

/**
 * "אבני דרך ראשונות" — הרשימה מהיומן המודפס, לפי אותו סדר.
 * טווחי הגילאים הם כיוון כללי בלבד: לכל תינוק/ת קצב משלו/ה.
 */
export const MILESTONES: MilestoneMeta[] = [
  { id: 'first-smile', label: 'החיוך הראשון', emoji: '😊', typical: [1, 2], hint: 'החיוך החברתי הראשון, בתגובה לפנים או לקול שלכם' },
  { id: 'first-laugh', label: 'הצחוק הראשון', emoji: '😄', typical: [3, 4], hint: 'צחוק בקול, בדרך כלל תוך כדי משחק' },
  { id: 'head-control', label: 'מרים ראש בביטחון', emoji: '🙆', typical: [3, 4], hint: 'מחזיק/ה את הראש יציב בזמן שכיבה על הבטן או בישיבה נתמכת' },
  { id: 'roll-over', label: 'מתהפך/ת מהבטן לגב', emoji: '🔄', typical: [4, 6], hint: 'ההיפוך הראשון — לרוב מהבטן לגב לפני הכיוון ההפוך' },
  { id: 'sit-alone', label: 'יושב/ת לבד', emoji: '🪑', typical: [6, 8], hint: 'ישיבה יציבה בלי תמיכה של ידיים או כריות' },
  { id: 'crawl', label: 'זוחל/ת', emoji: '🐛', typical: [7, 10], hint: 'זחילה על הברכיים, על הבטן או "החלקה" — כל סגנון נחשב' },
  { id: 'pull-to-stand', label: 'מתרומם/ת לעמידה', emoji: '🧍', typical: [8, 10], hint: 'נעזר/ת ברהיטים או בידיים שלכם כדי לקום' },
  { id: 'first-step', label: 'הצעד הראשון', emoji: '👣', typical: [9, 14], hint: 'הצעד העצמאי הראשון, גם אם אחריו נחיתה רכה' },
  { id: 'walk-alone', label: 'הולך/ת לבד', emoji: '🚶', typical: [11, 15], hint: 'כמה צעדים רצופים בלי להיאחז' },
  { id: 'first-tooth', label: 'השן הראשונה', emoji: '🦷', typical: [4, 10], hint: 'לרוב אחת השיניים הקדמיות התחתונות' },
  { id: 'first-word', label: 'המילה הראשונה', emoji: '🗣️', typical: [10, 14], hint: 'מילה עם משמעות עקבית — גם אם ההגייה עדיין חלקית' },
  { id: 'mama-dada', label: 'אומר/ת "אמא" / "אבא"', emoji: '❤️', typical: [10, 14], hint: 'הפעם הראשונה שזה מכוון אליכם ולא מלמול כללי' },
  { id: 'wave', label: 'מנופף/ת לשלום', emoji: '👋', typical: [8, 12], hint: 'ניפוף ביוזמה או בחיקוי' },
  { id: 'clap', label: 'מוחא/ת כפיים', emoji: '👏', typical: [8, 12], hint: 'לרוב מגיע יחד עם שמחה גדולה' },
  { id: 'point', label: 'מצביע/ה על חפצים', emoji: '👆', typical: [9, 14], hint: 'הצבעה כדי לבקש או כדי לשתף אתכם במשהו מעניין' },
  { id: 'drink-cup', label: 'שותה/ה מכוס', emoji: '🥤', typical: [9, 15], hint: 'כוס עם ידיות או כוס פתוחה, בעזרה או לבד' },
  { id: 'spoon', label: 'אוכל/ת לבד בכפית', emoji: '🥄', typical: [12, 18], hint: 'מכוון/ת את הכפית לפה — בהתחלה עם הרבה בלגן משמח' },
  { id: 'sleep-through', label: 'לילה ראשון של שינה רצופה', emoji: '🌙', typical: null, hint: 'הטווח כאן משתנה מאוד מתינוק לתינוק — אין מה למהר' },
];

export const MILESTONE_IDS = MILESTONES.map((m) => m.id);
