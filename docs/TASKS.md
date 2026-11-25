---
tags:
  - tasks
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# Milestones & Acceptance Criteria (TASKS)

Kembali ke [[MicroChain Hub]] | Lihat [[docs/PRD|PRD]] | Lihat [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi]]

## M1 — Discovery, PRD, Desain & Rencana (Disetujui)
- [x] Inspeksi skema Supabase (`demo_templates`, 8 tabel workspace, RLS, `ensure_demo_workspace`, temuan trigger warisan)
- [x] Tulis [[docs/PRD|PRD]], [[docs/superpowers/specs/2026-11-25-microchain-design|Desain & Arsitektur]], dan selesaikan *builder check*
- [x] Tulis [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi]] + `TASKS.md` + `TODO.md`
- [x] **Approval Gate:** Disetujui pengguna; eksekusi dialihkan ke sesi Claude dengan MCP Supabase aktif

## M2 — Fondasi Next.js, Domain Kanonik & Solver MILP Deterministik (TDD)
- [x] Task 1: Scaffolding `create-next-app@latest` (tanpa `src/`), dependensi, `.env.example`, config `highs` WASM
- [x] Task 2: `types.ts`, `validation.ts` (paritas CHECK Postgres), `signature.ts` (deteksi basi), unit tests
- [x] Task 3: `highs-loader.ts`, `milp-solver.ts`, `compare.ts`, unit tests Dapur Sari + 5 kasus Review Focus
- [x] Task 4: `graph.ts` (pembangun graf 3 kolom + deteksi *single-supplier*), unit tests

## M3 — Backend Next.js & Integrasi Supabase Auth + RLS
- [x] Task 5: Migrasi SQL (`drop on_auth_user_created` + `save_workspace_snapshot` RPC), klien `@supabase/ssr`, `workspace-repo.ts`, unit tests
- [x] Task 6: Route Handlers (`/api/demo`, `/api/simulate`, `/api/simulate/compare`, `/api/workspace`, `/api/workspace/reset`, `/auth/callback`), integration tests

## M4 — UI Berbahasa Indonesia (P0 Demo & P1 Workspace)
- [x] Task 7: Landing `/` + CTA "Coba Demo Dapur Sari" + `/login` Magic Link + UI tests
- [x] Task 8: `SupplyGraphView` (React Flow `>=640px` / daftar `<640px`) + `SimulatorView` + UI tests
- [x] Task 9: `ComparisonView` (Rp & %) + `BusinessDataView` + `MicroChainWorkspace` (`/demo` & `/workspace`) + alur status basi & reset + UI tests

## M5 — Verifikasi Akhir & Hand-off
- [ ] Task 10: `npm test`, `tsc --noEmit`, `npm run lint`, `npm run build`, uji browser `1440px` & `390px`, dan pembaruan [[MicroChain Hub]]

## Decisions Made Autonomously (Pending User Override at Approval Gate)
- Solver MILP server-side memakai `highs` WASM (deterministik via pengurutan entitas kanonik + post-solve 0-premium trim) alih-alih `javascript-lp-solver`.
- `delay_days` disimpan di `scenarios.disruptions` sebagai `{ type: 'delay_delivery', delivery_id, delay_days }`; edit di `SimulatorView` langsung memperbarui skenario di state workspace.
- Tiga skenario inti (`baseline`, `outage`, `mitigation`) dilindungi dari penghapusan dan `slug`-nya mengikat metrik `ComparisonSummary`, sedangkan skenario ke-4+ bersifat opsional.
- Simulasi dijalankan otomatis sekali saat awal membuka `/demo` & `/workspace`, tidak auto-solve di tiap ketikan agar status **basi** (*stale*) terlihat jelas, dan penyimpanan ke DB di `/workspace` memakai tombol eksplisit **"Simpan ke Workspace"**.
- `businesses.slug` workspace pengguna tetap `'dapur_sari'` agar reset via `ensure_demo_workspace(true)` konsisten, sedangkan nama & sektor usaha bebas diubah.

## Catatan Eksekusi (Claude, 2026-11-25)
- **Task 10 sebagian selesai:** `npm test` 116/116, `tsc --noEmit`, `npm run lint`, `npm run build` bersih; uji browser `1440px` dan `390px` selesai terhadap server tiruan PostgREST (tanpa `console` galat, tanpa overflow horizontal). **Belum:** uji end-to-end terhadap database Supabase nyata (lihat BLOCKED).
- **Database (selesai 2026-11-25):** 4 migrasi diterapkan ke `agrwkruicgrewnixvpdj` lewat Postgres pooler (`aws-0-ap-northeast-1`; `sbp_...` ternyata password DB, bukan token API). Diverifikasi di transaksi yang di-rollback dengan dua pengguna palsu: `ensure_demo_workspace` idempoten, `save_workspace_snapshot` menjaga UUID stabil dan menolak referensi menggantung serta hilangnya skenario inti, reset membuat ulang data, RLS mengisolasi antar-pengguna, `anon` ditolak. `/api/demo` + `/api/simulate/compare` terhadap DB asli: Rp 450.000 / 210.000 / 342.000, pulih Rp 132.000.
- **Masih perlu pengguna:** daftarkan `<origin>/auth/callback` di Auth > URL Configuration, uji Magic Link dengan email asli (tidak bisa diotomatisasi), rotasi kredensial yang tertempel di chat, deploy Vercel.

## Decisions Made Autonomously (Claude)
- Skema lengkap dibuat ulang lewat migrasi karena project target kosong (Hub lama merujuk `zphvhcfjurhgxeilkbkk`). Migrasi dipecah: `..110000_microchain_schema`, `..115000_seed_demo_template` (dibangkitkan dari fixture oleh `scripts/gen-seed-migration.mts`), `..120000_save_workspace_and_ensure_demo_rpc`, `..130000_cleanup_legacy_auth_trigger`.
- `ensure_demo_workspace` memanggil `save_workspace_snapshot` (upsert per slug, UUID stabil) agar satu jalur kode untuk klon dan simpan.
- Signature basi memakai SHA-256 TypeScript sinkron (`lib/domain/sha256.ts`) agar identik di klien dan server; nama, catatan, dan metadata tampilan tidak ikut sehingga tidak ada status basi palsu.
- Mutasi entitas (tambah/hapus dengan cascade) dipisah ke `lib/domain/mutations.ts` dan diuji; `validateSimulationInput` tidak mewajibkan 3 skenario inti, `validateWorkspaceData` mewajibkannya.
- Next.js 16 memakai `proxy.ts` (bukan `middleware.ts`); `vitest@5` + `@types/node@24` dipilih agar sesuai peer `@testing-library/jest-dom@8`.
