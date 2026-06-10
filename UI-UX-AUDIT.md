# SiCuti — Comprehensive UI/UX Audit & Optimization Guide

**Date**: June 2026  
**Product**: SiCuti (School Attendance & Operations System)  
**Target**: TK Karakter Mutiara Bunda Bali  
**Current Status**: v1.0.0 in production

---

## Executive Summary

**Overall Assessment**: **Good Foundation, Actively Improving** ✓

SiCuti has a **solid design system** (purple theme, consistent typography, custom components) and **good fundamentals** (role-based access, responsive layouts, sidebar navigation). Several UX issues have been resolved since the initial audit. Remaining opportunities are in accessibility, mobile UX, and visual consistency.

**Priority Issues Remaining**: 5  
**Low-Hanging Fruit**: 3 (quick wins)  
**Scalability Blockers**: 2 (address before growth)

### Recently Resolved ✅
- **Form error messages** — `lib/errorMessages.js` created; maps DB errors to Indonesian user-friendly strings. Used in kelas, guru, and murid pages.
- **Button loading states** — `isSubmitting` pattern implemented across all major forms (guru, murid, kelas, weekly-plan). Spinner + disabled state on submit.
- **Forgot password** — Full forgot password flow added inline in login page (modal).
- **Reset password** — Dedicated `/reset-password` page with token validation and show/hide password toggle.
- **QR Massal progress** — Progress bar (`progress` + `progressLabel` state) added to qr-massal page.
- **Print support** — `@media print` CSS added to laporan/page.js; PDF export via jsPDF + html2canvas for QR massal.

---

## 1. CRITICAL Issues (Must Fix Before Scaling)

### 1.1 **Accessibility Contrast Failures**

**Issue**: Some text combinations fail WCAG AA (4.5:1) standard.

**Examples**:

- Login page subtitle: `color: 'rgba(255,255,255,0.45)'` on dark purple background (~2:1 ratio) ❌
- Dashboard secondary text: `color: '#A8A29E'` (inkFaint) on white background (~3:1 ratio) ❌
- Error text colors may not meet 4.5:1 on all backgrounds

**Impact**:

- Fails WCAG AA compliance (legal risk for schools, federal regulations in some regions)
- Hard to read for low-vision users, older teachers, mobile use in sunlight
- Reduces user confidence in the platform

**Fix**:

```javascript
// BEFORE (theme.js)
export const COLORS = {
  inkFaint: "#A8A29E", // ~3:1 on white — fails AA
};

// AFTER — Use darker secondary text
export const COLORS = {
  inkFaint: "#6B7280", // ~5:1 on white — passes AAA
};

// For light text on dark backgrounds:
// rgba(255,255,255,0.45) → rgba(255,255,255,0.87) (87% opacity)
// Ratios on #442F78: ~6.5:1 ✓
```

**Apply to**:

- `dashboard/page.js` line 159 — time display secondary text
- `login/page.js` line 147 — "Gunakan email..." text
- `kelas/page.js` — any secondary labels

**Effort**: 30 min | **Impact**: High (compliance + accessibility)

---

### 1.2 **Touch Target Sizes Too Small on Mobile**

**Issue**: Several interactive elements fail the 44×44pt minimum (Apple HIG / Material Design).

**Examples**:

- Icon buttons in sidebar (line 21-40, Sidebar.js): `width="18" height="18"` with only `px-3 py-2.5` padding
  - Calculated: 18 + 12 = 30pt (fails minimum)
- Status badges: `text-xs px-1.5 py-0.5` = ~16×16pt (fails)
- Close/delete icon buttons (if any) likely too small

**Impact**:

- Teachers on tablets or with large fingers make mis-taps → frustration, wrong deletions
- Elderly users (common in schools) struggle with precise tapping
- Violates platform guidelines (Apple HIG, Material Design)

**Fix**:

