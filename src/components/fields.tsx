import { useEffect, useRef, type ChangeEvent, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

interface TextInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'date';
  inputMode?: 'text' | 'decimal';
  max?: string;
}

export function TextInput({ id, label, value, onChange, placeholder, hint, type = 'text', inputMode, max }: TextInputProps) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        max={max}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </Field>
  );
}

interface AutoTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  ariaLabel?: string;
}

/** תיבת טקסט שגדלה יחד עם הכתיבה — בלי סרגלי גלילה קטנים ומעצבנים. */
export function AutoTextarea({ id, value, onChange, placeholder, minRows = 3, ariaLabel }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      id={id}
      ref={ref}
      className="textarea"
      rows={minRows}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'התקדמות'}
    >
      <div className="progress__bar" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <p style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{title}</p>
      {body ? <p className="small">{body}</p> : null}
    </div>
  );
}
