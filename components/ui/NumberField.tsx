"use client";

import { useId, useState } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** Dipanggil hanya dengan bilangan bulat valid dalam rentang. */
  onCommit: (value: number) => void;
  suffix?: string;
  hideLabel?: boolean;
  className?: string;
}

/**
 * Input bilangan bulat yang aman diketik: nilai tidak valid (kosong, huruf, negatif, di luar rentang)
 * tidak pernah diteruskan ke state; pengguna melihat pesan galat dan nilai terakhir yang sah dipulihkan saat blur.
 */
export default function NumberField({
  label,
  value,
  min = 0,
  max = 1_000_000,
  onCommit,
  suffix,
  hideLabel,
  className = "",
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);

  let error: string | null = null;
  if (draft !== null) {
    if (!/^\d+$/.test(draft.trim())) error = "Isi dengan angka bulat, tanpa huruf atau tanda minus.";
    else if (Number(draft) < min || Number(draft) > max) error = `Isi angka antara ${min} dan ${max}.`;
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-sm font-semibold"}>
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (/^\d+$/.test(next.trim())) {
              const n = Number(next);
              if (n >= min && n <= max) onCommit(n);
            }
          }}
          onBlur={() => setDraft(null)}
          className={`num min-h-10 w-full min-w-0 rounded-md border bg-paper px-2.5 text-right text-sm ${
            error ? "border-danger" : "border-line"
          }`}
        />
        {suffix && <span className="shrink-0 text-sm text-ink-muted">{suffix}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
