"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, KeyRound, Mail, MailCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERRORS: Record<string, string> = {
  tautan: "Tautan masuk tidak lengkap. Minta tautan baru di bawah.",
  kedaluwarsa: "Tautan masuk sudah kedaluwarsa atau pernah dipakai. Minta tautan baru di bawah.",
  server: "Kami gagal menyiapkan workspace Anda. Coba masuk lagi beberapa saat lagi.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type Method = "password" | "link";
type Status = "idle" | "sending" | "sent";

interface AuthFailure {
  code?: string;
  status?: number;
  message?: string;
}

/** Ubah galat Supabase menjadi pesan Indonesia yang aman (tanpa detail penyedia). */
function describeFailure(error: AuthFailure, action: "masuk" | "daftar" | "tautan"): string {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Batas pengiriman email tercapai. Tunggu beberapa saat, atau masuk dengan kata sandi.";
  }
  if (error.code === "invalid_credentials") return "Email atau kata sandi salah.";
  if (error.code === "email_not_confirmed") return "Email belum dikonfirmasi. Buka tautan konfirmasi yang dikirim ke email Anda.";
  if (error.code === "user_already_exists" || error.code === "email_exists") return "Email ini sudah terdaftar. Silakan masuk.";
  if (error.code === "weak_password") return `Kata sandi terlalu lemah. Gunakan minimal ${MIN_PASSWORD} karakter dengan kombinasi huruf dan angka.`;
  if (action === "daftar") return "Gagal mendaftar. Periksa data Anda lalu coba lagi.";
  if (action === "tautan") return "Gagal mengirim tautan masuk. Periksa email Anda lalu coba lagi.";
  return "Gagal masuk. Periksa email dan kata sandi Anda lalu coba lagi.";
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackError = CALLBACK_ERRORS[params.get("error") ?? ""] ?? null;

  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validEmail() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Masukkan alamat email yang valid, misalnya nama@usaha.id.");
      return false;
    }
    return true;
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validEmail()) return;
    if (!password) {
      setError("Masukkan kata sandi Anda.");
      return;
    }
    setError(null);
    setStatus("sending");
    const { error: failure } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (failure) {
      setStatus("idle");
      setError(describeFailure(failure as AuthFailure, "masuk"));
      return;
    }
    router.replace("/workspace");
    router.refresh();
  }

  async function signUp() {
    if (!validEmail()) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
      return;
    }
    setError(null);
    setStatus("sending");
    const { data, error: failure } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (failure) {
      setStatus("idle");
      setError(describeFailure(failure as AuthFailure, "daftar"));
      return;
    }
    if (data.session) {
      router.replace("/workspace");
      router.refresh();
      return;
    }
    setSentMessage(`Kami mengirim tautan konfirmasi ke ${email.trim()}. Buka tautan itu, lalu masuk dengan kata sandi Anda.`);
    setStatus("sent");
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validEmail()) return;
    setError(null);
    setStatus("sending");
    const { error: failure } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    });
    if (failure) {
      setStatus("idle");
      setError(describeFailure(failure as AuthFailure, "tautan"));
      return;
    }
    setSentMessage(`Kami mengirim tautan masuk ke ${email.trim()}. Buka tautan itu di browser ini.`);
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="estimate-notice" role="status">
        <MailCheck size={18} aria-hidden="true" />
        <p><strong>Cek email Anda.</strong> {sentMessage}</p>
      </div>
    );
  }

  const message = error ?? callbackError;
  const busy = status === "sending";

  return (
    <div className="login-form">
      <div className="view-toggle login-method" role="group" aria-label="Metode masuk">
        <Button type="button" size="sm" variant="ghost" aria-pressed={method === "password"} onClick={() => { setMethod("password"); setError(null); }}>
          <KeyRound size={16} aria-hidden="true" /> Kata sandi
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-pressed={method === "link"} onClick={() => { setMethod("link"); setError(null); }}>
          <Mail size={16} aria-hidden="true" /> Tautan email
        </Button>
      </div>

      <form onSubmit={method === "password" ? signInWithPassword : sendLink} noValidate className="login-form">
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
        {method === "password" && (
          <div className="field">
            <label htmlFor="password">Kata sandi</label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small className="field-hint">Untuk akun baru, gunakan minimal {MIN_PASSWORD} karakter.</small>
          </div>
        )}
        {message && (
          <div className="state-panel error-panel" role="alert">
            <CircleAlert size={20} aria-hidden="true" />
            <p id="login-error">{message}</p>
          </div>
        )}
        {method === "password" ? (
          <div className="login-actions">
            <Button type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={signUp}>Daftar Akun Baru</Button>
          </div>
        ) : (
          <Button type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim Tautan Masuk"}</Button>
        )}
      </form>
    </div>
  );
}
