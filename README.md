# SiCuti — Digital Attendance & Operations System

SiCuti is a web-based attendance and operations management system built for **TK Karakter Mutiara Bunda Bali**. The system digitizes school routines including QR-based attendance scanning, teacher leave requests, student & teacher management, school calendar, and weekly lesson plans (RPPM).

The project was created to replace manual paper-based processes while remaining simple, maintainable, and easy to use for school staff and parents.

---

## What SiCuti Does

### For School Staff (Admin & Teachers)

- **QR-based Attendance**: Students and teachers scan QR codes to record attendance instantly
- **Manual Attendance Input**: Quickly mark students as late, sick, or absent from the dashboard
- **Attendance Reports**: View daily and monthly attendance summaries with CSV export
- **Leave Request Management**: Teachers submit leave requests; admins approve or reject
- **Student & Teacher Management**: CRUD operations for students, teachers, and classes
- **Class Management**: Organize students by class and academic year
- **Calendar Management**: Maintain school events and national holidays
- **Weekly Lesson Plans (RPPM)**: Create and manage weekly lesson plans per class with Surah Pendek field
- **Bulk QR Print**: Generate QR code cards for students and teachers (PNG + PDF)
- **Attendance Recap**: View personal attendance history and leave balance

### For Parents

- **Public Calendar**: View school events and holidays without login
- **Weekly Lesson Plans**: View lesson plans for their child's class with timeline layout
- **Share Features**: Share calendar and lesson plans to WhatsApp

---

## Key Features

### ✅ Core Features (Live)

- QR-based attendance for students and teachers (RPC optimized, 1 round-trip)
- Manual attendance input (present, late, sick, permitted, absent)
- Daily and monthly attendance reports with CSV export
- Teacher leave request workflow (submit, admin review, approve/reject)
- Student import from CSV with batch QR generation
- Manual student and teacher addition
- Bulk QR code printing (PNG + PDF)
- School calendar with public view and WhatsApp share button
- Weekly lesson plans (RPPM) — full CRUD per class per week
- Public RPPM page with timeline layout for parents
- WhatsApp share button for RPPM with auto-generated URL
- Attendance recap on profile page
- Leave balance summary on profile page
- Role-based access control (admin vs. guru)

### 🔒 Security

- Supabase Row Level Security (RLS) policies
- Cryptographically secure QR code generation (crypto.randomUUID)
- Auth guard on all dashboard pages
- Service role key used only on server (API routes)
- Anon key with limited RLS permissions for public pages

---

## Technology Stack

| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| **Frontend**        | Next.js 15+ (App Router), React, Tailwind CSS |
| **Backend**         | Supabase (PostgreSQL, Auth, RLS)              |
| **Deployment**      | Vercel (2 projects: production + staging)     |
| **Language**        | JavaScript (no TypeScript)                    |
| **Package Manager** | npm                                           |

---

## Project Structure

