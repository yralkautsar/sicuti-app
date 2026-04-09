'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import * as XLSX from 'xlsx'

const primary    = '#A78BFA'
const accent     = '#442F78'
const purple50   = '#F5F0FF'
const purple100  = '#EAB6FF'

const EMPTY_FORM = { nama_kelas: '', tahun_ajaran: '', wali_kelas_id: '', active: true }
const TAHUN_AJARAN_OPTIONS = ['2024/2025', '2025/2026', '2026/2027']

const STATUS_OPTIONS = [
  { value: 'hadir',  label: 'Hadir',  color: '#16a34a', bg: '#f0fdf4' },
  { value: 'izin',   label: 'Izin',   color: '#d97706', bg: '#fffbeb' },
  { value: 'sakit',  label: 'Sakit',  color: '#0891b2', bg: '#ecfeff' },
  { value: 'alpha',  label: 'Alpha',  color: '#dc2626', bg: '#fef2f2' },
]


function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
      style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
      {children}
    </label>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="px-6 py-5 flex items-center justify-between flex-shrink-0"
      style={{ borderBottom: `1px solid ${purple100}` }}>
      <h2 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{title}</h2>
      <button onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors"
        style={{ color: '#9ca3af', background: purple50 }}>
        ✕
      </button>
    </div>
  )
}