```javascript
// BEFORE — Sidebar nav items
<a className="flex items-center gap-3 px-3 py-2.5 rounded-xl..."
// py-2.5 = 10pt vertical, 18px icon = ~30pt total height (FAIL)

// AFTER — Increase padding for touch
<a className="flex items-center gap-3 px-3 py-3 rounded-xl..."
// py-3 = 12pt vertical, 18px icon = ~36pt, but 44pt tap target requires larger padding or hover area
// Better: use hitArea expansion via CSS
style={{
  minHeight: '44px',  // Explicit 44pt minimum
  display: 'flex',
  alignItems: 'center'
}}

// Icon buttons in forms
<button style={{ width: '44px', height: '44px' }} />  // Always 44×44
```

**Apply to**:

- Sidebar nav items (Sidebar.js lines 115-130)
- Delete/edit icon buttons (kelas/page.js, murid/page.js, guru/page.js)
- Status toggle buttons (attendance UI)

**Effort**: 1-2 hours | **Impact**: High (mobile UX, accessibility)

---

### 1.3 **Missing Focus Indicators (Keyboard Navigation)**

**Issue**: No visible focus ring on interactive elements when using Tab key.

**Current**: `input:focus { outline: none; }` (login/page.js line 67) removes focus completely!

**Impact**:

- Teachers using keyboard-only input methods cannot navigate
- Screen reader users get lost
- Fails WCAG AA requirement (2.4.7 Focus Visible)

**Fix**:

```css
/* BEFORE (removes focus) */
input:focus {
  outline: none;
} /* ❌ */

/* AFTER (restore + enhance) */
input:focus,
button:focus,
a:focus {
  outline: 2px solid #a78bfa; /* Your purple accent */
  outline-offset: 2px;
  border-radius: 4px;
}

/* For Tailwind, add to globals.css: */
@layer components {
  @focus-visible {
    outline: 2px solid #a78bfa;
    outline-offset: 2px;
  }
}
```

**Apply globally** in `app/globals.css`

**Effort**: 30 min | **Impact**: High (accessibility, keyboard users)

---

## 2. HIGH Priority Issues (Address in Next Sprint)

### ~~2.1 Form Error Handling Is Too Generic~~ ✅ RESOLVED

`lib/errorMessages.js` created with `getUserFriendlyErrorMessage(error)`. Handles: duplicate key, not-null, foreign key, RLS/permission, network, timeout, invalid format, rate limit. Imported and used in kelas, guru, and murid pages. Weekly-plan pages still use raw `alert(error.message)` — extend if needed.

---

### 2.2 **Empty States Missing Throughout**

**Issue**: Pages with no data show nothing (blank page = confusing).

**Examples**:

- Murid page with no students imported
- RPPM list when no lesson plans created yet
- Leave requests when no requests submitted

**Better Pattern**:

```javascript
if (classes.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        {/* Illustrative icon */}
      </svg>
      <h3
        style={{ color: "#442F78", marginTop: "16px" }}
        className="font-bold text-lg"
      >
        Belum ada kelas
      </h3>
      <p
        style={{ color: "#78716C", marginTop: "8px" }}
        className="text-sm max-w-xs"
      >
        Mulai dengan menambahkan kelas tahun ajaran ini.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="mt-6 px-4 py-2 rounded-lg text-white font-medium"
        style={{ background: "#A78BFA" }}
      >
        + Tambah Kelas
      </button>
    </div>
  );
}
```

**Apply to**:

- kelas/page.js (when no classes)
- murid/page.js (when no students)
- guru/page.js (when no teachers)
- weekly-plan/page.js (when no RPPM)
- laporan/page.js (when no attendance for date)

**Effort**: 3-4 hours | **Impact**: Medium (UX clarity, reduces user confusion)

---

### 2.3 **Loading States Inconsistent**

**Issue**: Some pages show spinners, others don't. Users don't know if page is loading or broken.

**Current**:

- Dashboard page (line 168-171): Spinner when loading ✓
- Kelas page: No loading indicator while fetching classes (line 44-67) ❌
- Murid page: Unclear if data is loading ❌

**Better Pattern** (Skeleton Screen for faster perceived load):

```javascript
// Instead of blank page + spinner, show placeholder structure
const LoadingKelas = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
    ))}
  </div>
);

// Use in render:
{
  loading ? <LoadingKelas /> : <KelasContent />;
}
```

**Apply to**: kelas, murid, guru, laporan pages

**Effort**: 2-3 hours | **Impact**: Medium (perceived performance)

---

### 2.4 **Mobile Responsiveness Gaps**

**Issue**: Some pages don't stack properly on mobile (< 375px).

**Examples**:

- Dashboard stat cards (line 183 `grid grid-cols-4`): Becomes 4 columns on mobile = tiny cards
- Tables (attendance, teacher list): No horizontal scroll affordance, text truncates

**Fix**:

```javascript
// BEFORE — 4 columns on all screen sizes
<div className="grid grid-cols-4 gap-4 mb-6">

// AFTER — Responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 4 columns
```

**Apply to**:

- dashboard/page.js line 183 (stat cards)
- kelas/page.js (class list)
- Any tables (add horizontal scroll wrapper on mobile)

**Effort**: 2-3 hours | **Impact**: High (mobile users = teachers in field)

---

## 3. MEDIUM Priority Issues (Improve in Next 2 Sprints)

### ~~3.1 Button States & Feedback Missing~~ ✅ RESOLVED

`isSubmitting` state pattern implemented across all major forms. Submit buttons show spinner + "Menyimpan..." + `disabled` during async operations. Applies to: guru create/edit, murid create/edit, kelas forms, WeeklyPlanForm tambah/edit. Delete confirmations still use `window.confirm()` — acceptable for now.

---

### 3.2 **Color System Underutilized**

**Issue**: Theme colors defined but not used consistently. Colors hardcoded in pages instead of using theme tokens.

**Current**:

- dashboard/page.js line 9-12: Colors defined locally (purple, purple50, etc.)
- Not imported from theme.js
- Inconsistent across pages

**Fix**: Centralize in theme.js, import everywhere:

```javascript
// lib/theme.js
export const COLORS = {
  // ... existing
  // Add semantic tokens for states:
  success: '#16A34A',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
}

// dashboard/page.js
import { COLORS } from '@/lib/theme'

// Use:
<div style={{ color: COLORS.accent }}>
```

**Benefit**: Easier theming, dark mode support, consistency

**Effort**: 4-5 hours refactor | **Impact**: Medium (maintainability, future theming)

---

### 3.3 **Animations Feel Generic**

**Issue**: Fade-up animations on dashboard are present but feel slow/stiff.

**Current** (dashboard/page.js line 126-136):

```javascript
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px) }
  to { opacity: 1; transform: translateY(0) }
}
.fu  { animation: fadeUp .4s ease both; }
.fu1 { animation: fadeUp .4s ease .08s both; }
```

**Issue**:

- All animations use `ease` (slow in, slow out) → feels floaty
- 0.4s is slightly slow for micro-interactions
- Stagger (0.08s) is too subtle; humans perceive above 0.1s

**Better**:

```javascript
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px) }  /* Less distance = faster */
  to { opacity: 1; transform: translateY(0) }
}

/* Use easing that feels snappy */
.fu  { animation: fadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both; } /* Material easeOut */
.fu1 { animation: fadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.08s both; }
.fu2 { animation: fadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.16s both; }
```

**Apply to**: dashboard/page.js, login/page.js, all modal entrances

**Effort**: 1-2 hours | **Impact**: Low→Medium (perceived quality)

---

## 4. LOW Priority Issues (Nice to Have)

### 4.1 **Icons Could Be More Consistent**

**Current**: Mix of inline SVGs with different stroke-widths and sizes.

