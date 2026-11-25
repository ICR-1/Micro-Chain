---
tags:
  - hub
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# MicroChain Hub

Alat simulasi ketahanan rantai pasok untuk UMKM makanan (demo: **Dapur Sari**), dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, React Flow, solver MILP server-side (`highs` WASM), dan Supabase (Auth Magic Link + Postgres RLS).

## Last Handoff / Current State
- **Status:** Task 1-9 selesai dan ter-commit di branch `feat/microchain` (kode, 116 test, `tsc`, lint, build bersih). Task 10 sebagian: uji browser 1440px dan 390px lolos terhadap server tiruan PostgREST; **uji dengan database Supabase nyata belum dilakukan**.
- **BLOCKED:** project `agrwkruicgrewnixvpdj` kosong dan token `sbp_...` ditolak (`401`). Terapkan [[supabase/setup.sql]] lewat SQL Editor (atau `node scripts/apply-migrations.mjs` dengan token valid), tambahkan `<origin>/auth/callback` di Auth > URL Configuration, lalu uji `/demo`, Magic Link, dan `/workspace`.
- **Keputusan kunci:** solver `highs` WASM terverifikasi di `next start`; signature basi SHA-256 sinkron (klien = server); `proxy.ts` (Next 16); migrasi dipecah 4 berkas; angka referensi Dapur Sari cocok PRD (Rp 450.000 / 210.000 / 342.000, pulih 55% dan 76%). Detail: [[docs/TASKS]].
- **Langkah berikutnya:** terapkan migrasi, uji end-to-end, rotasi kredensial yang sempat tertempel di percakapan, lalu deploy Vercel (set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Dokumen Perencanaan
- [[docs/PRD|Product Requirements Document (PRD)]] — Masalah, pengguna UMKM, ruang lingkup P0/P1, angka referensi Dapur Sari, dan risiko.
- [[docs/superpowers/specs/2026-11-25-microchain-design|Arsitektur & Desain Sistem]] — Model domain kanonik, keputusan desain hasil *builder check*, formulasi matematis MILP, skema Postgres + RLS, kontrak API, serta arah UI `frontend-design`.
- [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi (TDD)]] — 10 tugas implementasi terverifikasi lengkap dengan *Review Focus*, kontrak antarmuka, dan skenario test.
- [[docs/TASKS|Daftar Milestone (TASKS)]] — Milestone, kriteria penerimaan, dan daftar keputusan desain otonom.
- [[docs/TODO|Checklist Aktif (TODO)]] — Status langkah harian selama implementasi.