export default function KelasPage() {
  const router = useRouter()
  const [profile,   setProfile]   = useState(null)
  const [classes,   setClasses]   = useState([])
  const [gurus,     setGurus]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [editKelas, setEditKelas] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const [muridCounts,   setMuridCounts]   = useState({})
  const [showDetail,    setShowDetail]    = useState(null)
  const [detailMurids,  setDetailMurids]  = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const [expanded,      setExpanded]      = useState({})

  const [showAbsensi,    setShowAbsensi]    = useState(false)
  const [absensiKelas,   setAbsensiKelas]   = useState(null)
  const [absensiTgl,     setAbsensiTgl]     = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  })
  const [absensiMurids,  setAbsensiMurids]  = useState([])
  const [absensiData,    setAbsensiData]    = useState({})
  const [absensiLoading, setAbsensiLoading] = useState(false)
  const [absensiSaving,  setAbsensiSaving]  = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      await Promise.all([fetchClasses(), fetchGurus()])
    }
    init()
  }, [])

  const fetchClasses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('classes')
      .select('*, wali:profiles!classes_wali_kelas_id_fkey(full_name, jabatan)')
      .order('tahun_ajaran', { ascending: false })
      .order('nama_kelas', { ascending: true })

    if (error) {
      const { data: plain } = await supabase
        .from('classes').select('*')
        .order('tahun_ajaran', { ascending: false })
        .order('nama_kelas', { ascending: true })
      setClasses(plain || [])
      setLoading(false)
      return
    }
    setClasses(data || [])
    setLoading(false)
  }

  const fetchGurus = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, jabatan').order('full_name', { ascending: true })
    setGurus(data || [])
  }

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from('students').select('class_id').eq('active', true)
      const counts = {}
      data?.forEach(s => { if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1 })
      setMuridCounts(counts)
    }
    fetchCounts()
  }, [classes])

  useEffect(() => {
    if (classes.length > 0) {
      const init = {}
      classes.forEach(k => { init[k.nama_kelas] = true })
      setExpanded(init)
    }
  }, [classes.length === 0 ? 0 : 1])

  const toggleExpand = (nama) => setExpanded(p => ({ ...p, [nama]: !p[nama] }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        nama_kelas:    form.nama_kelas,
        tahun_ajaran:  form.tahun_ajaran,
        wali_kelas_id: form.wali_kelas_id || null,
        active:        form.active,
      }
      if (editKelas) {
        const { error } = await supabase.from('classes').update(payload).eq('id', editKelas.id)
        if (error) throw error
        if (form.wali_kelas_id) {
          await supabase.from('profiles').update({ class_id: null }).eq('class_id', editKelas.id)
          await supabase.from('profiles').update({ class_id: editKelas.id }).eq('id', form.wali_kelas_id)
        }
      } else {
        const { data: newClass, error } = await supabase.from('classes').insert(payload).select().single()
        if (error) throw error
        if (form.wali_kelas_id && newClass) {
          await supabase.from('profiles').update({ class_id: newClass.id }).eq('id', form.wali_kelas_id)
        }
      }
      await fetchClasses()
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditKelas(null)
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan.')
    }
    setSaving(false)
  }

  const openEdit = (kelas) => {
    setEditKelas(kelas)
    setForm({ nama_kelas: kelas.nama_kelas, tahun_ajaran: kelas.tahun_ajaran, wali_kelas_id: kelas.wali_kelas_id || '', active: kelas.active })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus kelas ini? Data murid yang terkait tidak akan terhapus.')) return
    await supabase.from('profiles').update({ class_id: null }).eq('class_id', id)
    await supabase.from('classes').delete().eq('id', id)
    await fetchClasses()
  }

  const toggleActive = async (kelas) => {
    await supabase.from('classes').update({ active: !kelas.active }).eq('id', kelas.id)
    await fetchClasses()
  }

  const openAbsensi = async (kelas) => {
    setAbsensiKelas(kelas)
    setShowAbsensi(true)
    await fetchAbsensiData(kelas, absensiTgl)
  }

  const fetchAbsensiData = async (kelas, tgl) => {
    setAbsensiLoading(true)
    const { data: murids } = await supabase
      .from('students').select('id, full_name, qr_code')
      .eq('class_id', kelas.id).eq('active', true).order('full_name', { ascending: true })
    const { data: existing } = await supabase
      .from('attendance_students').select('id, student_id, type, status, scanned_at')
      .in('student_id', (murids || []).map(m => m.id)).eq('date', tgl)
    const map = {}
    ;(existing || []).forEach(rec => {
      if (rec.type === 'masuk') map[rec.student_id] = { status: rec.status || 'hadir', id: rec.id, scanned: !!rec.scanned_at }
    })
    setAbsensiMurids(murids || [])
    setAbsensiData(map)
    setAbsensiLoading(false)
  }

  const handleTglChange = async (tgl) => {
    setAbsensiTgl(tgl)
    if (absensiKelas) await fetchAbsensiData(absensiKelas, tgl)
  }

  const setStatusMurid = (studentId, status) => {
    setAbsensiData(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
  }

  const saveAbsensi = async () => {
    setAbsensiSaving(true)
    for (const murid of absensiMurids) {
      const entry  = absensiData[murid.id]
      const status = entry?.status || 'alpha'
      if (entry?.id) {
        await supabase.from('attendance_students').update({ status, updated_by: profile?.id }).eq('id', entry.id)
      } else if (status !== 'hadir') {
        await supabase.from('attendance_students').insert({
          student_id: murid.id, type: 'masuk', date: absensiTgl, status, scanned_at: null, updated_by: profile?.id,
        })
      }
    }
    await fetchAbsensiData(absensiKelas, absensiTgl)
    setAbsensiSaving(false)
  }

  const openDetail = async (kelas) => {
    setShowDetail(kelas)
    setDetailLoading(true)
    const { data } = await supabase.from('students').select('*').eq('class_id', kelas.id).order('full_name', { ascending: true })
    setDetailMurids(data || [])
    setDetailLoading(false)
  }

  const exportKelasExcel = async () => {
    if (!showDetail) return
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const rows = detailMurids.map((m, i) => ({
        'No': i + 1,
        'Nama Lengkap':  m.full_name      || '',
        'NISN':          m.nisn           || '',
        'Jenis Kelamin': m.jenis_kelamin  || '',
        'Tanggal Lahir': m.tanggal_lahir ? new Date(m.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
        'Alamat':        m.alamat         || '',
        'Nama Wali':     m.wali_name      || '',
        'No HP Wali':    m.wali_phone     || '',
        'Status':        m.active ? 'Aktif' : 'Nonaktif',
        'QR Code':       m.qr_code        || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 36 }, { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 18 }]
      const sheetName = `${showDetail.nama_kelas} ${showDetail.tahun_ajaran}`.slice(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      const fileName = `Data_Murid_${showDetail.nama_kelas}_${showDetail.tahun_ajaran}.xlsx`.replace(/\//g, '-').replace(/ /g, '_')
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      alert('Gagal export. Silakan coba lagi.')
    }
    setExporting(false)
  }

  const tahunanList = [...new Set(classes.map(c => c.tahun_ajaran))].sort().reverse()
  const grouped = classes.reduce((acc, k) => {
    if (!acc[k.nama_kelas]) acc[k.nama_kelas] = []
    acc[k.nama_kelas].push(k)
    return acc
  }, {})
  Object.values(grouped).forEach(arr => arr.sort((a, b) => b.tahun_ajaran > a.tahun_ajaran ? 1 : -1))

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease both; }
        input:focus, select:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${purple100}; border-radius: 4px; }
        .overlay { position:fixed;inset:0;background:rgba(67,47,120,0.3);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center; }
        @keyframes modalIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .modal { animation: modalIn .2s ease both; }
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <div>
            <h1 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
              Manajemen Kelas
            </h1>
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              {Object.keys(grouped).length} kelas · {classes.length} angkatan terdaftar
            </p>
          </div>
          <button onClick={() => { setShowModal(true); setEditKelas(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: accent, boxShadow: `0 4px 14px ${accent}30`, fontFamily: "'Rubik', sans-serif" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tambah Kelas
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
            </div>

          ) : Object.keys(grouped).length === 0 ? (
            <div className="fu flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: purple50, border: `1px solid ${purple100}` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <p className="font-semibold mb-1" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>Belum ada kelas</p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Klik "Tambah Kelas" untuk mulai</p>
            </div>

          ) : (
            <div className="fu flex flex-col gap-4">
              {Object.entries(grouped).map(([namaKelas, angkatanList]) => {
                const isOpen     = expanded[namaKelas] !== false
                const totalMurid = angkatanList.reduce((s, k) => s + (muridCounts[k.id] || 0), 0)
                const adaAktif   = angkatanList.some(k => k.active)

                return (
                  <div key={namaKelas} className="rounded-2xl overflow-hidden"
                    style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>

                    {/* Group header */}
                    <div className="flex items-center justify-between px-6 py-4 cursor-pointer transition-all"
                      style={{ background: isOpen ? purple50 : '#FFFFFF' }}
                      onClick={() => toggleExpand(namaKelas)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: adaAktif ? purple100 : '#f3f4f6' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={adaAktif ? accent : '#9ca3af'} strokeWidth="2" strokeLinecap="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-base" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{namaKelas}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: '#9ca3af' }}>{angkatanList.length} angkatan</span>
                            <span className="text-xs" style={{ color: '#d1d5db' }}>·</span>
                            <span className="text-xs" style={{ color: '#9ca3af' }}>{totalMurid} murid total</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setEditKelas(null)
                            setForm({ ...EMPTY_FORM, nama_kelas: namaKelas })
                            setShowModal(true)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: accent, color: '#FFFFFF', fontFamily: "'Rubik', sans-serif" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Tambah Angkatan
                        </button>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"
                          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    </div>

                    {/* Angkatan list */}
                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${purple100}` }}>
                        {angkatanList.map((kelas, i) => (
                          <div key={kelas.id}
                            className="grid items-center px-6 py-4 transition-colors"
                            style={{
                              borderTop: i > 0 ? `1px solid ${purple100}` : 'none',
                              gridTemplateColumns: '1fr 80px 1fr',
                            }}>

                            {/* Left */}
                            <div className="flex items-center gap-4 pl-14">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm" style={{ color: accent, fontFamily: 'DM Mono' }}>
                                    {kelas.tahun_ajaran}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                    style={kelas.active
                                      ? { background: '#f0fdf4', color: '#16a34a' }
                                      : { background: '#f3f4f6', color: '#9ca3af' }}>
                                    {kelas.active ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                                  Wali: <span className="font-medium" style={{ color: '#6b7280' }}>
                                    {kelas.wali?.full_name || '— belum ditentukan'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Center */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                                {muridCounts[kelas.id] || 0}
                              </span>
                              <span className="text-xs" style={{ color: '#9ca3af' }}>murid</span>
                            </div>

                            {/* Right — actions */}
                            <div className="flex items-center gap-2 justify-end flex-wrap">
                              <button onClick={() => openAbsensi(kelas)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: '#f0fdf4', color: '#16a34a' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                </svg>
                                Absensi
                              </button>
                              <button onClick={() => openDetail(kelas)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="12" y1="18" x2="12" y2="12"/>
                                  <polyline points="9 15 12 18 15 15"/>
                                </svg>
                                Data & Export
                              </button>
                              <button onClick={() => toggleActive(kelas)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={kelas.active
                                  ? { background: '#f0fdf4', color: '#16a34a' }
                                  : { background: '#f3f4f6', color: '#9ca3af' }}>
                                {kelas.active ? '✓ Aktif' : 'Nonaktif'}
                              </button>
                              <button onClick={() => openEdit(kelas)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: '#f3f4f6', color: '#6b7280' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button>
                              <button onClick={() => handleDelete(kelas.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: '#fef2f2', color: '#dc2626' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL ABSENSI ── */}
      {showAbsensi && absensiKelas && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAbsensi(false)}>
          <div className="modal w-full max-w-2xl mx-4 overflow-hidden flex flex-col rounded-2xl"
            style={{ maxHeight: '90vh', background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>

            <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${purple100}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                    Absensi — {absensiKelas.nama_kelas}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>TA {absensiKelas.tahun_ajaran}</p>
                </div>
                <button onClick={() => setShowAbsensi(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm flex-shrink-0"
                  style={{ color: '#9ca3af', background: purple50 }}>✕</button>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <label className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>Tanggal</label>
                <input type="date" value={absensiTgl}
                  onChange={e => handleTglChange(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl transition-all"
                  style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}/>
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap"
              style={{ borderBottom: `1px solid ${purple100}`, background: purple50 }}>
              {STATUS_OPTIONS.map(s => (
                <div key={s.value} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }}/>
                  <span className="text-xs" style={{ color: '#6b7280' }}>{s.label}</span>
                </div>
              ))}
              <span className="text-xs ml-2" style={{ color: '#d1d5db' }}>· QR = scan otomatis</span>
            </div>

            {/* Murid list */}
            <div className="flex-1 overflow-y-auto">
              {absensiLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
                </div>
              ) : absensiMurids.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#9ca3af' }}>
                  Belum ada murid aktif di kelas ini.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                      {['Nama Murid', 'Status', 'Keterangan'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {absensiMurids.map((murid) => {
                      const entry  = absensiData[murid.id]
                      const status = entry?.status || (entry ? 'hadir' : 'alpha')
                      const scanned = entry?.scanned
                      const cfg    = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[3]
                      return (
                        <tr key={murid.id} style={{ borderBottom: `1px solid ${purple100}` }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: accent }}>{murid.full_name?.[0]}</div>
                              <span className="text-sm font-medium" style={{ color: '#111827' }}>{murid.full_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {scanned ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                                <span className="text-xs" style={{ color: '#d1d5db' }}>QR</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {STATUS_OPTIONS.map(s => (
                                  <button key={s.value}
                                    onClick={() => setStatusMurid(murid.id, s.value)}
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                                    style={{
                                      background: status === s.value ? s.bg : '#f3f4f6',
                                      color: status === s.value ? s.color : '#9ca3af',
                                      border: `1.5px solid ${status === s.value ? s.color : 'transparent'}`,
                                    }}>
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: '#9ca3af' }}>
                            {scanned ? 'Scan QR' : entry ? 'Input manual' : '— belum diisi'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderTop: `1px solid ${purple100}` }}>
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                Dicatat oleh: <span className="font-medium" style={{ color: accent }}>{profile?.full_name}</span>
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAbsensi(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: purple50, color: accent, border: `1px solid ${purple100}`, fontFamily: "'Rubik', sans-serif" }}>
                  Tutup
                </button>
                <button onClick={saveAbsensi} disabled={absensiSaving || absensiLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: absensiSaving ? primary : accent, fontFamily: "'Rubik', sans-serif" }}>
                  {absensiSaving ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Menyimpan...</>
                  ) : 'Simpan Absensi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETAIL KELAS ── */}
      {showDetail && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal w-full max-w-2xl mx-4 overflow-hidden flex flex-col rounded-2xl"
            style={{ maxHeight: '85vh', background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>

            <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${purple100}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                    {showDetail.nama_kelas}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>TA {showDetail.tahun_ajaran}</span>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>
                      Wali: <span className="font-semibold" style={{ color: accent }}>
                        {showDetail.wali?.full_name || '— belum ditentukan'}
                      </span>
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowDetail(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm flex-shrink-0"
                  style={{ color: '#9ca3af', background: purple50 }}>✕</button>
              </div>

              {/* Stats + Export */}
              <div className="flex items-center justify-between mt-4 pt-4"
                style={{ borderTop: `1px solid ${purple100}` }}>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-bold text-2xl" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                      {detailMurids.length}
                    </div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Total Murid</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-2xl text-green-600">{detailMurids.filter(m => m.active).length}</div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Aktif</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-2xl" style={{ color: '#d1d5db' }}>{detailMurids.filter(m => !m.active).length}</div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Nonaktif</div>
                  </div>
                </div>
                <button onClick={exportKelasExcel} disabled={exporting || detailLoading || detailMurids.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: exporting ? primary : accent, opacity: detailMurids.length === 0 ? 0.5 : 1, fontFamily: "'Rubik', sans-serif" }}>
                  {exporting ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Mengexport...</>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <polyline points="9 15 12 18 15 15"/>
                      </svg>
                      Download Excel
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Daftar murid */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
                </div>
              ) : detailMurids.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="font-semibold text-sm" style={{ color: '#6b7280' }}>Belum ada murid di kelas ini</p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Tambahkan murid melalui halaman Data Murid</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                      {['No', 'Nama Murid', 'NISN', 'Wali & No HP', 'Status'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailMurids.map((m, i) => (
                      <tr key={m.id} className="transition-colors" style={{ borderBottom: `1px solid ${purple100}` }}>
                        <td className="px-5 py-3 text-xs" style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: m.active ? accent : '#d1d5db' }}>
                              {m.full_name?.[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: '#111827' }}>{m.full_name}</div>
                              <div className="text-xs" style={{ color: '#9ca3af' }}>{m.jenis_kelamin || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: '#6b7280', fontFamily: 'DM Mono' }}>
                          {m.nisn || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-sm" style={{ color: '#374151' }}>{m.wali_name || '—'}</div>
                          <div className="text-xs" style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>{m.wali_phone || ''}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={m.active
                              ? { background: '#f0fdf4', color: '#16a34a' }
                              : { background: '#f3f4f6', color: '#9ca3af' }}>
                            {m.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TAMBAH / EDIT KELAS ── */}
      {showModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal w-full max-w-md mx-4 overflow-hidden rounded-2xl"
            style={{ background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>

            <ModalHeader
              title={editKelas ? 'Edit Angkatan' : form.nama_kelas && !editKelas ? `Tambah Angkatan — ${form.nama_kelas}` : 'Tambah Kelas Baru'}
              onClose={() => setShowModal(false)}
            />

            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">

              {/* Nama Kelas */}
              <div>
                <FieldLabel>Nama Kelas <span className="text-red-400">*</span></FieldLabel>
                {!editKelas && form.nama_kelas && Object.keys(grouped).includes(form.nama_kelas) ? (
                  <div className="w-full px-4 py-3 text-sm rounded-xl font-semibold"
                    style={{ background: purple50, border: `1.5px solid ${primary}`, color: accent }}>
                    {form.nama_kelas}
                  </div>
                ) : (
                  <input type="text" required
                    placeholder="contoh: TK A Baik Hati, TK B Ceria"
                    value={form.nama_kelas}
                    onChange={e => setForm(p => ({ ...p, nama_kelas: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                    style={{
                      border: `1.5px solid ${form.nama_kelas ? primary : purple100}`,
                      background: form.nama_kelas ? purple50 : '#FFFFFF',
                      color: '#111827',
                    }}
                  />
                )}
              </div>

              {/* Tahun Ajaran */}
              <div>
                <FieldLabel>Tahun Ajaran <span className="text-red-400">*</span></FieldLabel>
                <select required value={form.tahun_ajaran}
                  onChange={e => setForm(p => ({ ...p, tahun_ajaran: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                  style={{
                    border: `1.5px solid ${form.tahun_ajaran ? primary : purple100}`,
                    background: form.tahun_ajaran ? purple50 : '#FFFFFF',
                    color: form.tahun_ajaran ? '#111827' : '#9ca3af',
                  }}>
                  <option value="">Pilih tahun ajaran...</option>
                  {TAHUN_AJARAN_OPTIONS.map(ta => <option key={ta} value={ta}>{ta}</option>)}
                </select>
              </div>

              {/* Wali Kelas */}
              <div>
                <FieldLabel>Wali Kelas</FieldLabel>
                <select value={form.wali_kelas_id}
                  onChange={e => setForm(p => ({ ...p, wali_kelas_id: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                  style={{
                    border: `1.5px solid ${form.wali_kelas_id ? primary : purple100}`,
                    background: form.wali_kelas_id ? purple50 : '#FFFFFF',
                    color: form.wali_kelas_id ? '#111827' : '#9ca3af',
                  }}>
                  <option value="">— Belum ditentukan</option>
                  {gurus.map(g => (
                    <option key={g.id} value={g.id}>{g.full_name}{g.jabatan ? ` — ${g.jabatan}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Status toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: purple50, border: `1px solid ${purple100}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: accent }}>Status Kelas</div>
                  <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Kelas aktif akan muncul di pilihan saat tambah murid</div>
                </div>
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className="w-12 h-6 rounded-full transition-all flex-shrink-0 relative"
                  style={{ background: form.active ? accent : '#d1d5db' }}>
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                    style={{ left: form.active ? '26px' : '2px' }}/>
                </button>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: purple50, color: accent, border: `1px solid ${purple100}`, fontFamily: "'Rubik', sans-serif" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: saving ? primary : accent, fontFamily: "'Rubik', sans-serif" }}>
                  {saving ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Menyimpan...</>
                  ) : (editKelas ? 'Simpan Perubahan' : 'Buat Kelas')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}