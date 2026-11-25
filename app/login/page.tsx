import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Link href="/" className="text-lg font-bold tracking-tight">
        MicroChain
      </Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Masuk dengan email</h1>
      <p className="mt-2 mb-6 text-ink-muted">
        Kami kirim tautan sekali pakai. Tanpa kata sandi. Workspace Dapur Sari Anda dibuat otomatis saat pertama masuk.
      </p>
      <Suspense fallback={<div className="h-40" aria-hidden />}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-sm text-ink-muted">
        Hanya ingin mencoba?{" "}
        <Link href="/demo" className="font-semibold text-brand underline underline-offset-2">
          Buka demo tanpa masuk
        </Link>
      </p>
    </main>
  );
}
