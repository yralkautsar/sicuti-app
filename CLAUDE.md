# CLAUDE.md — SiCuti

---

## 1. Project Overview

- Name         : SiCuti
- Description  : Web-based digital attendance system for TK Karakter Mutiara Bunda Bali
- Goal         : Replace manual paper attendance with QR-based digital system. Manage student & teacher attendance, teacher leave requests, weekly lesson plans (RPPM), and school calendar — all in one platform.
- Target Users : Admin/Principal (full access), Teachers (own class only), Parents (public read-only via /kalendar and /rppm)
- Version      : v1.0.0
- Status       : Active development → Production

---

## 2. Tech Stack

- Language       : JavaScript (no TypeScript — do not add types)
- Framework      : Next.js 15+ (App Router)
- Styling        : Tailwind CSS + inline styles for dynamic values
- UI Library     : None — custom components only
- Database       : Supabase (PostgreSQL)
- Auth           : Supabase Auth
- State          : React Context (ProfileContext) — no external state library
- Data Fetching  : Supabase JS client directly — no SWR or React Query
- Package Manager: npm
- Deployment     : Vercel (2 projects: production + staging)

---

## 3. Commands

```bash
# Development
npm run dev        # Start dev server
npm run build      # Build for production
npm run start      # Start production build
npm run lint       # Run ESLint

# Package Management
npm install [pkg]  # Install new package — confirm first
```

> Always use npm. Never use yarn, pnpm, or bun.
> Database migrations are run manually via Supabase SQL Editor — not via CLI.

---

## 4. Project Structure

Architecture: Feature-based with App Router conventions

```
sicuti-app/
  app/
    api/
      create-user/       # Create Supabase auth user via service role key
    dashboard/
      layout.js          # Auth guard + profile fetch ONCE for all dashboard pages
      page.js            # Dashboard home
      kelas/             # Admin: class management + manual attendance
      guru/              # Admin: teacher CRUD + leave quota
      murid/             # Admin: student import CSV + manual add
      laporan/           # Admin: daily & monthly reports + CSV export
      cuti/              # Admin + Guru: leave requests
      qr-massal/         # Admin: bulk QR print PNG + PDF
      profil/            # Admin + Guru: attendance recap + leave summary
      kalendar/          # Admin + Guru: school calendar management
      weekly-plan/       # Admin + Guru: RPPM CRUD
        page.js          # List all RPPM
        WeeklyPlanForm.js # Shared form component (tambah + edit)
        tambah/          # Create new RPPM
        [id]/
          page.js        # View RPPM + Share to WA button
          edit/          # Edit RPPM
    kalendar/            # Public: school calendar for parents
    rppm/
      [slug]/            # Public: weekly lesson plan per class for parents
    scan/                # Public: QR scanner tablet page
    login/
    reset-password/
    panduan/
    globals.css
    layout.js            # Root layout — font loading via next/font/google
  components/
    Sidebar.js           # Dashboard navigation sidebar
  lib/
    supabase.js          # Supabase client — import as: import { supabase } from '@/lib/supabase'
    ProfileContext.js    # React Context — useProfile() hook for all dashboard pages
    theme.js             # Color and font constants
  public/
    logoborder.png       # School logo
```

File placement rules:
- New dashboard pages always under `app/dashboard/[feature]/page.js`
- Shared components always under `components/`
- Supabase queries always use `import { supabase } from '@/lib/supabase'` — never `createClient()`
- Theme values always from `lib/theme.js` — never hardcode colors outside of inline style dynamics
- Do not create new folders without confirmation

---

## 5. Naming Conventions

```
# Files and Folders
- Components    : PascalCase     e.g. WeeklyPlanForm.js, Sidebar.js
- Pages         : page.js        Next.js App Router convention
- Layouts       : layout.js
- Hooks/Utils   : camelCase      e.g. useProfile.js
- Folders       : kebab-case     e.g. weekly-plan/, qr-massal/
- Dynamic routes: [param]/       e.g. [id]/, [slug]/

# Inside Code
- Variables     : camelCase      e.g. activePlan, isAdmin
- Constants     : camelCase      e.g. purple, accent (theme values are camelCase in this project)
- Functions     : camelCase      e.g. loadPlans(), handleShare()
- DB tables     : snake_case     e.g. weekly_plans, attendance_students

# Git Branches
- New feature   : feat/[name]
- Bug fix       : fix/[name]
- Hotfix        : hotfix/[name]

# Git Commits
feat     : new feature
fix      : bug fix
refactor : code refactor
style    : styling changes
docs     : documentation
chore    : config or tooling
```

