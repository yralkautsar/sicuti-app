# SiCuti — System Architecture Documentation

## 1. Introduction

SiCuti is a digital attendance and operations management system for schools. The architecture prioritizes **simplicity**, **reliability**, and **maintainability**. The system serves two primary user groups:

- **School Staff** (Admin & Teachers): Full dashboard access
- **Parents**: Public read-only pages for calendar and lesson plans

The design principle is straightforward: keep complexity low while remaining scalable.

---

## 2. High-Level Architecture

### Three-Layer Model

```
┌─────────────────────────────────────────────┐
│         Browser (User Interface)            │
│  - Dashboard pages (admin/teacher)          │
│  - Public pages (calendar, RPPM, scanner)   │
└────────────────┬────────────────────────────┘
                 │ HTTP/HTTPS
                 ↓
┌─────────────────────────────────────────────┐
│       Next.js Application (Server)          │
│  - App Router (route groups & dynamic)      │
│  - API Routes (/api/create-user)            │
│  - React components ('use client')          │
│  - Server-side auth guard (layout.js)       │
└────────────────┬────────────────────────────┘
                 │ Supabase SDK
                 ↓
┌─────────────────────────────────────────────┐
│    Supabase (Backend as a Service)          │
│  - PostgreSQL database                      │
│  - Auth (email/password)                    │
│  - RLS (Row Level Security)                 │
│  - Storage (for images, files)              │
│  - RPC functions (stored procedures)        │
└─────────────────────────────────────────────┘
```

### Request Flow

```
1. User opens browser → Next.js app loads
2. Auth guard checks if user is logged in
3. If not logged in → redirect to /login
4. If logged in → fetch user profile from Supabase
5. Profile provided to all dashboard pages via React Context
6. User interacts with page → Supabase query executed
7. Results returned and displayed
```

---

## 3. Core Layers

### 3.1 Presentation Layer (Frontend)

**Technology**: React + Next.js 15+ (App Router) + Tailwind CSS

**Responsibilities**:

- Render user interface (dashboard, forms, reports)
- Handle user interactions (form submission, button clicks)
- Display data fetched from backend
- Client-side validation
- Responsive design for desktop and mobile

**Key Features**:

- Custom components (no UI library)
- Inline styles for dynamic values (theme colors)
- Tailwind CSS for layout utilities
- No TypeScript — pure JavaScript

**Directory**: `app/` and `components/`

---

### 3.2 Application Layer (Next.js)

**Technology**: Next.js 15+ App Router

**Responsibilities**:

- Route handling (URL → page mapping)
- Server-side auth guard
- Profile fetching on first dashboard load
- API endpoints for sensitive operations
- Environment variable management
- Font loading & global styles

**Key Components**:

#### Auth Guard (`app/dashboard/layout.js`)

```javascript
"use client";
// Fetches user session and profile once
// Provides profile via ProfileContext to all dashboard pages
// Redirects to login if not authenticated
```

#### API Routes (`app/api/create-user/route.js`)

- Server-side only (uses SUPABASE_SERVICE_ROLE_KEY)
- Creates Supabase auth users + profiles
- Uses cryptographically secure QR generation
- Includes rollback on failure

#### Public Pages

- `app/scan/` — QR scanner (no auth required)
- `app/kalendar/` — Public calendar for parents
- `app/rppm/[slug]/` — Public lesson plans for parents

---

### 3.3 Backend Layer (Supabase)

**Technology**: PostgreSQL + Supabase platform

**Responsibilities**:

- Database storage (8 core tables)
- Authentication (email/password with Supabase Auth)
- Authorization (Row Level Security policies)
- API for data access (via Supabase SDK)
- Real-time subscriptions (if needed)
- RPC functions for complex operations

**Key Components**:

#### Authentication

- Supabase Auth handles email/password
- Session stored in browser (JWT token)
- Profile fetched on dashboard load
- No re-fetching on individual pages

#### Row Level Security (RLS)

- All sensitive tables have RLS enabled
- Policies restrict data by user role
- Admins see all data
- Teachers see own data + own class
- Parents see public data only

#### RPC Functions

