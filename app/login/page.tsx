import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div className="landing">
      <header className="landing-top landing-width">
        <Brand />
        <nav aria-label="Navigasi masuk">
          <Button asChild variant="outline" size="sm"><Link href="/dashboard">Buka ruang demo</Link></Button>
        </nav>
      </header>
      <main className="login-main landing-width">
        <section className="panel login-card" aria-labelledby="login-title">
          <header className="panel-heading">
            <div>
              <h1 id="login-title">Masuk dengan email</h1>
              <p>Kami kirim tautan sekali pakai, tanpa kata sandi. Workspace Dapur Sari Anda dibuat otomatis saat pertama masuk.</p>
            </div>
          </header>
          <div className="panel-body">
            <Suspense fallback={<div className="state-panel" aria-hidden="true">Memuat formulir…</div>}>
              <LoginForm />
            </Suspense>
          </div>
          <div className="panel-footer">
            <p className="login-footer-note">Hanya ingin mencoba? <Link href="/dashboard" className="text-link">Buka demo tanpa masuk</Link></p>
          </div>
        </section>
      </main>
    </div>
  );
}
