# SiCuti — Operations & Maintenance Guide

Operational procedures, troubleshooting, and maintenance tasks for SiCuti in production.

---

## 1. Overview

This guide covers:
- **Daily operations** — Monitoring, responding to issues
- **Database maintenance** — Backups, recovery, optimization
- **Troubleshooting** — Common problems and solutions
- **Scaling** — When and how to expand capacity
- **Incident response** — Critical issue procedures
- **Compliance** — Data retention, audit logging

---

## 2. Daily Operations

### 2.1 Morning Checklist (Start of Day)

```
□ Check error logs (last 24 hours)
  Supabase dashboard → Logs tab
  Look for: RLS errors, SQL errors, auth failures
  
□ Verify application status
  https://sicuti-app.vercel.app → Load page
  Try login with test account
  Navigate to dashboard
  
□ Check database performance
  Supabase dashboard → Database → Queries
  Look for slow queries (> 1 second)
  
□ Review user reports
  Check email for reported issues
  Check admin dashboard for error messages
```

### 2.2 End of Day Checklist

```
□ No critical errors in logs
□ Database backups completed (auto via Supabase)
□ All deployments successful
□ Team notified of any issues
□ Plan for next day if maintenance needed
```

### 2.3 Weekly Tasks

**Every Monday**:
- Review last week's error logs
- Check database growth (table sizes)
- Verify all backups are working
- Update team with metrics (uptime, performance)

**Every Friday**:
- Test disaster recovery (optional)
- Review database indexes for optimization
- Plan next week's maintenance (if needed)

---

## 3. Monitoring & Alerting

### 3.1 What to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Uptime | < 99% | Investigate |
| Response time | > 2s average | Check database/Vercel |
| Error rate | > 1% | Review logs |
| Database size | > 80% quota | Upgrade plan |
| RLS errors | > 10 per day | Review security policies |
| Auth failures | > 20 per day | Check account status |

### 3.2 Log Locations

**Application logs** (Vercel):
1. Go to https://vercel.com
2. Select sicuti-app project
3. Click "Deployments" → latest deployment → "View Logs"
4. Shows runtime errors, function calls

**Database logs** (Supabase):
1. Go to Supabase dashboard
2. Project → "Logs" tab
3. Shows SQL queries, auth events, errors

**Browser errors** (Production):
1. Open https://sicuti-app.vercel.app
2. Press F12 → Console tab
3. Look for JavaScript errors (red X)

### 3.3 Error Log Analysis

**Common error patterns**:

```
RLS policy violation:
  Error: "new row violates row level security policy"
  → Teacher trying to access another class
  → Check RLS policies are correct

Auth error:
  Error: "User not found"
  → Deleted account or session expired
  → Redirect to login

Database timeout:
  Error: "Connection timeout"
  → Database overloaded or network issue
  → Check Supabase status page

Missing data:
  Error: "Cannot read property of undefined"
  → Data not loaded before rendering
  → Check useEffect dependencies
```

---

## 4. Database Maintenance

### 4.1 Backup Strategy

**Automatic backups** (Supabase included):
- Frequency: Daily
- Retention: 7 days
- Location: Supabase managed infrastructure
- Restore time: ~5 minutes

**To verify backup works**:
1. Supabase dashboard → Backups
2. See list of available backups with timestamps
3. Note: Backups are automatic, no action needed

**To restore from backup**:
1. Supabase dashboard → Backups
2. Click on backup date you want to restore to
3. Review what changed since that backup
4. Confirm restore
5. Database reverts to that point in time
6. Verify application still works

**Important**: Restore to production requires caution:
- Data after restore point will be lost
- Coordinate with team before restoring
- Test on staging first if possible
- Document reason for restore

### 4.2 Database Performance

**Check slow queries**:
```sql
-- Supabase SQL Editor → view slow queries
-- Look for queries taking > 1 second
-- Check if they have indexes
```

**Optimize**:
1. Add index if query doesn't have one
2. Break complex query into simpler steps
3. Use RPC function for atomic operations
4. Cache results if data doesn't change frequently

