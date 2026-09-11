# OHS Portal — Panduan Migrasi Laravel

Dokumen ini adalah **sumber kebenaran** untuk membangun ulang project ini di Laravel, dengan perilaku, validasi, ID, status, filter, email, cron, dan UI yang sama persis.

Karena Laravel tujuan sudah berisi banyak project: **semua** controller, view, route, model, service, asset, dan tabel OHS Portal diisolasi di folder/namespace **`OhsDashboard`**, URL `/ohs-dashboard`, dan prefix tabel `ohs_`. Jangan menaruh file di root `Controllers` / `views` / `routes/web.php`.

**Project asal:** OHS Roster, Leave & Event Portal  
**Backend lama:** Google Apps Script (`appscrip.js`) + Node.js/Vercel (`lib/api-router.js`)  
**Frontend lama:** `index.html` (Apps Script) dan `public/index.html` + `public/checkin.html` (Vercel)  
**Database lama:** Google Spreadsheet (bukan RDBMS)  
**Timezone aplikasi:** `Asia/Jakarta`  
**Definisi minggu:** Minggu sampai Sabtu  
**Autentikasi saat ini:** tidak ada login; portal dan halaman check-in bersifat publik

Spreadsheet sumber data lama (hanya untuk export, bukan runtime Laravel):

`https://docs.google.com/spreadsheets/d/13VLFWZBftawE2cO20t-AIzM_cC3hGDuJc5qGifXMj7o`

---

## 1. Ringkasan produk

Portal internal OHS (PT Berau Coal) dengan lima modul:

1. **Overview Dashboard** — KPI event, leave, project/issue, efektivitas hari kerja, leaderboard cuti.
2. **Leave & Integrated Calendar** — pengajuan cuti + kalender per orang (leave, event, project, issue) dengan pemindahan sementara assignment ke Backup PIC (ACTING).
3. **Event Maker** — CRUD event, update kesiapan, QR absensi, daftar hadir, notulensi, action item.
4. **Project & Issue Tracker** — parent Project/Issue + Sub Task, progress, status otomatis, audit log immutable.
5. **Admin Scheduler** — digest email overview, reminder due date tracker, sinkronisasi karyawan dari API HSE.

Master karyawan **bukan diinput manual**. Data di-sync dari API HSE (puluhan ribu baris, seluruh company, status `AKTIF` saja).

---

## 2. Mapping arsitektur ke Laravel

| Sekarang | Laravel |
|---|---|
| Sheet Google (satu tab = satu tabel) | Tabel MySQL + Eloquent |
| Fungsi publik di `appscrip.js` | Controller + Service |
| `google.script.run` / `fetch('/api/...')` | REST API `/ohs-dashboard/api/...` (path relatif sama, **wajib prefix modul**) |
| `public/index.html` (SPA 1 file) | Blade di `resources/views/OhsDashboard/` |
| `public/checkin.html` | View `OhsDashboard/checkin/index.blade.php`, URL `/ohs-dashboard/checkin` |
| Vercel Cron `0 1 * * *` UTC ≈ 08:00 WIB | Laravel Scheduler |
| MailApp / Nodemailer | Laravel Mail + Mailable |
| `LockService.waitLock(30000)` | DB transaction + unique constraint |
| Nama/tim diduplikasi di setiap baris | **Tetap simpan snapshot** di baris transaksi (histori tidak berubah jika karyawan pindah tim) |
| `PropertiesService` / env | `.env` + `config/` |
| Tidak ada auth | Opsional ditambahkan belakangan; **parity awal = tanpa login** |

### Isolasi folder (wajib — Laravel sudah berisi banyak project)

Semua file OHS Portal **tidak boleh** diletakkan di root `Controllers`, `views`, atau `routes/web.php` milik project lain. Masukkan ke namespace/folder **`OhsDashboard`**.

Aturan penamaan:

| Area | Lokasi | Namespace / pemanggilan |
|---|---|---|
| Controller web | `app/Http/Controllers/OhsDashboard/` | `App\Http\Controllers\OhsDashboard` |
| Controller API | `app/Http/Controllers/OhsDashboard/Api/` | `App\Http\Controllers\OhsDashboard\Api` |
| View Blade | `resources/views/OhsDashboard/` | `view('OhsDashboard.pages.overview')` |
| Route web + API | `routes/OhsDashboard/` | di-load terpisah, **jangan** campur di `web.php` lama |
| Model | `app/Models/OhsDashboard/` | `App\Models\OhsDashboard` |
| Service | `app/Services/OhsDashboard/` | `App\Services\OhsDashboard` |
| Mail | `app/Mail/OhsDashboard/` | `App\Mail\OhsDashboard` |
| Command | `app/Console/Commands/OhsDashboard/` | `php artisan ohs-dashboard:...` |
| Request / Resource | `app/Http/Requests/OhsDashboard/` | |
| Config | `config/ohs-dashboard.php` | `config('ohs-dashboard.*')` |
| Migration | `database/migrations/ohs_dashboard/` | `--path=database/migrations/ohs_dashboard` |
| Seeder | `database/seeders/OhsDashboard/` | |
| Asset publik | `public/ohs-dashboard/` | `/ohs-dashboard/js/...` |
| URL web | `/ohs-dashboard/...` | `route('ohs-dashboard.overview')` |
| URL API | `/ohs-dashboard/api/...` | |
| Tabel MySQL | prefix `ohs_` | contoh `ohs_employees` |

Jangan memakai nama generik (`Employee`, `Event`, `DashboardController`, tabel `employees` / `events` / `holidays`) tanpa prefix: besar kemungkinan sudah dipakai modul lain.

### Struktur folder lengkap

```
app/
  Http/
    Controllers/OhsDashboard/
      PortalController.php              # render halaman utama SPA/Blade
      CheckinController.php             # halaman absensi publik
      Api/
        InitController.php
        EmployeeController.php
        DashboardController.php
        LeaveController.php
        CalendarController.php
        EventController.php
        TrackerController.php
        AdminController.php
    Requests/OhsDashboard/
      ...
  Models/OhsDashboard/
    Employee.php
    LeaveType.php
    Holiday.php
    LeaveRequest.php
    Event.php
    EventAttendance.php
    EventMinute.php
    EventActionItem.php
    ProjectIssueTracker.php
    ProjectIssueSubTask.php
    ProjectIssueUpdateLog.php
    ProjectIssueSubTaskUpdateLog.php
    EmailSchedulerSetting.php
  Services/OhsDashboard/
    LeaveService.php
    CalendarService.php
    TrackerService.php
    EventService.php
    WorkingDayService.php
    EmailDigestService.php
    OverdueReminderService.php
    HseSyncService.php
  Mail/OhsDashboard/
    PortalDigestMail.php
    OverdueReminderMail.php
  Console/Commands/OhsDashboard/
    SendPortalDigest.php                # ohs-dashboard:digest
    SendOverdueReminder.php             # ohs-dashboard:overdue-reminder
    SyncHseEmployees.php                # ohs-dashboard:hse-sync
  View/Components/OhsDashboard/         # opsional

resources/views/OhsDashboard/
  layouts/
    app.blade.php                       # shell nav + CSS portal
    checkin.blade.php                   # layout halaman absensi HP
  pages/
    overview.blade.php                  # #viewDashboard
    leave-calendar.blade.php            # #viewLeave
    event-maker.blade.php               # #viewEvent
    tracker.blade.php                   # #viewTracker
    admin.blade.php                     # #viewAdmin
  checkin/
    index.blade.php
  partials/
    nav.blade.php
    kpi-cards.blade.php
    calendar-grid.blade.php
    modals/
      leave-create.blade.php
      leave-history.blade.php
      event-create.blade.php
      event-edit.blade.php
      event-readiness.blade.php
      event-qr.blade.php
      event-attendance.blade.php
      event-minutes.blade.php
      tracker-create.blade.php
      tracker-edit.blade.php
      tracker-update.blade.php
      tracker-log.blade.php
  emails/
    digest.blade.php
    overdue-reminder.blade.php

routes/OhsDashboard/
  web.php                               # halaman /ohs-dashboard
  api.php                               # JSON /ohs-dashboard/api/*
  console.php                           # schedule modul ini saja (opsional)

public/ohs-dashboard/
  css/portal.css
  js/portal.js
  js/checkin.js

database/migrations/ohs_dashboard/
  2026_01_01_000001_create_ohs_employees_table.php
  ...
database/seeders/OhsDashboard/
  LeaveTypeSeeder.php
  HolidaySeeder.php
  EmailSchedulerSettingSeeder.php

config/ohs-dashboard.php
```

