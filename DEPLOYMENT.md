# SiCuti — Deployment Guide

Complete deployment and environment management guide for SiCuti.

---

## 1. Overview

SiCuti uses a **two-environment setup** for reliable deployments:

| Environment    | URL                               | Branch    | Database            | Deployment          |
| -------------- | --------------------------------- | --------- | ------------------- | ------------------- |
| **Staging**    | https://sicuti-staging.vercel.app | `develop` | Staging Supabase    | Auto-deploy on push |
| **Production** | https://sicuti-app.vercel.app     | `master`  | Production Supabase | Auto-deploy on push |

**Deployment Flow**:

```
develop (push) → Vercel builds staging → Manual test → Merge to master → Vercel builds production
```

---

## 2. Environment Setup

### 2.1 Local Development Environment

**Prerequisites**:

- Node.js 18+
- Git
- Vercel CLI (optional but recommended)
- Supabase CLI (for local database, optional)

**Setup**:

```bash
# Clone repository
git clone https://github.com/yralkautsar/sicuti-app
cd sicuti-app

# Install dependencies
npm install

# Create .env.local (use staging Supabase for dev)
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://hylzeqciqpdiooajahow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
EOF

# Start dev server
npm run dev
```

**Access**: http://localhost:3000

### 2.2 Staging Environment (Supabase Staging)

| Variable                      | Value                                    | Location                      |
| ----------------------------- | ---------------------------------------- | ----------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | https://hylzeqciqpdiooajahow.supabase.co | Vercel env vars               |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [staging-key]                            | Vercel env vars               |
| SUPABASE_SERVICE_ROLE_KEY     | [staging-service-role]                   | Vercel env vars (server-only) |

**Deployment**: Automatic on push to `develop` branch

**Vercel Project**: sicuti-staging (Vercel dashboard)

### 2.3 Production Environment (Supabase Production)

| Variable                      | Value                                    | Location                      |
| ----------------------------- | ---------------------------------------- | ----------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | https://jfiujpyezuhrpvgnybvw.supabase.co | Vercel env vars               |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [prod-key]                               | Vercel env vars               |
| SUPABASE_SERVICE_ROLE_KEY     | [prod-service-role]                      | Vercel env vars (server-only) |

**Deployment**: Automatic on push to `master` branch

**Vercel Project**: sicuti-app (Vercel dashboard)

---

## 3. Git Workflow & Deployment

### 3.1 Feature Development

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feat/new-feature

# 2. Make changes, commit regularly
git add .
git commit -m "feat: description of feature"

# 3. Push to remote
git push origin feat/new-feature

# 4. Create Pull Request on GitHub
# - Title: feat: description
# - Describe changes + testing done
# - Request review

# 5. After approval, merge to develop
git checkout develop
git pull origin develop
git merge feat/new-feature
git push origin develop

# 6. Vercel auto-deploys to staging
# - Wait for build to complete
# - Test on https://sicuti-staging.vercel.app
```

### 3.2 Bug Fix Hotfix

```bash
# 1. Create hotfix branch from master (critical bugs only)
git checkout master
git pull origin master
git checkout -b fix/critical-bug

# 2. Fix bug, test locally
git commit -m "fix: description"

# 3. Create PR to master + develop
git push origin fix/critical-bug

# 4. After review & approval:
# - Merge to master first
# - Vercel deploys to production immediately
# - Then merge same commit to develop
# - Keep branches in sync
```

### 3.3 Release to Production

```bash
# 1. Ensure staging is tested & stable
# - Visit https://sicuti-staging.vercel.app
# - Test all critical flows
# - Verify no active issues

# 2. Create release PR: develop → master
git checkout master
git pull origin master
git merge develop
git push origin master

# 3. Vercel auto-deploys to production
# - Monitor build progress in Vercel dashboard
# - Verify https://sicuti-app.vercel.app loads
# - Check dashboard pages are accessible

# 4. If rollback needed:
# - Revert commit: git revert <commit-hash>
# - Push: git push origin master
# - Vercel redeploys old version
```

---

## 4. Continuous Integration & Build

### 4.1 Vercel Build Process

**Automatic on every push**:

```
Push to GitHub
  ↓
Vercel webhook triggered
  ↓
npm install (dependencies)
  ↓
npm run lint (ESLint check)
  ↓
npm run build (Next.js build)
  ↓
