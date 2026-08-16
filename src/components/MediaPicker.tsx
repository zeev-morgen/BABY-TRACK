import { useId, useRef, useState } from 'react';
import { formatBytes, prepareAudio, prepareImage } from '../lib/media';
import type { Attachment } from '../types';

interface MediaPickerProps {
  kind: 'image' | 'audio';
  value: Attachment | null;
  /** יכול להיות אסינכרוני — בענן הקובץ מועלה לפני שהמצב מתעדכן */
  onChange: (value: Attachment | null) => void | Promise<void>;
  label: string;
  hint?: string;
}

/** בחירת תמונה או הקלטה קצרה, כולל דחיסה והודעות שגיאה בעברית. */
export function MediaPicker({ kind, value, onChange, label, hint }: MediaPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const attachment = kind === 'image' ? await prepareImage(file) : await prepareAudio(file);
      await onChange(attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו לצרף את הקובץ');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={kind === 'image' ? 'image/*' : 'audio/*'}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="media-preview">
          {kind === 'image' ? (
            <img src={value.dataUrl} alt={label} />
          ) : (
            <div style={{ padding: '10px 10px 0' }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={value.dataUrl} />
            </div>
          )}
          <div className="media-preview__bar">
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value.name} · {formatBytes(value.size)}
            </span>
            <button type="button" className="btn btn--sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              החלפה
            </button>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                Promise.resolve(onChange(null)).finally(() => setBusy(false));
              }}
            >
              הסרה
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="media" onClick={() => inputRef.current?.click()} disabled={busy} style={{ width: '100%' }}>
          <div className="media__icon">{kind === 'image' ? '📷' : '🎙️'}</div>
          <div style={{ fontWeight: 700 }}>{busy ? 'רגע, מעבדים…' : label}</div>
          {hint ? <div className="media__hint">{hint}</div> : null}
        </button>
      )}

      {error ? (
        <p className="notice notice--error" style={{ marginTop: 8 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