### Cara load route tanpa menyentuh `web.php` lama

Di `bootstrap/app.php` (Laravel 11+) atau `RouteServiceProvider`, **tambahkan group baru**. Jangan menempelkan ratusan route OHS ke `routes/web.php` yang sudah penuh.

```php
then: function () {
    // project-project lama tetap seperti semula
    Route::middleware('web')->group(base_path('routes/web.php'));
    Route::middleware('api')->prefix('api')->group(base_path('routes/api.php'));

    // modul OHS Portal — terisolasi
    Route::middleware('web')
        ->prefix('ohs-dashboard')
        ->name('ohs-dashboard.')
        ->group(base_path('routes/OhsDashboard/web.php'));

    Route::middleware('api')
        ->prefix('ohs-dashboard/api')
        ->name('ohs-dashboard.api.')
        ->group(base_path('routes/OhsDashboard/api.php'));
}
```

Isi `routes/OhsDashboard/web.php` (contoh):

```php
use App\Http\Controllers\OhsDashboard\PortalController;
use App\Http\Controllers\OhsDashboard\CheckinController;

Route::get('/', [PortalController::class, 'index'])->name('overview');
Route::get('/leave', [PortalController::class, 'leave'])->name('leave');
Route::get('/events', [PortalController::class, 'events'])->name('events');
Route::get('/tracker', [PortalController::class, 'tracker'])->name('tracker');
Route::get('/admin', [PortalController::class, 'admin'])->name('admin');
Route::get('/checkin', [CheckinController::class, 'index'])->name('checkin');
```

Jika UI tetap 1 halaman SPA seperti HTML lama, cukup:

```php
Route::get('/', [PortalController::class, 'index'])->name('home');
Route::get('/checkin', [CheckinController::class, 'index'])->name('checkin');
```

Isi `routes/OhsDashboard/api.php` memakai **path relatif yang sama** dengan Vercel (`/init`, `/leave/create`, …), karena prefix `/ohs-dashboard/api` sudah di-group.

Frontend: `const API_BASE = '/ohs-dashboard/api';`  
QR check-in: `{origin}/ohs-dashboard/checkin?eventId=`

### Model: set `$table` ber-prefix

```php
namespace App\Models\OhsDashboard;

class Employee extends Model
{
    protected $table = 'ohs_employees';
    protected $primaryKey = 'emp_id';
    public $incrementing = false;
    protected $keyType = 'string';
}
```

**Penting:** jangan jalankan `php artisan migrate` otomatis. Migrasi hanya setelah dikonfirmasi, dan hanya path `database/migrations/ohs_dashboard` agar tidak menjalankan migrasi project lain.

---

## 3. Aturan bisnis global (wajib 1:1)

### 3.1 Format ID

Generate UUID hex, uppercase, lalu potong.

| Entitas | Prefix | Panjang hex | Contoh |
|---|---|---|---|
| Leave request | `LR-` | 8 | `LR-A1B2C3D4` |
| Event | `EV-` | 8 | `EV-A1B2C3D4` |
| Project | `PRJ-` | 8 | `PRJ-A1B2C3D4` |
| Issue | `ISS-` | 8 | `ISS-A1B2C3D4` |
| Sub Task | `TSK-` | 10 | `TSK-A1B2C3D4E5` |
| Update log parent | `UPD-` | 10 | `UPD-A1B2C3D4E5` |
| Update log sub task | `TUP-` | 10 | `TUP-A1B2C3D4E5` |
| Attendance | `ATT-` | 8 | `ATT-A1B2C3D4` |
| Action item | `AI-` | 8 | `AI-A1B2C3D4` |

### 3.2 Status tracker (dihitung, bukan dipilih user)

```
jika percent_complete >= 100          → Closed
else jika due_date < today            → Overdue
else                                  → On Going
```

- `today` = start of day timezone `Asia/Jakarta`.
- Overdue **tidak boleh** dipilih manual di form.
- Status di sheet/DB adalah cache; saat **baca** selalu hitung ulang (`EffectiveStatus`).

### 3.3 Agregat parent jika ada Sub Task

- `% parent` = rata-rata `%` seluruh sub task, dibulatkan 2 desimal.
- Parent **Closed** hanya jika semua sub task Closed.
- Parent **Overdue** jika ada minimal satu sub task Overdue **atau** `due_date` parent sudah lewat.
- Weekly report parent = `"X/Y sub task closed. Latest - {nama sub task}: {weekly report terbaru}"`.
- Remarks parent = remarks sub task yang `last_updated` paling baru, atau fallback `"N sub task overdue."` / `"Progress dihitung dari rata-rata seluruh sub task."`.
- **Tanpa sub task:** progress diupdate langsung di parent, log masuk `ohs_project_issue_update_logs`.

Setelah create/update/update-progress sub task, parent wajib di-sync (`syncTrackerAggregate_`).

### 3.4 Hari kerja (Leave YTD, leaderboard, efektivitas)

Inclusive dari `start` sampai `end`. **Tidak dihitung:**

- Sabtu (`getDay() === 6`)
- Minggu (`getDay() === 0`)
- Tanggal yang ada di tabel `ohs_holidays`

Rumus percent: `Math.round((effective / total) * 1000) / 10` (satu desimal).

### 3.5 Cuti tidak boleh overlap

- Karyawan tidak boleh punya dua leave yang rentang tanggalnya beririsan (`startA <= endB && endA >= startB`).
- Backup PIC juga tidak boleh sedang cuti pada periode yang sama.
- Backup **wajib**.
- Backup **tidak boleh** sama dengan karyawan yang cuti.

Pesan overlap karyawan:

```
Tanggal beririsan dengan {LeaveType} ({StartDate} sampai {EndDate})[ dan N request lain].
```

Pesan overlap backup:

```
Backup / Acting PIC {nama} juga sedang on leave ({StartDate} sampai {EndDate}). Pilih backup lain.
```

### 3.6 Calendar ACTING (handover sementara)

Assignment Event / Project / Issue menempel pada PIC asal (`ownerEmpId`).

Jika PIC punya leave yang beririsan dengan timeline assignment:

1. Segmen **sebelum** leave tetap di PIC asal.
2. Segmen **selama** leave dipindah ke `backup_emp_id`, `acting = true`.
   - Judul: `ACTING for {nama PIC asal} • {judul asli}`
   - Detail ditambah baris handover, periode leave, note.
3. Segmen **sesudah** leave kembali ke PIC asal.
4. Jika backup kosong / sama dengan PIC asal: assignment tetap di PIC asal, catatan `"Backup PIC tidak valid; assignment tetap pada PIC asal."`

Leave itu sendiri tetap tampil di baris karyawan yang cuti (bukan di backup).

### 3.7 Edit tracker vs update progress

**Edit details** (`updateTrackerDetails`):

- Boleh ubah master: type, nama, department, leader, site, deskripsi, background, impact, start, due, success indicator, atribut statis sub task (nama, PIC, site, deskripsi, tanggal, success indicator).
- Progress / weekly report / remarks sub task **existing tidak diubah**.
- Sub task yang sudah ada **tidak boleh dihapus**. Jika payload tidak menyertakan semua `sub_task_id` existing → error.
- Sub task baru wajib: nama, PIC, site, description, success indicator, start/due dalam timeline parent, initial weekly report, initial remarks, lalu buat log pertama.

**Update progress** (form terpisah):

- Parent tanpa sub task → `updateTracker`
- Sub task → `updateTrackerSubTask`
- Selalu append log immutable. Wajib: `%` 0–100, Progress Report Weekly, Keterangan, Updated By.

### 3.8 Event

- **Create:** `event_date` tidak boleh sebelum hari ini.
- **Update master:** tanggal masa lalu boleh; field kesiapan **tidak** diubah.
- **Update kesiapan:** hanya `readiness_update` + `readiness_updated_at`.