```sql
record_student_attendance(p_qr, p_scanned_at)
record_guru_attendance(p_qr, p_scanned_at)
```

- Atomic operations (1 round-trip vs 3 queries)
- Verify QR code, create/update attendance in one call
- Used by public scanner page

---

## 4. Feature Architecture

### 4.1 Attendance Scanning

```
QR Camera → JavaScript Decoder → Extract QR Code
     ↓
Validate Format (MRD-xxx for student, GRU-xxx for teacher)
     ↓
Call RPC: record_student_attendance(qr_code, timestamp)
     ↓
Supabase RPC:
  1. Find student/teacher by QR code
  2. Check attendance not already recorded today
  3. Insert attendance record
  4. Return success/error
     ↓
Display confirmation message
```

**Performance**: 1 Supabase round-trip (RPC call) instead of 3 sequential queries

**Files**:

- Frontend: `app/scan/page.js` (public)
- Backend: Supabase RPC functions
- Security: Anon user can only call RPC, cannot view other records

---

### 4.2 Dashboard Authentication & Profile Fetching

```
User opens /dashboard → auth guard in layout.js
     ↓
Check if session exists (JWT token from browser storage)
     ↓
If no session:
  - Redirect to /login
     ↓
If session exists:
  - Fetch user profile from profiles table (once only)
  - Store in ProfileContext
  - Provide to all dashboard pages via useProfile() hook
     ↓
Pages render with profile available
```

**Performance**: Profile fetched ONCE per session (not refetched on every page)

**State Management**: React Context (`lib/ProfileContext.js`)

**Files**:

- Guard: `app/dashboard/layout.js`
- Context: `lib/ProfileContext.js`
- Hook: `useProfile()` — used in all dashboard pages

---

### 4.3 Attendance Management

#### Daily Manual Entry

```
Teacher/Admin opens Kelas page
     ↓
View list of students with today's attendance status
     ↓
Click "Izin", "Sakit", or "Alpha" for each student
     ↓
Update attendance_students table via Supabase
     ↓
Refresh display
```

#### Bulk Import (CSV)

```
Admin opens Murid page → CSV Import tab
     ↓
Select CSV file (expected columns: nama, tanggal_lahir, nama_orang_tua, no_hp_ortu)
     ↓
JavaScript reads file → parse rows
     ↓
For each student:
  - Generate QR code (crypto.randomUUID)
  - Insert into students table
     ↓
Confirm success or show errors
```

**Security**: Bulk insert includes validation + error handling

**Files**: `app/dashboard/murid/page.js` (CSV import + manual add)

---

### 4.4 Leave Request Workflow

```
Teacher submits leave request:
     ↓
Supabase inserts row into leave_requests table (status: pending)
     ↓
Admin dashboard shows pending requests (cuti page)
     ↓
Admin approves or rejects:
  - Update leave_requests status
  - Record reviewer ID + timestamp
     ↓
Teacher sees updated status on own Profil page
  - Shows remaining kuota_cuti
```

**Files**:

- Request: `app/dashboard/cuti/page.js`
- Approval: `app/dashboard/cuti/page.js` (admin view)
- Summary: `app/dashboard/profil/page.js`

---

### 4.5 Weekly Lesson Plans (RPPM)

#### Create/Edit RPPM

```
Teacher/Admin opens Weekly Plan page
     ↓
Form displays:
  - Class dropdown
  - Academic year (read-only: 2025/2026)
  - Semester dropdown
  - Week number (1-52)
  - Theme + Sub-theme text
  - Day-by-day activities (JSONB structure)
  - Surah Pendek field
     ↓
Save to weekly_plans table
```

#### Public View

```
Parent/Public opens /rppm/[slug]?tahun=2025%2F2026&semester=2&minggu=16
     ↓
No auth required (public RLS policy)
     ↓
Fetch weekly plan by:
  - classes.slug = [slug]
  - tahun_ajaran, semester, minggu from query params
     ↓
Display timeline layout:
  - Theme title
  - Day-by-day activities in cards
  - Share to WhatsApp button
```

**JSONB Storage**: Day-by-day activities stored as JSON in `hari_data` column

**Files**:

- Dashboard: `app/dashboard/weekly-plan/`
- Public: `app/rppm/[slug]/page.js`
- Form: `app/dashboard/weekly-plan/WeeklyPlanForm.js`

---

### 4.6 Reports & Export

#### Daily Report

```
Admin opens Laporan page → Daily tab
     ↓
Select date → fetch attendance_students records for that date
     ↓
Display:
  - Total students present / late / sick / permitted / absent
  - List per student with status
  - Summary statistics
     ↓
Export to CSV button
```

#### Monthly Report

```
Select month → fetch all attendance_students for that month
     ↓
Group by student → calculate:
  - Days present
  - Days late
  - Days sick
  - Days permitted
  - Days absent
     ↓
Display summary table
     ↓
Export to CSV button
```

**Performance**: Pre-index `(student_id, tanggal)` for fast lookups

**Files**: `app/dashboard/laporan/page.js`

---

### 4.7 Calendar Management

#### School Admin Creates Event

```
Admin opens Kalendar page
     ↓
Fill form: judul, tanggal, deskripsi, kategori, is_public
     ↓
Save to school_events table
```

#### Public View

```
Parent opens /kalendar (no auth required)
     ↓
Fetch school_events where is_public = true
     ↓
Display calendar view with events
     ↓
Share to WhatsApp button
```

**Files**:

- Dashboard: `app/dashboard/kalendar/page.js`
- Public: `app/kalendar/page.js`

---

## 5. State Management

### Hierarchy (Simplest First)

#### 1. Local State (useState)

Used within a single component for UI state.

```javascript
const [isLoading, setIsLoading] = useState(false);
const [selectedStudent, setSelectedStudent] = useState(null);
```

#### 2. Lifted State

Shared between parent and child components.

```javascript
// Parent holds state, passes as props to children
const [students, setStudents] = useState([]);
return <StudentList students={students} />;
```

#### 3. ProfileContext (Global)

Authentication state shared across all dashboard pages.

```javascript
// Provided by app/dashboard/layout.js
const { profile, isAdmin } = useProfile();
```

### Why No Global State Library?

- Current scope (small school system) doesn't need Redux/Zustand
- ProfileContext is sufficient for auth state
- Keep bundle size small
- Reduce complexity for maintenance

---

## 6. Data Flow Examples

### Example 1: QR Scanning (Public)

```
1. Scanner page opens: app/scan/page.js
2. Camera detects QR code
3. JavaScript decodes QR value (e.g., "MRD-a1b2c3d4-...")
4. Call RPC via Supabase SDK:
   const { data, error } = await supabase.rpc('record_student_attendance', {
     p_qr: 'MRD-...',
     p_scanned_at: new Date().toISOString()
   })
5. Supabase executes stored procedure:
   - SELECT * FROM students WHERE qr_code = p_qr
   - SELECT * FROM attendance_students WHERE student_id = ? AND tanggal = TODAY
   - If not found today, INSERT new attendance record
6. Return {success: true} or error
7. Display "Attendance recorded" confirmation
```

---

### Example 2: Leave Request (Auth)

```
1. Teacher opens /dashboard/cuti (auth required)
2. Profile already loaded via layout.js
3. Form submit → handleSubmit()
4. Insert into leave_requests:
   const { error } = await supabase.from('leave_requests').insert({
     guru_id: profile.id,
     tipe_cuti: 'annual',
     tanggal_mulai: '2025-07-10',
     tanggal_selesai: '2025-07-12',
     alasan: 'Family vacation',
     status: 'pending'
   })
5. If success, refresh list or show confirmation
6. Admin sees request in /dashboard/cuti with approve/reject buttons
7. Admin clicks approve:
   await supabase.from('leave_requests').update({
     status: 'approved',
     reviewed_by: admin_profile.id,
     tgl_review: new Date()
   }).eq('id', request_id)
8. Teacher sees updated status on /dashboard/profil
```

---

### Example 3: RPPM Public View

