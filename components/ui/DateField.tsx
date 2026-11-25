"use client";

import { useId } from "react";

interface DateFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  hideLabel?: boolean;
  className?: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Input tanggal; hanya tanggal ISO yang valid diteruskan (pengosongan sementara diabaikan). */
export default function DateField({ label, value, onCommit, hideLabel, className = "" }: DateFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-sm font-semibold"}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (ISO.test(next) && !Number.isNaN(new Date(`${next}T00:00:00Z`).getTime())) onCommit(next);
        }}
        className="num mt-1 min-h-10 w-full rounded-md border border-line bg-paper px-2.5 text-sm"
      />
    </div>
  );
}