### 3.9 Absensi event

- Satu `emp_id` hanya sekali per `event_id` (unique).
- Scan/submit ulang mengembalikan `{ alreadyCheckedIn: true, empName, checkInAt }`, **bukan error**.
- Halaman check-in publik, tanpa login.

### 3.10 Validasi tanggal umum

- Format bisnis: `YYYY-MM-DD`.
- `end_date >= start_date`.
- Timeline sub task harus `task.start >= parent.start` dan `task.due <= parent.due`.
- `% Complete` wajib angka 0–100, koma boleh (`"12,5"` → `12.5`), dibulatkan 2 desimal.

### 3.11 Filter default

String filter yang dipakai di seluruh API:

- Team: `"All Teams"`
- Site: `"All Sites"`
- Department: `"All Departments"` (alias `"All Teams"` juga diterima)
- Type: `"All Types"` / `"Project"` / `"Issue"`
- Status: `"All Status"` / `"On Going"` / `"Overdue"` / `"Closed"`

---

## 4. Database Laravel (skema 1:1 dari sheet)

Semua tabel memakai prefix **`ohs_`** supaya tidak bentrok dengan tabel project lain di database Laravel yang sama. Model ada di `App\Models\OhsDashboard`, masing-masing set `protected $table = 'ohs_...'`.

Tanggal bisnis: `DATE`. Timestamp: `DATETIME` (app timezone `Asia/Jakarta`).  
Snapshot nama/tim/posisi/site **wajib** di tabel transaksi.

### 4.1 Relasi

```
ohs_employees 1──* ohs_leave_requests          (emp_id dan backup_emp_id)
ohs_employees 1──* ohs_events                  (pic_emp_id)
ohs_employees 1──* ohs_project_issue_trackers  (project_leader_emp_id)
ohs_employees 1──* ohs_project_issue_sub_tasks (pic_emp_id)
ohs_events 1──* ohs_event_attendances
ohs_events 1──1 ohs_event_minutes
ohs_events 1──* ohs_event_action_items
ohs_project_issue_trackers 1──* ohs_project_issue_sub_tasks
ohs_project_issue_trackers 1──* ohs_project_issue_update_logs
ohs_project_issue_sub_tasks 1──* ohs_project_issue_sub_task_update_logs
ohs_email_scheduler_settings                 (tepat 1 baris)
ohs_leave_types, ohs_holidays                (master)
```

Foreign key ke `ohs_employees` sebaiknya **logis**, bukan ketat `ON DELETE CASCADE`: sync HSE menimpa seluruh karyawan; leave/event historis harus tetap ada meski NPK hilang.

### 4.2 `ohs_employees`

Sumber: API HSE. Sync **menimpa seluruh tabel** (`DELETE` + `INSERT` dalam transaksi, atau truncate-then-insert). Duplikat NPK: ambil kemunculan pertama.

| Kolom | Tipe | Sumber HSE | Keterangan |
|---|---|---|---|
| emp_id | string PK | `npk` | wajib |
| sid | string nullable | `sidCode` | |
| emp_name | string | `name` | wajib |
| position | string nullable | `structuralPosition` | |
| team | string nullable | `departmentName` | dipakai sebagai Department di tracker |
| site_dedicated | string nullable | `dedicatedSite` | alias sheet: `SiteDedicated` / `Site_Dedicated` / `Site Dedicated` |
| company | string nullable | `companyName` | |
| photo_url | string nullable | — | dikosongkan saat sync |

Hanya karyawan dengan `status === "AKTIF"` (case-insensitive, trim, uppercase).

Index: `team`, `site_dedicated`, `emp_name`.

**Pencarian server-side** (`GET /ohs-dashboard/api/employees/search?q=&limit=`):

- Match substring case-insensitive pada `emp_name`, `emp_id`, `company`, `team`.
- Default `limit = 20`, min 1, max 50.
- Query kosong → `[]`.
- **Jangan** kirim seluruh karyawan ke client (data puluhan ribu baris).

### 4.3 `ohs_leave_types`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| leave_type | string unique | wajib |
| available_days | string/int nullable | metadata UI saja, tidak membatasi pengajuan |

Sheet: `LeaveTypes`. Header: `LeaveType`, `AvailableDays`.

### 4.4 `ohs_holidays`

| Kolom | Tipe | Keterangan |
|---|---|---|
| date | date PK | ISO `YYYY-MM-DD` |
| name | string | default `"Holiday"` jika kosong |

Sheet: `Holidays`. Header wajib: `Date`, `Name`.  
Response init/calendar: object map `{ "2026-01-01": "Tahun Baru", ... }`.

### 4.5 `ohs_leave_requests`

Sheet: `LeaveRequests`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| request_id | string PK | `LR-...` |
| timestamp | datetime | waktu create |
| emp_id | string | |
| emp_name | string | snapshot |
| team | string nullable | snapshot |
| position | string nullable | snapshot |
| site_dedicated | string nullable | snapshot |
| leave_type | string | |
| start_date | date | |
| end_date | date | `>= start_date` |
| start_time | time nullable | payload `TimeFrom` |
| end_time | time nullable | payload `TimeTo` |
| note | text nullable | handover / pending work |
| backup_emp_id | string | wajib, ≠ emp_id |
| backup_emp_name | string | snapshot |
| backup_team | string nullable | snapshot |
| backup_position | string nullable | snapshot |
| backup_site_dedicated | string nullable | snapshot |

Index: `(emp_id, start_date, end_date)`, `backup_emp_id`.

Payload create:

```json
{
  "EmpId": "",
  "BackupEmpId": "",
  "LeaveType": "",
  "StartDate": "YYYY-MM-DD",
  "EndDate": "YYYY-MM-DD",
  "TimeFrom": "HH:MM",
  "TimeTo": "HH:MM",
  "Note": ""
}
```

Response: `{ "requestId": "LR-..." }`.

### 4.6 `ohs_events`

Sheet: `Events`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| event_id | string PK | `EV-...` |
| timestamp | datetime | |
| event_name | string | wajib |
| description | text | wajib |
| where | string | wajib, lokasi |
| readiness_update | text nullable | |
| readiness_updated_at | datetime nullable | |
| pic_emp_id | string | wajib |
| pic_name | string | snapshot |
| pic_team | string nullable | snapshot |
| pic_position | string nullable | snapshot |
| pic_site_dedicated | string nullable | snapshot |
| event_date | date | wajib |

Index: `event_date`, `pic_emp_id`, `pic_team`, `pic_site_dedicated`.

### 4.7 `ohs_event_attendances`

Sheet: `EventAttendance`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| attendance_id | string PK | `ATT-...` |
| timestamp | datetime | |
| event_id | string | |
| emp_id | string | |
| emp_name | string | snapshot |
| team | string nullable | snapshot |
| position | string nullable | snapshot |
| site_dedicated | string nullable | snapshot |
| check_in_at | datetime | |

Unique: `(event_id, emp_id)`.

### 4.8 `ohs_event_minutes`

Sheet: `EventMinutes`. **Satu baris per event** (upsert by `event_id`).

| Kolom | Tipe | Keterangan |
|---|---|---|
| event_id | string PK/unique | |
| timestamp | datetime | create pertama |
| summary | text nullable | |
| updated_at | datetime | |
| updated_by_emp_id | string nullable | |
| updated_by_name | string nullable | snapshot |

### 4.9 `ohs_event_action_items`

Sheet: `EventActionItems`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| action_item_id | string PK | `AI-...` |
| timestamp | datetime | |
| event_id | string | |
| task | text | wajib |
| pic_emp_id | string nullable | |
| pic_name | string nullable | snapshot |
| due_date | date nullable | |
| status | string | hanya `Open` atau `Done`; default `Open` |

### 4.10 `ohs_project_issue_trackers`