**Recommendation**: Use a single icon family (e.g., Lucide React, Heroicons) consistently.

```bash
npm install lucide-react
```

```javascript
// Instead of:
<svg width="18" height="18" viewBox="0 0 24 24"...

// Use:
import { Calendar, Users, FileText } from 'lucide-react'

<Calendar size={20} className="text-[#A78BFA]" />
```

**Benefit**: Consistent stroke width, easier to maintain, themed icons

**Effort**: 6-8 hours refactor | **Impact**: Low (polish)

---

### ~~4.2 Print Styles Missing~~ ✅ RESOLVED

- `laporan/page.js` — `@media print` CSS implemented (hides nav, expands table for print)
- `qr-massal/page.js` — PDF export via `html2canvas` + `jsPDF`; 4×2 ID cards per A4 landscape page; progress bar shows generation progress
- `scan/page.js` — `.no-print` class on login/panduan buttons

---

## 5. Scalability Considerations (Design System)

### For 2-3 Teachers → 10+ Teachers & Multiple Schools

**What Will Break**:

1. **Sidebar grows**: 10+ navigation items overflow on mobile
2. **Data pages**: Tables with 100+ rows become slow (no virtualization)
3. **Color consistency**: Hardcoded colors scattered across pages become hard to maintain
4. **Mobile UX**: Fixed heights, hardcoded widths become brittle

**Prevention**:

**1. Extract Color System → Design Tokens** (Priority: HIGH)

```javascript
// lib/tokens.js — Single source of truth
export const tokens = {
  // Semantic colors
  primary: '#A78BFA',
  primaryHover: '#8B5CF6',
  secondary: '#442F78',
  surface: '#FFFFFF',
  background: '#FAFAFA',

  // Status colors (consistent across all pages)
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',

  // Spacing scale (prevents arbitrary values)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Responsive breakpoints
  breakpoints: {
    mobile: '375px',
    tablet: '768px',
    desktop: '1024px',
  }
}

// dashboard/page.js
import { tokens } from '@/lib/tokens'
style={{ color: tokens.primary }}
```

**2. Adaptive Navigation** (Priority: MEDIUM)

```javascript
// For 10+ items, switch to collapsible sections
<nav>
  <section>
    <h3>Data Murid & Guru</h3>
    <a>Data Guru</a>
    <a>Data Murid</a>
    <a>Kelas</a>
  </section>
  <section>
    <h3>Operasional</h3>
    <a>Absensi</a>
    <a>Laporan</a>
    <a>Cuti Guru</a>
  </section>
</nav>
```

**3. Virtualized Tables** (Priority: HIGH if 100+ rows expected)

```javascript
import { FixedSizeList } from "react-window";

<FixedSizeList
  height={600}
  itemCount={students.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => <StudentRow student={students[index]} style={style} />}
</FixedSizeList>;
```

---

## 6. Quick Wins (Can Complete This Week)

| Issue                           | Status  | Fix                                        | Time    | Impact       |
| ------------------------------- | ------- | ------------------------------------------ | ------- | ------------ |
| **Focus indicators missing**    | Open    | Add focus ring CSS globally                | 30 min  | High (a11y)  |
| **Contrast failures**           | Open    | Update theme.js colors                     | 30 min  | High (a11y)  |
| **Login subtitle hard to read** | Open    | Increase opacity rgba(255,255,255,0.87)    | 15 min  | Medium       |
| **No empty states**             | Open    | Add 4-5 empty state components             | 3 hours | Medium (UX)  |
| **Touch targets too small**     | Open    | Set min-height/width 44px on buttons/icons | 1 hour  | High (a11y)  |
| **Print QR codes**              | ✅ Done | PDF via jsPDF + html2canvas                | —       | —            |
| **Form error messages**         | ✅ Done | lib/errorMessages.js created               | —       | —            |
| **Button loading states**       | ✅ Done | isSubmitting pattern in all major forms    | —       | —            |
| **Animation timing**            | Open    | Update .4s → 0.3s, ease → easeOut          | 30 min  | Low (polish) |