**Index strategy**:
- Attendance lookups: Index on (student_id, tanggal)
- Leave requests: Index on (guru_id, status)
- Weekly plans: Index on (class_id, tahun_ajaran, semester, minggu)
- Always index foreign keys

### 4.3 Database Cleanup

**Monthly cleanup tasks**:

```sql
-- Find unused records (if any)
SELECT COUNT(*) FROM students WHERE deleted_at IS NOT NULL;

-- Check for duplicate records
SELECT qr_code, COUNT(*) as count
FROM students
GROUP BY qr_code
HAVING COUNT(*) > 1;

-- Check for orphaned records
SELECT s.* FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE c.id IS NULL;
```

**If orphaned records exist**:
1. Investigate why they exist
2. Delete or reassign to correct class
3. Add constraint to prevent future orphans
4. Document in changelog

### 4.4 Table Statistics

**Monthly review**:

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check row counts
SELECT 'students' as table_name, COUNT(*) FROM students
UNION ALL
SELECT 'attendance_students', COUNT(*) FROM attendance_students
UNION ALL
SELECT 'weekly_plans', COUNT(*) FROM weekly_plans;
```

**Healthy ranges** (for ~100 students, ~20 teachers):
- students: 100-150 rows
- attendance_students: 10,000-50,000 rows (daily records)
- weekly_plans: 500-1,000 rows (per week, per class)
- leave_requests: 100-500 rows (annual)

If any table grows unexpectedly, investigate.

---

## 5. Common Issues & Troubleshooting

### 5.1 Issue: Attendance not recording (QR scanner failing)

**Symptoms**:
- Scan QR code → page shows error
- Attendance record not created
- Error in console: "Failed to record attendance"

**Diagnosis**:
```
1. Check Supabase status
   - Is database responding?
   - Are RPC functions enabled?
   
2. Check RLS policy
   - Can anon user call record_student_attendance RPC?
   - Supabase dashboard → RLS policies
   
3. Check QR code format
   - Is it MRD-xxxxx or GRU-xxxxx?
   - Is the QR code in database?
   
4. Check network
   - Is browser connected to network?
   - Any CORS errors in console?
```

**Solutions**:
```
If QR code not in database:
  → Generate QR code for student
  → Update students table with qr_code
  
If RLS policy blocking:
  → Check policy allows anon read on attendance table
  → Verify policy on students table
  
If RPC function broken:
  → Check RPC function exists in Supabase
  → Verify function logic is correct
  → Re-test with SELECT query
  
If network issue:
  → Check internet connection
  → Reload page
  → Try different device
```

### 5.2 Issue: Login not working

**Symptoms**:
- Enter credentials → "Invalid login"
- Or page keeps redirecting to login
- Or stuck on login screen

**Diagnosis**:
```
1. Verify account exists
   Supabase dashboard → Authentication → Users
   Search for email address
   
2. Check account is not disabled
   Supabase dashboard → Auth settings
   Verify email verification not required
   