Sheet: `ProjectIssueTracker`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| tracker_id | string PK | `PRJ-...` atau `ISS-...` |
| timestamp | datetime | |
| tracker_type | string | hanya `Project` atau `Issue` |
| project_issue_name | string | wajib |
| department | string | wajib, biasanya = Team leader |
| site | string | wajib |
| project_leader_emp_id | string | wajib |
| project_leader_name | string | snapshot |
| project_leader_team | string nullable | snapshot |
| project_leader_position | string nullable | snapshot |
| project_leader_site_dedicated | string nullable | snapshot |
| description_project | text | wajib |
| background_project | text | wajib |
| impact_project | text | wajib |
| start_date | date | wajib |
| due_date | date | wajib, `>= start_date` |
| success_indicator | text | wajib |
| current_percent_complete | decimal(5,2) | 0–100 |
| current_progress_report_weekly | text nullable | |
| current_remarks | text nullable | |
| status | string | cache: On Going / Overdue / Closed |
| last_updated | datetime nullable | |

Index: `tracker_type`, `status`, `department`, `site`, `due_date`.

Kolom legacy sheet (`Title`, `Description`, `PICEmpId`, `OwnerEmpId`, `ProgressUpdate`) **tidak perlu** di Laravel. Saat import data lama, mapping:

- `ProjectIssueName` ← `Title` jika kosong
- `ProjectLeader*` ← `PIC*` jika kosong
- `DescriptionProject` ← `Description` jika kosong
- `CurrentProgressReportWeekly` ← `ProgressUpdate` jika kosong
- Jika `Status` lama `"closed"` dan percent kosong → percent `100`

### 4.11 `ohs_project_issue_sub_tasks`

Sheet: `ProjectIssueSubTasks`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| sub_task_id | string PK | `TSK-...` |
| tracker_id | string | FK logis |
| timestamp | datetime | |
| sub_task_name | string | wajib |
| department | string nullable | default Team PIC |
| site | string | wajib |
| pic_emp_id | string | wajib |
| pic_name | string | snapshot |
| pic_team | string nullable | snapshot |
| pic_position | string nullable | snapshot |
| pic_site_dedicated | string nullable | snapshot |
| description_sub_task | text | wajib |
| start_date | date | wajib, ≥ parent.start |
| due_date | date | wajib, ≤ parent.due |
| success_indicator | text | wajib |
| current_percent_complete | decimal(5,2) | |
| current_progress_report_weekly | text | |
| current_remarks | text | |
| status | string | cache |
| last_updated | datetime nullable | |

### 4.12 `ohs_project_issue_update_logs`

Sheet: `ProjectIssueUpdateLog`. Insert only.

| Kolom | Tipe |
|---|---|
| update_id | string PK `UPD-...` |
| timestamp | datetime |
| tracker_id | string |
| percent_complete | decimal(5,2) |
| progress_report_weekly | text |
| remarks | text |
| status | string |
| updated_by_emp_id | string |
| updated_by_name | string |
| updated_by_team | string nullable |
| updated_by_position | string nullable |
| updated_by_site_dedicated | string nullable |

### 4.13 `ohs_project_issue_sub_task_update_logs`

Sheet: `ProjectIssueSubTaskUpdateLog`. Insert only. Sama seperti 4.12 + `sub_task_id`, prefix ID `TUP-`.

### 4.14 `ohs_email_scheduler_settings`

Sheet: `EmailSchedulerSettings`. **Tepat satu baris.**

| Kolom | Default | Keterangan |
|---|---|---|
| enabled | false | digest otomatis |
| frequency | `SELECTED_DAYS` | selalu nilai ini |
| schedule_days | `MON,TUE,WED,THU,FRI` | CSV kode hari |
| send_hour | 7 | integer 0–23 |
| send_minute | 0 | hanya `0`, `15`, `30`, `45` |
| recipients | `''` | wajib jika enabled |
| cc | `''` | |
| bcc | `''` | |
| portal_url | `''` | wajib `https://` jika enabled |
| overview_team | `All Teams` | scope digest |
| overview_site | `All Sites` | scope digest |
| include_leave_summary | true | |
| include_tracker_summary | true | |
| include_leaderboard | true | top 10 di email |
| subject_prefix | `[OHS Portal]` | |
| event_reminder_days | `0,1,3,7` | tersimpan; digest saat ini memakai overview penuh |
| include_previous_days | 7 | integer 0–365, tersimpan |
| last_scheduled_key | `''` | idempotensi digest `{YYYY-MM-DD} {HH}:{MM}` |
| last_run_at | null | |
| last_run_status | `Belum pernah dijalankan.` | |
| last_email_count | 0 | |
| updated_at | null | |
| updated_by | `''` | |
| overdue_reminder_last_key | `''` | ISO date hari ini |
| overdue_reminder_last_run_at | null | |
| overdue_reminder_last_count | 0 | |
| hse_sync_last_key | `''` | ISO date Senin minggu itu |
| hse_sync_last_run_at | null | |
| hse_sync_last_count | 0 | |

Email list: pecah dengan koma, titik koma, atau baris baru; trim; validasi format email.

---

## 5. Modul, UI, dan fungsi backend

Konvensi JSON payload **PascalCase** seperti Apps Script (`EmpId`, `StartDate`, …) supaya frontend lama bisa dipakai tanpa rewrite. Internally Laravel boleh snake_case.

Semua endpoint JSON di bawah ini hidup di **`/ohs-dashboard/api/...`** (bukan `/api/...` root, agar tidak bentrok modul lain). Controller: `App\Http\Controllers\OhsDashboard\Api\*`. View halaman: `resources/views/OhsDashboard/...`.

Error: HTTP 4xx/5xx, body `{ "error": "pesan bahasa Indonesia" }`.

---

### 5.1 Init

**`GET /ohs-dashboard/api/init`** → `getInit()`

Tidak perlu body. Return:

```json
{
  "employeeCount": 0,
  "leaveTypes": [{ "LeaveType": "", "AvailableDays": "" }],
  "teams": ["..."],
  "sites": ["..."],
  "years": [2025, 2026],
  "currentYear": 2026,
  "holidays": { "2026-01-01": "Tahun Baru" },
  "todayISO": "2026-08-21"
}
```

- `teams` / `sites`: unique, sorted, skip kosong.
- `years`: union tahun dari leave start/end, event date, tracker start/due, **plus tahun ini dan tahun lalu**, sorted.

Frontend memakai ini untuk mengisi semua dropdown filter.

---

### 5.2 Employee search

**`GET /ohs-dashboard/api/employees/search?q=&limit=`** → `getEmployeeSearchResults`

Dipakai semua combobox PIC/employee (leave, event, tracker, check-in, updated-by).

---

### 5.3 Overview Dashboard

**Halaman:** nav `Overview` (`#viewDashboard`).

Filter UI: Team, Site, Year, tombol Refresh.

**`POST /ohs-dashboard/api/dashboard/overview`**

Body:

```json
{ "team": "All Teams", "site": "All Sites", "year": 2026 }
```

#### Periode minggu

Ambil *reference date*:

- `year == tahun berjalan` → hari ini
- `year < tahun berjalan` → 31 Desember tahun itu
- `year > tahun berjalan` → 1 Januari tahun itu minus 1 hari (YTD kosong)

Lalu:

- `thisWeek` = Minggu–Sabtu yang mengandung reference date
- `nextWeek` = +7 sampai +13 hari dari Minggu
- `nextTwoWeek` = +14 sampai +20 hari dari Minggu
- Event “More Than 2 Weeks Ahead” = `event_date > nextTwoWeekEnd` dan masih dalam tahun
- Leave this week = rentang leave **beririsan** dengan this week
- Upcoming leave = `start_date > thisWeekEnd`

Filter:

- Employee: `team` dan `site_dedicated`
- Leave: hanya emp_id yang lolos filter employee, dan rentang overlap tahun
- Event: `event_date` dalam tahun, lalu filter `PICTeam` / `PICSiteDedicated`
- Tracker: overlap tahun (start/due vs 1 Jan–31 Des), lalu `Department === team`, `Site === site`

#### KPI cards

| ID UI | Nilai |
|---|---|
| Event This Week | jumlah events this week |
| Upcoming Event | next week + next 2 week + more than 2 weeks |
| Leave This Week | jumlah leave this week |
| Upcoming Leave | jumlah upcoming leave |
| Project Active | type Project dan EffectiveStatus ≠ Closed |
| Issue Active | type Issue dan EffectiveStatus ≠ Closed |

#### Event Status (collapsible)