---

## 6. Code Conventions

```
# General
- DRY — extract to function if used more than once
- Readable over clever — no one-liners that sacrifice clarity
- No TypeScript — pure JavaScript only, no .ts or .tsx files

# Import Order
1. React / Next.js core
2. Internal absolute (@/components, @/lib)
3. Internal relative (../WeeklyPlanForm)
4. Assets

# Supabase
- Always import: import { supabase } from '@/lib/supabase'
- Never: import { createClient } from '@/lib/supabase/client'
- Always use try-catch or check { data, error } from queries
- All queries go inside the component or a local function — no separate service layer currently

# Auth / Role Check
- Admin detection: profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'
- Always get profile from useProfile() hook, never re-fetch in individual pages

# Error Handling
- Always handle Supabase errors — check error before using data
- Show user-friendly alert() for form errors (current pattern in project)
- Log errors to console in development

# 'use client' directive
- All dashboard pages use 'use client' — they all use hooks and Supabase client
- Public pages (kalendar, rppm, scan) also use 'use client' for interactivity
```

---

## 7. Component Rules

```
# Component Order
1. 'use client'
2. Imports
3. Constants (color values, config arrays)
4. Sub-components (if any)
5. Main component function
   a. useParams / useSearchParams / useRouter
   b. useProfile()
   c. useState declarations
   d. useEffect
   e. Handler functions (load*, handle*)
   f. Return JSX
6. No explicit export default line needed — just export default function

# Props
- No PropTypes — project does not use TypeScript or PropTypes
- Default values via destructuring: function Component({ data = [] })

# Sub-components
- Defined in same file if only used by that file (e.g. DayCard, CPBlockEditor)
- Moved to components/ if used across multiple pages

# Client vs Server
- All pages are 'use client' in this project
- Do not convert to Server Components without discussion
```

---

## 8. Styling Rules

```
# Approach
- Tailwind CSS for layout and spacing utilities
- Inline style={{ }} for dynamic values (colors from theme, conditional logic)
- Never use !important
- Never use @import in individual page files — fonts are loaded in app/layout.js only

# Theme Colors (from lib/theme.js — use these, do not hardcode)
- accent:   #442F78   (dark purple — headings, buttons, active states)
- primary:  #A78BFA   (medium purple — labels, highlights)
- border:   #EAB6FF   (light purple — card borders, dividers)
- bg:       #FAFAFA   (page background)
- surface:  #FFFFFF   (card background)
- ink:      #1C1917   (body text — use for all input text)
- inkMid:   #44403C
- inkDim:   #78716C
- inkFaint: #A8A29E   (placeholder, secondary labels)

# Fonts (loaded via next/font/google in app/layout.js)
- Headings  : Rubik
- Body/UI   : Karla
- Monospace : DM Mono

# Tailwind + Inline Style pattern
- Use Tailwind for padding, margin, flex, grid, rounded, overflow, cursor
- Use inline style for colors, borders with theme colors, gradients, font-family
- Example: className="flex items-center gap-3 px-4 py-2 rounded-xl"
           style={{ background: '#442F78', color: '#fff', fontFamily: "'Rubik', sans-serif" }}

# Input / Form text color
- All inputs, selects, textareas MUST have text-[#1C1917] class
- Placeholder text: color #C4B5FD + font-style italic (via CSS class .rppm-input)

# Responsive
- Max content width: max-w-5xl or max-w-3xl for forms, centered with mx-auto
- Padding: px-4 md:px-6 or px-8 for dashboard pages
- Public pages (rppm, kalendar): maxWidth: 680 inline style
```

---

## 9. API & Data Fetching Rules

