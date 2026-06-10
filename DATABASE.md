# SiCuti — Database Schema Documentation

## Overview

The SiCuti database is built on PostgreSQL through Supabase. The schema is designed to be compact yet flexible, supporting core school operations including attendance, leave management, student/teacher records, calendar events, and lesson plans.

**Total Tables**: 7 core tables  
**Security**: Row Level Security (RLS) policies on all sensitive tables  
**Performance**: 11 indexes + 3 unique constraints

---

## Core Tables

### 1. `profiles` — Teachers and Staff

Stores information about teachers and administrators.

| Column       | Type        | Notes                                                         |
| ------------ | ----------- | ------------------------------------------------------------- |
| `id`         | uuid (PK)   | Linked to auth.users                                          |
| `full_name`  | text        | Teacher's full name                                           |
| `email`      | text        | Email address                                                 |
| `role`       | enum        | 'admin' or 'guru'                                             |
| `jabatan`    | text        | Job title (e.g., 'Kepala Sekolah', 'Guru Kelas')              |
| `nip`        | text        | Employee ID (optional)                                        |
| `no_hp`      | text        | Phone number (optional)                                       |
| `qr_code`    | text UNIQUE | QR code for attendance (format: GRU-XXXXXXXX or ADM-XXXXXXXX) |
| `kuota_cuti` | int         | Annual leave quota (default: 12)                              |
| `created_at` | timestamp   | Account creation time                                         |
| `updated_at` | timestamp   | Last update time                                              |

**Admin Detection**:

```javascript
profile?.role === "admin" || profile?.jabatan === "Kepala Sekolah";
```

**Indexes**:

- PK on `id`
- UNIQUE on `email`, `qr_code`
- Index on `role`

---

### 2. `classes` — School Classes

Represents school classes organized by academic year.

| Column         | Type        | Notes                                                                    |
| -------------- | ----------- | ------------------------------------------------------------------------ |
| `id`           | uuid (PK)   | Class unique identifier                                                  |
| `nama_kelas`   | text        | Class name (e.g., "TK B Disiplin")                                       |
| `tahun_ajaran` | text        | Academic year (format: "2025/2026")                                      |
| `guru_id`      | uuid (FK)   | Teacher assigned to class (links to profiles)                            |
| `slug`         | text UNIQUE | URL-friendly slug for public RPPM pages (auto-generated from nama_kelas) |
| `created_at`   | timestamp   | Creation time                                                            |
| `updated_at`   | timestamp   | Last update time                                                         |

**Slug Generation Example**:

- Input: "TK B Disiplin" → Slug: "tk-b-disiplin"

**Indexes**:

- PK on `id`
- UNIQUE on `slug`
- Index on `tahun_ajaran`
- Foreign key on `guru_id` → profiles

---

### 3. `students` — Student Roster

Stores student records linked to classes.

| Column           | Type        | Notes                                         |
| ---------------- | ----------- | --------------------------------------------- |
| `id`             | uuid (PK)   | Student unique identifier                     |
| `nama`           | text        | Student's full name                           |
| `class_id`       | uuid (FK)   | Class assignment (links to classes)           |
| `qr_code`        | text UNIQUE | QR code for attendance (format: MRD-XXXXXXXX) |
| `tanggal_lahir`  | date        | Date of birth                                 |
| `nama_orang_tua` | text        | Parent/guardian name                          |
| `no_hp_ortu`     | text        | Parent phone number                           |
| `created_at`     | timestamp   | Record creation time                          |
| `updated_at`     | timestamp   | Last update time                              |

**Indexes**:

- PK on `id`
- UNIQUE on `qr_code`
- Index on `class_id`

---

### 4. `attendance_students` — Student Attendance Records

Records daily attendance events for students.

| Column        | Type      | Notes                                                                                      |
| ------------- | --------- | ------------------------------------------------------------------------------------------ |
| `id`          | uuid (PK) | Record unique identifier                                                                   |
| `student_id`  | uuid (FK) | Student (links to students)                                                                |
| `tanggal`     | date      | Attendance date                                                                            |
| `status`      | enum      | 'hadir' (present), 'terlambat' (late), 'sakit' (sick), 'izin' (permitted), 'alfa' (absent) |
| `recorded_at` | timestamp | When attendance was recorded                                                               |
| `recorded_by` | uuid (FK) | User who recorded it (links to profiles)                                                   |

**Indexes**:

- PK on `id`
- Index on `student_id`, `tanggal`
- Composite index on `student_id`, `tanggal` for fast lookups

---

