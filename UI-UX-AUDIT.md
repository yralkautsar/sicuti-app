# SiCuti — UI/UX Backlog

**Product**: SiCuti · TK Karakter Mutiara Bunda Bali  
**Updated**: June 2026  
**Scope**: Hanya item yang belum dikerjakan, urut dari impact tertinggi ke terendah.

---

## Sudah Selesai ✅

- Form error messages → `lib/errorMessages.js` (kelas, guru, murid)
- Button loading states → `isSubmitting` pattern di semua form utama
- Print/PDF → `@media print` di laporan, jsPDF + html2canvas di qr-massal
- Forgot password + reset password → inline modal + `/reset-password` page
- QR Massal progress bar → `progress` + `progressLabel` state
- RPPM public page → timeline view dengan dot connector
- Panduan page → `/panduan` public usage guide

---

## Backlog

### 🔴 1. Focus Indicators (Keyboard Navigation)

**Impact**: WCAG AA compliance — keyboard & screen reader users  
**Effort**: 30 menit

`outline: none` aktif di login, reset-password, dan weekly-plan pages — menghilangkan focus ring sepenuhnya. Guru yang pakai keyboard tidak bisa navigasi.

**Fix** — tambahkan ke `app/globals.css`:
```css
/* Ganti outline:none dengan focus-visible yang proper */
*:focus { outline: none; }
*:focus-visible {
  outline: 2px solid #A78BFA;
  outline-offset: 2px;
  border-radius: 4px;
}
```
Hapus semua `input:focus { outline: none; }` di file individual setelah ini diterapkan.

---

### 🔴 2. Contrast Failures (WCAG AA)

**Impact**: Keterbacaan — guru senior, layar tablet di luar ruangan  
**Effort**: 30 menit

Beberapa kombinasi warna gagal rasio 4.5:1:
- `rgba(255,255,255,0.45)` di login sidebar kiri (`login/page.js` baris 103) → ~2:1 ❌
- `#A8A29E` (inkFaint) di teks sekunder atas latar putih → ~3:1 ❌

**Fix**:
```
rgba(255,255,255,0.45) → rgba(255,255,255,0.75)   // pada bg #442F78: ~5:1 ✓
inkFaint #A8A29E       → #78716C (inkDim)          // pada bg putih: ~4.6:1 ✓
```
Terapkan di: `login/page.js` baris 103–107, semua penggunaan `inkFaint` sebagai teks utama.

---

### 🟠 3. Touch Targets Terlalu Kecil

**Impact**: Mis-tap di tablet — guru yang pakai touchscreen saat piket  
**Effort**: 1–2 jam

Minimum 44×44px (Apple HIG / Material Design):
- Nav sidebar (`Sidebar.js`): `py-2.5` + ikon 18px = ~30px ❌
- Tombol ikon hapus/edit di kelas, murid, guru: `p-1` atau `p-1.5` = ~24px ❌
- Badge/toggle status: `px-1.5 py-0.5` = ~16px ❌

**Fix**:
```jsx
// Sidebar nav items
className="flex items-center gap-3 px-3 rounded-xl"
style={{ minHeight: '44px' }}

// Icon-only buttons
className="flex items-center justify-center rounded-lg"
style={{ width: '44px', height: '44px' }}
```

---

### 🟠 4. Empty States

**Impact**: UX clarity — admin/guru baru bingung saat data kosong  
**Effort**: 3–4 jam

Halaman menampilkan area kosong tanpa penjelasan saat belum ada data:

| Halaman | Kondisi kosong | CTA yang perlu ada |
|---|---|---|
| `kelas/page.js` | Belum ada kelas | Tombol "Tambah Kelas" |
| `murid/page.js` | Belum ada murid | Tombol "Import CSV" atau "Tambah Manual" |
| `guru/page.js` | Belum ada guru | Tombol "Tambah Guru" |
| `weekly-plan/page.js` | Belum ada RPPM | Tombol "Buat RPPM" |
| `laporan/page.js` | Tidak ada data hari/bulan itu | Teks penjelasan (libur/belum ada absensi) |

**Pattern**:
```jsx
{data.length === 0 && (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: 'rgba(167,139,250,0.1)' }}>
      {/* icon */}
    </div>
    <p className="font-semibold mb-1" style={{ color: '#442F78' }}>Belum ada [entitas]</p>
    <p className="text-sm mb-5" style={{ color: '#78716C' }}>[deskripsi singkat]</p>
    <button onClick={...} style={{ background: '#442F78', color: '#fff' }}
      className="px-4 py-2 rounded-xl text-sm font-semibold">
      + [CTA]
    </button>
  </div>
)}
```

---

