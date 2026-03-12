'use client'

import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const purple   = '#6d28d9'
const purple50 = '#f5f3ff'

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
    href: '/dashboard/cuti',
    label: 'Cuti Guru',
    roles: ['admin', 'guru'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  },
  {
    href: '/dashboard/qr-massal',
    label: 'Print QR',
    roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg>
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
    <aside className={`w-60 flex flex-col border-r border-gray-100 bg-white flex-shrink-0 ${className}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <div className="font-bold text-gray-900 text-xs leading-tight">Mutiara Bunda</div>
            <div className="text-gray-400 text-xs" style={{ fontFamily: 'DM Mono', letterSpacing: '0.05em' }}>SiCuti v1.0</div>
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
              style={active ? { background: purple50, color: purple } : { color: '#6b7280' }}>
              <span style={{ color: active ? purple : '#9ca3af' }}>{icon}</span>
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
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: purple50, color: purple }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Halaman Scan Tablet
        </a>
      </div>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: purple }}>
            {profile?.full_name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name || 'Admin'}</div>
            <div className="text-xs text-gray-400 truncate" style={{ fontFamily: 'DM Mono' }}>
              {profile?.jabatan || profile?.role || 'admin'}
            </div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  )
}