### 5. `attendance_guru` — Teacher Attendance Records

Records check-in and check-out events for teachers.

| Column        | Type      | Notes                                                                                      |
| ------------- | --------- | ------------------------------------------------------------------------------------------ |
| `id`          | uuid (PK) | Record unique identifier                                                                   |
| `guru_id`     | uuid (FK) | Teacher (links to profiles)                                                                |
| `tanggal`     | date      | Attendance date                                                                            |
| `jam_masuk`   | timestamp | Check-in time (or NULL if absent)                                                          |
| `jam_keluar`  | timestamp | Check-out time (or NULL)                                                                   |
| `status`      | enum      | 'hadir' (present), 'terlambat' (late), 'sakit' (sick), 'izin' (permitted), 'alfa' (absent) |
| `recorded_at` | timestamp | When recorded                                                                              |

**Indexes**:

- PK on `id`
- Index on `guru_id`, `tanggal`

---

### 6. `leave_requests` — Teacher Leave Applications

Tracks leave requests submitted by teachers with approval workflow.

| Column             | Type      | Notes                                                               |
| ------------------ | --------- | ------------------------------------------------------------------- |
| `id`               | uuid (PK) | Request unique identifier                                           |
| `guru_id`          | uuid (FK) | Requesting teacher (links to profiles)                              |
| `tipe_cuti`        | enum      | 'annual' (tahunan), 'sick' (sakit), 'unpaid' (tanpa gaji)           |
| `tanggal_mulai`    | date      | Leave start date                                                    |
| `tanggal_selesai`  | date      | Leave end date                                                      |
| `alasan`           | text      | Reason for leave                                                    |
| `status`           | enum      | 'pending' (submitted), 'approved' (disetujui), 'rejected' (ditolak) |
| `reviewed_by`      | uuid (FK) | Admin who reviewed (links to profiles, or NULL if pending)          |
| `tgl_review`       | timestamp | When reviewed                                                       |
| `catatan_reviewer` | text      | Admin notes (optional)                                              |
| `created_at`       | timestamp | Submission time                                                     |
| `updated_at`       | timestamp | Last update time                                                    |

**Indexes**:

- PK on `id`
- Index on `guru_id`, `status`
- Index on `tanggal_mulai`, `tanggal_selesai`

---

### 7. `school_events` — Calendar Events

Represents school events and holidays.

| Column            | Type      | Notes                                                           |
| ----------------- | --------- | --------------------------------------------------------------- |
| `id`              | uuid (PK) | Event unique identifier                                         |
| `judul`           | text      | Event title (e.g., "Hari Raya Aidilfitri")                      |
| `tanggal`         | date      | Event date (or start date if multi-day)                         |
| `tanggal_selesai` | date      | End date (or NULL if single day)                                |
| `deskripsi`       | text      | Event description (optional)                                    |
| `lokasi`          | text      | Event location (optional)                                       |
| `kategori`        | enum      | 'holiday' (libur nasional), 'event' (acara sekolah), 'reminder' |
| `is_public`       | boolean   | Visible to parents on public calendar                           |
| `created_at`      | timestamp | Creation time                                                   |
| `updated_at`      | timestamp | Last update time                                                |

**Indexes**:

- PK on `id`
- Index on `tanggal`, `is_public`

---

### 8. `weekly_plans` — RPPM (Weekly Lesson Plans)

Stores weekly lesson plans per class per week with detailed day-by-day activities.

| Column         | Type      | Notes                                                                                   |
| -------------- | --------- | --------------------------------------------------------------------------------------- |
| `id`           | uuid (PK) | Plan unique identifier                                                                  |
| `class_id`     | uuid (FK) | Class (links to classes)                                                                |
| `tahun_ajaran` | text      | Academic year (e.g., "2025/2026")                                                       |
| `semester`     | int       | Semester (1 or 2)                                                                       |
| `minggu`       | int       | Week number (1-52)                                                                      |
| `tema`         | text      | Weekly theme                                                                            |
| `sub_tema`     | text      | Sub-theme                                                                               |
| `hari_data`    | jsonb     | Day-by-day activities (JSON object with keys: senin, selasa, rabu, kamis, jumat, sabtu) |
| `surah_pendek` | text      | Quranic verses for PAUD (optional)                                                      |
| `created_at`   | timestamp | Creation time                                                                           |
| `updated_at`   | timestamp | Last update time                                                                        |
| `created_by`   | uuid (FK) | Teacher who created (links to profiles)                                                 |

**JSONB Structure** (`hari_data`):

