import { useState } from 'react';
import { isIOS, isStandalone } from '../lib/platform';

const DISMISS_KEY = 'baby-journal:install-hint-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * הנחיה לאייפון להוסיף את היומן למסך הבית.
 * זה לא קישוט: Safari מנקה אחסון של אתרים שלא ביקרו בהם כשבוע,
 * ואפליקציה שנוספה למסך הבית לא נכללת בניקוי הזה.
 */
export function InstallHint() {
  const [hidden, setHidden] = useState(wasDismissed);

  if (hidden || !isIOS() || isStandalone()) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // אם האחסון חסום, ההנחיה פשוט תופיע שוב בפעם הבאה
    }
  }

  return (
    <div className="install-hint" role="note">
      <span aria-hidden="true" style={{ fontSize: 22 }}>
        📲
      </span>
      <div className="install-hint__body">
        <strong>הוסיפו את היומן למסך הבית</strong>
        בסרגל התחתון של Safari: שיתוף ⬆️ ← "הוספה למסך הבית".
        <details className="install-hint__why">
          <summary>למה זה חשוב?</summary>
          Safari מנקה נתונים של אתרים שלא נכנסים אליהם כשבוע. אפליקציה שנוספה למסך הבית לא נכללת בניקוי הזה, ולכן
          היומן נשאר אצלכם — וגם נפתח במסך מלא ועובד בלי אינטרנט.
        </details>
      </div>
      <button type="button" className="install-hint__close" onClick={dismiss} aria-label="סגירת ההודעה">
        ✕
      </button>
    </div>
  );
}