Empat grup, masing-masing bisa collapse + sort (`dateAsc` / `dateDesc` / `nameAsc`):

1. This Week
2. Next Week
3. Next 2 Week
4. More Than 2 Weeks Ahead

#### Leave Status (collapsible)

1. Leave This Week
2. Upcoming Leave — **response max 30 item** (`upcomingLeave.slice(0, 30)`), count KPI tetap full length

#### Leaderboard Working Days Effectiveness

Untuk setiap employee di filter:

```
leaveDaysYTD = jumlah hari kerja leave yang di-clip ke [1 Jan .. ytdCutoff]
totalWorkingDaysYTD = hari kerja 1 Jan .. ytdCutoff
effectiveWorkingDays = max(0, totalWorkingDaysYTD - leaveDaysYTD)
effectiveWorkingPercent = round(effective / total * 1000) / 10
```

`ytdCutoff`:

- tahun lalu → 31 Des tahun itu
- tahun ini → hari ini
- tahun depan → 1 Jan − 1 hari

Sort: `LeaveYTD DESC`, lalu `EmpName ASC`.

Response **maksimal 200 baris** (`DASHBOARD_LEADERBOARD_LIMIT`).  
Agregat `workforceEffectiveness` dihitung dari **seluruh** employee sebelum dipotong.

```json
"workforceEffectiveness": {
  "employeeCount": 0,
  "totalWorkingDaysPerEmployee": 0,
  "totalPersonWorkingDays": 0,
  "leavePersonDays": 0,
  "effectivePersonDays": 0,
  "effectiveWorkingPercent": 0
}
```

Klik baris leaderboard membuka modal riwayat: `GET /ohs-dashboard/api/leave/history?empId=&year=`.

#### Tracker highlights

Semua tracker dalam scope tahun+filter, sort:

1. Overdue, On Going, Closed
2. DueDate ASC
3. ProjectIssueName ASC

Pagination **10 per halaman di client** (bukan server). Tampilkan badge On Going / Overdue / Closed.

---

### 5.4 Leave history (modal leaderboard)

**`GET /ohs-dashboard/api/leave/history?empId=&year=`** → `getEmployeeLeaveHistory`

Validasi: empId wajib, employee harus ada.

Setiap record:

- enrich dari employee map
- `LeaveDays` / `WorkingDays` = working days **full range** (tidak di-clip)
- `Status`:
  - `start > today` → `Upcoming`
  - `start <= today <= end` → `On Leave`
  - selain itu → `Completed`
- Sort StartDate DESC, EndDate DESC

YTD (`leaveDaysYTD`) di-clip ke tahun + cutoff, sama seperti dashboard.

Return:

```json
{
  "employee": {},
  "records": [],
  "totalRequests": 0,
  "totalWorkingDays": 0,
  "totalLeaveDaysAllHistory": 0,
  "leaveDaysYTD": 0,
  "ytdWorkingDays": 0,
  "effectiveWorkingDays": 0,
  "effectiveWorkingPercent": 0,
  "currentYear": 2026
}
```

`ytdWorkingDays` = alias backward-compat untuk `leaveDaysYTD`.

---

### 5.5 Create leave & overlap

**Halaman:** `Leave & Integrated Calendar`, tombol `+ Create Leave Request`.

Form:

- Employee (search)
- Leave Type (dari init)
- Start Date, End Date
- Time From, Time To (`type="time"`)
- Backup / Acting PIC (search, ≠ employee)
- Note (handover)

**`POST /ohs-dashboard/api/leave/check-overlap`**

Body: `{ EmpId, BackupEmpId, StartDate, EndDate, ExcludeRequestId? }`

Jika EmpId/tanggal kosong → `{ hasOverlap: false, overlaps: [], hasBackupConflict: false, backupOverlaps: [], message: "" }`.

**`POST /ohs-dashboard/api/leave/create`**

Validasi berurutan sesuai `createLeaveRequest`. Simpan snapshot employee + backup.

---

### 5.6 Integrated Calendar

**`POST /ohs-dashboard/api/calendar/range`**

Body:

```json
{
  "viewMode": "WEEK",
  "anchorISO": "2026-08-21",
  "team": "All Teams",
  "site": "All Sites",
  "search": ""
}
```

`viewMode`: `WEEK` | `MONTH` | `YEAR` (uppercase). Default WEEK.  
`anchorISO` kosong → hari ini.

Range:

- YEAR → 1 Jan–31 Des tahun anchor
- MONTH → 1 sampai akhir bulan
- WEEK → Minggu–Sabtu

#### Kolom kalender (`cols`)

- YEAR: 12 kolom, `type: MONTH`, label `MMM`, key `YYYY-MM`
- MONTH: satu kolom per minggu (mulai Minggu, sampai Sabtu), `type: WEEK`, label `Week {n}`
- WEEK: satu kolom per hari, `type: DAY`, key = ISO date

#### Item

1. **LEAVE** untuk setiap leave yang overlap range. Title: `{LeaveType} → {BackupEmpName}`.
2. **EVENT** menempel PIC, 1 hari (`EventDate`).
3. **PROJECT / ISSUE** parent menempel Project Leader, rentang Start–Due, judul berisi `%`.
4. **PROJECT/ISSUE TASK** menempel PIC sub task.

Lalu jalankan `distributeAssignmentToBackup_` untuk item 2–4.

#### Filter employee di kalender

1. Filter team/site.
2. Search: match employee (EmpId, SID, EmpName, Position, Team, Site) **atau** item (category, title, detail, status, searchText, originalOwnerName, actingEmployeeName).
3. **Default tanpa filter team/site/search:** hanya tampilkan employee yang punya item (jangan kirim puluhan ribu baris kosong).
4. Jika user memfilter team/site atau mengisi search: tampilkan roster termasuk yang kosong.

Sort baris: Team ASC, EmpName ASC.

Chip:

```
Leave YTD {year}: {n} hari • Assignment: {count non-LEAVE} • Acting: {m}
```

`year` = tahun `rangeStart`. Leave YTD dihitung working days clip ke tahun range (cutoff = today jika tahun ini).

Legend UI: Leave / Event / Project / Issue / ACTING.

Counts response: `events`, `projects`, `issues`, `leaveEmployees`, `actingTransfers`.

Navigasi: Prev / Today / Next sesuai viewMode.

---

### 5.7 Event Maker

**Halaman:** nav `Event Maker`.

Filter: Team PIC, Site PIC, search per kolom tabel + sort.

**`POST /ohs-dashboard/api/events/maker-data`**

ScheduleStatus per event:

| Kondisi | ScheduleStatus | ScheduleOrder |
|---|---|---|
| `event_date < today` | Previous Event | 5 |
| today s/d Sabtu (akhir minggu portal) | This Week | 1 |
| next week | Next Week | 2 |
| next 2 week | Next 2 Week | 3 |
| selain itu (masa depan) | More Than 2 Weeks Ahead | 4 |

Sort: previous di bawah (date DESC); non-previous by ScheduleOrder lalu tanggal.

Badge count: This Week, Next Week, Next 2 Week, More Than 2 Weeks, Previous Event.

Kolom tabel: Status, Event, Date, PIC/Team/Site, Where, Update Kesiapan, Last Update, Action.

#### Create

**`POST /ohs-dashboard/api/events/create`**

Wajib: EventName, Description, Where, PICEmpId, EventDate ≥ today.

Return `{ "eventId": "EV-..." }`. Readiness awal kosong.

#### Update master

**`POST /ohs-dashboard/api/events/update`**

Field sama; kesiapan tidak disentuh. Tanggal masa lalu boleh.

#### Update kesiapan

**`POST /ohs-dashboard/api/events/readiness`**

Body: `{ EventId, ReadinessUpdate }` — ReadinessUpdate wajib.

Return: `{ eventId, readinessUpdate, readinessUpdatedAt }`.

#### QR Absensi

URL publik:

```
{origin}/ohs-dashboard/checkin?eventId={EventId}
```

Tampilkan QR (image generator) + copy link. Di Laravel, view `OhsDashboard.checkin.index`.

#### Daftar hadir

**`GET /ohs-dashboard/api/events/attendance?eventId=`**

Return event ringkas + array attendance (sort CheckInAt ASC) + attendanceCount.

