'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const primary     = '#A78BFA'
const accent      = '#442F78'
const purple50    = '#F5F0FF'
const purple100   = '#EAB6FF'
const BATAS_MURID = '07:30'
const BATAS_GURU  = '07:00'
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function getWeekdaysInMonth(year, month) {
  // Murid: Senin - Jumat
  const days = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push(`${y}-${m}-${day}`)
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getWorkdaysGuruInMonth(year, month) {
  // Guru: Senin - Sabtu
  const days = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const dow = d.getDay()
    if (dow !== 0) { // exclude Minggu saja
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push(`${y}-${m}-${day}`)
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

function isLate(timeStr, batas) {
  if (!timeStr) return false
  return timeStr.slice(0, 5) > batas
}

function menitDiff(timeStr, batas) {
  if (!timeStr) return null
  const [bh, bm] = batas.split(':').map(Number)
  const cleaned = timeStr.replace('.', ':')
  const parts = cleaned.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  const [h, m] = parts
  const diff = (h * 60 + m) - (bh * 60 + bm)
  if (diff === 0) return null
  const total = Math.abs(diff)
  const jam   = Math.floor(total / 60)
  const mnt   = total % 60
  const label = jam > 0
    ? (mnt > 0 ? `${jam} jam ${mnt} mnt` : `${jam} jam`)
    : `${mnt} mnt`
  return { label, early: diff < 0 }
}

function menitRaw(timeStr, batas) {
  if (!timeStr) return 0
  const [bh, bm] = batas.split(':').map(Number)
  const cleaned = timeStr.replace('.', ':')
  const parts = cleaned.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0
  const diff = (parts[0] * 60 + parts[1]) - (bh * 60 + bm)
  return diff > 0 ? diff : 0
}

function fmtMenit(total) {
  if (total <= 0) return ''
  const jam = Math.floor(total / 60)
  const mnt = total % 60
  if (jam > 0) return mnt > 0 ? `${jam} jam ${mnt} mnt` : `${jam} jam`
  return `${mnt} mnt`
}

function fmtTime(scannedAt) {
  if (!scannedAt) return null
  return new Date(scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
}

const statusStyle = (s) => {
  if (s === 'Hadir')       return { background: '#f0fdf4', color: '#16a34a' }
  if (s === 'Telat')       return { background: '#fffbeb', color: '#d97706' }
  if (s === 'Izin')        return { background: '#fffbeb', color: '#d97706' }
  if (s === 'Sakit')       return { background: '#ecfeff', color: '#0891b2' }
  if (s === 'Alpha')       return { background: '#fef2f2', color: '#dc2626' }
  if (s === 'Tidak Masuk') return { background: '#fef2f2', color: '#dc2626' }
  return {}
}

export default function LaporanPage() {
  const router = useRouter()

  const [profile, setProfile]         = useState(null)
  const [subjectTab, setSubjectTab]   = useState('murid')
  const [mode, setMode]               = useState('harian')
  const [classes, setClasses]         = useState([])
  const [murids, setMurids]           = useState([])
  const [gurus, setGurus]             = useState([])
  const [filterKelas, setFilterKelas] = useState('')
  const [loading, setLoading]         = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)

  const now = new Date()
  const [tanggal, setTanggal] = useState(now.toISOString().slice(0, 10))
  const [bulan, setBulan]     = useState(now.getMonth())
  const [tahun, setTahun]     = useState(now.getFullYear())

  const [hariDataMurid,  setHariDataMurid]  = useState([])
  const [hariDataGuru,   setHariDataGuru]   = useState([])
  const [bulanDataMurid, setBulanDataMurid] = useState([])
  const [bulanDataGuru,  setBulanDataGuru]  = useState([])

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
      const { data: gr } = await supabase.from('profiles').select('id,full_name,jabatan,nip').order('full_name')
      setGurus(gr || [])
    }
    init()
  }, [])

  useEffect(() => {
    if (mode === 'harian') fetchHarian()
    else fetchBulanan()
  }, [tanggal, bulan, tahun, filterKelas, mode, subjectTab])

  const fetchHarian = async () => {
    setLoading(true)
    if (subjectTab === 'murid') {
      const { data } = await supabase.from('attendance_students').select('student_id,type,scanned_at,status').eq('date', tanggal)
      setHariDataMurid(data || [])
    } else {
      const { data } = await supabase.from('attendance_guru').select('profile_id,type,scanned_at').eq('date', tanggal)
      setHariDataGuru(data || [])
    }
    setLoading(false)
  }

  const fetchBulanan = async () => {
    setLoading(true)
    const start = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    if (subjectTab === 'murid') {
      const { data } = await supabase.from('attendance_students').select('student_id,type,scanned_at,date,status').gte('date', start).lte('date', end)
      setBulanDataMurid(data || [])
    } else {
      const { data } = await supabase.from('attendance_guru').select('profile_id,type,scanned_at,date').gte('date', start).lte('date', end)
      setBulanDataGuru(data || [])
    }
    setLoading(false)
  }

  // ── MURID computed ──
  const hariRowsMurid = useMemo(() => {
    const filtered = murids.filter(m => !filterKelas || m.class_id === filterKelas)
    return filtered.map(m => {
      const recs      = hariDataMurid.filter(r => r.student_id === m.id)
      const masukRec  = recs.find(r => r.type === 'masuk')
      const pulangRec = recs.find(r => r.type === 'pulang')
      const jamMasuk  = fmtTime(masukRec?.scanned_at)
      const jamPulang = fmtTime(pulangRec?.scanned_at)
      let status = 'Tidak Masuk'
      if (masukRec) {
        const s = masukRec.status
        if (s === 'izin')  status = 'Izin'
        else if (s === 'sakit') status = 'Sakit'
        else if (s === 'alpha') status = 'Alpha'
        else status = isLate(jamMasuk, BATAS_MURID) ? 'Telat' : 'Hadir'
      }
      return { ...m, jamMasuk, jamPulang, status }
    })
  }, [hariDataMurid, murids, filterKelas])

  const hariSummaryMurid = useMemo(() => ({
    hadir:      hariRowsMurid.filter(r => r.status === 'Hadir').length,
    telat:      hariRowsMurid.filter(r => r.status === 'Telat').length,
    izin:       hariRowsMurid.filter(r => r.status === 'Izin').length,
    sakit:      hariRowsMurid.filter(r => r.status === 'Sakit').length,
    alpha:      hariRowsMurid.filter(r => r.status === 'Alpha').length,
    tidakMasuk: hariRowsMurid.filter(r => r.status === 'Tidak Masuk').length,
    total:      hariRowsMurid.length,
  }), [hariRowsMurid])

  const bulanRowsMurid = useMemo(() => {
    const hariKerja = getWeekdaysInMonth(tahun, bulan)
    const filtered  = murids.filter(m => !filterKelas || m.class_id === filterKelas)
    return filtered.map(m => {
      const recs = bulanDataMurid.filter(r => r.student_id === m.id)
      let hadir = 0, telat = 0, tidakMasuk = 0, totalMenit = 0
      const telatDetail = []
      hariKerja.forEach(tgl => {
        const masukRec = recs.find(r => r.date === tgl && r.type === 'masuk')
        if (!masukRec) { tidakMasuk++; return }
        const jam = fmtTime(masukRec.scanned_at)
        if (isLate(jam, BATAS_MURID)) {
          telat++
          const mnt = menitRaw(jam, BATAS_MURID)
          totalMenit += mnt
          telatDetail.push({ tgl, jam, mnt })
        } else hadir++
      })
      return { ...m, hadir, telat, tidakMasuk, total: hariKerja.length, telatDetail, totalMenit }
    })
  }, [bulanDataMurid, murids, filterKelas, bulan, tahun])

  // ── GURU computed ──
  const hariRowsGuru = useMemo(() => {
    return gurus.map(g => {
      const recs      = hariDataGuru.filter(r => r.profile_id === g.id)
      const masukRec  = recs.find(r => r.type === 'masuk')
      const pulangRec = recs.find(r => r.type === 'pulang')
      const jamMasuk  = fmtTime(masukRec?.scanned_at)
      const jamPulang = fmtTime(pulangRec?.scanned_at)
      let status = 'Tidak Masuk'
      if (masukRec) status = isLate(jamMasuk, BATAS_GURU) ? 'Telat' : 'Hadir'
      return { ...g, jamMasuk, jamPulang, status }
    })
  }, [hariDataGuru, gurus])

  const hariSummaryGuru = useMemo(() => ({
    hadir:      hariRowsGuru.filter(r => r.status === 'Hadir').length,
    telat:      hariRowsGuru.filter(r => r.status === 'Telat').length,
    tidakMasuk: hariRowsGuru.filter(r => r.status === 'Tidak Masuk').length,
    total:      hariRowsGuru.length,
  }), [hariRowsGuru])

  const bulanRowsGuru = useMemo(() => {
    const hariKerja = getWorkdaysGuruInMonth(tahun, bulan)
    return gurus.map(g => {
      const recs = bulanDataGuru.filter(r => r.profile_id === g.id)
      let hadir = 0, telat = 0, tidakMasuk = 0, totalMenit = 0
      const telatDetail = []
      hariKerja.forEach(tgl => {
        const masukRec = recs.find(r => r.date === tgl && r.type === 'masuk')
        if (!masukRec) { tidakMasuk++; return }
        const jam = fmtTime(masukRec.scanned_at)
        if (isLate(jam, BATAS_GURU)) {
          telat++
          const mnt = menitRaw(jam, BATAS_GURU)
          totalMenit += mnt
          telatDetail.push({ tgl, jam, mnt })
        } else hadir++
      })
      return { ...g, hadir, telat, tidakMasuk, total: hariKerja.length, telatDetail, totalMenit }
    })
  }, [bulanDataGuru, gurus, bulan, tahun])

  const printLaporan = () => window.print()

  const exportCSV = () => {
    const isHarian  = mode === 'harian'
    const isMurid   = subjectTab === 'murid'
    const rows      = isHarian ? hariRows : bulanRows
    const label     = isMurid ? 'Murid' : 'Guru'
    const periode   = isHarian ? tanggal : `${BULAN[bulan]}_${tahun}`

    let headers, csvRows
    if (isHarian) {
      headers  = ['No', 'Nama', isMurid ? 'Kelas' : 'Jabatan', 'Jam Masuk', 'Keterlambatan', 'Jam Pulang', 'Status']
      csvRows  = rows.map((r, i) => {
        const batas = isMurid ? BATAS_MURID : BATAS_GURU
        const d = menitDiff(r.jamMasuk, batas)
        const ket = d ? (d.early ? `${d.label} lebih awal` : `${d.label} terlambat`) : ''
        return [
          i + 1,
          r.full_name,
          isMurid ? (r.classes?.nama_kelas || '') : (r.jabatan || ''),
          r.jamMasuk  || '',
          ket,
          r.jamPulang || '',
          r.status,
        ]
      })
    } else {
      headers  = ['No', 'Nama', isMurid ? 'Kelas' : 'Jabatan', 'Hari Kerja', 'Hadir', 'Telat', 'Tidak Masuk', '% Hadir', 'Total Hari Telat', 'Total Menit Telat', 'Detail Keterlambatan']
      csvRows  = rows.map((r, i) => {
        const pct = r.total > 0 ? Math.round(((r.hadir + r.telat) / r.total) * 100) : 0
        const detail = (r.telatDetail || []).map(t => {
          const tglFmt = new Date(t.tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
          return `${tglFmt} (${t.mnt} mnt)`
        }).join(', ')
        return [
          i + 1,
          r.full_name,
          isMurid ? (r.classes?.nama_kelas || '') : (r.jabatan || ''),
          r.total,
          r.hadir,
          r.telat,
          r.tidakMasuk,
          pct + '%',
          r.telat || 0,
          r.totalMenit ? fmtMenit(r.totalMenit) : '',
          detail,
        ]
      })
    }

    const csv = [headers, ...csvRows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const bom  = '\uFEFF' // UTF-8 BOM supaya Excel baca karakter Indonesia dengan benar
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Laporan_Absensi_${label}_${isHarian ? 'Harian' : 'Bulanan'}_${periode}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hariRows    = subjectTab === 'murid' ? hariRowsMurid    : hariRowsGuru
  const hariSummary = subjectTab === 'murid' ? hariSummaryMurid : hariSummaryGuru
  const bulanRows   = subjectTab === 'murid' ? bulanRowsMurid   : bulanRowsGuru

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
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

      <Sidebar profile={profile} className="no-print" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 no-print"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <div>
            <h1 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>Laporan Absensi</h1>
            <p className="text-xs" style={{ color: '#9ca3af' }}>Batas tepat waktu: Murid {BATAS_MURID} · Guru {BATAS_GURU} · Senin–Jumat</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Export Excel
            </button>
            <button onClick={printLaporan}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: accent, boxShadow: `0 4px 14px ${accent}30`, fontFamily: "'Rubik', sans-serif" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6 print-area">

          {/* Controls */}
          <div className="fu flex items-center gap-3 mb-6 flex-wrap no-print">

            {/* Subject: Murid | Guru */}
            <div className="flex p-1 rounded-xl" style={{ background: purple50, border: `1px solid ${purple100}` }}>
              {[
                { key: 'murid', label: 'Murid', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                )},
                { key: 'guru', label: 'Guru', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                )},
              ].map(t => (
                <button key={t.key} onClick={() => setSubjectTab(t.key)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={subjectTab === t.key
                    ? { background: accent, color: '#FFFFFF', fontFamily: "'Rubik', sans-serif" }
                    : { color: accent }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Mode: Harian | Bulanan */}
            <div className="flex p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
              {[{ key: 'harian', label: 'Harian' }, { key: 'bulanan', label: 'Bulanan' }].map(t => (
                <button key={t.key} onClick={() => setMode(t.key)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={mode === t.key
                    ? { background: accent, color: '#FFFFFF', fontFamily: "'Rubik', sans-serif" }
                    : { color: accent }}>
                  {t.label}
                </button>
              ))}
            </div>

            {mode === 'harian' && (
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                style={{ color: '#111' }}/>
            )}

            {mode === 'bulanan' && (
              <>
                <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                  className="px-4 py-2 text-sm rounded-xl appearance-none transition-all" style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}>
                  {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
                </select>
                <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                  className="px-4 py-2 text-sm rounded-xl appearance-none transition-all" style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}

            {subjectTab === 'murid' && (
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                style={{ color: filterKelas ? '#111' : '#9ca3af' }}>
                <option value="">Semua Kelas</option>
                {classes.map(k => (
                  <option key={k.id} value={k.id}>{k.nama_kelas} — {k.tahun_ajaran}</option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
            </div>
          ) : (
            <>
              {/* ── HARIAN ── */}
              {mode === 'harian' && (
                <div className="fu flex flex-col gap-5">
                  <div className="hidden print:block mb-4 text-center">
                    <div className="font-bold text-xl">Laporan Absensi Harian — {subjectTab === 'murid' ? 'Murid' : 'Guru'}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  <div className={`grid gap-4 ${subjectTab === 'murid' ? 'grid-cols-3 lg:grid-cols-6' : 'grid-cols-4'}`}>
                    {(subjectTab === 'murid' ? [
                      { label: 'Total Murid', val: hariSummary.total,      color: accent,    bg: purple50  },
                      { label: 'Hadir',       val: hariSummary.hadir,      color: '#16a34a', bg: '#f0fdf4' },
                      { label: 'Telat',       val: hariSummary.telat,      color: '#d97706', bg: '#fffbeb' },
                      { label: 'Izin',        val: hariSummary.izin || 0,  color: '#d97706', bg: '#fffbeb' },
                      { label: 'Sakit',       val: hariSummary.sakit || 0, color: '#0891b2', bg: '#ecfeff' },
                      { label: 'Alpha',       val: (hariSummary.alpha || 0) + (hariSummary.tidakMasuk || 0), color: '#dc2626', bg: '#fef2f2' },
                    ] : [
                      { label: 'Total Guru',  val: hariSummary.total,      color: accent,    bg: purple50  },
                      { label: 'Hadir',       val: hariSummary.hadir,      color: '#16a34a', bg: '#f0fdf4' },
                      { label: 'Telat',       val: hariSummary.telat,      color: '#d97706', bg: '#fffbeb' },
                      { label: 'Tidak Masuk', val: hariSummary.tidakMasuk, color: '#dc2626', bg: '#fef2f2' },
                    ]).map(c => (
                      <div key={c.label} className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: c.color, fontFamily: 'DM Mono' }}>{c.label}</div>
                        <div className="text-3xl font-bold" style={{ color: c.color }}>{c.val}</div>
                        {hariSummary.total > 0 && (
                          <div className="text-xs text-gray-400 mt-1">{Math.round((c.val / hariSummary.total) * 100)}%</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {hariSummary.total > 0 && (
                    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: accent, fontFamily: 'DM Mono' }}>Kehadiran Hari Ini</div>
                      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: purple50 }}>
                        <div style={{ width: `${(hariSummary.hadir / hariSummary.total) * 100}%`, background: '#22c55e' }}/>
                        <div style={{ width: `${(hariSummary.telat / hariSummary.total) * 100}%`, background: '#f59e0b' }}/>
                        {subjectTab === 'murid' && <>
                          <div style={{ width: `${((hariSummary.izin || 0) / hariSummary.total) * 100}%`, background: '#fb923c' }}/>
                          <div style={{ width: `${((hariSummary.sakit || 0) / hariSummary.total) * 100}%`, background: '#22d3ee' }}/>
                        </>}
                        <div style={{ width: `${((hariSummary.tidakMasuk + (hariSummary.alpha || 0)) / hariSummary.total) * 100}%`, background: '#ef4444' }}/>
                      </div>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        {(subjectTab === 'murid'
                          ? [{ label: 'Hadir', color: '#22c55e' }, { label: 'Telat', color: '#f59e0b' }, { label: 'Izin', color: '#fb923c' }, { label: 'Sakit', color: '#22d3ee' }, { label: 'Alpha', color: '#ef4444' }]
                          : [{ label: 'Hadir', color: '#22c55e' }, { label: 'Telat', color: '#f59e0b' }, { label: 'Tidak Masuk', color: '#ef4444' }]
                        ).map(l => (
                          <div key={l.label} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }}/>
                            <span className="text-xs text-gray-500">{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                          {['No', subjectTab === 'murid' ? 'Nama Murid' : 'Nama Guru', subjectTab === 'murid' ? 'Kelas' : 'Jabatan', 'Jam Masuk', 'Jam Pulang', 'Status'].map(h => (
                            <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hariRows.map((row, i) => (
                          <tr key={row.id} className="transition-colors" style={{ borderBottom: `1px solid ${purple100}` }}>
                            <td className="px-5 py-3.5 text-sm text-gray-400">{i + 1}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: accent }}>
                                  {row.full_name?.[0]}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{row.full_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500">
                              {subjectTab === 'murid' ? (row.classes?.nama_kelas || '—') : (row.jabatan || '—')}
                            </td>
                            <td className="px-5 py-3.5">
                              {row.jamMasuk ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium" style={{ fontFamily: 'DM Mono', color: isLate(row.jamMasuk, subjectTab === 'murid' ? BATAS_MURID : BATAS_GURU) ? '#d97706' : '#16a34a' }}>
                                    {row.jamMasuk}
                                  </span>
                                  {(() => {
                                    const batas = subjectTab === 'murid' ? BATAS_MURID : BATAS_GURU
                                    const d = menitDiff(row.jamMasuk, batas)
                                    if (!d) return null
                                    return (
                                      <span className="text-xs font-semibold" style={{ color: d.early ? '#16a34a' : '#dc2626' }}>
                                        {d.early ? `${d.label} lebih awal` : `${d.label} terlambat`}
                                      </span>
                                    )
                                  })()}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {row.jamPulang
                                ? <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Mono' }}>{row.jamPulang}</span>
                                : <span className="text-sm text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={statusStyle(row.status)}>{row.status}</span>
                            </td>
                          </tr>
                        ))}
                        {hariRows.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>Belum ada data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── BULANAN ── */}
              {mode === 'bulanan' && (
                <div className="fu flex flex-col gap-5">
                  <div className="hidden print:block mb-4 text-center">
                    <div className="font-bold text-xl">Laporan Absensi Bulanan — {subjectTab === 'murid' ? 'Murid' : 'Guru'}</div>
                    <div className="text-sm text-gray-500">{BULAN[bulan]} {tahun}</div>
                  </div>

                  <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                          {['', 'No', subjectTab === 'murid' ? 'Nama Murid' : 'Nama Guru', subjectTab === 'murid' ? 'Kelas' : 'Jabatan', 'Hari Kerja', 'Hadir', 'Telat', 'Tidak Masuk', '% Hadir', 'Total Terlambat'].map(h => (
                            <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulanRows.map((row, i) => {
                          const pct      = row.total > 0 ? Math.round(((row.hadir + row.telat) / row.total) * 100) : 0
                          const expanded = expandedRow === row.id
                          const hasDetail = row.telatDetail?.length > 0
                          return (
                            <React.Fragment key={row.id}>
                              <tr
                                onClick={() => hasDetail && setExpandedRow(expanded ? null : row.id)}
                                className="transition-colors"
                                style={{ cursor: hasDetail ? 'pointer' : 'default', background: expanded ? purple50 : '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
                                <td className="pl-4 py-3.5 w-8">
                                  {hasDetail && (
                                    <span className="text-gray-400 text-xs transition-transform inline-block" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-gray-400">{i + 1}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: accent }}>
                                      {row.full_name?.[0]}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{row.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm text-gray-500">
                                  {subjectTab === 'murid' ? (row.classes?.nama_kelas || '—') : (row.jabatan || '—')}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-gray-600">{row.total}</td>
                                <td className="px-4 py-3.5"><span className="text-sm font-semibold" style={{ color: '#16a34a' }}>{row.hadir}</span></td>
                                <td className="px-4 py-3.5"><span className="text-sm font-semibold" style={{ color: '#d97706' }}>{row.telat}</span></td>
                                <td className="px-4 py-3.5"><span className="text-sm font-semibold" style={{ color: '#dc2626' }}>{row.tidakMasuk}</span></td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: purple50 }}>
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}/>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>{pct}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  {row.totalMenit > 0 ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{row.telat} hari</span>
                                      <span className="text-xs text-gray-400">{fmtMenit(row.totalMenit)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                              {expanded && hasDetail && (
                                <tr style={{ background: purple50 }}>
                                  <td colSpan={10} className="px-8 pb-4 pt-1">
                                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent, fontFamily: 'DM Mono' }}>
                                      Detail Keterlambatan — {row.full_name}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {row.telatDetail.map((t, idx) => {
                                        const tglFmt = new Date(t.tgl).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                                        return (
                                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                                            style={{ background: '#fee2e2', color: '#dc2626' }}>
                                            <span>{tglFmt}</span>
                                            <span className="font-bold">·</span>
                                            <span>{t.jam}</span>
                                            <span className="font-bold">·</span>
                                            <span>{t.mnt} mnt terlambat</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                        {bulanRows.length === 0 && (
                          <tr><td colSpan={10} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>Belum ada data</td></tr>
                        )}
                      </tbody>
                    </table>
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