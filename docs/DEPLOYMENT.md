# Deployment

Monorepo menggunakan dua proyek Vercel. Frontend memakai preset Next.js dengan root `apps/web`. Backend memakai preset FastAPI dengan root `apps/api`, entrypoint `app/main.py`, Python 3.12, dan `uv.lock`. API produksi berhasil menjawab lima endpoint melalui HTTPS, dengan CP-SAT siap dan CORS untuk origin frontend. [Health API produksi](https://rantaitangguh-api.vercel.app/health)

Demo produksi tersedia untuk juri tanpa akun. Kode sumber ada di cabang `main` repository publik Pasok-Siaga. [Website](https://rantaitangguh.vercel.app/), [Pasok-Siaga di GitHub](https://github.com/Zeeynrs/Pasok-Siaga)

| Lingkungan | Pengaturan |
|---|---|
| Web | `NEXT_PUBLIC_API_BASE_URL` berisi origin HTTPS API ketika build |
| API | `CORS_ORIGINS` berisi origin HTTPS web dan origin lokal yang dibutuhkan, dipisahkan dengan koma |
| API | `API_RATE_LIMIT_PER_MINUTE` mengatur batas per klien dan per instance. Default 60 |
| API di Docker | `PORT` default 8000. Di hosting container, pakai port yang ditetapkan host |

Untuk container, perintah dari root repo berikut membangun layanan API dengan dependency lock yang sama:

```bash
docker build -t rantaitangguh-api apps/api
docker run --rm -p 8000:8000 --env-file apps/api/.env.example rantaitangguh-api
```

Gunakan `/health` untuk memeriksa kesiapan solver. Setelah deploy, cek `/api/v1/demo` dan preflight CORS dari origin web, lalu jalankan Playwright dengan `PLAYWRIGHT_BASE_URL` mengarah ke domain publik. [Next.js](https://nextjs.org/docs/app/getting-started/deploying), [FastAPI di Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [Docker di Render](https://render.com/docs/docker)