#### Notulensi

**`GET /ohs-dashboard/api/events/minutes?eventId=`**  
**`POST /ohs-dashboard/api/events/minutes`** body `{ EventId, Summary, UpdatedByEmpId }` — upsert.

**`POST /ohs-dashboard/api/events/action-items/add`** body `{ EventId, Task, PICEmpId, DueDate }` — status awal `Open`. Task wajib.

**`POST /ohs-dashboard/api/events/action-items/status`** body `{ ActionItemId, EventId, Status }` — Status hanya `Open` atau `Done`.

Kedua POST action item / minutes mengembalikan payload `getEventMinutes` (summary + actionItems).

---

### 5.8 Check-in publik

File sumber lama: `public/checkin.html`. Di Laravel: `resources/views/OhsDashboard/checkin/index.blade.php` + `public/ohs-dashboard/js/checkin.js`. Mobile-first, font Plus Jakarta Sans.

**`GET /ohs-dashboard/api/events/checkin-info?eventId=`**

Jika event tidak ada: `"Event tidak ditemukan atau QR sudah tidak berlaku."`

Return:

```json
{
  "event": { "EventId", "EventName", "Description", "Where", "EventDate" },
  "checkedInEmpIds": ["..."],
  "attendanceCount": 0
}
```

**`POST /ohs-dashboard/api/events/checkin`** body `{ EventId, EmpId }`

Alur: event ada → employee ada → jika sudah absen return `alreadyCheckedIn: true` → else insert + `{ alreadyCheckedIn: false, empName, checkInAt }`.

---

### 5.9 Project & Issue Tracker

**Halaman:** nav `Project & Issue Tracker`.

Filter: Type, Status, Department, Site + search/sort per kolom.

Hint UI: *Jika ada Sub Task, progress parent = rata-rata Sub Task. Tanpa Sub Task, progress diupdate langsung pada parent.*

**`POST /ohs-dashboard/api/tracker/data`**

Body: `{ type, status, department|team, site, search }`

Filter type/department/site dulu, hitung counts (total/onGoing/overdue/closed) **sebelum** filter status, lalu filter status, lalu sort.

Search match parent **atau** sub task (id, nama, PIC, dept, site, deskripsi, success, weekly, remarks).

Department match: parent.Department **atau** sub task Department/PICTeam.  
Site match: parent.Site **atau** sub task Site/PICSiteDedicated.

#### Create

**`POST /ohs-dashboard/api/tracker/create`**

Wajib parent: TrackerType (`Project`/`Issue`), ProjectIssueName, Department, ProjectLeaderEmpId, Site, DescriptionProject, BackgroundProject, ImpactProject, StartDate, DueDate, Success Indicator.

SubTasks array opsional. Baris dianggap “terisi” jika salah satu field tidak kosong; baris terisi wajib lengkap termasuk Initial Progress Report Weekly dan Initial Keterangan.

Percent parent default 0 jika kosong saat create. Weekly/remarks parent default:

- `"Tracker dibuat."`
- `"Belum ada catatan tambahan."`

Jika ada sub task: jangan tulis parent update log; tulis log per sub task dengan UpdatedBy = project leader. Sync agregat dari sub task.

Jika tanpa sub task: tulis parent update log.

Return `{ trackerId, status, subTaskCount }`.

#### Edit details

**`POST /ohs-dashboard/api/tracker/update-details`**

Lihat aturan 3.7. Return `{ trackerId, subTaskCount, newSubTaskCount }`.

#### Update progress sub task

**`POST /ohs-dashboard/api/tracker/update-subtask`**

`{ SubTaskId, PercentComplete, ProgressReportWeekly, Remarks, UpdatedByEmpId }`

Return `{ trackerId, subTaskId, percentComplete, status }`.

#### Update progress parent (tanpa sub task)

**`POST /ohs-dashboard/api/tracker/update`**

Field sama + `TrackerId`.

#### Logs

**`GET /ohs-dashboard/api/tracker/log?trackerId=`** — tracker + logs parent, timestamp DESC.  
**`GET /ohs-dashboard/api/tracker/subtask-log?subTaskId=`** — tracker, subTask, logs, timestamp DESC.

Sort daftar tracker/sub task: Overdue → On Going → Closed, lalu DueDate, lalu nama.

---

### 5.10 Admin Email Scheduler

**Halaman:** nav `Admin Scheduler`.

Kartu status: Scheduler on/off, hari & jam, last run, remaining mail quota (di Google; di Laravel bisa `null` atau info SMTP).

Form:

- Enable Auto Email
- Hari: Sen–Min checkbox (kode `MON`…`SUN`)
- Jam 00–23, menit 00/15/30/45
- Recipients (textarea), CC, BCC
- Web Portal URL (`https://` wajib)
- Overview Team / Site scope
- Subject prefix
- Checkbox Include Leave Summary / Tracker Summary / Leaderboard

Tombol:

- Refresh Settings
- Save → `POST /ohs-dashboard/api/admin/email-settings`
- Send Now → `POST /ohs-dashboard/api/admin/email-send`
- Test Email → `POST /ohs-dashboard/api/admin/email-test`
- Send Overdue Reminder Now → `POST /ohs-dashboard/api/admin/overdue-reminder-send`
- Sync HSE Now → `POST /ohs-dashboard/api/admin/hse-sync-now`

`POST /ohs-dashboard/api/admin/install-cron` dan `remove-cron` adalah sisa Apps Script. Di Laravel **tidak perlu** diimplementasi (pakai `schedule()`). Boleh return pesan informatif.

**`GET /ohs-dashboard/api/admin/email-settings`** mengembalikan settings + `PortalUrl` ter-resolve, `TimeZone`, catatan cron.

Save: jika enabled, Recipients, minimal 1 hari, dan PortalUrl wajib.

---

## 6. Tabel API (parity penuh)

File route: `routes/OhsDashboard/api.php`, prefix group `/ohs-dashboard/api`.

| Method | Path Laravel | Fungsi asal |
|---|---|---|
| GET | `/ohs-dashboard/api/init` | `getInit` |
| GET | `/ohs-dashboard/api/employees/search` | `getEmployeeSearchResults` |
| POST | `/ohs-dashboard/api/dashboard/overview` | `getDashboardOverview` |
| GET | `/ohs-dashboard/api/leave/history` | `getEmployeeLeaveHistory` |
| POST | `/ohs-dashboard/api/leave/check-overlap` | `checkLeaveOverlap` |
| POST | `/ohs-dashboard/api/leave/create` | `createLeaveRequest` |
| POST | `/ohs-dashboard/api/calendar/range` | `getCalendarRange` |
| POST | `/ohs-dashboard/api/events/create` | `createEvent` |
| POST | `/ohs-dashboard/api/events/update` | `updateEvent` |
| POST | `/ohs-dashboard/api/events/readiness` | `updateEventReadiness` |
| POST | `/ohs-dashboard/api/events/maker-data` | `getEventMakerData` |
| GET | `/ohs-dashboard/api/events/checkin-info` | `getEventCheckinInfo` |
| POST | `/ohs-dashboard/api/events/checkin` | `submitEventCheckin` |
| GET | `/ohs-dashboard/api/events/attendance` | `getEventAttendanceSummary` |
| GET | `/ohs-dashboard/api/events/minutes` | `getEventMinutes` |
| POST | `/ohs-dashboard/api/events/minutes` | `saveEventMinutes` |
| POST | `/ohs-dashboard/api/events/action-items/add` | `addEventActionItem` |
| POST | `/ohs-dashboard/api/events/action-items/status` | `updateEventActionItemStatus` |
| POST | `/ohs-dashboard/api/tracker/create` | `createTracker` |
| POST | `/ohs-dashboard/api/tracker/update-details` | `updateTrackerDetails` |
| POST | `/ohs-dashboard/api/tracker/data` | `getTrackerData` |
| POST | `/ohs-dashboard/api/tracker/update-subtask` | `updateTrackerSubTask` |
| POST | `/ohs-dashboard/api/tracker/update` | `updateTracker` |
| GET | `/ohs-dashboard/api/tracker/subtask-log` | `getTrackerSubTaskUpdateLog` |
| GET | `/ohs-dashboard/api/tracker/log` | `getTrackerUpdateLog` |
| GET | `/ohs-dashboard/api/admin/email-settings` | `getEmailSchedulerSettings` |
| POST | `/ohs-dashboard/api/admin/email-settings` | `saveEmailSchedulerSettings` |
| POST | `/ohs-dashboard/api/admin/email-send` | `sendSchedulerEmailNow` |
| POST | `/ohs-dashboard/api/admin/email-test` | `sendSchedulerTestEmail` |
| POST | `/ohs-dashboard/api/admin/overdue-reminder-send` | `sendOverdueReminderNow` |
| POST | `/ohs-dashboard/api/admin/hse-sync-now` | `syncHseEmployeesNow` |

