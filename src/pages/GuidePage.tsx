import { DOMAINS } from '../data/domains';
import { USAGE_TIPS } from '../data/prompts';
import { Link } from '../lib/router';

export function GuidePage() {
  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">איך משתמשים ביומן</div>
        <h1>עמוד אחד לכל חודש, ארבעה תחומים, והרבה רוגע</h1>
        <p>
          בכל חודש תמצאו עמוד ובו ארבעה תחומי התפתחות מרכזיים, מקום לסימון יכולות חדשות ומקום לרגע חביב מהחודש. כתבו
          בעברית לפי הקצב של התינוק/ת שלכם — אין "סדר נכון", כל ילד/ה מתקדמ/ת אחרת.
        </p>
      </div>

      <h2 className="section-title">ארבעת תחומי ההתפתחות</h2>
      {DOMAINS.map((domain) => (
        <div className={`card tone-${domain.tone}`} key={domain.key}>
          <div className="card__head" style={{ marginBottom: 0 }}>
            <div className="card__emoji" aria-hidden="true">
              {domain.emoji}
            </div>
            <div>
              <h3 className="card__title">{domain.title}</h3>
              <p className="card__sub">{domain.subtitle}</p>
            </div>
          </div>
        </div>
      ))}

      <h2 className="section-title">יכולות חדשות שגיליתי החודש</h2>
      <div className="card">
        <p>
          כאן מסמנים כל יכולת חדשה שהתינוק/ת מגלה — עם תאריך. עם הזמן תיווצר רשימה יפה של הישגים לפי סדר הופעתם, ואפשר
          לראות את כולם יחד ב<Link to="/timeline">ציר הזמן</Link>.
        </p>
      </div>

      <h2 className="section-title">כמה טיפים נעימים</h2>
      <div className="card">
        <ul className="tips">
          {USAGE_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <h2 className="section-title">מה נוסף באפליקציה</h2>
      <div className="card">
        <ul className="tips">
          <li>
            הגיל וטווח התאריכים של כל חודש מחושבים לבד מתאריך הלידה — היומן תמיד יודע לפתוח אתכם בחודש הנכון.
          </li>
          <li>
            בכל תחום מופיעה דוגמה עדינה למה אפשר לחפש בחודש הזה. זו השראה בלבד, לא רשימת מטלות ולא ייעוץ רפואי.
          </li>
          <li>
            אפשר לצרף לכל חודש תמונה והקלטה קצרה, והכול נשמר אצלכם במכשיר — בלי חשבון ובלי שרת.
          </li>
          <li>
            ב<Link to="/settings">גיבוי והדפסה</Link> אפשר לייצא קובץ גיבוי, לייבא אותו במכשיר אחר, או להדפיס את היומן
            כולו כ-PDF.
          </li>
        </ul>
      </div>

      <p className="notice" style={{ marginTop: 14 }}>
        💛 היומן נועד לתיעוד ולשמחה, לא למדידה או להשוואה. אם משהו בהתפתחות מטריד אתכם — הכתובת הנכונה היא טיפת חלב או
        רופא/ת הילדים.
      </p>
    </div>
  );
}
