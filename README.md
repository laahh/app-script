# OHS Portal — Node.js + Vercel + Google Sheets

Migrasi **Google Apps Script** (`appscrip.js`) ke **Node.js** di Vercel. Database tetap di Google Spreadsheet yang sama.

## Struktur

```
appscrip.js              # Sumber Apps Script (jangan dihapus)
scripts/build-portal.mjs # Konverter otomatis → lib/portal/index.js
lib/
  config.js              # Konstanta sheet & header
  sheets/adapter.js      # Google Sheets API
  gas-compat.js          # Pengganti Utilities, Session, Lock, Cron
  mail.js                # Pengganti MailApp (Nodemailer)
  portal/index.js        # Hasil konversi (auto-generated)
  api-router.js          # Routing REST API
api/
  [...path].js           # Semua endpoint /api/*
  cron/email.js          # Vercel Cron — email scheduler
public/
  index.html             # Halaman uji + placeholder frontend
  js/google-script-shim.js  # Pengganti google.script.run
```

## Setup Google Cloud

1. Buat **Service Account** di [Google Cloud Console](https://console.cloud.google.com/)
2. Aktifkan **Google Sheets API**
3. Download JSON key
4. **Share** spreadsheet ke email service account (role **Editor**):
   - https://docs.google.com/spreadsheets/d/13VLFWZBftawE2cO20t-AIzM_cC3hGDuJc5qGifXMj7o/edit

## Environment Variables

Salin `.env.example` → `.env.local`:

| Variable | Keterangan |
|----------|------------|
| `SPREADSHEET_ID` | ID spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account |
| `GOOGLE_PRIVATE_KEY` | Private key (dengan `\n`) |
| `TZ` | Timezone, mis. `Asia/Jakarta` |
| `PORTAL_URL` | URL Vercel setelah deploy |
| `CRON_SECRET` | Token untuk proteksi cron |
| `SMTP_*` | Konfigurasi email |

## Development Lokal

```bash
npm install
npm run build:portal   # Regenerasi lib/portal/index.js dari appscrip.js
npm run dev            # vercel dev
```

Buka http://localhost:3000 — halaman akan memanggil `/api/init`.

## Deploy ke Vercel

```bash
npx vercel login
npx vercel
# Set semua env vars di Vercel Dashboard → Settings → Environment Variables
npx vercel --prod
```

Cron email berjalan otomatis setiap **15 menit** (`vercel.json`).

## API Endpoints

| Apps Script | REST |
|-------------|------|
| `getInit()` | `GET /api/init` |
| `getDashboardOverview(req)` | `POST /api/dashboard/overview` |
| `getEmployeeLeaveHistory(id, year)` | `GET /api/leave/history?empId=&year=` |
| `checkLeaveOverlap(p)` | `POST /api/leave/check-overlap` |
| `createLeaveRequest(p)` | `POST /api/leave/create` |
| `getCalendarRange(req)` | `POST /api/calendar/range` |
| `createEvent(p)` | `POST /api/events/create` |
| `updateEvent(p)` | `POST /api/events/update` |
| `updateEventReadiness(p)` | `POST /api/events/readiness` |
| `getEventMakerData(req)` | `POST /api/events/maker-data` |
| `createTracker(p)` | `POST /api/tracker/create` |
| `updateTrackerDetails(p)` | `POST /api/tracker/update-details` |
| `getTrackerData(req)` | `POST /api/tracker/data` |
| `updateTrackerSubTask(p)` | `POST /api/tracker/update-subtask` |
| `updateTracker(p)` | `POST /api/tracker/update` |
| `getTrackerSubTaskUpdateLog(id)` | `GET /api/tracker/subtask-log?subTaskId=` |
| `getTrackerUpdateLog(id)` | `GET /api/tracker/log?trackerId=` |
| `getEmailSchedulerSettings()` | `GET /api/admin/email-settings` |
| `saveEmailSchedulerSettings(p)` | `POST /api/admin/email-settings` |
| `sendSchedulerEmailNow()` | `POST /api/admin/email-send` |
| `sendSchedulerTestEmail()` | `POST /api/admin/email-test` |

## Frontend Apps Script

1. Copy `Index.html` dari Apps Script Editor ke `public/`
2. Tambahkan sebelum script portal:

```html
<script src="/js/google-script-shim.js"></script>
```

Shim menerjemahkan `google.script.run.getInit()` → `fetch('/api/init')`.

## Update Logika

Setelah mengubah `appscrip.js`:

```bash
npm run build:portal
```

Commit hasil build atau jalankan `build:portal` saat deploy (sudah di `postinstall` & `vercel.json`).

## Catatan

- **LockService** diganti no-op (serverless). Untuk traffic tinggi, pertimbangkan optimistic locking.
- **MailApp** → Nodemailer (SMTP wajib dikonfigurasi untuk email scheduler).
- **ScriptApp trigger** → Vercel Cron (`/api/cron/email`).
