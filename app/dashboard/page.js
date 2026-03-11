'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const purple      = '#6d28d9'
const purple50    = '#f5f3ff'
const purple100   = '#ede9fe'
const purple600   = '#7c3aed'
const SCHOOL      = 'TK Karakter Mutiara Bunda Bali'

// ── Sidebar nav items ──────────────────────────────────────────────
const NAV = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    href: '/dashboard/kelas', label: 'Kelas',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
  {
    href: '/dashboard/guru', label: 'Data Guru',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
  {
    href: '/dashboard/murid', label: 'Data Murid',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    href: '/dashboard/laporan', label: 'Laporan',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  },
  {
    href: '/dashboard/cuti', label: 'Cuti Guru',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  },
  {
    href: '/dashboard/qr-massal', label: 'Print QR',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg>
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile]   = useState(null)
  const [stats, setStats]       = useState({ guru: 0, murid: 0, hadirHari: 0, cutiPending: 0 })
  const [recentAbs, setRecentAbs] = useState([])
  const [pendingLeave, setPendingLeave] = useState([])
  const [time, setTime]         = useState('')
  const [date, setDate]         = useState('')
  const [loading, setLoading]   = useState(true)

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }))
      setDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Data fetch
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const today = new Date().toISOString().split('T')[0]

      const [
        { count: guruCount },
        { count: muridCount },
        { count: hadirCount },
        { count: cutiCount },
        { data: recentData },
        { data: leaveData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('attendance_students').select('*', { count: 'exact', head: true }).eq('date', today).eq('type', 'masuk'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('attendance_students')
          .select('*, students(full_name, kelas)')
          .eq('date', today)
          .order('scanned_at', { ascending: false })
          .limit(6),
        supabase.from('leave_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      setStats({ guru: guruCount || 0, murid: muridCount || 0, hadirHari: hadirCount || 0, cutiPending: cutiCount || 0 })
      setRecentAbs(recentData || [])

      // Attach profile data to leave requests manually
      if (leaveData && leaveData.length > 0) {
        const ids = [...new Set(leaveData.map(r => r.profile_id))]
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', ids)
        const map = {}
        ;(profilesData || []).forEach(p => { map[p.id] = p })
        setPendingLeave(leaveData.map(r => ({ ...r, profiles: map[r.profile_id] || null })))
      } else {
        setPendingLeave([])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pct = stats.murid > 0 ? Math.round((stats.hadirHari / stats.murid) * 100) : 0

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu  { animation: fadeUp .4s ease both; }
        .fu1 { animation: fadeUp .4s ease .08s both; }
        .fu2 { animation: fadeUp .4s ease .16s both; }
        .fu3 { animation: fadeUp .4s ease .24s both; }
        .fu4 { animation: fadeUp .4s ease .32s both; }
        .fu5 { animation: fadeUp .4s ease .40s both; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${purple100}; border-radius: 4px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="w-60 flex flex-col border-r border-gray-100 bg-white flex-shrink-0">
        {/* Logo area */}
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
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <a key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active
                  ? { background: purple50, color: purple }
                  : { color: '#6b7280' }}>
                <span style={{ color: active ? purple : '#9ca3af' }}>{icon}</span>
                {label}
              </a>
            )
          })}
        </nav>

        {/* Scan shortcut */}
        <div className="px-3 pb-3">
          <a href="/scan" target="_blank"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: purple50, color: purple }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Halaman Scan Tablet
          </a>
        </div>

        {/* Profile + logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: purple }}>
              {profile?.full_name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name || 'Admin'}</div>
              <div className="text-xs text-gray-400 truncate" style={{ fontFamily: 'DM Mono' }}>
                {profile?.role || 'admin'}
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

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Dashboard</h1>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse"/>
              <span className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>Sistem Aktif</span>
            </div>
            <div className="font-bold tabular-nums text-lg" style={{ color: purple, fontFamily: 'DM Mono' }}>
              {time} <span className="text-xs font-normal text-gray-400">WITA</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
            </div>
          ) : (
            <>
              {/* Greeting */}
              <div className="fu mb-6">
                <h2 className="font-bold text-gray-900 text-2xl">
                  Selamat datang, <span style={{ color: purple }}>{profile?.full_name?.split(' ')[0] || 'Admin'}</span> 👋
                </h2>
                <p className="text-sm text-gray-400 mt-1">Berikut ringkasan aktivitas hari ini.</p>
              </div>

              {/* ── STAT CARDS ── */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  {
                    cls: 'fu1', label: 'Total Guru', value: stats.guru,
                    sub: 'terdaftar di sistem',
                    color: purple,
                    bg: purple50,
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  },
                  {
                    cls: 'fu2', label: 'Total Murid', value: stats.murid,
                    sub: 'murid aktif',
                    color: '#0891b2',
                    bg: '#ecfeff',
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  },
                  {
                    cls: 'fu3', label: 'Hadir Hari Ini', value: `${stats.hadirHari}`,
                    sub: `${pct}% dari total murid`,
                    color: '#16a34a',
                    bg: '#f0fdf4',
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  },
                  {
                    cls: 'fu4', label: 'Cuti Pending', value: stats.cutiPending,
                    sub: 'menunggu persetujuan',
                    color: '#d97706',
                    bg: '#fffbeb',
                    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  },
                ].map(({ cls, label, value, sub, color, bg, icon }) => (
                  <div key={label} className={`${cls} bg-white rounded-2xl p-5 border border-gray-100
                    hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: bg, color }}>
                        {icon}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900 mb-0.5" style={{ fontSize: 32 }}>{value}</div>
                    <div className="text-sm font-semibold text-gray-700">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>

              {/* ── ATTENDANCE PROGRESS ── */}
              <div className="fu3 bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Kehadiran Murid Hari Ini</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{stats.hadirHari} dari {stats.murid} murid hadir</p>
                  </div>
                  <span className="font-bold text-2xl" style={{ color: purple }}>{pct}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${purple}, #a78bfa)`
                    }}/>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-400">0%</span>
                  <span className="text-xs text-gray-400">100%</span>
                </div>
              </div>

              {/* ── BOTTOM GRID ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Recent absensi */}
                <div className="fu4 bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Absensi Terbaru</h3>
                    <a href="/dashboard/laporan"
                      className="text-xs font-medium transition-colors"
                      style={{ color: purple }}>
                      Lihat semua →
                    </a>
                  </div>
                  {recentAbs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
                        style={{ background: purple50 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke={purple} strokeWidth="2" strokeLinecap="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-400">Belum ada absensi hari ini</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {recentAbs.map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: a.type === 'masuk' ? '#dcfce7' : purple50 }}>
                              <span style={{ color: a.type === 'masuk' ? '#16a34a' : purple }}>
                                {a.students?.full_name?.[0] || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{a.students?.full_name || '-'}</div>
                              <div className="text-xs text-gray-400">{a.students?.kelas || '-'}</div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={a.type === 'masuk'
                              ? { background: '#dcfce7', color: '#16a34a' }
                              : { background: purple50, color: purple }}>
                            {a.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending cuti */}
                <div className="fu5 bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Pengajuan Cuti</h3>
                    <a href="/dashboard/cuti"
                      className="text-xs font-medium transition-colors"
                      style={{ color: purple }}>
                      Lihat semua →
                    </a>
                  </div>
                  {pendingLeave.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
                        style={{ background: '#fffbeb' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke="#d97706" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="4" width="18" height="18" rx="2"/>
                          <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-400">Tidak ada pengajuan cuti pending</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {pendingLeave.map((l, i) => (
                        <div key={i} className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{l.profiles?.full_name || '-'}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {new Date(l.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                {l.date_end !== l.date_start && ` – ${new Date(l.date_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                              </div>
                              <div className="text-xs text-gray-400 mt-1 italic">{l.type}</div>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                              Pending
                            </span>
                          </div>
                          <a href="/dashboard/cuti"
                            className="mt-2 text-xs font-medium block"
                            style={{ color: purple }}>
                            Review →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}