'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'
const BATAS_JAM = '07:30'

const NAV = [
  { href: '/dashboard',         label: 'Dashboard',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: '/dashboard/kelas',   label: 'Kelas',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/dashboard/guru',    label: 'Data Guru',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { href: '/dashboard/murid',   label: 'Data Murid', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/dashboard/laporan', label: 'Laporan',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
  { href: '/dashboard/cuti',    label: 'Cuti Guru',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { href: '/dashboard/qr-massal', label: 'Print QR', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg> },
]

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function getWeekdaysInMonth(year, month) {
  // month: 0-indexed
  const days = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function isLate(timeStr) {
  if (!timeStr) return false
  return timeStr.slice(0, 5) > BATAS_JAM
}

export default function LaporanPage() {
  const router   = useRouter()
  const pathname = usePathname()

  const [profile, setProfile]     = useState(null)
  const [mode, setMode]           = useState('harian') // harian | bulanan
  const [classes, setClasses]     = useState([])
  const [murids, setMurids]       = useState([])
  const [filterKelas, setFilterKelas] = useState('')
  const [loading, setLoading]     = useState(false)

  // Harian
  const [tanggal, setTanggal]     = useState(new Date().toISOString().slice(0, 10))
  const [hariData, setHariData]   = useState([])

  // Bulanan
  const now = new Date()
  const [bulan, setBulan]         = useState(now.getMonth())
  const [tahun, setTahun]         = useState(now.getFullYear())
  const [bulanData, setBulanData] = useState([]) // per murid summary

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: cls } = await supabase.from('classes').select('id,nama_kelas,tahun_ajaran').eq('active', true).order('nama_kelas')
      setClasses(cls || [])
      const { data: mrd } = await supabase.from('students').select('id,full_name,class_id,classes(nama_kelas)').eq('active', true).order('full_name')
      setMurids(mrd || [])
    }
    init()
  }, [])

  // ── HARIAN ──
  useEffect(() => {
    if (mode === 'harian') fetchHarian()
  }, [tanggal, filterKelas, mode])

  const fetchHarian = async () => {
    setLoading(true)
    let q = supabase.from('attendance_students')
      .select('student_id, type, scanned_at')
      .eq('date', tanggal)
    const { data: absen } = await q
    setHariData(absen || [])
    setLoading(false)
  }

  const hariRows = useMemo(() => {
    const filtered = murids.filter(m => !filterKelas || m.class_id === filterKelas)
    return filtered.map(m => {
      const records = hariData.filter(r => r.student_id === m.id)
      const masukRec = records.find(r => r.type === 'masuk')
      const pulangRec = records.find(r => r.type === 'pulang')
      const jamMasuk = masukRec ? new Date(masukRec.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
      const jamPulang = pulangRec ? new Date(pulangRec.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
      let status = 'Tidak Masuk'
      if (masukRec) status = isLate(jamMasuk) ? 'Telat' : 'Hadir'
      return { ...m, jamMasuk, jamPulang, status }
    })
  }, [hariData, murids, filterKelas])

  const hariSummary = useMemo(() => ({
    hadir:      hariRows.filter(r => r.status === 'Hadir').length,
    telat:      hariRows.filter(r => r.status === 'Telat').length,
    tidakMasuk: hariRows.filter(r => r.status === 'Tidak Masuk').length,
    total:      hariRows.length,
  }), [hariRows])

  // ── BULANAN ──
  useEffect(() => {
    if (mode === 'bulanan') fetchBulanan()
  }, [bulan, tahun, filterKelas, mode])

  const fetchBulanan = async () => {
    setLoading(true)
    const start = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const end   = new Date(tahun, bulan + 1, 0).toISOString().slice(0, 10)
    const { data: absen } = await supabase
      .from('attendance_students')
      .select('student_id, type, scanned_at, date')
      .gte('date', start)
      .lte('date', end)
    setBulanData(absen || [])
    setLoading(false)
  }

  const bulanRows = useMemo(() => {
    const hariKerja = getWeekdaysInMonth(tahun, bulan)
    const filtered = murids.filter(m => !filterKelas || m.class_id === filterKelas)
    return filtered.map(m => {
      const recsMurid = bulanData.filter(r => r.student_id === m.id)
      let hadir = 0, telat = 0, tidakMasuk = 0
      hariKerja.forEach(tgl => {
        const masukRec = recsMurid.find(r => r.date === tgl && r.type === 'masuk')
        if (!masukRec) { tidakMasuk++; return }
        const jam = new Date(masukRec.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        if (isLate(jam)) telat++
        else hadir++
      })
      return { ...m, hadir, telat, tidakMasuk, total: hariKerja.length }
    })
  }, [bulanData, murids, filterKelas, bulan, tahun])

  const bulanSummaryKelas = useMemo(() => {
    const map = {}
    bulanRows.forEach(r => {
      const kn = r.classes?.nama_kelas || 'Tanpa Kelas'
      if (!map[kn]) map[kn] = { hadir: 0, telat: 0, tidakMasuk: 0, total: 0, count: 0 }
      map[kn].hadir      += r.hadir
      map[kn].telat      += r.telat
      map[kn].tidakMasuk += r.tidakMasuk
      map[kn].total      += r.total
      map[kn].count++
    })
    return map
  }, [bulanRows])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const printLaporan = () => window.print()

  const statusStyle = (s) => {
    if (s === 'Hadir')       return { background: '#f0fdf4', color: '#16a34a' }
    if (s === 'Telat')       return { background: '#fffbeb', color: '#d97706' }
    if (s === 'Tidak Masuk') return { background: '#fef2f2', color: '#dc2626' }
    return {}
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
        @media print {
          aside, header, .no-print { display: none !important; }
          main { overflow: visible !important; }
          .print-area { overflow: visible !important; }
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-60 flex flex-col border-r border-gray-100 bg-white flex-shrink-0 no-print">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <div className="font-bold text-gray-900 text-xs leading-tight">Mutiara Bunda</div>
              <div className="text-gray-400 text-xs" style={{ fontFamily: 'DM Mono' }}>SiCuti v1.0</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <a key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active ? { background: purple50, color: purple } : { color: '#6b7280' }}>
                <span style={{ color: active ? purple : '#9ca3af' }}>{icon}</span>
                {label}
              </a>
            )
          })}
        </nav>
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
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: purple }}>
              {profile?.full_name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name || 'Admin'}</div>
              <div className="text-xs text-gray-400 truncate" style={{ fontFamily: 'DM Mono' }}>{profile?.role || 'admin'}</div>
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

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0 no-print">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Laporan Absensi</h1>
            <p className="text-xs text-gray-400">Batas tepat waktu: {BATAS_JAM} · Senin–Jumat</p>
          </div>
          <button onClick={printLaporan}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print / Export
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6 print-area">

          {/* Mode toggle + filters */}
          <div className="fu flex items-center gap-3 mb-6 flex-wrap no-print">
            {/* Mode tabs */}
            <div className="flex p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
              {[
                { key: 'harian',  label: 'Laporan Harian' },
                { key: 'bulanan', label: 'Laporan Bulanan' },
              ].map(t => (
                <button key={t.key} onClick={() => setMode(t.key)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={mode === t.key
                    ? { background: 'white', color: purple, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                    : { color: '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Harian: date picker */}
            {mode === 'harian' && (
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                style={{ color: '#111' }}/>
            )}

            {/* Bulanan: bulan + tahun */}
            {mode === 'bulanan' && (
              <>
                <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                  style={{ color: '#111' }}>
                  {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
                </select>
                <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                  style={{ color: '#111' }}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}

            {/* Filter kelas */}
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
              style={{ color: filterKelas ? '#111' : '#9ca3af' }}>
              <option value="">Semua Kelas</option>
              {classes.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas} — {k.tahun_ajaran}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
            </div>
          ) : (
            <>
              {/* ── HARIAN ── */}
              {mode === 'harian' && (
                <div className="fu flex flex-col gap-5">
                  {/* Print title */}
                  <div className="hidden print:block mb-4 text-center">
                    <div className="font-bold text-xl">Laporan Absensi Harian</div>
                    <div className="text-sm text-gray-500">
                      {new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {filterKelas ? ` · ${classes.find(c => c.id === filterKelas)?.nama_kelas}` : ' · Semua Kelas'}
                    </div>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Total Murid',  val: hariSummary.total,      color: purple,     bg: purple50 },
                      { label: 'Hadir',        val: hariSummary.hadir,      color: '#16a34a',  bg: '#f0fdf4' },
                      { label: 'Telat',        val: hariSummary.telat,      color: '#d97706',  bg: '#fffbeb' },
                      { label: 'Tidak Masuk',  val: hariSummary.tidakMasuk, color: '#dc2626',  bg: '#fef2f2' },
                    ].map(c => (
                      <div key={c.label} className="rounded-2xl p-5 border border-gray-100 bg-white">
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: c.color, fontFamily: 'DM Mono' }}>{c.label}</div>
                        <div className="text-3xl font-bold" style={{ color: c.color }}>{c.val}</div>
                        {hariSummary.total > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {Math.round((c.val / hariSummary.total) * 100)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {hariSummary.total > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'DM Mono' }}>Kehadiran Hari Ini</div>
                      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: '#f3f4f6' }}>
                        <div style={{ width: `${(hariSummary.hadir / hariSummary.total) * 100}%`, background: '#22c55e' }}/>
                        <div style={{ width: `${(hariSummary.telat / hariSummary.total) * 100}%`, background: '#f59e0b' }}/>
                        <div style={{ width: `${(hariSummary.tidakMasuk / hariSummary.total) * 100}%`, background: '#ef4444' }}/>
                      </div>
                      <div className="flex gap-4 mt-2">
                        {[
                          { label: 'Hadir', color: '#22c55e' },
                          { label: 'Telat', color: '#f59e0b' },
                          { label: 'Tidak Masuk', color: '#ef4444' },
                        ].map(l => (
                          <div key={l.label} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }}/>
                            <span className="text-xs text-gray-500">{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Table */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                          {['No', 'Nama Murid', 'Kelas', 'Jam Masuk', 'Jam Pulang', 'Status'].map(h => (
                            <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                              style={{ fontFamily: 'DM Mono' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hariRows.map((row, i) => (
                          <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 text-sm text-gray-400">{i + 1}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ background: purple }}>
                                  {row.full_name?.[0]}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{row.full_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500">{row.classes?.nama_kelas || '—'}</td>
                            <td className="px-5 py-3.5">
                              {row.jamMasuk ? (
                                <span className="text-sm font-medium" style={{ fontFamily: 'DM Mono', color: isLate(row.jamMasuk) ? '#d97706' : '#16a34a' }}>
                                  {row.jamMasuk}
                                </span>
                              ) : <span className="text-sm text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              {row.jamPulang ? (
                                <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Mono' }}>{row.jamPulang}</span>
                              ) : <span className="text-sm text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={statusStyle(row.status)}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── BULANAN ── */}
              {mode === 'bulanan' && (
                <div className="fu flex flex-col gap-5">
                  {/* Print title */}
                  <div className="hidden print:block mb-4 text-center">
                    <div className="font-bold text-xl">Laporan Absensi Bulanan</div>
                    <div className="text-sm text-gray-500">
                      {BULAN[bulan]} {tahun}
                      {filterKelas ? ` · ${classes.find(c => c.id === filterKelas)?.nama_kelas}` : ' · Semua Kelas'}
                    </div>
                  </div>

                  {/* Rekap per kelas */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Rekap per Kelas — {BULAN[bulan]} {tahun}</h3>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                      {Object.entries(bulanSummaryKelas).map(([kelas, data]) => {
                        const pct = data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0
                        return (
                          <div key={kelas} className="bg-white rounded-2xl border border-gray-100 p-5">
                            <div className="font-semibold text-gray-900 mb-1">{kelas}</div>
                            <div className="text-xs text-gray-400 mb-3" style={{ fontFamily: 'DM Mono' }}>{data.count} murid · {data.total / data.count || 0} hari kerja</div>
                            <div className="h-2 rounded-full overflow-hidden flex mb-3" style={{ background: '#f3f4f6' }}>
                              <div style={{ width: `${data.total > 0 ? (data.hadir / data.total) * 100 : 0}%`, background: '#22c55e' }}/>
                              <div style={{ width: `${data.total > 0 ? (data.telat / data.total) * 100 : 0}%`, background: '#f59e0b' }}/>
                              <div style={{ width: `${data.total > 0 ? (data.tidakMasuk / data.total) * 100 : 0}%`, background: '#ef4444' }}/>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              {[
                                { label: 'Hadir',       val: data.hadir,      color: '#16a34a' },
                                { label: 'Telat',       val: data.telat,      color: '#d97706' },
                                { label: 'Tdk Masuk',   val: data.tidakMasuk, color: '#dc2626' },
                              ].map(s => (
                                <div key={s.label}>
                                  <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                                  <div className="text-xs text-gray-400">{s.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {Object.keys(bulanSummaryKelas).length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                          Belum ada data absensi untuk periode ini
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rekap per murid */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Rekap per Murid — {BULAN[bulan]} {tahun}</h3>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                            {['No', 'Nama Murid', 'Kelas', 'Hari Kerja', 'Hadir', 'Telat', 'Tidak Masuk', '% Hadir'].map(h => (
                              <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                                style={{ fontFamily: 'DM Mono' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulanRows.map((row, i) => {
                            const pct = row.total > 0 ? Math.round(((row.hadir + row.telat) / row.total) * 100) : 0
                            return (
                              <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3.5 text-sm text-gray-400">{i + 1}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                      style={{ background: purple }}>
                                      {row.full_name?.[0]}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{row.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-500">{row.classes?.nama_kelas || '—'}</td>
                                <td className="px-5 py-3.5 text-sm text-gray-600">{row.total}</td>
                                <td className="px-5 py-3.5">
                                  <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>{row.hadir}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className="text-sm font-semibold" style={{ color: '#d97706' }}>{row.telat}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className="text-sm font-semibold" style={{ color: '#dc2626' }}>{row.tidakMasuk}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}/>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>
                                      {pct}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {bulanRows.length === 0 && (
                            <tr>
                              <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                                Belum ada data murid aktif
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}