If successful: Deploy to edge network
If failed: Build notification sent to GitHub
```

**Build time**: ~2-3 minutes

**Logs**: Vercel dashboard → Project → Deployments → Build Logs

### 4.2 Build Failures

**Common causes**:

1. **Lint errors**: ESLint violations
   - Fix: `npm run lint` locally, fix errors, re-push

2. **Missing env vars**: Supabase keys not in Vercel
   - Fix: Check Vercel dashboard → Settings → Environment Variables

3. **Import errors**: Wrong paths or missing files
   - Fix: Check file exists, verify import statements

4. **Type errors** (if TypeScript added): Type mismatch
   - Fix: Fix type errors, ensure .js files stay (no .ts)

### 4.3 Monitoring Builds

```bash
# Using Vercel CLI (optional)
npm install -g vercel

# Login to Vercel
vercel login

# Check build logs
vercel logs <project-name> --follow

# See deployments
vercel ls
```

---

## 5. Environment Variables Management

### 5.1 Sensitive Credentials

**NEVER commit**:

- `.env.local` (local development)
- `.env.production.local`
- API keys, secrets, passwords

**Use Vercel dashboard**:

1. Go to Project Settings → Environment Variables
2. Add variables
3. Select which environments (Staging / Production / Preview)
4. Redeploy to apply changes

### 5.2 Updating Secrets

```
Staging Supabase credentials change:
  ↓
1. Update keys in Supabase dashboard
2. Add new keys to Vercel (Settings → Environment Variables)
3. Redeploy staging:
   git push origin develop
4. Test on staging
  ↓
Production Supabase credentials change:
  ↓
1. Update keys in Supabase dashboard
2. Add new keys to Vercel (Settings → Environment Variables)
3. Redeploy production:
   git push origin master
4. Verify production works
```

### 5.3 Variable Organization

**Staging Environment Variables** (in Vercel):

```
NEXT_PUBLIC_SUPABASE_URL = https://hylzeqciqpdiooajahow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi...
```

**Production Environment Variables** (in Vercel):

```
NEXT_PUBLIC_SUPABASE_URL = https://jfiujpyezuhrpvgnybvw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi...
```

---

## 6. Database Deployments

### 6.1 Schema Changes (Migrations)

Since SiCuti uses manual SQL migrations (no CLI):

```
1. Create SQL migration file:
   SQL_MIGRATIONS/migration_001_add_field.sql

   Example:
   ALTER TABLE weekly_plans ADD COLUMN semester_data JSONB;

2. Test locally on development database

3. Apply to staging first:
   - Open Supabase dashboard (staging)
   - Go to SQL Editor
   - Copy & paste SQL from migration file
   - Execute
   - Test on staging environment

4. After staging validation:
   - Open Supabase dashboard (production)
   - Go to SQL Editor
   - Run same SQL
   - Verify in production

5. Commit migration to git:
   git add SQL_MIGRATIONS/migration_001_add_field.sql
   git commit -m "migration: add semester_data field to weekly_plans"
   git push origin feat/add-semester-data
```

**Important Notes**:

- Always run migrations on staging FIRST
- Never run untested migrations on production
- Keep migration files in repository for audit trail
- Document what each migration does
- Include rollback SQL (if needed)

### 6.2 RLS Policy Changes

```
1. Test RLS policy changes on staging:
   - Staging Supabase dashboard
   - Authentication → Policies
   - Edit or create policy
   - Test with staging data

2. Verify the policy with:
   - Login as test guru account
   - Verify can only see own data
   - Login as test admin account
   - Verify can see all data

3. Apply to production:
   - Production Supabase dashboard
   - Apply same policy changes
   - Test with production accounts

4. Commit to version control:
   git commit -m "security: update RLS policies for leave_requests"
```

### 6.3 Rollback Strategy

**If migration breaks production**:

```
1. Identify issue immediately via error logs

2. Create rollback migration:
   ALTER TABLE weekly_plans DROP COLUMN semester_data;

3. Apply rollback to production:
   - Supabase SQL Editor (production)
   - Execute rollback SQL
   - Verify application works

4. Fix the original migration locally

5. Test on staging thoroughly

6. Re-apply corrected migration to production

7. Commit rollback + fix:
   git commit -m "rollback: revert semester_data migration"
   git commit -m "fix: correct semester_data migration with proper constraints"
```

---

## 7. Testing Before Production

### 7.1 Staging Test Checklist

**Before merging develop → master**, verify on staging:

```
□ Login as admin
  □ Dashboard loads
  □ Can access all dashboard routes
  □ Can create/edit/delete students
  □ Can create/edit/delete teachers
  □ Can manage calendar events
  □ Can create RPPM lesson plans
  □ Can export reports to CSV