```
1. Parent navigates to /rppm/tk-b-disiplin?tahun=2025%2F2026&semester=2&minggu=16
2. No auth required (RLS policy allows public read)
3. JavaScript fetches weekly plan:
   const { data } = await supabase
     .from('weekly_plans')
     .select('*, classes!inner(slug)')
     .eq('classes.slug', 'tk-b-disiplin')
     .eq('tahun_ajaran', '2025/2026')
     .eq('semester', 2)
     .eq('minggu', 16)
     .single()
4. Parse hari_data (JSONB) to extract day-by-day activities
5. Render timeline layout with activities
6. Share to WhatsApp button generates URL with query params
7. Parent shares link to WhatsApp group
```

---

## 7. Security Model

### Authentication

- **Method**: Supabase Auth (email/password)
- **Session**: JWT token stored in browser
- **Guard**: Check session exists before rendering dashboard pages
- **Logout**: Clear session → redirect to login

### Authorization (Role-Based)

- **Admin**: Access all data, manage users/classes/reports
- **Guru**: Access own class students, own leave requests, own attendance
- **Public**: Access public calendar and RPPM pages only

### Data Access Control

- **Row Level Security (RLS)**: PostgreSQL policies enforce access at database level
- **Service Role Key**: Used only server-side in API routes (never exposed to client)
- **Anon Key**: Limited to public read operations via RLS policies

### QR Code Security

- **Generation**: Cryptographically secure `crypto.randomUUID()` (not Math.random)
- **Format**: Prefix + UUID for collision prevention
- **Uniqueness**: UNIQUE constraint on qr_code column

---

## 8. Performance Optimizations

### Database

- **Indexes**: 11 strategic indexes on FK and frequently queried columns
- **Composite Indexes**: (student_id, tanggal) for daily attendance lookups
- **RPC Functions**: Atomic operations reduce round-trips
- **RLS Policies**: Database-level filtering (not application-level)

### Application

- **Profile Caching**: Fetched once per session via Context
- **React Context**: Avoids prop drilling
- **Debounced Updates**: Real-time subscriptions use 1s debounce
- **Map Pre-indexing**: Attendance reports use O(1) map lookups vs O(n²) loops

### Deployment

- **Edge Functions**: Vercel edge network for fast content delivery
- **Image Optimization**: Static assets (logo) served from CDN
- **Bundle Size**: No unnecessary libraries (Tailwind + custom components)

---

## 9. Error Handling

### Client-Side

```javascript
try {
  const { data, error } = await supabase.from("table").select();
  if (error) {
    alert(error.message);
    console.error(error);
  } else {
    // use data
  }
} catch (err) {
  alert("Server error");
  console.error(err);
}
```

### Server-Side (API Routes)

```javascript
try {
  // create user, insert profile
} catch (err) {
  // Rollback: delete created auth user if profile insert fails
  await supabaseAdmin.auth.admin.deleteUser(userId);
  return NextResponse.json({ error: err.message }, { status: 400 });
}
```

---

## 10. Testing Strategy

### Manual Testing (Current)

- Test on staging environment before production
- Test accounts: Admin + Teacher roles
- Test flows: Login → Dashboard → Create/Edit/Delete → Reports
- Test public pages: /rppm, /kalendar, /scan

### What to Verify Before Production

1. Auth guard prevents unauthenticated access to dashboard
2. Role-based access works (admin sees all, teacher sees own only)
3. Public pages load without auth
4. QR scanning records attendance correctly
5. CSV import creates student records with unique QR codes
6. Leave request workflow (submit → approve → update)
7. Reports generate correctly and export to CSV

### Future Automation

- End-to-end tests (Playwright/Cypress)
- Unit tests for utility functions
- Integration tests for API routes

---

## 11. Deployment Workflow

```
Local Development
  ↓
  git checkout -b feat/new-feature develop
  ↓
Commit & push to feature branch
  ↓
Create PR → review
  ↓
Merge to develop branch
  ↓
Vercel auto-builds staging environment (sicuti-staging.vercel.app)
  ↓
Test on staging
  ↓
If approved, merge develop → master
  ↓
Vercel auto-builds production (sicuti-app.vercel.app)
  ↓
Monitor production
```

### Environment Variables

| Environment | DB                  | Deployment                |
| ----------- | ------------------- | ------------------------- |
| Local       | Staging Supabase    | localhost:3000            |
| Staging     | Staging Supabase    | sicuti-staging.vercel.app |
| Production  | Production Supabase | sicuti-app.vercel.app     |

