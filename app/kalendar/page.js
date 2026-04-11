'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

const primary    = '#A78BFA'
const accent     = '#442F78'
const purple50   = '#F5F0FF'
const purple100  = '#EAB6FF'
const SCHOOL    = 'TK Karakter Mutiara Bunda Bali'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

const TYPE_CONFIG = {
  libur_nasional: { label: 'Libur Nasional', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  libur_sekolah:  { label: 'Libur Sekolah',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  kegiatan:       { label: 'Kegiatan',        color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
}

const LIBUR_FALLBACK = {
  2025: [
    { tanggal: '2025-01-01', judul: 'Tahun Baru Masehi' },
    { tanggal: '2025-01-27', judul: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2025-01-29', judul: 'Tahun Baru Imlek' },
    { tanggal: '2025-03-29', judul: 'Hari Suci Nyepi' },
    { tanggal: '2025-03-31', judul: 'Idul Fitri 1446 H' },
    { tanggal: '2025-04-01', judul: 'Idul Fitri 1446 H' },
    { tanggal: '2025-04-18', judul: 'Wafat Yesus Kristus' },
    { tanggal: '2025-04-20', judul: 'Paskah' },
    { tanggal: '2025-05-01', judul: 'Hari Buruh Internasional' },
    { tanggal: '2025-05-12', judul: 'Hari Raya Waisak' },
    { tanggal: '2025-05-29', judul: 'Kenaikan Yesus Kristus' },
    { tanggal: '2025-06-01', judul: 'Hari Lahir Pancasila' },
    { tanggal: '2025-06-06', judul: 'Idul Adha 1446 H' },
    { tanggal: '2025-06-27', judul: 'Tahun Baru Islam 1447 H' },
    { tanggal: '2025-08-17', judul: 'Hari Kemerdekaan RI' },
    { tanggal: '2025-09-05', judul: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2025-12-25', judul: 'Hari Raya Natal' },
  ],
  2026: [
    { tanggal: '2026-01-01', judul: 'Tahun Baru Masehi' },
    { tanggal: '2026-01-16', judul: 'Isra Mikraj Nabi Muhammad SAW' },
    { tanggal: '2026-02-17', judul: 'Tahun Baru Imlek' },
    { tanggal: '2026-03-19', judul: 'Hari Suci Nyepi' },
    { tanggal: '2026-03-21', judul: 'Idul Fitri 1447 H' },
    { tanggal: '2026-03-22', judul: 'Idul Fitri 1447 H' },
    { tanggal: '2026-04-03', judul: 'Wafat Yesus Kristus' },
    { tanggal: '2026-04-05', judul: 'Paskah' },
    { tanggal: '2026-05-01', judul: 'Hari Buruh Internasional' },
    { tanggal: '2026-05-14', judul: 'Kenaikan Yesus Kristus' },
    { tanggal: '2026-05-27', judul: 'Idul Adha 1447 H' },
    { tanggal: '2026-05-31', judul: 'Hari Raya Waisak' },
    { tanggal: '2026-06-01', judul: 'Hari Lahir Pancasila' },
    { tanggal: '2026-06-17', judul: 'Tahun Baru Islam 1448 H' },
    { tanggal: '2026-08-17', judul: 'Hari Kemerdekaan RI' },
    { tanggal: '2026-08-25', judul: 'Maulid Nabi Muhammad SAW' },
    { tanggal: '2026-12-25', judul: 'Hari Raya Natal' },
  ]
}

async function fetchLiburNasional(year) {
  try {
    const res = await fetch(`https://api-hari-libur.vercel.app/api?year=${year}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    if (!Array.isArray(data) && data?.data) {
      return data.data.map(d => ({
        id: `nasional-${d.date}`, tanggal: d.date, judul: d.description,
        type: 'libur_nasional', _source: 'api'
      }))
    }
    if (Array.isArray(data)) {
      return data.map(d => ({
        id: `nasional-${d.date || d.tanggal}`,
        tanggal: d.date || d.tanggal,
        judul: d.description || d.keterangan,
        type: 'libur_nasional', _source: 'api'
      }))
    }
    throw new Error('Unknown format')
  } catch {
    const fallback = LIBUR_FALLBACK[year] || []
    return fallback.map(d => ({
      id: `nasional-${d.tanggal}`, tanggal: d.tanggal, judul: d.judul,
      type: 'libur_nasional', _source: 'fallback'
    }))
  }
}

export default function KalendarPublikPage() {
  const now = new Date()
  const [bulan,   setBulan]   = useState(now.getMonth())
  const [tahun,   setTahun]   = useState(now.getFullYear())
  const [events,  setEvents]  = useState([])
  const [libNas,  setLibNas]  = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    const start   = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end     = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const [{ data: evData }, libData] = await Promise.all([
      supabase.from('school_events').select('*')
        .eq('tampil_publik', true)
        .gte('tanggal', start)
        .lte('tanggal', end)
        .order('tanggal', { ascending: true }),
      fetchLiburNasional(tahun)
    ])

    setEvents(evData || [])
    setLibNas(libData.filter(d => d.tanggal >= start && d.tanggal <= end))
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [bulan, tahun])

  const allEvents = useMemo(() => {
    const map = {}
    const add = (tgl, ev) => {
      if (!map[tgl]) map[tgl] = []
      map[tgl].push(ev)
    }
    libNas.forEach(e => add(e.tanggal, e))
    events.forEach(e => add(e.tanggal, e))
    return map
  }, [libNas, events])

  const calendarDays = useMemo(() => {
    const firstDay    = new Date(tahun, bulan, 1).getDay()
    const daysInMonth = new Date(tahun, bulan + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const tgl = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, tgl, events: allEvents[tgl] || [] })
    }
    return days
  }, [tahun, bulan, allEvents])

  // List semua event bulan ini untuk tampilan bawah
  const eventList = useMemo(() => {
    const all = []
    libNas.forEach(e => all.push(e))
    events.forEach(e => all.push(e))
    return all.sort((a, b) => a.tanggal > b.tanggal ? 1 : -1)
  }, [libNas, events])

  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10" style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoborder.png" alt="Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-bold text-sm leading-tight" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{SCHOOL}</div>
              <div className="text-xs" style={{ color: primary, fontFamily: 'DM Mono' }}>Kalendar Sekolah</div>
            </div>
          </div>
          <a href="/panduan"
            className="text-xs font-medium transition-all px-3 py-1.5 rounded-lg"
            style={{ color: accent, background: purple50, border: `1px solid ${purple100}` }}>
            Panduan
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Nav bulan */}
        <div className="flex items-center justify-between">
          <button onClick={() => {
            if (bulan === 0) { setBulan(11); setTahun(t => t - 1) }
            else setBulan(b => b - 1)
          }} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="font-bold text-xl" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{BULAN[bulan]} {tahun}</h2>
          <button onClick={() => {
            if (bulan === 11) { setBulan(0); setTahun(t => t + 1) }
            else setBulan(b => b + 1)
          }} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }}/>
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
          {/* Day headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${purple100}` }}>
            {HARI.map(h => (
              <div key={h} className="py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="min-h-16 p-0" style={{ borderBottom: `1px solid ${purple100}`, borderRight: `1px solid ${purple100}`, background: '#FAFAFA' }}/>
                const isToday    = day.tgl === today
                const isSunday   = new Date(day.tgl + 'T00:00:00').getDay() === 0
                const isSaturday = new Date(day.tgl + 'T00:00:00').getDay() === 6
                const hasLibur   = day.events.some(e => e.type === 'libur_nasional' || e.type === 'libur_sekolah')
                const isSelected = selectedDay === day.tgl

                return (
                  <div key={day.tgl}
                    className="min-h-16 p-1 cursor-pointer transition-colors" style={{ borderBottom: `1px solid ${purple100}`, borderRight: `1px solid ${purple100}` }}
                    style={{ background: isSelected ? purple50 : hasLibur ? '#fff7ed' : isSunday ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => setSelectedDay(isSelected ? null : day.tgl)}>
                    <div className="flex justify-center mb-1">
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'text-white' : isSunday ? 'text-red-400' : isSaturday ? 'text-blue-400' : 'text-gray-700'
                      }`} style={{ background: isToday ? accent : 'transparent' }}>
                        {day.day}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {day.events.slice(0, 2).map((ev, j) => {
                        const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.kegiatan
                        return (
                          <div key={j} className="px-1 py-0.5 rounded text-xs font-medium truncate text-center"
                            style={{ background: cfg.bg, color: cfg.color, fontSize: 9 }}>
                            {ev.judul}
                          </div>
                        )
                      })}
                      {day.events.length > 2 && (
                        <div className="text-center text-gray-400" style={{ fontSize: 9, fontFamily: 'DM Mono' }}>
                          +{day.events.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected day detail */}
        {selectedDay && (() => {
          const dayEvents = allEvents[selectedDay] || []
          const tglFmt = new Date(selectedDay + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          return (
            <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{tglFmt}</h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-700">✕</button>
              </div>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-gray-400">Tidak ada kegiatan di hari ini.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayEvents.map((ev, i) => {
                    const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.kegiatan
                    return (
                      <div key={i} className="p-3 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <div className="text-sm font-semibold" style={{ color: cfg.color }}>{ev.judul}</div>
                        {ev.deskripsi && <div className="text-xs text-gray-500 mt-0.5">{ev.deskripsi}</div>}
                        {(ev.waktu || ev.tempat) && (
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {ev.waktu && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                                </svg>
                                {ev.waktu}
                              </span>
                            )}
                            {ev.tempat && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                </svg>
                                {ev.tempat}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs mt-1" style={{ color: cfg.color, fontFamily: 'DM Mono', opacity: 0.7 }}>{cfg.label}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Event list bulan ini */}
        {eventList.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-bold text-sm" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>Agenda {BULAN[bulan]} {tahun}</h3>
            </div>
            <div className="flex flex-col">
              {eventList.map((ev, i) => {
                const cfg  = TYPE_CONFIG[ev.type] || TYPE_CONFIG.kegiatan
                const tgl  = new Date(ev.tanggal + 'T00:00:00')
                return (
                  <div key={i} className="flex items-start gap-4 px-5 py-3.5" style={{ borderBottom: `1px solid ${purple100}` }}>
                    <div className="text-center flex-shrink-0 w-10">
                      <div className="text-lg font-bold text-gray-900">{tgl.getDate()}</div>
                      <div className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>{HARI[tgl.getDay()]}</div>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="text-sm font-semibold text-gray-900">{ev.judul}</div>
                      {ev.deskripsi && <div className="text-xs text-gray-400 mt-0.5">{ev.deskripsi}</div>}
                      {(ev.waktu || ev.tempat) && (
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {ev.waktu && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                              </svg>
                              {ev.waktu}
                            </span>
                          )}
                          {ev.tempat && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                              </svg>
                              {ev.tempat}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs" style={{ color: '#d1d5db', fontFamily: 'DM Mono' }}>
            SiCuti · {SCHOOL}
          </p>
        </div>

      </div>
    </div>
  )
}