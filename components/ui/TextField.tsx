"use client";

import { useId, useState } from "react";

interface TextFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  maxLength?: number;
  hideLabel?: boolean;
  className?: string;
}

/** Input teks wajib-isi: nilai kosong tidak diteruskan dan dipulihkan saat blur. */
export default function TextField({ label, value, onCommit, maxLength = 100, hideLabel, className = "" }: TextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const error = draft !== null && draft.trim() === "" ? "Nama wajib diisi." : null;
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-sm font-semibold"}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={draft ?? value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value.trim() !== "") onCommit(e.target.value);
        }}
        onBlur={() => setDraft(null)}
        className={`mt-1 min-h-10 w-full min-w-0 rounded-md border bg-paper px-2.5 text-sm ${error ? "border-danger" : "border-line"}`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