```
# Pattern
- Fetch directly with Supabase client inside components
- Use useEffect to trigger initial load
- Use local async functions named load*() for data fetching
- Use handle*() for user interaction handlers

# Supabase Client
- Single import: import { supabase } from '@/lib/supabase'
- Always destructure: const { data, error } = await supabase.from(...)
- Check error before using data

# Auth
- Profile is loaded ONCE in app/dashboard/layout.js
- All dashboard pages access it via: const { profile, isAdmin } = useProfile()
- Never call supabase.auth.getUser() inside individual pages

# RPC Functions (already created in DB)
- record_student_attendance(p_qr, p_scanned_at) — used in /scan
- record_guru_attendance(p_qr, p_scanned_at) — used in /scan

# Public Pages (no auth)
- /kalendar, /rppm/[slug], /scan — use supabase anon key
- RLS policies allow anon read for these tables

# Environment Variables
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL — safe for client
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon key — safe for client
SUPABASE_SERVICE_ROLE_KEY     # Service role — SERVER ONLY, used in /api/create-user only
```

---

## 10. State Management Rules

```
# Hierarchy (simplest first)
1. Local state (useState)  — single component data
2. Lifted state            — parent + children
3. ProfileContext          — auth profile shared across all dashboard pages

# ProfileContext (lib/ProfileContext.js)
- Provides: profile, isAdmin, pendingCuti
- Used in ALL dashboard pages via: const { profile, isAdmin } = useProfile()
- Never bypass this — never re-fetch profile in individual pages

# No external state library
- Do not add Zustand, Redux, Jotai, or any global state library
- ProfileContext is sufficient for current scale
```

---

## 11. Performance Rules

```
# Already implemented — do not regress
- Scan: RPC 1 round-trip (was 3 sequential queries)
- Dashboard auth: profile fetched once in layout.js via ProfileContext
- Realtime: debounce 1s via debounceRef to prevent burst re-fetch
- Reports: Map pre-index O(1) lookup instead of O(n²)
- Holidays API: _libCache[year] in-memory cache
- Fonts: next/font/google in layout.js — no @import in individual pages
- DB: 11 indexes + 3 unique constraints
- Scan: isProcessingRef lock to prevent duplicate scans
- Scan: scaleX(-1) CSS mirror — decode unaffected

# Images
- Use <img> tag for school logo (logoborder.png) — it's a small static asset
- No next/image needed for current use cases

# Bundle
- Import only what's needed from libraries
- No unused dependencies

# Do not add
- Do not add SWR, React Query, or any caching library — current pattern is sufficient
- Do not add server components unless discussed — all pages are currently client components
```

---

## 12. Git Rules

Commit after every completed feature or fix before moving to the next task.
This ensures rollback is possible if output is unexpected.

```
# Commit Format
feat     : [description]
fix      : [description]
refactor : [description]
style    : [description]
docs     : [description]
chore    : [description]

# Branch Workflow — MANDATORY
develop → staging (sicuti-staging.vercel.app)  ← always build here first
master  → production (sicuti-app.vercel.app)   ← merge from develop only

NEVER push directly to master.
Always test on staging before merging to master.

# Merge to master
git checkout master
git merge develop
git push origin master
git checkout develop

# Commit examples
feat: tambah tombol share link di kalendar publik
feat: RPPM weekly plan — list, tambah, edit, view per kelas
fix: supabase import path di weekly plan pages
style: text hitam di input form RPPM
```

---

## 13. Features

```
# Completed and live in production
- [x] QR-based attendance scan for students and teachers (RPC, 1 round-trip)
- [x] Manual attendance input (izin/sakit/alpha) from Kelas page
- [x] Daily and monthly attendance reports with CSV export
- [x] Teacher leave request and approval flow
- [x] Bulk QR print (PNG + PDF)
- [x] Profile page with attendance recap and leave summary
- [x] School calendar (events + national holidays) with public view
- [x] Share link button on public /kalendar page
- [x] RPPM (Weekly Plan) — full CRUD per class per week
- [x] Public RPPM page /rppm/[slug] — timeline view for parents, no login
- [x] Share to WA button on RPPM view — auto-generates URL with params
- [x] classes.slug — auto-generated from nama_kelas for public RPPM URLs
- [x] Surah Pendek Jilid PAUD field in RPPM form and view

# Planned — do not start without discussion
- [ ] Attendance correction (admin edit/delete attendance records)
- [ ] Monthly report PDF export (jsPDF + html2canvas already in project)
- [ ] RPPM PDF export (same stack)
- [ ] Centralized styling — extend lib/theme.js, replace inline color strings
- [ ] QR Massal progress indicator ("Memproses X / 60 kartu...")
- [ ] Laporan empty state for holidays/weekends
- [ ] Expand tahun ajaran beyond hardcoded array
```

