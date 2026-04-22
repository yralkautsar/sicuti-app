'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { useProfile } from '@/lib/ProfileContext'

const primary   = '#A78BFA'
const accent    = '#442F78'
const border    = '#EAB6FF'
const primaryBg = 'rgba(167,139,250,0.10)'

const BATAS_GURU = '07:00'
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

function hitungHariCuti(start, end) {
  if (!start || !end) return 1
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
}

function getWorkdaysGuruInMonth(year, month) {
  const days = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (d.getDay() !== 0) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push(`${y}-${m}-${day}`)
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

const statusStyle = (s) => {
  if (s === 'Hadir')       return { bg: '#F0FDF4', color: '#16A34A' }
  if (s === 'Telat')       return { bg: '#FFFBEB', color: '#D97706' }
  if (s === 'Tidak Masuk') return { bg: '#FEF2F2', color: '#DC2626' }
  return { bg: '#F5F5F4', color: '#78716C' }
}

export default function ProfilPage() {
  const { profile, setProfile } = useProfile()

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
    if (!profile) return  // tunggu profile dari context
    const init = async () => {
      setLoading(false)
      setCutiLoading(true)
      const { data: cuti } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'approved')
        .order('date_start', { ascending: false })
      setCutiList(cuti || [])
      setCutiLoading(false)
    }
    init()
  }, [profile])

  useEffect(() => {
    if (profile) fetchRekap()
  }, [profile, bulan, tahun])

  const fetchRekap = async () => {
    if (!profile) return
    setRekapLoading(true)
    const start   = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end     = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

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

  const pct = rekap && rekap.total > 0
    ? Math.round(((rekap.hadir + rekap.telat) / rekap.total) * 100)
    : 0

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#FAFAFA' }}>
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${border} ${border} ${border} ${primary}` }}/>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${border};border-radius:4px}
        h1,h2,h3{font-family:'Rubik',sans-serif}
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="px-8 py-4 flex-shrink-0"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${border}` }}>
          <h1 className="font-bold text-lg" style={{ color: accent }}>Profil Saya</h1>
          <p className="text-xs" style={{ color: primary }}>Data diri dan rekap kehadiran</p>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-5">

            {/* ── DATA DIRI ── */}
            <div className="fu rounded-2xl overflow-hidden"
              style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>

              {/* Avatar + nama */}
              <div className="px-6 py-5 flex items-center gap-4"
                style={{ borderBottom: `1px solid ${border}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                  {profile?.full_name?.[0]}
                </div>
                <div>
                  <h2 className="font-bold text-xl leading-tight" style={{ color: accent }}>
                    {profile?.full_name}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: '#78716C' }}>{profile?.jabatan || '—'}</p>
                  <span className="inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: primaryBg, color: accent }}>
                    {profile?.role === 'admin' ? 'Admin' : 'Guru'}
                  </span>
                </div>
              </div>

              {/* Data detail */}
              <div className="px-6 py-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'NIP',         val: profile?.nip     || '—' },
                  { label: 'No. HP',      val: profile?.no_hp   || '—' },
                  { label: 'Jabatan',     val: profile?.jabatan || '—' },
                  { label: 'Role Sistem', val: profile?.role    || '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="px-4 py-3 rounded-xl" style={{ background: '#FAFAFA', border: `1px solid ${border}` }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: primary, fontFamily: 'DM Mono' }}>{label}</div>
                    <div className="text-sm font-medium" style={{ color: accent }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FILTER BULAN ── */}
            <div className="fu flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: accent }}>Rekap Bulan:</span>
              <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                className="px-3 py-2 text-sm rounded-xl appearance-none"
                style={{ border: `1px solid ${border}`, background: '#FFFFFF', color: accent }}>
                {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
              </select>
              <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                className="px-3 py-2 text-sm rounded-xl appearance-none"
                style={{ border: `1px solid ${border}`, background: '#FFFFFF', color: accent }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {rekapLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${border} ${border} ${border} ${primary}` }}/>
              </div>
            ) : rekap && (
              <>
                {/* ── STAT CARDS ── */}
                <div className="fu grid grid-cols-4 gap-3">
                  {[
                    { label: 'Hari Kerja',  val: rekap.total,      color: accent,     bg: primaryBg },
                    { label: 'Hadir',        val: rekap.hadir,      color: '#16A34A',  bg: '#F0FDF4' },
                    { label: 'Telat',        val: rekap.telat,      color: '#D97706',  bg: '#FFFBEB' },
                    { label: 'Tidak Masuk',  val: rekap.tidakMasuk, color: '#DC2626',  bg: '#FEF2F2' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} className="rounded-2xl p-5"
                      style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>
                      <div className="text-3xl font-bold mb-1" style={{ color }}>{val}</div>
                      <div className="text-xs font-medium" style={{ color: '#A8A29E' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* ── KEHADIRAN + KETERLAMBATAN ── */}
                <div className="fu grid grid-cols-2 gap-4">

                  {/* Tingkat kehadiran */}
                  <div className="rounded-2xl p-5"
                    style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold" style={{ color: accent }}>Tingkat Kehadiran</span>
                      <span className="font-bold text-lg" style={{ color: primary }}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#F5F5F4' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${primary}, ${accent})` }}/>
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#A8A29E' }}>
                      {rekap.hadir + rekap.telat} hadir dari {rekap.total} hari kerja — {BULAN[bulan]} {tahun}
                    </p>
                  </div>

                  {/* Keterlambatan */}
                  <div className="rounded-2xl p-5"
                    style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>
                    <span className="text-sm font-semibold" style={{ color: accent }}>Total Keterlambatan</span>
                    {rekap.telat > 0 ? (
                      <div className="mt-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold" style={{ color: '#DC2626' }}>
                            {rekap.telat}
                          </span>
                          <span className="text-sm" style={{ color: '#A8A29E' }}>kali terlambat</span>
                        </div>
                        <div className="text-sm font-semibold mt-1" style={{ color: '#D97706' }}>
                          Total: {fmtMenit(rekap.totalMenit)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#A8A29E' }}>
                          Rata-rata: {fmtMenit(Math.round(rekap.totalMenit / rekap.telat))} per hari
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm mt-3 font-semibold" style={{ color: '#16A34A' }}>
                        Tidak ada keterlambatan bulan ini.
                      </p>
                    )}
                  </div>
                </div>

                {/* ── DETAIL TERLAMBAT ── */}
                {rekap.telatDetail.length > 0 && (
                  <div className="fu rounded-2xl p-5"
                    style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>
                    <div className="text-sm font-semibold mb-3" style={{ color: accent }}>Detail Hari Terlambat</div>
                    <div className="flex flex-wrap gap-2">
                      {rekap.telatDetail.map((t, i) => {
                        const tglFmt = new Date(t.tgl + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                            <span>{tglFmt}</span>
                            <span style={{ color: '#FECACA' }}>·</span>
                            <span style={{ fontFamily: 'DM Mono' }}>{t.jam}</span>
                            <span style={{ color: '#FECACA' }}>·</span>
                            <span>{t.mnt} mnt</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── RIWAYAT HARIAN ── */}
                <div className="fu rounded-2xl overflow-hidden"
                  style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>
                  <div className="px-6 py-4" style={{ borderBottom: `1px solid ${border}` }}>
                    <h3 className="font-semibold" style={{ color: accent }}>
                      Riwayat Harian — {BULAN[bulan]} {tahun}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#FAFAFA', borderBottom: `1px solid ${border}` }}>
                          {['Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                              style={{ color: primary, fontFamily: 'DM Mono' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {riwayat.map((r, i) => {
                          const s = statusStyle(r.status)
                          const tglFmt = new Date(r.tgl + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                          return (
                            <tr key={i} style={{ borderBottom: `1px solid #FAFAFA` }}
                              className="last:border-0 hover:bg-[#FAFAFA] transition-colors">
                              <td className="px-5 py-3 text-sm" style={{ color: '#44403C', fontFamily: 'DM Mono' }}>{tglFmt}</td>
                              <td className="px-5 py-3">
                                {r.jamMasuk
                                  ? <span className="text-sm font-medium" style={{ fontFamily: 'DM Mono', color: isLate(r.jamMasuk) ? '#D97706' : '#16A34A' }}>{r.jamMasuk}</span>
                                  : <span className="text-sm" style={{ color: '#D6D3D1' }}>—</span>}
                              </td>
                              <td className="px-5 py-3">
                                {r.jamPulang
                                  ? <span className="text-sm" style={{ fontFamily: 'DM Mono', color: '#44403C' }}>{r.jamPulang}</span>
                                  : <span className="text-sm" style={{ color: '#D6D3D1' }}>—</span>}
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

            {/* ── RINGKASAN CUTI ── */}
            <div className="fu rounded-2xl overflow-hidden"
              style={{ background: '#FFFFFF', border: `1px solid ${border}` }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${border}` }}>
                <h3 className="font-semibold" style={{ color: accent }}>Ringkasan Cuti</h3>
                {cutiLoading && (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${border} ${border} ${border} ${primary}` }}/>
                )}
              </div>

              {/* Kuota cards */}
              {(() => {
                const kuota    = profile?.kuota_cuti ?? 12
                const terpakai = cutiList.reduce((s, c) => s + hitungHariCuti(c.date_start, c.date_end), 0)
                const sisa     = Math.max(0, kuota - terpakai)
                const pctCuti  = kuota > 0 ? Math.min(100, Math.round((terpakai / kuota) * 100)) : 0
                return (
                  <>
                    <div className="px-6 py-5 grid grid-cols-3 gap-3"
                      style={{ borderBottom: `1px solid ${border}` }}>
                      {[
                        { label: 'Total Kuota', val: kuota,    color: accent,    bg: primaryBg },
                        { label: 'Terpakai',    val: terpakai, color: '#D97706', bg: '#FFFBEB' },
                        { label: 'Sisa',        val: sisa,     color: sisa > 0 ? '#16A34A' : '#DC2626', bg: sisa > 0 ? '#F0FDF4' : '#FEF2F2' },
                      ].map(({ label, val, color, bg }) => (
                        <div key={label} className="rounded-xl p-4 text-center" style={{ background: bg }}>
                          <div className="text-2xl font-bold mb-0.5" style={{ color }}>{val}</div>
                          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color, fontFamily: 'DM Mono' }}>{label}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#A8A29E' }}>hari</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="px-6 py-3" style={{ borderBottom: `1px solid ${border}` }}>
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: '#A8A29E' }}>
                        <span>Penggunaan kuota</span>
                        <span style={{ fontFamily: 'DM Mono' }}>{pctCuti}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F5F5F4' }}>
                        <div className="h-2 rounded-full transition-all"
                          style={{ width: `${pctCuti}%`, background: pctCuti >= 100 ? '#DC2626' : pctCuti >= 70 ? '#F59E0B' : '#16A34A' }}/>
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* Tabel cuti */}
              {cutiList.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm" style={{ color: '#A8A29E' }}>
                  Belum ada cuti yang disetujui
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#FAFAFA', borderBottom: `1px solid ${border}` }}>
                        {['Tanggal', 'Durasi', 'Alasan'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                            style={{ color: primary, fontFamily: 'DM Mono' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cutiList.map((c, i) => {
                        const hari     = hitungHariCuti(c.date_start, c.date_end)
                        const tglStart = new Date(c.date_start + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        const tglEnd   = c.date_end !== c.date_start
                          ? new Date(c.date_end + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : null
                        return (
                          <tr key={i} className="hover:bg-[#FAFAFA] transition-colors"
                            style={{ borderBottom: i < cutiList.length - 1 ? `1px solid #FAFAFA` : 'none' }}>
                            <td className="px-5 py-3 text-sm" style={{ color: '#44403C', fontFamily: 'DM Mono' }}>
                              {tglStart}{tglEnd ? ` — ${tglEnd}` : ''}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: primaryBg, color: accent }}>
                                {hari} hari
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm" style={{ color: '#78716C' }}>{c.reason || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}