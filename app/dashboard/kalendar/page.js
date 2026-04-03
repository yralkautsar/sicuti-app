'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const HARI  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

const TYPE_CONFIG = {
  libur_nasional: { label: 'Libur Nasional', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  libur_sekolah:  { label: 'Libur Sekolah',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  kegiatan:       { label: 'Kegiatan',        color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  cuti_guru:      { label: 'Cuti Guru',       color: purple,    bg: purple50,  border: purple100 },
}

const EMPTY_FORM = { judul: '', deskripsi: '', tanggal: '', type: 'kegiatan', tampil_publik: true }

// Fetch libur nasional Indonesia dari API
async function fetchLiburNasional(year) {
  try {
    const res = await fetch(`https://dayoffapi.vercel.app/api?year=${year}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(d => ({
      id:     `nasional-${d.tanggal}`,
      tanggal: d.tanggal,
      judul:   d.keterangan,
      type:   'libur_nasional',
      tampil_publik: true,
      _source: 'api'
    }))
  } catch { return [] }
}

export default function KalendarPage() {
  const router = useRouter()
  const now    = new Date()

  const [profile,   setProfile]   = useState(null)
  const [isAdmin,   setIsAdmin]   = useState(false)
  const [bulan,     setBulan]     = useState(now.getMonth())
  const [tahun,     setTahun]     = useState(now.getFullYear())
  const [events,    setEvents]    = useState([])
  const [libNas,    setLibNas]    = useState([])
  const [cutiGuru,  setCutiGuru]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const fetchEvents = async () => {
    const start = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data } = await supabase
      .from('school_events')
      .select('*')
      .gte('tanggal', start)
      .lte('tanggal', end)
      .order('tanggal', { ascending: true })
    setEvents(data || [])
  }

  const fetchLibNas = async () => {
    const data = await fetchLiburNasional(tahun)
    const start = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    setLibNas(data.filter(d => d.tanggal >= start && d.tanggal <= end))
  }

  const fetchCutiGuru = async () => {
    const start = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const lastDay = new Date(tahun, bulan + 1, 0).getDate()
    const end = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data } = await supabase
      .from('leave_requests')
      .select('*, profiles(full_name)')
      .eq('status', 'approved')
      .lte('date_start', end)
      .gte('date_end', start)
    setCutiGuru(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setIsAdmin(prof?.role === 'admin' || prof?.jabatan === 'Kepala Sekolah')
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    fetchEvents()
    fetchLibNas()
    fetchCutiGuru()
  }, [bulan, tahun])

  // Gabung semua events per tanggal
  const allEvents = useMemo(() => {
    const map = {}
    const add = (tgl, ev) => {
      if (!map[tgl]) map[tgl] = []
      map[tgl].push(ev)
    }
    libNas.forEach(e => add(e.tanggal, e))
    events.forEach(e => add(e.tanggal, e))
    // Cuti guru — expand range ke individual days
    cutiGuru.forEach(c => {
      const s = new Date(c.date_start + 'T00:00:00')
      const e = new Date(c.date_end + 'T00:00:00')
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const tgl = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        add(tgl, {
          id: `cuti-${c.id}-${tgl}`,
          tanggal: tgl,
          judul: c.profiles?.full_name || 'Guru',
          type: 'cuti_guru',
          _source: 'cuti'
        })
      }
    })
    return map
  }, [libNas, events, cutiGuru])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(tahun, bulan, 1).getDay()
    const daysInMonth = new Date(tahun, bulan + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const tgl = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, tgl, events: allEvents[tgl] || [] })
    }
    return days
  }, [tahun, bulan, allEvents])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (editEvent) {
        const { error } = await supabase.from('school_events').update({
          judul: form.judul,
          deskripsi: form.deskripsi || null,
          tanggal: form.tanggal,
          type: form.type,
          tampil_publik: form.tampil_publik,
        }).eq('id', editEvent.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('school_events').insert({
          judul: form.judul,
          deskripsi: form.deskripsi || null,
          tanggal: form.tanggal,
          type: form.type,
          tampil_publik: form.tampil_publik,
          created_by: profile?.id,
        })
        if (error) throw error
      }
      await fetchEvents()
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditEvent(null)
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan.')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus event ini?')) return
    await supabase.from('school_events').delete().eq('id', id)
    await fetchEvents()
    setSelectedDay(null)
  }

  const openAdd = (tgl = '') => {
    setEditEvent(null)
    setForm({ ...EMPTY_FORM, tanggal: tgl })
    setShowModal(true)
  }

  const openEdit = (ev) => {
    setEditEvent(ev)
    setForm({ judul: ev.judul, deskripsi: ev.deskripsi || '', tanggal: ev.tanggal, type: ev.type, tampil_publik: ev.tampil_publik })
    setShowModal(true)
    setSelectedDay(null)
  }

  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus,textarea:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center}
        @keyframes modalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .modal{animation:modalIn .2s ease both}
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Kalendar Sekolah</h1>
            <p className="text-xs text-gray-400">Kegiatan, libur, dan cuti guru</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/kalendar" target="_blank"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: purple50, color: purple, border: `1px solid ${purple100}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Lihat Publik
            </a>
            {isAdmin && (
              <button onClick={() => openAdd()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Tambah Event
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Nav bulan */}
          <div className="fu flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => {
                if (bulan === 0) { setBulan(11); setTahun(t => t - 1) }
                else setBulan(b => b - 1)
              }} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 hover:border-gray-400 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <h2 className="font-bold text-gray-900 text-xl" style={{ minWidth: 200, textAlign: 'center' }}>
                {BULAN[bulan]} {tahun}
              </h2>
              <button onClick={() => {
                if (bulan === 11) { setBulan(0); setTahun(t => t + 1) }
                else setBulan(b => b + 1)
              }} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 hover:border-gray-400 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
              <button onClick={() => { setBulan(now.getMonth()); setTahun(now.getFullYear()) }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: purple50, color: purple }}>
                Hari Ini
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
          </div>

          {/* Calendar grid */}
          <div className="fu bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {HARI.map(h => (
                <div key={h} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  style={{ fontFamily: 'DM Mono' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="min-h-24 border-b border-r border-gray-50 bg-gray-50/30"/>
                const isToday    = day.tgl === today
                const isSunday   = new Date(day.tgl + 'T00:00:00').getDay() === 0
                const isSaturday = new Date(day.tgl + 'T00:00:00').getDay() === 6
                const isSelected = selectedDay === day.tgl
                const hasLibur   = day.events.some(e => e.type === 'libur_nasional' || e.type === 'libur_sekolah')

                return (
                  <div key={day.tgl}
                    className="min-h-24 border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors"
                    style={{ background: isSelected ? purple50 : hasLibur ? '#fff7ed' : isSunday ? '#fafafa' : 'white' }}
                    onClick={() => setSelectedDay(isSelected ? null : day.tgl)}>

                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                        isToday ? 'text-white' : isSunday ? 'text-red-400' : isSaturday ? 'text-blue-400' : 'text-gray-700'
                      }`} style={{ background: isToday ? purple : 'transparent' }}>
                        {day.day}
                      </span>
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); openAdd(day.tgl) }}
                          className="w-5 h-5 rounded flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                          style={{ color: purple }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Events */}
                    <div className="flex flex-col gap-0.5">
                      {day.events.slice(0, 3).map((ev, j) => {
                        const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.kegiatan
                        return (
                          <div key={j} className="px-1.5 py-0.5 rounded text-xs font-medium truncate"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            {ev.judul}
                          </div>
                        )
                      })}
                      {day.events.length > 3 && (
                        <div className="text-xs text-gray-400 px-1" style={{ fontFamily: 'DM Mono' }}>
                          +{day.events.length - 3} lagi
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail panel — selected day */}
          {selectedDay && (() => {
            const dayEvents = allEvents[selectedDay] || []
            const tglFmt = new Date(selectedDay + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <div className="fu mt-4 bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">{tglFmt}</h3>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button onClick={() => openAdd(selectedDay)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: purple50, color: purple }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Tambah
                      </button>
                    )}
                    <button onClick={() => setSelectedDay(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                      ✕
                    </button>
                  </div>
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-gray-400">Tidak ada event di hari ini.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayEvents.map((ev, i) => {
                      const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.kegiatan
                      return (
                        <div key={i} className="flex items-start justify-between p-3 rounded-xl"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }}/>
                            <div>
                              <div className="text-sm font-semibold" style={{ color: cfg.color }}>{ev.judul}</div>
                              {ev.deskripsi && <div className="text-xs text-gray-500 mt-0.5">{ev.deskripsi}</div>}
                              <div className="text-xs mt-1" style={{ color: cfg.color, fontFamily: 'DM Mono', opacity: 0.7 }}>{cfg.label}</div>
                            </div>
                          </div>
                          {isAdmin && ev._source !== 'api' && ev._source !== 'cuti' && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openEdit(ev)}
                                className="p-1.5 rounded-lg hover:bg-white transition-all text-gray-400 hover:text-gray-700">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(ev.id)}
                                className="p-1.5 rounded-lg hover:bg-white transition-all text-red-400 hover:text-red-600">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </main>

      {/* Modal tambah/edit event */}
      {showModal && isAdmin && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">
                {editEvent ? 'Edit Event' : 'Tambah Event'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">

              {/* Judul */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>
                  Judul <span className="text-red-400">*</span>
                </label>
                <input type="text" required placeholder="contoh: Hari Raya Idul Fitri"
                  value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                  style={{ border: `1.5px solid ${form.judul ? purple : '#e5e7eb'}`, background: form.judul ? purple50 : 'white', color: '#111' }}
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>
                  Tanggal <span className="text-red-400">*</span>
                </label>
                <input type="date" required value={form.tanggal}
                  onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                  style={{ border: `1.5px solid ${form.tanggal ? purple : '#e5e7eb'}`, background: form.tanggal ? purple50 : 'white', color: '#111' }}
                />
              </div>

              {/* Tipe */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>Tipe</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                  style={{ border: `1.5px solid ${purple}`, background: purple50, color: '#111' }}>
                  <option value="kegiatan">Kegiatan Sekolah</option>
                  <option value="libur_sekolah">Libur Sekolah</option>
                </select>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>Deskripsi (opsional)</label>
                <textarea rows={2} placeholder="Keterangan tambahan..."
                  value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all resize-none"
                  style={{ border: `1.5px solid ${form.deskripsi ? purple : '#e5e7eb'}`, background: form.deskripsi ? purple50 : 'white', color: '#111' }}
                />
              </div>

              {/* Tampil publik */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#f9fafb' }}>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Tampilkan di Kalendar Publik</div>
                  <div className="text-xs text-gray-400 mt-0.5">Wali murid bisa melihat event ini</div>
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, tampil_publik: !p.tampil_publik }))}
                  className="w-11 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ background: form.tampil_publik ? purple : '#d1d5db' }}>
                  <div className="w-5 h-5 bg-white rounded-full shadow transition-all mx-0.5"
                    style={{ transform: form.tampil_publik ? 'translateX(20px)' : 'translateX(0)' }}/>
                </button>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: saving ? '#a78bfa' : purple }}>
                  {saving ? 'Menyimpan...' : editEvent ? 'Simpan Perubahan' : 'Tambah Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}