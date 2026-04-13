'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const primary    = '#A78BFA'
const accent     = '#442F78'
const purple50   = '#F5F0FF'
const purple100  = '#EAB6FF'
const BATAS_GURU = '07:00'
const BULAN      = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

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
  const cleaned  = timeStr.replace('.', ':')
  const parts    = cleaned.split(':').map(Number)
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

function hitungHariCuti(start, end) {
  if (!start || !end) return 1
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
}

function getWorkdaysGuruInMonth(year, month) {
  const days = []
  const d    = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (d.getDay() !== 0) {
      const y   = d.getFullYear()
      const m   = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push(`${y}-${m}-${day}`)
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

function SectionCard({ children, className = '' }) {
  return (
    <div className={`fu rounded-2xl overflow-hidden ${className}`}
      style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
      {children}
    </div>
  )
}

function SectionHeader({ title, right }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between"
      style={{ borderBottom: `1px solid ${purple100}` }}>
      <h3 className="font-semibold" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{title}</h3>
      {right}
    </div>
  )
}

function TableHead({ cols }) {
  return (
    <thead>
      <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
        {cols.map(h => (
          <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
            style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}

const statusStyle = (s) => {
  if (s === 'Hadir')       return { bg: '#f0fdf4', color: '#16a34a' }
  if (s === 'Telat')       return { bg: '#fffbeb', color: '#d97706' }
  if (s === 'Tidak Masuk') return { bg: '#fef2f2', color: '#dc2626' }
  return { bg: '#f3f4f6', color: '#6b7280' }
}

export default function ProfilPage() {
  const router = useRouter()

  const [profile,      setProfile]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const now = new Date()
  const [bulan,        setBulan]        = useState(now.getMonth())
  const [tahun,        setTahun]        = useState(now.getFullYear())
  const [rekap,        setRekap]        = useState(null)
  const [rekapLoading, setRekapLoading] = useState(false)
  const [riwayat,      setRiwayat]      = useState([])
  const [cutiList,     setCutiList]     = useState([])
  const [cutiLoading,  setCutiLoading]  = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setLoading(false)
      setCutiLoading(true)
      const { data: cuti } = await supabase
        .from('leave_requests').select('*')
        .eq('profile_id', user.id).eq('status', 'approved')
        .order('date_start', { ascending: false })
      setCutiList(cuti || [])
      setCutiLoading(false)
    }
    init()
  }, [])

  useEffect(() => { if (profile) fetchRekap() }, [profile, bulan, tahun])

  const fetchRekap = async () => {
    if (!profile) return
    setRekapLoading(true)
    const start   = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end     = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: recs } = await supabase
      .from('attendance_guru').select('*')
      .eq('profile_id', profile.id)
      .gte('date', start).lte('date', end)
      .order('date', { ascending: true })

    const hariKerja = getWorkdaysGuruInMonth(tahun, bulan)
    let hadir = 0, telat = 0, tidakMasuk = 0, totalMenit = 0
    const telatDetail = [], riwayatList = []

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

  const pct = rekap && rekap.total > 0
    ? Math.round(((rekap.hadir + rekap.telat) / rekap.total) * 100) : 0

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#FAFAFA' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 px-8 py-4"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <h1 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>Profil Saya</h1>
          <p className="text-xs" style={{ color: '#9ca3af' }}>Data diri dan rekap kehadiran</p>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">

            {/* DATA DIRI */}
            <SectionCard>
              <div className="px-6 py-5 flex items-center gap-4"
                style={{ borderBottom: `1px solid ${purple100}` }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                  style={{ background: accent, fontFamily: "'Rubik', sans-serif" }}>
                  {profile?.full_name?.[0]}
                </div>
                <div>
                  <h2 className="font-bold text-xl leading-tight"
                    style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{profile?.full_name}</h2>
                  <p className="text-sm mt-0.5" style={{ color: '#9ca3af' }}>{profile?.jabatan || '—'}</p>
                  <span className="inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
                    {profile?.role === 'admin' ? 'Admin' : 'Guru'}
                  </span>
                </div>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'NIP',         val: profile?.nip     || '—' },
                  { label: 'No. HP',      val: profile?.no_hp   || '—' },
                  { label: 'Jabatan',     val: profile?.jabatan || '—' },
                  { label: 'Role Sistem', val: profile?.role    || '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="p-4 rounded-xl"
                    style={{ background: purple50, border: `1px solid ${purple100}` }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1"
                      style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>{label}</div>
                    <div className="text-sm font-medium" style={{ color: accent }}>{val}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* FILTER BULAN */}
            <div className="fu flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: accent }}>Rekap Bulan:</span>
              <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                className="px-3 py-2 text-sm rounded-xl appearance-none transition-all"
                style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}>
                {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
              </select>
              <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                className="px-3 py-2 text-sm rounded-xl appearance-none transition-all"
                style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {rekapLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
              </div>
            ) : rekap && (
              <>
                {/* STAT CARDS */}
                <div className="fu grid grid-cols-4 gap-4">
                  {[
                    { label: 'Hari Kerja',  val: rekap.total,      color: accent,    bg: purple50   },
                    { label: 'Hadir',        val: rekap.hadir,      color: '#16a34a', bg: '#f0fdf4'  },
                    { label: 'Telat',        val: rekap.telat,      color: '#d97706', bg: '#fffbeb'  },
                    { label: 'Tidak Masuk',  val: rekap.tidakMasuk, color: '#dc2626', bg: '#fef2f2'  },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} className="rounded-2xl p-5"
                      style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                      <div className="text-3xl font-bold mb-1"
                        style={{ color, fontFamily: "'Rubik', sans-serif" }}>{val}</div>
                      <div className="text-xs font-semibold" style={{ color: '#9ca3af' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* PROGRESS + KETERLAMBATAN */}
                <div className="fu grid grid-cols-2 gap-4">
                  <div className="rounded-2xl p-5"
                    style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold" style={{ color: accent }}>Tingkat Kehadiran</span>
                      <span className="font-bold text-lg" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>{pct}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: purple50 }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${primary})` }}/>
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                      {rekap.hadir + rekap.telat} hadir dari {rekap.total} hari kerja di {BULAN[bulan]} {tahun}
                    </p>
                  </div>

                  <div className="rounded-2xl p-5"
                    style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                    <div className="text-sm font-semibold mb-3" style={{ color: accent }}>Total Keterlambatan</div>
                    {rekap.telat > 0 ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-3xl font-bold" style={{ color: '#dc2626', fontFamily: "'Rubik', sans-serif" }}>{rekap.telat}</span>
                          <span className="text-sm" style={{ color: '#9ca3af' }}>kali terlambat</span>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: '#d97706' }}>
                          Total: {fmtMenit(rekap.totalMenit)}
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
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

                {/* DETAIL KETERLAMBATAN */}
                {rekap.telatDetail.length > 0 && (
                  <SectionCard>
                    <SectionHeader title="Detail Hari Terlambat" />
                    <div className="px-6 py-5 flex flex-wrap gap-2">
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
                  </SectionCard>
                )}

                {/* RIWAYAT HARIAN */}
                <SectionCard>
                  <SectionHeader title={`Riwayat Harian — ${BULAN[bulan]} ${tahun}`} />
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <TableHead cols={['Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status']} />
                      <tbody>
                        {riwayat.map((r, i) => {
                          const s      = statusStyle(r.status)
                          const tglFmt = new Date(r.tgl + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                          return (
                            <tr key={i} style={{ borderBottom: `1px solid ${purple100}` }}>
                              <td className="px-5 py-3 text-sm" style={{ color: '#374151', fontFamily: 'DM Mono' }}>{tglFmt}</td>
                              <td className="px-5 py-3">
                                {r.jamMasuk
                                  ? <span className="text-sm font-medium" style={{ fontFamily: 'DM Mono', color: isLate(r.jamMasuk) ? '#d97706' : '#16a34a' }}>{r.jamMasuk}</span>
                                  : <span className="text-sm" style={{ color: '#d1d5db' }}>—</span>}
                              </td>
                              <td className="px-5 py-3">
                                {r.jamPulang
                                  ? <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'DM Mono' }}>{r.jamPulang}</span>
                                  : <span className="text-sm" style={{ color: '#d1d5db' }}>—</span>}
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
                </SectionCard>
              </>
            )}

            {/* RINGKASAN CUTI */}
            <SectionCard>
              <SectionHeader
                title="Ringkasan Cuti"
                right={cutiLoading && (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
                )}
              />

              {/* Kuota summary */}
              <div className="px-6 py-5 grid grid-cols-3 gap-4"
                style={{ borderBottom: `1px solid ${purple100}` }}>
                {(() => {
                  const kuota    = profile?.kuota_cuti ?? 12
                  const terpakai = cutiList.reduce((s, c) => s + hitungHariCuti(c.date_start, c.date_end), 0)
                  const sisa     = Math.max(0, kuota - terpakai)
                  return [
                    { label: 'Total Kuota', val: kuota,    color: accent,    bg: purple50   },
                    { label: 'Terpakai',    val: terpakai, color: '#d97706', bg: '#fffbeb'  },
                    { label: 'Sisa',        val: sisa,     color: sisa > 0 ? '#16a34a' : '#dc2626', bg: sisa > 0 ? '#f0fdf4' : '#fef2f2' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} className="rounded-xl p-4 text-center"
                      style={{ background: bg, border: `1px solid ${purple100}` }}>
                      <div className="text-2xl font-bold mb-0.5"
                        style={{ color, fontFamily: "'Rubik', sans-serif" }}>{val}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color, fontFamily: 'DM Mono' }}>{label}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>hari</div>
                    </div>
                  ))
                })()}
              </div>

              {/* Progress bar */}
              {(() => {
                const kuota    = profile?.kuota_cuti ?? 12
                const terpakai = cutiList.reduce((s, c) => s + hitungHariCuti(c.date_start, c.date_end), 0)
                const p        = kuota > 0 ? Math.min(100, Math.round((terpakai / kuota) * 100)) : 0
                return (
                  <div className="px-6 py-3" style={{ borderBottom: `1px solid ${purple100}` }}>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9ca3af' }}>
                      <span>Penggunaan kuota</span>
                      <span style={{ fontFamily: 'DM Mono' }}>{p}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: purple50 }}>
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${p}%`, background: p >= 100 ? '#dc2626' : p >= 70 ? '#f59e0b' : '#16a34a' }}/>
                    </div>
                  </div>
                )
              })()}

              {/* Tabel cuti */}
              {cutiList.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm" style={{ color: '#9ca3af' }}>
                  Belum ada cuti yang disetujui
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TableHead cols={['Tanggal', 'Durasi', 'Alasan']} />
                    <tbody>
                      {cutiList.map((c, i) => {
                        const hari     = hitungHariCuti(c.date_start, c.date_end)
                        const tglStart = new Date(c.date_start + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        const tglEnd   = c.date_end !== c.date_start
                          ? new Date(c.date_end + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : null
                        return (
                          <tr key={i} className="transition-colors" style={{ borderBottom: `1px solid ${purple100}` }}>
                            <td className="px-5 py-3 text-sm" style={{ color: '#374151', fontFamily: 'DM Mono' }}>
                              {tglStart}{tglEnd ? ` — ${tglEnd}` : ''}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
                                {hari} hari
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm" style={{ color: '#6b7280' }}>{c.reason || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

          </div>
        </div>
      </main>
    </div>
  )
}