**Remaining open quick wins**: ~5 hours → Focus indicators + contrast + empty states

---

## 7. 3-Month Roadmap

### Month 1 (Completed ✅)

- ✅ Form error messages — `lib/errorMessages.js` done
- ✅ Button loading states — `isSubmitting` pattern done
- ✅ Print/PDF for QR massal and laporan — done
- ✅ Forgot password + reset password — done
- ✅ RPPM public page redesign — timeline view done
- ✅ Panduan page — public usage guide done
- ⬜ Fix accessibility (contrast, focus, touch targets) — still open
- ⬜ Add empty states — still open
- ⬜ Mobile responsiveness gaps — still open

### Month 2 (Next)

- Fix remaining accessibility issues (contrast, focus rings, touch targets 44px)
- Add empty state components for kelas, murid, guru, weekly-plan, laporan
- Extract color system to tokens (replace local color constants in each page)
- Upgrade animations (0.3s + easeOut)

### Month 3

- Prepare for multi-school scaling (adaptive nav, virtualized lists)
- RPPM PDF export (jsPDF + html2canvas already in project)
- Laporan empty state for holidays/weekends
- User testing & refinement

---

## 8. Accessibility Checklist (Before Each Release)

- [ ] Contrast: All text >= 4.5:1 (AA) or 7:1 (AAA)
- [ ] Focus rings: Visible on all interactive elements (Tab navigation)
- [ ] Touch targets: Minimum 44×44pt (no hidden taps)
- [ ] Labels: All form fields have visible labels (not placeholder-only)
- [ ] Error messages: Clear, specific, near the field
- [ ] Color not alone: Never convey status by color only (add icon/text)
- [ ] Keyboard nav: Full navigation without mouse
- [ ] Alt text: Meaningful descriptions on images (QR codes need alt: "QR code for XXXXXX")
- [ ] Reduced motion: Animations respect prefers-reduced-motion
- [ ] Screen reader: Tested with VoiceOver (iOS) or TalkBack (Android)

---

## 9. Final Recommendations

### For Next Release (2-3 weeks)

**Focus on Accessibility + Empty States**

1. Fix contrast failures (30 min)
2. Restore focus indicators (30 min)
3. Increase touch target sizes (1-2 hours)
4. Add empty state components (3 hours)

**Expected Impact**: High compliance score, reduced support tickets, better mobile experience

### For Production Readiness (1-2 months)

1. Extract token system (color, spacing, breakpoints)
2. Add loading/skeleton states
3. Enhance form UX (error messages, validation)
4. Test on actual school devices (teacher tablets, admin phones)

### For Scaling (3-6 months)

1. Prepare navigation for 10+ items (accordion/collapsible)
2. Virtualize large lists (100+ students)
3. Dark mode support (via tokens)
4. Multi-school support (branding flexibility)

---

## Conclusion

**SiCuti's UI is well-structured** with good fundamentals. The **main opportunities** are in **accessibility compliance** (critical for schools), **mobile UX** (teachers use tablets), and **scalability preparation** (token system, adaptive navigation).

Addressing the **critical + high priority items** (6-8 hours of work) will result in a **significantly improved product** that's:

- ✅ Accessible to all users (legal compliance)
- ✅ Mobile-friendly (field use)
- ✅ Maintainable (token system)
- ✅ Ready to scale (adaptive patterns)

**Next Step**: Start with Quick Wins this week. Build a stronger foundation for growth.

---

**Questions?** Refer to:

- Accessibility: WCAG 2.1 Guidelines (https://www.w3.org/WAI/WCAG21/quickref/)
- Mobile: Apple HIG (https://developer.apple.com/design/human-interface-guidelines/), Material Design (https://material.io/design)
- React patterns: React docs
- Tailwind: Tailwind CSS docs (https://tailwindcss.com)