CORS lama: `Access-Control-Allow-Origin: *`, methods GET/POST/OPTIONS.

---

## 7. Job terjadwal

Vercel cron: `0 1 * * *` (01:00 UTC = **08:00 WIB**), satu endpoint menjalankan 3 job berurutan.

Di Laravel, daftarkan tiga command jam 08:00 `Asia/Jakarta`. Idempotensi tetap di dalam service (window 75 menit + last_key), supaya aman jika scheduler jalan tiap menit.

```php
// contoh, jangan dijalankan otomatis tanpa konfirmasi deploy
$schedule->command('ohs-dashboard:digest')->everyMinute();
$schedule->command('ohs-dashboard:overdue-reminder')->everyMinute();
$schedule->command('ohs-dashboard:hse-sync')->everyMinute();
```

Atau panggil ketiganya sekali jam 08:00, dengan window 75 menit di kode.

### 7.1 Digest overview — `runScheduledPortalEmail`

Kirim hanya jika **semua** terpenuhi:

1. `enabled === true`
2. Hari ini ∈ `schedule_days` (`SUN`…`SAT` sesuai `Date.getDay()`)
3. Menit sekarang ∈ `[target, target+75)`
4. `last_scheduled_key` ≠ `{todayISO} {HH}:{MM}`

Isi email (`buildPortalEmailDigest_`):

- Ambil `getDashboardOverview({ team: OverviewTeam, site: OverviewSite, year: currentYear })`
- KPI cards: Event This Week, Upcoming Event, Leave This Week, Upcoming Leave, Project Active, Issue Active, Effective Working Days %
- Section Event Status (this/next/next2/more)
- Section Leave jika `IncludeLeaveSummary`
- Section Active Project & Issue jika `IncludeTrackerSummary` (semua `trackerHighlights`)
- Section Working Days Effectiveness Top 10 jika `IncludeLeaderboard`
- Tombol **Open OHS Web Portal** ke `portal_url`
- Max 100 baris per tabel section
- Subject: `{SubjectPrefix} Overview Dashboard - {dd MMM yyyy}`
- Test: `{SubjectPrefix} TEST - Overview Dashboard - {dd MMM yyyy}` + banner TEST EMAIL
- From name: `OHS Portal Scheduler`
- CC/BCC jika terisi

Setelah sukses/gagal, update last_run_* di settings.

Manual: `sendSchedulerEmailNow` (abaikan enabled/hari/jam). Test: `sendSchedulerTestEmail` (`isTest=true`).

### 7.2 Overdue reminder — setiap hari 08:00 WIB

Window sama 75 menit dari **08:00** (hardcoded `OVERDUE_REMINDER_HOUR=8`, `MINUTE=0`), bukan dari settings digest.

Idempotensi: `overdue_reminder_last_key === todayISO` → skip.

Penerima **tetap** (bukan dari Recipients settings):

```
christine@beraucoal.co.id
paian.siregar@beraucoal.co.id
yadi.haryadi@beraucoal.co.id
oscar.whimmy@beraucoal.co.id
yudi@beraucoal.co.id
davi.tantra@beraucoalenergy.co.id
sepriyanto@beraucoal.co.id
dhehave@beraucoal.co.id
budiansyah@beraucoal.co.id
m.firmansyah@beraucoal.co.id
indra.nur@beraucoal.co.id
rahmantha.anggana@beraucoal.co.id
jimmi.idris@beraucoal.co.id
```

Item (`OVERDUE_REMINDER_WINDOW_DAYS = 3`):

- Status **On Going**
- `due_date` antara `today` dan `today+3` inclusive
- Jika parent punya sub task: reminder **per sub task**, parent dilewati
- Jika tanpa sub task: reminder parent

Kolom email: Sisa Hari (`Hari ini` atau `H-N`), Tipe, Project/Issue, Item, PIC (nama • team • site), Due Date, % Complete.

Subject: `[OHS Portal] Reminder Due Date Project & Issue Tracker - {dd MMM yyyy} ({n} item)`

Jika 0 item: **jangan kirim email**, tetap update last run + count 0.

### 7.3 Sinkronisasi HSE — Senin 08:00 WIB

Hari: `Date.getDay() === 1` (Senin). Jam 08:00, window 75 menit.  
Idempotensi: `hse_sync_last_key` = ISO tanggal **Senin minggu itu** (`startOfWeekMonday`).

Env:

```
HSE_API_KEY=            # wajib
HSE_API_BASE=https://hseautomation.beraucoal.co.id
HSE_COMPANY_ID=5194     # default lama; sync memakai SEMUA company
```

Alur:

1. `GET {base}/sid2/api/ftwApi/getCompany?page=1&size=1000`  
   Header: `x-api-key: {HSE_API_KEY}`  
   Ambil `results[].id` atau `companyId`.
2. Per company:  
   `GET {base}/sid2/api/ftwApi/getEmployee?companyId={id}&page=1&size=30000`  
   Filter `status === "AKTIF"`.  
   Retry sekali jika gagal; jika tetap gagal, catat `failedCompanyIds`, **jangan** gagalkan seluruh sync.
3. Concurrency disarankan 8 company per batch.
4. Map:

   | Kolom | Field HSE |
   |---|---|
   | emp_id | `npk` |
   | sid | `sidCode` |
   | emp_name | `name` |
   | position | `structuralPosition` |
   | team | `departmentName` |
   | site_dedicated | `dedicatedSite` |
   | company | `companyName` |
   | photo_url | `''` |

5. Skip baris tanpa emp_id atau emp_name. Dedupe emp_id (first wins).
6. **Replace seluruh tabel `ohs_employees`** dalam transaksi.
7. Simpan `hse_sync_last_*`.

Error jika `HSE_API_KEY` kosong: `"HSE_API_KEY belum dikonfigurasi..."`.

---

## 8. Frontend (parity UI)

Semua Blade **hanya** di `resources/views/OhsDashboard/`. Jangan taruh di `resources/views/` root.

| Halaman | View | URL web |
|---|---|---|
| Portal (Overview default) | `OhsDashboard.layouts.app` + `pages.overview` | `/ohs-dashboard` |
| Leave & Calendar | `OhsDashboard.pages.leave-calendar` | `/ohs-dashboard/leave` |
| Event Maker | `OhsDashboard.pages.event-maker` | `/ohs-dashboard/events` |
| Tracker | `OhsDashboard.pages.tracker` | `/ohs-dashboard/tracker` |
| Admin Scheduler | `OhsDashboard.pages.admin` | `/ohs-dashboard/admin` |
| Check-in publik | `OhsDashboard.checkin.index` | `/ohs-dashboard/checkin?eventId=` |

Jika UI tetap 1 file SPA: satu view `OhsDashboard.pages.portal` berisi kelima section, asset di `public/ohs-dashboard/`.

`const API_BASE = '/ohs-dashboard/api';`

### 8.1 Shell

- Title: `OHS Roster, Leave & Event Portal`
- Topbar sticky, brand mark hijau `OHS`
- Nav 5 tombol: Overview | Leave & Integrated Calendar | Event Maker | Project & Issue Tracker | Admin Scheduler
- Font: Inter / system-ui
- Warna: `--green: #27851f`, `--green-dark: #166534`, background `#f5f8f5`, card putih radius 14px
- Max width konten ≈ 1550px

Cara tercepat: **port `public/index.html` + `public/checkin.html`** ke `resources/views/OhsDashboard/` dan `public/ohs-dashboard/`, ganti `API_BASE` ke `/ohs-dashboard/api`, baru pecah Blade per halaman belakangan.

