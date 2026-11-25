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
- [ ] Task 1: Scaffolding `create-next-app@latest` (tanpa `src/`), dependensi, `.env.example`, config `highs` WASM
- [ ] Task 2: `types.ts`, `validation.ts` (paritas CHECK Postgres), `signature.ts` (deteksi basi), unit tests
- [ ] Task 3: `highs-loader.ts`, `milp-solver.ts`, `compare.ts`, unit tests Dapur Sari + 5 kasus Review Focus
- [ ] Task 4: `graph.ts` (pembangun graf 3 kolom + deteksi *single-supplier*), unit tests

## M3 — Backend Next.js & Integrasi Supabase Auth + RLS
- [ ] Task 5: Migrasi SQL (`drop on_auth_user_created` + `save_workspace_snapshot` RPC), klien `@supabase/ssr`, `workspace-repo.ts`, unit tests
- [ ] Task 6: Route Handlers (`/api/demo`, `/api/simulate`, `/api/simulate/compare`, `/api/workspace`, `/api/workspace/reset`, `/auth/callback`), integration tests

## M4 — UI Berbahasa Indonesia (P0 Demo & P1 Workspace)
- [ ] Task 7: Landing `/` + CTA "Coba Demo Dapur Sari" + `/login` Magic Link + UI tests
- [ ] Task 8: `SupplyGraphView` (React Flow `>=640px` / daftar `<640px`) + `SimulatorView` + UI tests
- [ ] Task 9: `ComparisonView` (Rp & %) + `BusinessDataView` + `MicroChainWorkspace` (`/demo` & `/workspace`) + alur status basi & reset + UI tests

## M5 — Verifikasi Akhir & Hand-off
- [ ] Task 10: `npm test`, `tsc --noEmit`, `npm run lint`, `npm run build`, uji browser `1440px` & `390px`, dan pembaruan [[MicroChain Hub]]

## Decisions Made Autonomously (Pending User Override at Approval Gate)
- Solver MILP server-side memakai `highs` WASM (deterministik via pengurutan entitas kanonik + post-solve 0-premium trim) alih-alih `javascript-lp-solver`.
- `delay_days` disimpan di `scenarios.disruptions` sebagai `{ type: 'delay_delivery', delivery_id, delay_days }`; edit di `SimulatorView` langsung memperbarui skenario di state workspace.
- Tiga skenario inti (`baseline`, `outage`, `mitigation`) dilindungi dari penghapusan dan `slug`-nya mengikat metrik `ComparisonSummary`, sedangkan skenario ke-4+ bersifat opsional.
- Simulasi dijalankan otomatis sekali saat awal membuka `/demo` & `/workspace`, tidak auto-solve di tiap ketikan agar status **basi** (*stale*) terlihat jelas, dan penyimpanan ke DB di `/workspace` memakai tombol eksplisit **"Simpan ke Workspace"**.
- `businesses.slug` workspace pengguna tetap `'dapur_sari'` agar reset via `ensure_demo_workspace(true)` konsisten, sedangkan nama & sektor usaha bebas diubah.
