"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="estimate-notice" role="status">
        <MailCheck size={18} aria-hidden="true" />
        <p><strong>Cek email Anda.</strong> Kami mengirim tautan masuk ke {email.trim()}. Buka tautan itu di browser ini.</p>
      </div>
    );
  }

  const message = error ?? callbackError;
  return (
    <form onSubmit={onSubmit} noValidate className="login-form">
      <div className="field">
        <label htmlFor="email">Email</label>
        <Input
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
        />
      </div>
      {message && (
        <div className="state-panel error-panel" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <p id="login-error">{message}</p>
        </div>
      )}
      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Mengirim…" : "Kirim Tautan Masuk"}
      </Button>
    </form>
  );
}