---

## 12. Scaling Considerations

### Current Scale

- ~50-100 students per class
- ~20 teachers
- 1-2 admin users
- Simple operations (no real-time collaboration)

### If Growing

- Implement attendance correction workflow
- Add notification system (email/SMS)
- Expand reporting (PDF export, analytics dashboards)
- Add teacher scheduling module
- Consider server components for complex queries

### No Changes Needed For

- ~10x current user base (database is solid)
- 10 years of historical data (indexes scale well)
- Mobile-first public pages (already responsive)

---

## 13. Key Design Decisions

| Decision              | Why                                                  |
| --------------------- | ---------------------------------------------------- |
| No TypeScript         | CLAUDE.md explicit — simpler setup, faster iteration |
| React Context         | Small scale, no external state library needed        |
| Tailwind CSS          | Low config, fast styling, standard approach          |
| Custom Components     | Simple system, no need for UI library bloat          |
| RLS for Authorization | Database-level security, not app-level (more secure) |
| RPC for Scanning      | Atomic operation, single round-trip (better UX)      |
| crypto.randomUUID     | Cryptographically secure QR generation               |
| Supabase Auth         | Free tier, built-in JWT, scales for free             |
| No Server Components  | Current architecture works, pages are 'use client'   |

---

## 14. Future Architecture Changes

### If adding Server Components

- Use for data-fetching pages (non-interactive)
- Keep dashboard as 'use client' for interactivity
- Separate `(auth)` route group

### If adding Notifications

- Implement notification table + queue
- Use webhook or scheduled job to send emails/SMS
- Store notification history for auditing

### If adding Analytics

- Create analytics table for pre-computed metrics
- Implement dashboard with charts (Chart.js / Recharts)
- Schedule nightly aggregation job

### If adding Real-Time

- Use Supabase Realtime subscriptions on attendance table
- Implement conflict resolution for simultaneous updates
- Use WebSocket for live dashboard updates

---

## 15. Architecture Diagram

```
┌─ Deployment Layer ──────────────────────────────────────────┐
│                                                              │
│  Vercel Edge Network                                         │
│  ├─ Production: sicuti-app.vercel.app                        │
│  └─ Staging: sicuti-staging.vercel.app                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌─ Application Layer ─────────────────────────────────────────┐
│                                                              │
│  Next.js 15+ (Node.js Runtime)                               │
│  ├─ App Router (pages + layouts)                             │
│  ├─ API Routes (/api/create-user)                            │
│  ├─ Client Components (React 'use client')                   │
│  ├─ Middleware (auth guard)                                  │
│  └─ Static Assets (fonts, images)                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌─ Frontend UI Layer ─────────────────────────────────────────┐
│                                                              │
│  React Components + Tailwind CSS                             │
│  ├─ Dashboard Pages (admin/teacher auth)                     │
│  ├─ Public Pages (calendar, RPPM, scanner)                   │
│  ├─ Forms (create/edit/delete)                               │
│  └─ Reports (CSV export)                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌─ Backend Layer ─────────────────────────────────────────────┐
│                                                              │
│  Supabase (PostgreSQL + Auth + RLS)                          │
│  ├─ Database                                                 │
│  │  ├─ profiles (teachers/admin)                             │
│  │  ├─ classes (school classes)                              │
│  │  ├─ students (student roster)                             │
│  │  ├─ attendance_students (daily records)                    │
│  │  ├─ attendance_guru (teacher attendance)                   │
│  │  ├─ leave_requests (leave workflow)                        │
│  │  ├─ school_events (calendar)                              │
│  │  └─ weekly_plans (RPPM)                                    │
│  ├─ Auth (email/password + JWT)                              │
│  ├─ RLS Policies (row-level security)                        │
│  └─ RPC Functions (stored procedures)                        │
│     ├─ record_student_attendance()                           │
│     └─ record_guru_attendance()                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

This architecture documentation is up-to-date as of v1.0.0 (June 2026) and reflects all live features including attendance scanning, leave management, lesson plans (RPPM), and public calendar/RPPM pages.