`public/index.html` lebih lengkap daripada `index.html` root (sudah ada QR absensi). Pakai yang `public/`.

### 8.2 Pola UI yang sudah ada (harus ada)

- Filter Team / Site / Year
- KPI cards
- Section collapsible (overview)
- Table: header sort + row search per kolom
- Pagination tracker dashboard 10/halaman
- Modal create / edit / update progress / history / QR / minutes / attendance
- Employee combobox via search API + debounce
- Legend kalender: Leave, Event, Project, Issue, ACTING
- Check-in: header hijau gradient, cari nama, konfirmasi sukses/sudah absen

### 8.3 Kalender

Grid: kolom kiri = nama orang + meta (posisi • site) + chip YTD; kolom kanan = bar item per hari/minggu/bulan. Warna berbeda per category. Item acting punya badge ACTING.

---

## 9. Helper yang harus di-port (logika, bukan I/O sheet)

Implementasikan ulang di `App\Services\OhsDashboard\*`:

| Helper | Perilaku |
|---|---|
| `countWorkingDaysInclusive_` | skip Sat/Sun/holiday, inclusive |
| `startOfWeekSunday_` | Minggu 00:00 (definisi minggu portal) |
| `startOfWeekMonday_` | Senin 00:00 (hanya kunci HSE sync) |
| `formatISO_` / `parseISO_` | `YYYY-MM-DD` |
| `isDateRangeOverlap_` | inclusive |
| `isISODateInRange_` | |
| `deriveTrackerStatus_` | Closed / Overdue / On Going |
| `normalizePercentComplete_` | 0–100, 2 desimal |
| `validatePercentComplete_` | error jika kosong / di luar 0–100 |
| `normalizeTrackerType_` | hanya Project/Issue |
| `calculateTrackerAggregate_` | rata-rata + status parent |
| `distributeAssignmentToBackup_` | segmentasi ACTING |
| `buildCalendarColumns_` | WEEK/MONTH/YEAR |
| `getISOWeekNumber_` | ISO week |
| `findLeaveOverlaps_` | |
| `getPortalSchedulerDecision_` | hari + window 75 menit + last_key |
| `getOverdueReminderDecision_` | 08:00 + window 75 + last_key |
| `getHseSyncDecision_` | Senin 08:00 + window 75 + last_key |
| `normalizeScheduleDays_` | MON–SUN unique |
| `clampInteger_` | |
| `toBoolean_` | true/1/"TRUE"/"YES"/"YA" |

Enrich saat baca: nama/tim dari employee map jika snapshot kosong (`enrichLeave_`, `enrichEvent_`, `enrichTracker_`, `enrichTrackerSubTask_`).

---

## 10. Environment Laravel

```env
APP_TIMEZONE=Asia/Jakarta
APP_URL=https://your-domain

PORTAL_URL=https://your-domain/ohs-dashboard

HSE_API_KEY=
HSE_API_BASE=https://hseautomation.beraucoal.co.id
HSE_COMPANY_ID=5194

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME="OHS Portal Scheduler"
```

Scheduler OS:

```
* * * * * php /path/to/artisan schedule:run
```

---

## 11. Urutan implementasi yang aman

1. Schema Eloquent di `App\Models\OhsDashboard` + seeder `OhsDashboard\LeaveTypeSeeder` dan `HolidaySeeder` — **jangan migrate tanpa konfirmasi**. Jalankan hanya `--path=database/migrations/ohs_dashboard`.
2. Script import sekali dari Spreadsheet → tabel `ohs_*` (bukan migrate). Backup dulu; jangan hapus data sheet.
3. `GET /ohs-dashboard/api/init` + employee search.
4. Leave create + overlap.
5. Event CRUD + readiness.
6. Tracker create/edit/update + aggregate + logs.
7. Dashboard (working days + leaderboard 200 + tracker table).
8. Calendar + ACTING.
9. Check-in + attendance + minutes + action items.
10. Mail digest + overdue reminder + HSE sync.
11. Port HTML ke `resources/views/OhsDashboard/` dan `public/ohs-dashboard/`.
12. Checklist parity (bagian 12).

Tidak ada auth di versi asal. Jika Laravel menambah login, jangan sampai memblokir `/ohs-dashboard/api/events/checkin`, `/ohs-dashboard/api/events/checkin-info`, dan `/ohs-dashboard/checkin`.

---

## 12. Checklist parity (wajib lulus sebelum go-live)

- [ ] File hanya di folder `OhsDashboard` (controller, view, route, model, service)
- [ ] URL web `/ohs-dashboard`, API `/ohs-dashboard/api`, tabel prefix `ohs_`
- [ ] ID prefix dan panjang hex sama
- [ ] Status tracker hanya dihitung, bukan input
- [ ] Parent % = rata-rata sub task; tanpa sub task update langsung
- [ ] Sub task existing tidak bisa dihapus lewat Edit
- [ ] Edit tidak menimpa progress existing
- [ ] Update progress selalu insert log, tidak update log lama
- [ ] Leave overlap diri + backup; backup ≠ emp
- [ ] Working days exclude Sabtu, Minggu, holidays
- [ ] Leaderboard max 200, email top 10, upcoming leave dashboard max 30
- [ ] Minggu Minggu–Sabtu
- [ ] Calendar default hanya orang yang punya item
- [ ] ACTING memindah event/project/issue ke backup selama leave
- [ ] Event create menolak tanggal < today; edit boleh
- [ ] Absensi unik per (event, emp); rescan bukan error
- [ ] Digest: enabled + hari + window 75 menit + last_key
- [ ] Overdue reminder: H-3 s/d H-0, On Going, penerima hardcoded, skip email jika 0 item
- [ ] HSE sync Senin 08:00, replace employees, hanya AKTIF, dedupe NPK
- [ ] JSON error `{ "error": "..." }`
- [ ] Payload API PascalCase kompatibel frontend lama
- [ ] Timezone Asia/Jakarta di semua tanggal

---

## 13. Import data dari Google Sheet

Sheet yang harus diekspor:

| Sheet | Tabel Laravel |
|---|---|
| Employees | ohs_employees |
| LeaveTypes | ohs_leave_types |
| LeaveRequests | ohs_leave_requests |
| Holidays | ohs_holidays |
| Events | ohs_events |
| EventAttendance | ohs_event_attendances |
| EventMinutes | ohs_event_minutes |
| EventActionItems | ohs_event_action_items |
| ProjectIssueTracker | ohs_project_issue_trackers |
| ProjectIssueSubTasks | ohs_project_issue_sub_tasks |
| ProjectIssueUpdateLog | ohs_project_issue_update_logs |
| ProjectIssueSubTaskUpdateLog | ohs_project_issue_sub_task_update_logs |
| EmailSchedulerSettings | ohs_email_scheduler_settings (1 row) |

Normalisasi saat import:

- Header site: `SiteDedicated` / `Site_Dedicated` / `Site Dedicated`
- Tanggal serial Google / Date object → `YYYY-MM-DD`
- Datetime → `Y-m-d H:i:s` WIB
- Boolean settings: TRUE/FALSE/1/0/yes/no
- Skip baris tanpa key wajib (EmpId+EmpName, EventName+EventDate, TrackerId+nama, dll.)

Jangan truncate produksi tanpa konfirmasi. Import awal ke database kosong / staging.

---

## 14. Referensi file sumber di repo ini

| File | Isi |
|---|---|
| `appscrip.js` | Seluruh business logic (sumber utama) |
| `lib/api-router.js` | Daftar route REST yang sudah dipakai Vercel |
| `lib/config.js` | Nama sheet + header |
| `api/cron/email.js` | Urutan cron: digest → overdue → HSE |
| `public/index.html` | UI portal lengkap (termasuk QR) |
| `public/checkin.html` | UI absensi publik |
| `vercel.json` | Cron `0 1 * * *` |

Jika ragu perilaku, **ikut `appscrip.js`**, bukan tebakan.

---

*Dokumen ini dibuat sebagai panduan implementasi Laravel 1:1 terhadap OHS Portal yang berjalan di Apps Script / Vercel + Google Sheets.*
