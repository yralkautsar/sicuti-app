'use client'

import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── New Design System ──
const C = {
  primary:  '#A78BFA',
  accent:   '#442F78',
  surface:  '#FFFFFF',
  bg:       '#FAFAFA',
  border:   '#EAB6FF',
  primaryBg: 'rgba(167,139,250,0.12)',
}

const ALL_NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    roles: ['admin', 'guru'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    href: '/dashboard/kelas',
    label: 'Kelas',
    roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
  {
    href: '/dashboard/guru',
    label: 'Data Guru',
    roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
  {
    href: '/dashboard/murid',
    label: 'Data Murid',
    roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    href: '/dashboard/laporan',
    label: 'Laporan',
    roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  },
  {
    href: '/dashboard/kalendar',
    label: 'Kalendar',
    roles: ['admin', 'guru'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
  },
  {
    href: '/dashboard/cuti',
    label: 'Cuti Guru',
    roles: ['admin', 'guru'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  },
  {
    href: '/dashboard/qr-massal',
    label: 'Print QR',
    roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg>
  },
  {
    href: '/dashboard/profil',
    label: 'Profil Saya',
    roles: ['admin', 'guru'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
  },
]

export default function Sidebar({ profile, pendingCuti = 0, className = '' }) {
  const pathname = usePathname()
  const router   = useRouter()

  const isAdmin = profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'
  const userRole = isAdmin ? 'admin' : 'guru'

  const navItems = ALL_NAV.filter(item => item.roles.includes(userRole))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className={`w-60 flex flex-col flex-shrink-0 ${className}`}
      style={{ background: C.surface, borderRight: `1px solid ${C.border}`, fontFamily: "'Karla', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Karla:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <img src="/logoborder.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <div className="font-bold text-xs leading-tight" style={{ fontFamily: "'Rubik', sans-serif", color: C.accent }}>Mutiara Bunda</div>
            <div className="text-xs" style={{ color: C.primary, letterSpacing: '0.05em' }}>SiCuti v1.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <a key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={active
                ? { background: C.primaryBg, color: C.accent, fontWeight: 600 }
                : { color: '#6b7280' }}>
              <span style={{ color: active ? C.primary : '#9ca3af' }}>{icon}</span>
              {label}
              {label === 'Cuti Guru' && pendingCuti > 0 && isAdmin && (
                <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: '#ef4444', fontSize: 10 }}>
                  {pendingCuti}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Scan tablet shortcut */}
      <div className="px-3 pb-3">
        <a href="/scan" target="_blank"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: C.primaryBg, color: C.accent }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Halaman Scan Tablet
        </a>
      </div>

      {/* User info + logout */}
      <div className="px-4 py-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent})` }}>
            {profile?.full_name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: C.accent, fontFamily: "'Rubik', sans-serif" }}>{profile?.full_name || 'Admin'}</div>
            <div className="text-xs truncate" style={{ color: C.primary }}>
              {profile?.jabatan || profile?.role || 'admin'}
            </div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ color: '#9ca3af' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  )
}