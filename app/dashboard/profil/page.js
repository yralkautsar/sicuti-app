'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'
const BATAS_GURU  = '07:00'
const BATAS_MURID = '07:30'
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function fmtTime(scannedAt) {
  if (!scannedAt) return null
  return new Date(scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
}

function isLate(timeStr) {
  if (!timeStr) return false
  return timeStr.replace('.', ':').slice(0, 5) > BATAS_GURU
}

function menitRaw(timeStr) {
  if (!timeStr) return 0
  const [bh, bm] = BATAS_GURU.split(':').map(Number)
  const cleaned = timeStr.replace('.', ':')
  const parts = cleaned.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0
  const diff = (parts[0] * 60 + parts[1]) - (bh * 60 + bm)
  return diff > 0 ? diff : 0
}

function fmtMenit(total) {
  if (!total || total <= 0) return '0 mnt'
  const jam = Math.floor(total / 60)
  const mnt = total % 60
  if (jam > 0) return mnt > 0 ? `${jam} jam ${mnt} mnt` : `${jam} jam`
  return `${mnt} mnt`
}

function getWorkdaysGuruInMonth(year, month) {
  // Guru: Senin - Sabtu
  const days = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const dow = d.getDay()
    if (dow !== 0) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push(`${y}-${m}-${day}`)
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default function ProfilPage() {
  const router = useRouter()

  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)

  // Rekap bulan ini
  const now = new Date()
  const [bulan, setBulan]         = useState(now.getMonth())
  const [tahun, setTahun]         = useState(now.getFullYear())
  const [rekap, setRekap]         = useState(null) // { hadir, telat, tidakMasuk, totalMenit, telatDetail }
  const [rekapLoading, setRekapLoading] = useState(false)

  // Riwayat absensi harian bulan ini
  const [riwayat, setRiwayat]     = useState([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (profile) fetchRekap()
  }, [profile, bulan, tahun])

  const fetchRekap = async () => {
    if (!profile) return
    setRekapLoading(true)
    const start = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const end   = new Date(tahun, bulan + 1, 0).toISOString().slice(0, 10)

    const { data: recs } = await supabase
      .from('attendance_guru')
      .select('*')
      .eq('profile_id', profile.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    const hariKerja = getWorkdaysGuruInMonth(tahun, bulan)
    let hadir = 0, telat = 0, tidakMasuk = 0, totalMenit = 0
    const telatDetail = []
    const riwayatList = []

    hariKerja.forEach(tgl => {
      const masukRec  = (recs || []).find(r => r.date === tgl && r.type === 'masuk')
      const pulangRec = (recs || []).find(r => r.date === tgl && r.type === 'pulang')
      const jamMasuk  = fmtTime(masukRec?.scanned_at)
      const jamPulang = fmtTime(pulangRec?.scanned_at)

      let status = 'Tidak Masuk'
      if (masukRec) {
        status = isLate(jamMasuk) ? 'Telat' : 'Hadir'
        if (status === 'Telat') {
          telat++
          const mnt = menitRaw(jamMasuk)
          totalMenit += mnt
          telatDetail.push({ tgl, jam: jamMasuk, mnt })
        } else hadir++
      } else tidakMasuk++

      riwayatList.push({ tgl, jamMasuk, jamPulang, status })
    })

    setRekap({ hadir, telat, tidakMasuk, totalMenit, telatDetail, total: hariKerja.length })
    setRiwayat(riwayatList)
    setRekapLoading(false)
  }

  const statusStyle = (s) => {
    if (s === 'Hadir')       return { bg: '#f0fdf4', color: '#16a34a' }
    if (s === 'Telat')       return { bg: '#fffbeb', color: '#d97706' }
    if (s === 'Tidak Masuk') return { bg: '#fef2f2', color: '#dc2626' }
    return { bg: '#f3f4f6', color: '#6b7280' }
  }

  const pct = rekap && rekap.total > 0
    ? Math.round(((rekap.hadir + rekap.telat) / rekap.total) * 100)
    : 0

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
    </div>
  )

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
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex-shrink-0">
          <h1 className="font-bold text-gray-900 text-lg">Profil Saya</h1>
          <p className="text-xs text-gray-400">Data diri dan rekap kehadiran</p>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">

            {/* ── DATA DIRI ── */}
            <div className="fu bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                  style={{ background: purple }}>
                  {profile?.full_name?.[0]}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl leading-tight">{profile?.full_name}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{profile?.jabatan || '—'}</p>
                  <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: purple50, color: purple }}>
                    {profile?.role === 'admin' ? 'Admin' : 'Guru'}
                  </span>
                </div>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-4">
                {[
                  { label: 'NIP',       val: profile?.nip     || '—' },
                  { label: 'No. HP',    val: profile?.no_hp   || '—' },
                  { label: 'Jabatan',   val: profile?.jabatan || '—' },
                  { label: 'Role Sistem', val: profile?.role  || '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: '#fafafa' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1"
                      style={{ fontFamily: 'DM Mono' }}>{label}</div>
                    <div className="text-sm font-medium text-gray-800">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FILTER BULAN ── */}
            <div className="fu flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600">Rekap Bulan:</span>
              <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                style={{ color: '#111' }}>
                {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
              </select>
              <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                style={{ color: '#111' }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {rekapLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
              </div>
            ) : rekap && (
              <>
                {/* ── STAT CARDS ── */}
                <div className="fu grid grid-cols-4 gap-4">
                  {[
                    { label: 'Hari Kerja',   val: rekap.total,      color: purple,     bg: purple50  },
                    { label: 'Hadir',         val: rekap.hadir,      color: '#16a34a',  bg: '#f0fdf4' },
                    { label: 'Telat',         val: rekap.telat,      color: '#d97706',  bg: '#fffbeb' },
                    { label: 'Tidak Masuk',   val: rekap.tidakMasuk, color: '#dc2626',  bg: '#fef2f2' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="text-3xl font-bold mb-1" style={{ color }}>{val}</div>
                      <div className="text-xs font-semibold text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>

                {/* ── PROGRESS + KETERLAMBATAN ── */}
                <div className="fu grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Tingkat Kehadiran</span>
                      <span className="font-bold text-lg" style={{ color: purple }}>{pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${purple}, #a78bfa)` }}/>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {rekap.hadir + rekap.telat} hadir dari {rekap.total} hari kerja di {BULAN[bulan]} {tahun}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Total Keterlambatan</div>
                    {rekap.telat > 0 ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-3xl font-bold" style={{ color: '#dc2626' }}>{rekap.telat}</span>
                          <span className="text-sm text-gray-400">kali terlambat</span>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: '#d97706' }}>
                          Total: {fmtMenit(rekap.totalMenit)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Rata-rata: {fmtMenit(Math.round(rekap.totalMenit / rekap.telat))} per hari
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2" style={{ color: '#16a34a' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                        </svg>
                        <span className="text-sm font-semibold">Tidak ada keterlambatan bulan ini!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── DETAIL KETERLAMBATAN ── */}
                {rekap.telatDetail.length > 0 && (
                  <div className="fu bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Detail Hari Terlambat</div>
                    <div className="flex flex-wrap gap-2">
                      {rekap.telatDetail.map((t, i) => {
                        const tglFmt = new Date(t.tgl + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                            style={{ background: '#fee2e2', color: '#dc2626' }}>
                            <span>{tglFmt}</span>
                            <span>·</span>
                            <span style={{ fontFamily: 'DM Mono' }}>{t.jam}</span>
                            <span>·</span>
                            <span>{t.mnt} mnt terlambat</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── RIWAYAT HARIAN ── */}
                <div className="fu bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h3 className="font-semibold text-gray-900">Riwayat Harian — {BULAN[bulan]} {tahun}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                          {['Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                              style={{ fontFamily: 'DM Mono' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {riwayat.filter(r => r.status !== 'Tidak Masuk' || r.jamMasuk).concat(
                          riwayat.filter(r => r.status === 'Tidak Masuk' && !r.jamMasuk)
                        ).map((r, i) => {
                          const s = statusStyle(r.status)
                          const tglFmt = new Date(r.tgl + 'T08:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                          return (
                            <tr key={i} className="border-b border-gray-50 last:border-0">
                              <td className="px-5 py-3 text-sm text-gray-700" style={{ fontFamily: 'DM Mono' }}>{tglFmt}</td>
                              <td className="px-5 py-3">
                                {r.jamMasuk
                                  ? <span className="text-sm font-medium" style={{ fontFamily: 'DM Mono', color: isLate(r.jamMasuk) ? '#d97706' : '#16a34a' }}>{r.jamMasuk}</span>
                                  : <span className="text-sm text-gray-300">—</span>}
                              </td>
                              <td className="px-5 py-3">
                                {r.jamPulang
                                  ? <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Mono' }}>{r.jamPulang}</span>
                                  : <span className="text-sm text-gray-300">—</span>}
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ background: s.bg, color: s.color }}>{r.status}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}