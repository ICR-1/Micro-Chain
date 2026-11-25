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
- **Status:** Perencanaan lengkap (**PRD**, **Desain**, **Rencana 10 Tugas TDD**, **TASKS**, **TODO**) telah **disetujui pengguna**, dan eksekusi dialihkan ke **Claude** (yang memiliki koneksi MCP Supabase aktif).
- **Perubahan Terakhir:**
  - Disusun dokumen perencanaan lengkap di vault Obsidian `C:\Projek\lomba-SEVENT-X\Micro-Chain`: [[docs/PRD]], [[docs/superpowers/specs/2026-11-25-microchain-design]], [[docs/superpowers/plans/2026-11-25-microchain]], [[docs/TASKS]], [[docs/TODO]].
  - Dihapus konfigurasi dan cache MCP Supabase milik Antigravity (`~/.gemini/config/mcp_config.json`, `antigravity/mcp/supabase`, `antigravity-cli/mcp/supabase`) sesuai permintaan pengguna.
- **Keputusan & Catatan Kunci untuk Claude:**
  - Penafsiran akhir prompt yang terpotong (`dengan RL`) ditetapkan sebagai **`dengan RLS`** (Auth Magic Link + workspace persisten 8 tabel + RLS).
  - Solver memakai **`highs` WASM** (`serverExternalPackages: ['highs']` + `outputFileTracingIncludes`) dengan pengurutan entitas kanonik dan *post-solve zero-premium trim*.
  - Saat inspeksi awal pada instance `zphvhcfjurhgxeilkbkk.supabase.co`, tabel `demo_templates` (`dapur_sari`), 8 tabel workspace dengan RLS, dan RPC `ensure_demo_workspace(p_reset boolean)` sudah ada, namun ditemukan trigger warisan `on_auth_user_created` -> `handle_new_user()` ke `public.business_profiles` (tidak ada). **Verifikasi dulu `get_project_url` / `list_tables` melalui MCP Supabase di Claude** sebelum menerapkan migrasi pembersihan trigger dan RPC `save_workspace_snapshot`.
- **Langkah Berikutnya:** Mulai eksekusi Task 1–10 sesuai [[docs/superpowers/plans/2026-11-25-microchain]] dengan alur TDD dan verifikasi penuh sebelum selesai.

## Dokumen Perencanaan
- [[docs/PRD|Product Requirements Document (PRD)]] — Masalah, pengguna UMKM, ruang lingkup P0/P1, angka referensi Dapur Sari, dan risiko.
- [[docs/superpowers/specs/2026-11-25-microchain-design|Arsitektur & Desain Sistem]] — Model domain kanonik, keputusan desain hasil *builder check*, formulasi matematis MILP, skema Postgres + RLS, kontrak API, serta arah UI `frontend-design`.
- [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi (TDD)]] — 10 tugas implementasi terverifikasi lengkap dengan *Review Focus*, kontrak antarmuka, dan skenario test.
- [[docs/TASKS|Daftar Milestone (TASKS)]] — Milestone, kriteria penerimaan, dan daftar keputusan desain otonom.
- [[docs/TODO|Checklist Aktif (TODO)]] — Status langkah harian selama implementasi.