### 🟠 5. Mobile Responsiveness — Dashboard & Tables

**Impact**: Guru yang buka dashboard dari HP (layar < 400px)  
**Effort**: 2–3 jam

- **Dashboard stat cards** (`dashboard/page.js`): `grid grid-cols-4` → jadi 4 kolom kecil di mobile
- **Tabel laporan & data guru/murid**: tidak ada horizontal scroll affordance, teks terpotong

**Fix**:
```jsx
// Stat cards
className="grid grid-cols-2 md:grid-cols-4 gap-4"

// Tabel — bungkus dengan scroll container
<div className="overflow-x-auto rounded-2xl">
  <table className="min-w-[600px] w-full">...</table>
</div>
```

---

### 🟡 6. Loading Skeleton States

**Impact**: Perceived performance — halaman terasa lebih cepat  
**Effort**: 2–3 jam

Beberapa halaman tidak punya loading indicator — terasa "hang" sebelum data muncul:
- `kelas/page.js` — tidak ada spinner/skeleton saat fetch
- `murid/page.js` — tidak ada spinner/skeleton
- `guru/page.js` — tidak ada spinner/skeleton

Dashboard dan weekly-plan view sudah punya spinner — konsistenkan ke halaman lain.

**Fix** — skeleton sederhana:
```jsx
{loading ? (
  <div className="space-y-3">
    {[1,2,3].map(i => (
      <div key={i} className="h-16 rounded-xl animate-pulse"
        style={{ background: '#F3F4F6' }} />
    ))}
  </div>
) : <Content />}
```

---

### 🟡 7. Centralisasi Color Token

**Impact**: Maintainability — sekarang warna didefinisikan ulang di setiap page  
**Effort**: 4–5 jam refactor

Setiap page mendefinisikan lokalnya sendiri (`const purple = '#A78BFA'`, `const accent = '#442F78'`, dll). `lib/theme.js` sudah ada tapi tidak dipakai konsisten.

**Fix** — import dari `@/lib/theme` di semua page:
```js
import { COLORS, FONTS } from '@/lib/theme'
// COLORS.accent, COLORS.primary, COLORS.border, dll
```

Sekaligus tambahkan status colors yang belum ada di theme.js:
```js
// Tambahkan ke lib/theme.js
success:    '#16A34A',
successBg:  '#F0FDF4',
warning:    '#D97706',
warningBg:  '#FFFBEB',
error:      '#DC2626',
errorBg:    '#FEF2F2',
```

---

### 🟢 8. Animation Timing

**Impact**: Polish — animasi terasa sedikit lambat/floaty  
**Effort**: 30 menit

Semua animasi pakai `ease` (slow in slow out) dengan durasi 0.4s — terasa berat untuk micro-interaction.

**Fix** — ganti di semua `<style>` tag yang punya `.fu`:
```css
/* Sebelum */
animation: fadeUp .4s ease both;

/* Sesudah */
animation: fadeUp 0.28s cubic-bezier(0.4, 0, 0.2, 1) both;
/* translateY: 12px → 8px juga terasa lebih ringan */
```

---

### 🟢 9. Konsistensi Icon

**Impact**: Polish — stroke-width dan ukuran SVG tidak seragam antar page  
**Effort**: 6–8 jam (besar, tidak mendesak)

Semua icon adalah inline SVG manual dengan variasi `strokeWidth` (1.5 vs 2 vs 2.5) dan ukuran (14 vs 15 vs 16 vs 18 vs 20px).

**Opsi** (konfirmasi sebelum mulai — butuh npm package baru):
```bash
npm install lucide-react
```
```jsx
import { Users, Calendar, FileText } from 'lucide-react'
<Users size={18} strokeWidth={1.75} />
```

Jangan mulai sebelum diskusi — scope besar dan menyentuh semua page.

---

## Ringkasan Prioritas

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Focus indicators | 30 mnt | 🔴 WCAG AA |
| 2 | Contrast fixes | 30 mnt | 🔴 WCAG AA |
| 3 | Touch targets 44px | 1–2 jam | 🟠 Mobile UX |
| 4 | Empty states | 3–4 jam | 🟠 UX clarity |
| 5 | Mobile responsiveness | 2–3 jam | 🟠 Mobile UX |
| 6 | Loading skeletons | 2–3 jam | 🟡 Perceived perf |
| 7 | Color token system | 4–5 jam | 🟡 Maintainability |
| 8 | Animation timing | 30 mnt | 🟢 Polish |
| 9 | Icon consistency | 6–8 jam | 🟢 Polish |

**Quick wins sekarang** (item 1 + 2 + 8): ~1.5 jam total untuk dampak a11y yang langsung terasa.
