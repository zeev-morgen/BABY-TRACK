/** זיהוי סביבת ההרצה — בעיקר כדי לתת לאייפון את ההנחיות הנכונות. */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // אייפד מודרני מדווח על עצמו כ-Mac, ולכן בודקים גם מסך מגע
  const iPadOS = /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

/** האם האפליקציה רצה כאפליקציה מותקנת (הוספה למסך הבית) ולא בתוך דפדפן. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/** האם אפשר להעלות קובץ ישירות לתפריט השיתוף של המערכת (אייפון/אנדרואיד). */
export function canShareFiles(files: File[]): boolean {
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files });
}

/** רישום ה-service worker — רק בבנייה לפרודקשן, ובלי להפיל את האפליקציה אם נכשל. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