---

## 14. Testing

```
# Current approach
- Manual testing on staging (sicuti-staging.vercel.app) before every production push
- No automated tests currently

# Test accounts — Staging
- Admin : yogaralkautsar@gmail.com  (UUID: f4af07bc-60fd-4817-b00d-dcc5beb54dc1)
- Guru  : dewi.kusuma@demo.com      (check Supabase staging for UUID)

# What to test before merging to master
1. Login as admin — verify all dashboard routes load
2. Login as guru — verify they only see their own class RPPM, cannot delete
3. Open /rppm/[slug] without login — verify public page loads
4. Open /kalendar without login — verify share button works
5. Test on mobile viewport (public pages are mobile-first)
6. Verify Vercel build succeeds — check build logs before promoting

# Staging seed data
- sicuti-staging-seed-v2.sql   — classes + students
- sicuti-staging-attendance-full.sql — full attendance data
```

---

## 15. Do Not

If any instruction is ambiguous, ASK FIRST before writing code.
Do not assume and proceed without confirmation.

```
# Project-specific — critical
- Never use: import { createClient } from '@/lib/supabase/client'
  Always use: import { supabase } from '@/lib/supabase'
- Never push directly to master branch
- Never run SQL that modifies or deletes production data
- Never create DB migrations without showing SQL first for confirmation
- Never add TypeScript (.ts / .tsx files) — this project is JavaScript only
- Never add a new npm package without confirmation

# Files and Structure
- Do not create new folders without confirmation
- Do not delete files without confirmation
- Do not move files without confirmation
- Do not modify app/dashboard/layout.js without explicit instruction
  (it handles auth for all dashboard pages)

# Code
- Do not hardcode Supabase URLs or keys — always use env variables
- Do not fetch profile inside individual pages — always use useProfile()
- Do not use useEffect for data fetching in a way that creates race conditions
  (always use a cleanup flag or ref guard for concurrent fetches)
- Do not add @import for fonts inside individual page files
  (fonts are loaded in app/layout.js only)
- Do not use input/select/textarea without text-[#1C1917] class
  (all form fields must have black text for readability)

# Database
- Do not expose SUPABASE_SERVICE_ROLE_KEY to client
- Do not bypass RLS by using service role in client-side code
- Do not modify existing RPC functions without confirmation

# Security
- Do not expose any API key or secret to client
- Do not skip error handling in Supabase queries
```

---

## 16. Environment Variables

```
# Setup
- Copy .env.local.example to .env.local for local development
- Never commit .env.local or any file containing secrets

# Public Variables — safe for client (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key — limited by RLS

# Server-only Variables — NEVER expose to client
SUPABASE_SERVICE_ROLE_KEY      # Used ONLY in /api/create-user route
                               # Bypasses RLS — keep strictly server-side

# Two environments
# Staging:    hylzeqciqpdiooajahow.supabase.co  → sicuti-staging.vercel.app
# Production: jfiujpyezuhrpvgnybvw.supabase.co  → sicuti-app.vercel.app
```

---

## 17. Database Quick Reference

```sql
-- Key tables
profiles          -- users (admin + guru)
classes           -- kelas with slug for public URLs
students          -- murid per kelas
attendance_students -- student attendance records
attendance_guru   -- teacher attendance records
leave_requests    -- teacher leave requests
school_events     -- calendar events
weekly_plans      -- RPPM per class per week (JSONB: hari_data, surah_pendek)

-- Admin detection (always use this pattern)
profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'

-- QR format
-- Teacher: GRU-XXXXXXXX
-- Student: MRD-XXXXXXXX

-- Slug generation (auto from nama_kelas)
-- "TK B Disiplin" → "tk-b-disiplin"

-- Public RPPM URL pattern
-- /rppm/[slug]?tahun=2025%2F2026&semester=2&minggu=16

-- Working days
-- Teachers: Monday–Saturday, cutoff 07:00 WITA
-- Students: Monday–Friday,   cutoff 07:30 WITA
```