```
sicuti-app/
├── app/
│   ├── api/
│   │   └── create-user/           # Server: Create auth users + profiles
│   ├── dashboard/
│   │   ├── layout.js              # Auth guard + profile fetching
│   │   ├── page.js                # Dashboard home
│   │   ├── kelas/                 # Class management + manual attendance
│   │   ├── guru/                  # Teacher CRUD + leave quota
│   │   ├── murid/                 # Student import (CSV) + manual add
│   │   ├── laporan/               # Daily & monthly reports + CSV export
│   │   ├── cuti/                  # Leave requests (admin + teacher view)
│   │   ├── qr-massal/             # Bulk QR print (PNG + PDF)
│   │   ├── profil/                # Attendance recap + leave summary
│   │   ├── kalendar/              # School calendar management
│   │   └── weekly-plan/           # RPPM CRUD + form + view
│   ├── kalendar/                  # Public: Calendar for parents
│   ├── rppm/[slug]/               # Public: Weekly plans per class for parents
│   ├── scan/                      # Public: QR scanner (tablet)
│   ├── login/
│   ├── reset-password/
│   ├── panduan/                   # User guide
│   ├── layout.js                  # Root layout + font loading
│   └── globals.css
├── components/
│   ├── Sidebar.js                 # Dashboard navigation
│   └── [other shared components]
├── lib/
│   ├── supabase.js                # Supabase client config
│   ├── ProfileContext.js          # Auth state (React Context)
│   └── theme.js                   # Color & font constants
├── public/
│   └── logoborder.png             # School logo
├── CLAUDE.md                       # Project rules & conventions
├── DATABASE.md                     # Schema documentation
├── ARCHITECTURE.md                 # System architecture
└── package.json
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yralkautsar/sicuti-app
cd sicuti-app
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` with Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run start     # Run production build
npm run lint      # Run ESLint
```

---

## Deployment

### Staging Environment

- URL: https://sicuti-staging.vercel.app
- Branch: `develop`
- Use for testing before production

### Production Environment

- URL: https://sicuti-app.vercel.app
- Branch: `master`
- Stable release only

### Workflow

```
develop (staging) → tested → merge to master (production)
```

Never push directly to master. Always test on staging first.

---

## Test Accounts (Staging)

| Role  | Email                    | Purpose                        |
| ----- | ------------------------ | ------------------------------ |
| Admin | yogaralkautsar@gmail.com | Full access, all features      |
| Guru  | dewi.kusuma@demo.com     | Teacher access, own class only |

---

## Database Overview

The system uses PostgreSQL via Supabase with the following core tables:

- **profiles** — Teachers and staff (role, leave quota, QR code)
- **classes** — School classes by academic year with slug for public URLs
- **students** — Students linked to classes
- **attendance_students** — Student attendance records (present, late, sick, absent, permitted)
- **attendance_guru** — Teacher attendance records
- **leave_requests** — Teacher leave applications and approval workflow
- **school_events** — Calendar events and holidays
- **weekly_plans** — RPPM (weekly lesson plans) per class per week with JSONB hari_data

See [DATABASE.md](./DATABASE.md) for complete schema documentation.

---

## Architecture Overview

The system follows a three-layer architecture:

```
Browser (UI) → Next.js (App Router) → Supabase (Database + Auth + RLS)
```

### Key Components

- **Frontend**: React + Tailwind CSS custom components
- **Server**: Next.js route handlers for API endpoints (user creation)
- **Backend**: Supabase PostgreSQL + RLS policies + RPC functions
- **State**: React Context (ProfileContext) for auth state
- **Auth**: Supabase Auth with email/password

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

---

## Security & Performance

### Security

- Cryptographically secure QR code generation (crypto.randomUUID)
- Row Level Security (RLS) on all sensitive tables
- Auth guard on dashboard pages
- Service role key kept server-side only
- Input validation on all forms

### Performance

- RPC optimized for attendance scanning (1 round-trip vs 3 sequential queries)
- Profile fetched once per session via ProfileContext
- In-memory caching for holidays API
- Attendance lookups optimized with indexes
- Debounced real-time updates

---

## Development Notes

### Code Conventions

- Use `import { supabase } from '@/lib/supabase'` for database access
- Use `useProfile()` hook for auth state in dashboard pages
- Use theme colors from `lib/theme.js` — do not hardcode
- All form inputs must have `text-[#1C1917]` class for readability
- Mark all dashboard pages with `'use client'` directive

### Git Workflow

```bash
# Feature branch
git checkout -b feat/feature-name develop
git commit -m "feat: description"
git push origin feat/feature-name

# Create PR, test on staging
# Merge to develop when approved
# Then merge develop → master for production
```

### Adding New Features

1. Create branch from `develop`
2. Add feature to dashboard page or new route
3. Test on staging (sicuti-staging.vercel.app)
4. Merge to `develop` after testing
5. Merge `develop` to `master` for production

---

## Planned Features

- [ ] Attendance correction (admin edit/delete records)
- [ ] Monthly report PDF export
- [ ] RPPM PDF export
- [ ] Centralized styling (extend theme.js)
- [ ] QR Massal progress indicator
- [ ] Laporan empty state for holidays
- [ ] Extended tahun ajaran support

---

## Troubleshooting

### "Cannot read property 'role' of null"

- The dashboard layout guard is not fetching profile correctly
- Check Supabase auth is configured
- Verify RLS policies allow reading from profiles table

### QR code not scanning

- Ensure QR code image is clear and high contrast
- Check QR prefix matches expected format (MRD- for student, GRU- for teacher, ADM- for admin)
- Test with multiple devices

### CSV import fails

- Verify CSV format matches expected columns
- Check for empty rows or malformed data
- Ensure all required fields are present

---

## Contributing

This is a custom school system — changes should be discussed with the project owner before implementation.

For bugs or questions, contact the development team.

---

## License

Internal project for TK Karakter Mutiara Bunda Bali. All rights reserved.

---

## Repository

Source: https://github.com/yralkautsar/sicuti-app