□ Login as guru (teacher)
  □ Dashboard loads
  □ Can see own class only
  □ Cannot see other classes
  □ Can submit leave requests
  □ Cannot delete records (admin only)
  □ Can view own attendance

□ Public pages (no login)
  □ /login page loads
  □ /scan page loads & QR decoder works
  □ /kalendar page loads with events
  □ /rppm/[slug] page loads with lesson plan
  □ Share to WhatsApp buttons work

□ Database operations
  □ Create attendance record via scanner
  □ Create leave request
  □ Approve leave request
  □ Generate bulk QR codes
  □ Import students from CSV

□ Edge cases
  □ Try invalid login (wrong password)
  □ Try accessing /dashboard without login (should redirect)
  □ Try accessing other user's data (should be blocked by RLS)
  □ Try submitting forms with empty fields (validation works)

□ Performance
  □ Dashboard loads in <2s
  □ Reports generate in <5s
  □ No console errors
```

### 7.2 Production Verification

**After merging to master & deployment completes**:

```
1. Verify build succeeded:
   - Vercel dashboard shows green checkmark
   - No error notifications

2. Quick sanity check:
   - Open https://sicuti-app.vercel.app
   - Page loads (should see login screen)
   - No error messages

3. Test critical flow:
   - Login with production account
   - Navigate to dashboard
   - Verify data loads correctly
   - Check attendance records are showing

4. Monitor for errors:
   - Check Vercel deployment logs for runtime errors
   - Monitor Supabase logs for query errors
   - Have team monitor for user-reported issues

5. If issues found:
   - Identify root cause
   - Create hotfix on separate branch
   - Test on staging
   - Merge hotfix to master immediately
```

---

## 8. Rollback Procedures

### 8.1 Code Rollback

**If production code is broken**:

```bash
# Option 1: Revert last commit
git checkout master
git pull origin master
git revert HEAD
git push origin master
# Vercel auto-deploys reverted code (~2 min)

# Option 2: Deploy previous working version
git checkout master
git log --oneline  # Find last good commit
git reset --hard <commit-hash>
git push -f origin master  # Force push reverted state
# Vercel auto-deploys
```

**Note**: Force push only for emergencies. Document why in commit message.

### 8.2 Database Rollback

**If production database migration broke queries**:

```
1. Open Supabase dashboard (production)
2. Go to SQL Editor
3. Execute rollback migration:
   ALTER TABLE weekly_plans DROP COLUMN semester_data;
4. Verify application works again
5. Commit rollback to git
6. Fix the migration & re-test on staging
7. Re-apply corrected migration when ready
```

---

## 9. Environment Parity

Keep staging & production as similar as possible:

| Component             | Staging             | Production      |
| --------------------- | ------------------- | --------------- |
| Next.js version       | Same (package.json) | Same            |
| Supabase schema       | Mirror              | Mirror          |
| Supabase RLS policies | Same                | Same            |
| Environment variables | Similar (diff keys) | Similar         |
| Node.js version       | Vercel defaults     | Vercel defaults |
| Tailwind CSS config   | Same                | Same            |

**Checklist**:

- [ ] Staging & Production Supabase projects have identical schema
- [ ] RLS policies are identical (except for testing accounts)
- [ ] Staging data is fresh (mirrors production structure)
- [ ] Both environments run the same Next.js version
- [ ] Both use the same environment variable names (different values)

---

## 10. Monitoring Deployments

### 10.1 Vercel Dashboard

**Check deployment status**:

1. Go to https://vercel.com
2. Select project (sicuti-staging or sicuti-app)
3. View "Deployments" tab
4. Click on latest deployment to see:
   - Build logs
   - Errors (if any)
   - Deployment time
   - Environment variables used
   - Preview URL (for preview deployments)

### 10.2 Git Integration

**Automatic notifications**:

- Vercel posts deployment status to GitHub pull requests
- Status badges show build success/failure
- Check deployment before merging PR

### 10.3 Supabase Logs

**Monitor database queries**:

1. Go to Supabase dashboard
2. Select project
3. Logs tab shows:
   - SQL queries
   - Auth events
   - Errors
   - Performance metrics

**Check for issues**:

```sql
-- Slow queries (take >1 second)
-- High error rates
-- Permission denied (RLS) errors
-- Unexpected query patterns
```

---

## 11. Scaling Considerations

### 11.1 Performance Monitoring

**Set up alerts for**:

- Build time > 5 minutes
- API response time > 2 seconds
- Database queries > 1 second
- Error rate > 1%
- Disk space usage > 80%

### 11.2 Capacity Planning

**When to scale**:

- Database size > 10GB (upgrade Supabase plan)
- Active users > 500 concurrent (Vercel auto-scales)
- Response time degradation (add indexes, optimize queries)
- Storage needs > plan limit (upgrade)

### 11.3 Scheduled Maintenance

```
Monthly:
- Review error logs
- Optimize slow queries
- Clean up old logs
- Update dependencies

