# MicroChain

Simulasi ketahanan rantai pasok UMKM makanan (demo: Dapur Sari). Next.js 16 (App Router), TypeScript, Tailwind CSS 4, React Flow, solver MILP `highs` (WASM) di server, Supabase (Magic Link + Postgres RLS).

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Perintah: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Database

Terapkan `supabase/setup.sql` (gabungan semua migrasi, idempoten) lewat Supabase Dashboard > SQL Editor, atau `node scripts/apply-migrations.mjs` dengan `SUPABASE_PROJECT_REF` dan `SUPABASE_ACCESS_TOKEN` (personal access token). Di Authentication > URL Configuration, daftarkan `<origin>/auth/callback` sebagai Redirect URL.

Rute: `/` landing, `/demo` mode tamu (tanpa login), `/login`, `/workspace` (perlu login). Dokumen desain ada di `docs/`.