3. Check password is correct
   Verify in Supabase (users are hashed, can't see)
   Try reset password flow
   
4. Check profile exists
   Supabase → SQL Editor
   SELECT * FROM profiles WHERE email = 'user@example.com';
   
5. Check RLS policy
   Can user read their own profile?
```

**Solutions**:
```
If account doesn't exist:
  → Create account via /api/create-user endpoint
  → Or use Supabase dashboard to create
  
If account disabled:
  → Verify in Supabase Authentication settings
  → Reactivate if needed
  
If profile missing:
  → Insert row in profiles table
  → Use correct UUID (must match auth user id)
  
If RLS blocking:
  → Check RLS policy allows self-read
  → Verify email matches between auth & profiles
```

### 5.3 Issue: Reports not generating / taking too long

**Symptoms**:
- Click "Export to CSV" → waiting forever
- Or "Generate Report" → spinner keeps spinning
- Network tab shows slow API call

**Diagnosis**:
```
1. Check data volume
   How many attendance records?
   If > 100,000 rows → may be slow
   
2. Check database query
   Open browser DevTools → Network tab
   See what query is being run
   Estimate how long it takes
   
3. Check browser resources
   Is browser process using too much CPU/memory?
   Try with different browser
   
4. Check database performance
   Supabase → Logs tab
   Is query taking > 5 seconds?
```

**Solutions**:
```
If data too large:
  → Add date range filter
  → Generate report by month instead of year
  → Add pagination to reports
  
If query slow:
  → Add index to attendance table
  → Use RPC function instead of client query
  → Pre-compute reports (cache results)
  
If browser slow:
  → Increase browser RAM
  → Try different browser
  → Split report into smaller chunks
```

### 5.4 Issue: Permission denied / RLS blocking legitimate access

**Symptoms**:
- Admin can't access admin dashboard
- Teacher can't see own class students
- Error: "new row violates row level security policy"

**Diagnosis**:
```
1. Check user role
   Supabase → profiles table
   Is profile.role = 'admin' for admin user?
   Is profile.role = 'guru' for teacher?
   
2. Check RLS policy
   Supabase → RLS policies
   Find policy for table user is accessing
   Test policy with test queries
   
3. Check policy logic
   Is policy checking role correctly?
   Is policy checking user ID correctly?
   
4. Test policy manually
   Supabase → SQL Editor
   Run as admin: SELECT * FROM students WHERE class_id = '...'
   Run as teacher: SELECT * FROM students WHERE class_id = '...'
   Verify results differ
```

**Solutions**:
```
If role is wrong:
  → Update profiles set role = 'admin' where id = '...';
  → Or: update profiles set jabatan = 'Kepala Sekolah' where id = '...';
  → Have user logout & login again
  
If RLS policy is wrong:
  → Fix policy logic in Supabase
  → Re-test with test queries
  → Re-deploy application
  
If policy is missing:
  → Create new policy for the table
  → Test before enabling
  → Enable on table
```

### 5.5 Issue: Database quota exceeded

**Symptoms**:
- Error: "Database quota exceeded"
- Cannot insert new records
- Vercel deployment fails with database error

**Diagnosis**:
```
1. Check database size
   Supabase dashboard → Database → Storage
   How much of quota is used?
   
2. Find what's taking space
   Run SQL to get table sizes (see 4.4)
   Is any table unexpectedly large?
   
3. Check backup size
   Supabase → Backups
   How much space do backups take?
```

**Solutions**:
```
If quota exceeded:
  → Upgrade Supabase plan (dashboard → Billing)
  → Or delete old data (with caution)
  → Or archive old data to file
  
If table is too large:
  → Check for duplicate records → delete
  → Check for orphaned records → delete
  → Archive old attendance records (if > 1 year)
  → Add indexes to speed up queries
```

### 5.6 Issue: Vercel deployment fails

**Symptoms**:
- Merge to master → Vercel shows red X
- Build log shows error
- Version not deploying to production

**Diagnosis**:
```
1. Check build logs
   Vercel dashboard → Deployments → Latest
   Click to see full build output
   Look for error message
   
2. Common causes:
   - ESLint error (syntax)
   - Import error (missing file)
   - Environment variable missing
   - Database connection timeout
   
3. Try rebuilding
   Vercel dashboard → Deployments → "..."
   Click "Redeploy"
   See if issue was temporary
```

**Solutions**:
```
If ESLint error:
  → Run npm run lint locally
  → Fix all issues
  → git push to re-trigger build
  
If import error:
  → Verify file exists at path
  → Check import statement
  → git commit fix, push to re-trigger
  
If env var missing:
  → Vercel dashboard → Settings → Environment Variables
  → Add missing variable
  → Trigger new deployment: git push
  
If database timeout:
  → Check Supabase status page
  → Wait and retry
  → Or check if query is too slow
```

---

## 6. Incident Response

### 6.1 Critical Issue Procedure (Production Down)

**Level 1: Confirm Issue**
```
Time 0:00
□ Verify problem is real (test URL, try login)
□ Notify team immediately
□ Check status pages (Vercel, Supabase)
□ Document when issue started
```

**Level 2: Quick Diagnosis**
```
Time 0:05
□ Check Vercel logs for deployment errors
□ Check Supabase status for database issues
□ Check browser console for JavaScript errors
□ Determine if issue is:
  - Application code
  - Database
  - Infrastructure
```

**Level 3: Immediate Action**
```
Time 0:10
If code issue:
  → Revert last commit: git revert HEAD
  → git push origin master
  → Wait for Vercel to redeploy (~2 min)
  
If database issue:
  → Check Supabase status
  → If Supabase down: wait for fix or contact support
  → If RLS policy broken: fix policy
  → If table corrupted: restore from backup
  
If infrastructure issue:
  → Check Vercel status page
  → Contact Vercel support if needed
  → Deploy to different Vercel project temporarily (if available)
```

**Level 4: Verification & Communication**
```
Time 0:15
□ Verify application is back online
□ Try login, navigate pages
□ Check error logs are clear
□ Notify team: issue identified & resolved
□ Document incident (see 6.3)
```

### 6.2 Escalation Matrix

| Issue | Response Time | Owner | Contact |
|-------|---|---|---|
| Login not working | 15 min | Operations | DevOps on-call |
| Attendance scanner broken | 30 min | Developer | SiCuti team |
| Database down | 5 min | Infrastructure | Supabase support |
| Deployment stuck | 10 min | DevOps | DevOps on-call |
| Data corruption | ASAP | DBA | Restore from backup |

### 6.3 Incident Post-Mortem

After any critical issue:

```markdown
## Incident Report

**Title**: [Describe incident]
**Date**: [Date and time]
**Duration**: [How long was issue active]
**Impact**: [How many users affected]

### What Happened
[Detailed description of what occurred]

### Root Cause
[Why did it happen - technical root cause]

### Detection
[How was it detected, how long before detected]

### Resolution
[What was done to fix it]

### Timeline
- Time: Action taken
- Time: Result of action
- Time: Issue resolved

### Prevention
[What can we do to prevent this in future]

### Action Items
- [ ] Action 1 (assigned to person, deadline)
- [ ] Action 2
- [ ] Action 3
```

**Store in**: `INCIDENTS/` folder, filename: `2026-06-10-login-failure.md`

---

## 7. Scaling Operations

### 7.1 When to Scale

**Indicators**:
- Database > 80% quota used → Upgrade Supabase plan
- API response > 2s average → Optimize queries or scale database
- Concurrent users > 500 → Vercel auto-scales (usually OK)
- Storage > 90% → Archive old data or upgrade

### 7.2 Scaling Database

**Signs database needs upgrade**:
```
- Queries taking > 2 seconds
- "Database quota exceeded" error
- Slow page loads
- Reports timing out
```

**How to upgrade** (Supabase):
1. Dashboard → Billing
2. Select higher plan tier
3. Confirm upgrade
4. Database scales automatically
5. No downtime needed

### 7.3 Scaling Application

**Vercel auto-scales**, but you can optimize:
```
1. Review Vercel deployment logs
2. Identify slow API calls
3. Optimize database queries
4. Add caching where appropriate
5. Use CDN for static assets
6. Consider edge functions for heavy computation
```

### 7.4 Scaling Storage

**If running out of space**:
```
1. Check what's taking space (see 4.4)
2. Options:
   a. Delete old records (attendance older than X years)
   b. Archive to external storage (Amazon S3, Google Cloud)
   c. Upgrade database plan (includes more storage)
3. Verify backups still work after changes
```

---

## 8. Scheduled Maintenance

### 8.1 Weekly Maintenance

**Every Sunday 2:00 AM** (schedule when no active usage):

```
□ Database backup test
  - Verify automatic backup completed
  - Test restore process (on dev, not prod)
  - Document backup size

□ Log review
  - Check for unusual patterns
  - Review error counts
  - Delete old logs if needed

□ Performance review
  - Check response times
  - Review slow queries
  - Identify optimization opportunities
```

### 8.2 Monthly Maintenance

**First Sunday of month**:

```
□ Security audit
  - Review RLS policies
  - Check for privilege escalation
  - Verify auth is working correctly

□ Database optimization
  - Check index usage
  - Rebuild bloated indexes
  - Update statistics

□ Dependency review
  - Check for security updates
  - Review npm audit results
  - Plan upgrades for next sprint

□ Capacity planning
  - Project growth rate
  - Estimate when next upgrade needed
  - Order hardware/plan changes in advance
```

### 8.3 Quarterly Maintenance

**Every 3 months** (schedule maintenance window):

```
□ Full security review
  - Code audit for vulnerabilities
  - Dependency audit
  - RLS policy review
  - OWASP checklist

□ Disaster recovery test
  - Backup restore test
  - Failover procedures
  - Document recovery time

□ Performance optimization
  - Full database analysis
  - Query optimization
  - Caching strategy review

□ Compliance review
  - Data retention policies
  - Audit logging
  - Access control review
```

---

## 9. Disaster Recovery

### 9.1 Disaster Scenarios

**Scenario 1: Database corrupted**
```
1. Immediately stop all writes to prevent spreading corruption
2. Restore from most recent backup
3. Check data integrity after restore
4. Compare with any external backups
5. Monitor for recurrence
```

**Scenario 2: Production database deleted**
```
1. DO NOT PANIC — backups exist
2. Immediately restore latest backup
3. Check restoration was successful
4. Notify users (if appropriate)
5. Review how this happened, add safeguards
```

**Scenario 3: Entire application down**
```
1. Check all status pages (Vercel, Supabase)
2. If Vercel down: wait for their recovery
3. If Supabase down: wait for their recovery
4. If our issue: rollback code or restore database
5. Have team working on diagnosis while waiting
```

**Scenario 4: Data breach / unauthorized access**
```
1. Immediately revoke access
2. Change all secrets (API keys, database passwords)
3. Contact affected users
4. Review audit logs for what was accessed
5. Strengthen security (RLS, auth, etc.)
```

### 9.2 Recovery Point Objective (RPO) & Recovery Time Objective (RTO)

| Scenario | RPO | RTO |
|----------|-----|-----|
| Database failure | 24 hours (daily backups) | 5 min (automatic restore) |
| Application crash | Real-time (git history) | 2 min (redeploy) |
| Data corruption | 24 hours (daily backups) | 5 min (restore backup) |
| Infrastructure failure | 24 hours | 30 min (failover/restore) |

**Meaning**:
- **RPO** = How much data might be lost (max 24 hours)
- **RTO** = How long to recover (max 30 minutes)

### 9.3 Recovery Procedures

**Database recovery**:
1. Identify what point in time you need to restore to
2. Supabase dashboard → Backups
3. Select backup date
4. Confirm restore (this overwrites current database)
5. Verify application still works
6. Test critical flows

**Application recovery**:
1. Identify last good commit
2. Revert: `git revert <bad-commit>`
3. Deploy: `git push origin master`
4. Vercel auto-redeploys (~2 min)
5. Verify site is back online

---

## 10. Performance Tuning

### 10.1 Database Performance

**Identify slow queries**:
```sql
-- In Supabase SQL Editor
-- Find queries taking > 1000ms
-- Analyze execution plan
-- Add indexes where needed
```

**Common optimizations**:
```
1. Add index to frequently filtered columns
   CREATE INDEX idx_student_class ON students(class_id);

2. Denormalize if join is slow
   Cache computed values in table

3. Use RPC function for complex operations
   One round-trip instead of multiple queries

4. Add constraint to enforce data integrity
   Prevents buggy data that slows queries
```

### 10.2 Application Performance

**Frontend optimization**:
```
1. Code splitting (Next.js does this)
2. Image optimization (use next/image)
3. Component memoization (React.memo for expensive renders)
4. Lazy load heavy components
```

**Backend optimization**:
```
1. Cache frequently accessed data
2. Use RPC for atomic operations
3. Batch queries where possible
4. Avoid N+1 queries
```

### 10.3 Monitoring Performance

**Track these metrics**:
- Page load time (< 2s target)
- Database query time (< 100ms target)
- API response time (< 500ms target)
- Error rate (< 0.1% target)

**Tools**:
- Vercel dashboard (deployment metrics)
- Supabase logs (query performance)
- Browser DevTools (page load performance)
- Google PageSpeed Insights (front-end optimization)

---

## 11. Compliance & Audit Logging

### 11.1 Data Retention

**How long to keep data**:
- Student attendance: Full academic year + 3 months
- Teacher leave requests: 2 years (for audit)
- Audit logs: 1 year minimum
- Backups: 7 days (automatic by Supabase)

**Data deletion policy**:
```
Each June (end of academic year):
1. Archive student attendance from previous year
2. Export to CSV and store offline
3. Delete from active database
4. Update archive policy if needed
```

### 11.2 Audit Logging

**What to log**:
- Admin actions (create/delete user, approve leave)
- Data modifications (edit student, edit attendance)
- Access attempts (failed logins, permission denied)
- System changes (RLS policy updates, schema changes)

**Where logs are stored**:
- Supabase logs (automatic)
- Vercel logs (automatic)
- Application logs (if custom logging added)

**Audit log retention**:
- Supabase logs: Available for query in dashboard
- Exported logs: Keep in secure storage for 1+ years

---

## 12. Security Operations

### 12.1 Secret Management

**Secrets to protect**:
- Supabase service role key (server-only)
- Database passwords (Supabase-managed)
- API keys (if any external integrations)
- JWT tokens (temporary, session-based)

**Best practices**:
```
✓ Store in Vercel environment variables (encrypted)
✓ Rotate keys periodically (every 90 days)
✓ Never commit secrets to Git
✓ Use service role key only server-side
✓ Log key rotation in changelog
```

### 12.2 Access Control Review

**Monthly review**:
1. List all users with dashboard access
2. Verify each user should still have access
3. Check roles are correct (admin vs guru)
4. Disable any inactive accounts

**Procedure**:
```
Supabase → Authentication → Users
For each user:
  - Is role correct? (admin or guru)
  - Is jabatan correct?
  - Should they still have access?
  - Last login date (to identify inactive)
```

### 12.3 Security Patches

**Monitor for security updates**:
```bash
npm audit  # Check for vulnerable packages

# If vulnerabilities found:
npm audit fix  # Auto-fix if possible
# Manual review & test
git commit -m "security: update vulnerable dependencies"
git push  # Triggers rebuild & staging test
```

---

## 13. Operations Checklist

### Daily (EOD)
- [ ] Check error logs for issues
- [ ] Verify application loads
- [ ] Database backup completed
- [ ] No critical errors in logs

### Weekly (Monday AM)
- [ ] Review last week's errors
- [ ] Database performance review
- [ ] User report summary
- [ ] Plan any maintenance

### Monthly (First Sunday)
- [ ] Security audit
- [ ] Database optimization
- [ ] Dependency updates
- [ ] Post-mortem on any incidents

### Quarterly (Every 3 months)
- [ ] Full security review
- [ ] Disaster recovery test
- [ ] Performance optimization
- [ ] Compliance audit

---

## 14. Quick Reference

| Task | Who | When | Duration |
|------|-----|------|----------|
| Daily monitoring | Operations | Every day | 15 min |
| Weekly maintenance | DevOps | Sunday 2 AM | 30 min |
| Monthly review | Tech lead | 1st of month | 1 hour |
| Quarterly audit | Security | Every 3 months | 2 hours |
| Emergency response | On-call | As needed | 15-30 min |

---

## 15. Contacts & Resources

**Team**:
- Tech Lead: [Name] — Architecture, major decisions
- DevOps: [Name] — Deployments, infrastructure
- DBA: [Name] — Database, performance
- On-call: [Name] — Emergency response (rotating)

**External**:
- Vercel status: https://www.vercel-status.com
- Supabase status: https://status.supabase.com
- GitHub: https://github.com/yralkautsar/sicuti-app
- Supabase dashboard: https://app.supabase.com

**Documentation**:
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment procedures
- [DATABASE.md](./DATABASE.md) — Database schema
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
- [CLAUDE.md](./CLAUDE.md) — Project rules

---

This operations guide is current as of June 2026. Update as team and operations evolve.