Quarterly:
- Database backup verification
- Security audit
- Load testing
- Capacity planning review
```

---

## 12. Disaster Recovery

### 12.1 Data Backup

**Supabase automatic backups**:

- Daily backups (included with pro plan)
- 7-day retention
- Manual backups available via Supabase dashboard

**Restore from backup**:

1. Supabase dashboard → Backups
2. Select backup date
3. Review changes (what was restored)
4. Confirm restore
5. Database reverts to that point in time

**Manual backup**:

```bash
# Export production database
pg_dump postgresql://[user]:[password]@[host]:[port]/[db] > backup.sql

# Keep in safe location (GitHub, cloud storage)
```

### 12.2 Application Disaster

**If entire production site is down**:

1. **Verify issue**:
   - Is it DNS (domain not resolving)?
   - Is it Vercel (deployment broken)?
   - Is it Supabase (database down)?
   - Is it network?

2. **Check status pages**:
   - https://www.vercel-status.com (Vercel status)
   - https://status.supabase.com (Supabase status)

3. **If Vercel issue**: Wait for Vercel team or rollback last commit
4. **If Supabase issue**: Use backup to restore
5. **If our code issue**:
   - Rollback to last working commit
   - Or redeploy with manual fix

---

## 13. Troubleshooting

### Issue: Build fails with "env variable not found"

**Solution**:

1. Check variable is defined in Vercel project settings
2. Variable should be in correct environment (Staging/Production/Preview)
3. For NEXT*PUBLIC* variables: visible in browser code
4. For server variables: only in API routes
5. Redeploy after adding variable: `git push`

### Issue: Deployment stuck in "Building"

**Solution**:

1. Vercel dashboard → Settings → Git
2. Rebuild deployment: Click "..." → Redeploy
3. Or push empty commit: `git commit --allow-empty -m "retry build"`
4. Check build logs for errors

### Issue: Staging works but production broken

**Solution**:

1. Verify environment variables are correct (different Supabase projects)
2. Check production database has data
3. Compare recent commits to what's on master vs develop
4. Rollback if needed

### Issue: Supabase connection timeout

**Solution**:

1. Check Supabase project is not paused
2. Verify Supabase URL in env vars is correct
3. Check network connectivity
4. Restart application

---

## 14. Deployment Checklist

**Before pushing to develop (staging)**:

- [ ] Code tested locally
- [ ] No console errors
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds locally: `npm run build`
- [ ] Database migrations tested (if any)
- [ ] Commit message is clear

**Before merging to master (production)**:

- [ ] Tested on staging (all flows in test checklist)
- [ ] Code review approved
- [ ] RLS policies verified
- [ ] No database locks or pending migrations
- [ ] On-call person notified
- [ ] Rollback plan prepared (if needed)

**After production deployment**:

- [ ] Build succeeds in Vercel
- [ ] Application loads without errors
- [ ] Quick sanity test (login, view dashboard)
- [ ] Monitor error logs for 30 minutes
- [ ] Confirm with team that everything works

---

## 15. Quick Reference

| Task                 | Command / URL                                        |
| -------------------- | ---------------------------------------------------- |
| Start local dev      | `npm run dev` → http://localhost:3000                |
| Lint check           | `npm run lint`                                       |
| Build locally        | `npm run build && npm run start`                     |
| Deploy to staging    | `git push origin develop`                            |
| Deploy to production | `git push origin master`                             |
| View staging         | https://sicuti-staging.vercel.app                    |
| View production      | https://sicuti-app.vercel.app                        |
| Vercel dashboard     | https://vercel.com                                   |
| Supabase staging     | https://app.supabase.com (select staging project)    |
| Supabase production  | https://app.supabase.com (select production project) |
| GitHub repo          | https://github.com/yralkautsar/sicuti-app            |

---

This deployment guide is current as of June 2026 and covers all aspects of managing SiCuti across environments.