```json
{
  "senin": {
    "kegiatan_pagi": "Bernyanyi & Ice Breaking",
    "tema_pembelajaran": "Mengenal Bentuk",
    "kegiatan_main": "Bermain dengan balok",
    "snack": "Susu & Kue",
    "kegiatan_penutup": "Doa & Salam"
  },
  "selasa": { ... },
  ...
}
```

**Indexes**:

- PK on `id`
- UNIQUE on `(class_id, tahun_ajaran, semester, minggu)`
- Index on `class_id`, `tahun_ajaran`
- Foreign key on `created_by` → profiles

---

## Relationships & Foreign Keys

```
profiles
  ├─ students.class_id → classes.guru_id (indirectly through class assignment)
  ├─ classes.guru_id → profiles.id
  ├─ attendance_students.recorded_by → profiles.id
  ├─ attendance_guru.guru_id → profiles.id
  ├─ leave_requests.guru_id → profiles.id
  ├─ leave_requests.reviewed_by → profiles.id
  └─ weekly_plans.created_by → profiles.id

classes
  ├─ students.class_id → classes.id
  └─ weekly_plans.class_id → classes.id
```

---

## Row Level Security (RLS) Policies

### `profiles` table

- **Public Select**: Anon users can read QR codes (public endpoint)
- **Own Select**: Authenticated users can read their own profile
- **Admin Select**: Admins can read all profiles
- **Admin Insert/Update/Delete**: Admins only

### `students` table

- **Own Class Read**: Teachers see students from their own class
- **Admin Full Access**: Admins can read/write all students
- **Public Read**: Anon can read for public RPPM pages

### `attendance_students` & `attendance_guru` tables

- **Own Data Read**: Users can read own attendance
- **Own Class Teachers**: Teachers can read attendance for their own class
- **Admin Full Access**: Admins full access
- **Public RPC**: Anon can call RPC functions to record attendance

### `leave_requests` table

- **Own Requests**: Teachers see own requests
- **Admin Full Access**: Admins see and approve all requests

### `school_events` & `weekly_plans` tables

- **Public Read**: Anon users can read is_public=true events and RPPM data

---

## Performance Optimizations

### Indexes

- Composite index on `(student_id, tanggal)` for fast daily lookups
- Composite index on `(guru_id, tanggal)` for teacher attendance
- Composite index on `(class_id, tahun_ajaran, semester, minggu)` for RPPM uniqueness
- Indexes on FK columns for join performance
- UNIQUE constraints on `qr_code` for fast QR lookups

### Queries

- **Attendance Scanning**: Uses RPC function `record_student_attendance()` — 1 round-trip instead of 3 queries
- **Profile Fetching**: Fetched once per session via React Context
- **Report Generation**: Attendance maps pre-indexed for O(1) lookups vs O(n²) loops
- **Holiday Caching**: In-memory cache for holidays API by year

---

## QR Code Format

| User Type     | Prefix       | Example               | Generated By                       |
| ------------- | ------------ | --------------------- | ---------------------------------- |
| Teacher/Admin | GRU- or ADM- | GRU-a1b2c3d4-e5f6-... | API route (crypto.randomUUID)      |
| Student       | MRD-         | MRD-f7g8h9i0-j1k2-... | Dashboard form (crypto.randomUUID) |

QR codes use cryptographically secure random generation to prevent collisions.

---

## Data Access Examples

### Get student attendance for a day

```sql
SELECT s.nama, a.status, a.recorded_at
FROM students s
LEFT JOIN attendance_students a ON s.id = a.student_id AND a.tanggal = '2025-06-10'
WHERE s.class_id = 'class-uuid'
ORDER BY s.nama;
```

### Approve leave request

```sql
UPDATE leave_requests
SET status = 'approved', reviewed_by = 'admin-uuid', tgl_review = NOW()
WHERE id = 'request-uuid';
```

### Get weekly plan for class

```sql
SELECT * FROM weekly_plans
WHERE class_id = 'class-uuid'
  AND tahun_ajaran = '2025/2026'
  AND semester = 2
  AND minggu = 16;
```

---

## Migration Notes

Database schema is managed manually via Supabase SQL Editor. No CLI migrations are used.

All schema changes must be:

1. Tested on staging environment first
2. Documented in commit message
3. Validated for backward compatibility

---

## Future Enhancements

- Attendance corrections table (admin edit/delete history)
- Notification log table (for future messaging integrations)
- Analytics table (pre-computed reports for performance)
- Student health records (medical conditions, allergies)
- Teacher competency tracking
