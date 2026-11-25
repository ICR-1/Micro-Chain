"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERRORS: Record<string, string> = {
  tautan: "Tautan masuk tidak lengkap. Minta tautan baru di bawah.",
  kedaluwarsa: "Tautan masuk sudah kedaluwarsa atau pernah dipakai. Minta tautan baru di bawah.",
  server: "Kami gagal menyiapkan workspace Anda. Coba masuk lagi beberapa saat lagi.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const params = useSearchParams();
  const callbackError = CALLBACK_ERRORS[params.get("error") ?? ""] ?? null;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Masukkan alamat email yang valid, misalnya nama@usaha.id.");
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      const { error: otpError } = await createClient().auth.signInWithOtp({
        email: value,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
      });
      if (otpError) throw otpError;
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("Gagal mengirim tautan masuk. Periksa email Anda lalu coba lagi.");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-lg border border-line bg-paper p-5">
        <p className="font-semibold">Cek email Anda</p>
        <p className="mt-1 text-ink-muted">
          Kami mengirim tautan masuk ke <span className="num">{email.trim()}</span>. Buka tautan itu di browser ini.
        </p>
      </div>
    );
  }

  const message = error ?? callbackError;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={message ? "login-error" : undefined}
          aria-invalid={message ? true : undefined}
          className="mt-1 block min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
        />
      </div>
      {message && (
        <p id="login-error" role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand px-5 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {status === "sending" ? "Mengirim..." : "Kirim Tautan Masuk"}
      </button>
    </form>
  );
}
