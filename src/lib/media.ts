import type { Attachment } from '../types';

const MAX_IMAGE_EDGE = 1280;
const IMAGE_QUALITY = 0.82;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('לא הצלחנו לקרוא את הקובץ'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('הקובץ אינו תמונה תקינה'));
    image.src = dataUrl;
  });
}

/** אומדן גודל ב-bytes של מחרוזת base64. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.round((base64.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * מקטין תמונה לצד ארוך של 1280px ודוחס ל-JPEG,
 * כדי שאלבום שלם של 13 תמונות עדיין ייכנס לאחסון של הדפדפן.
 */
export async function prepareImage(file: File): Promise<Attachment> {
  if (!file.type.startsWith('image/')) throw new Error('אפשר להעלות קובץ תמונה בלבד');
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: original, name: file.name, size: file.size };

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const compressed = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
  const dataUrl = compressed.length < original.length ? compressed : original;
  return { dataUrl, name: file.name, size: dataUrlBytes(dataUrl) };
}

/** מצרף קובץ שמע קצר (עד 4MB) כמו הקלטה של צחוק או מלמול. */
export async function prepareAudio(file: File): Promise<Attachment> {
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    throw new Error('אפשר לצרף קובץ שמע בלבד');
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(`הקובץ גדול מדי (${formatBytes(file.size)}). אפשר לצרף הקלטה של עד ${formatBytes(MAX_AUDIO_BYTES)}.`);
  }
  const dataUrl = await readAsDataUrl(file);
  return { dataUrl, name: file.name, size: dataUrlBytes(dataUrl) };
}
