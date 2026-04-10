'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const primary    = '#A78BFA'
const accent     = '#442F78'
const purple50   = '#F5F0FF'
const purple100  = '#EAB6FF'

const EMPTY_FORM = {
  full_name: '', nisn: '', class_id: '', tahun_ajaran: '',
  wali_name: '', wali_phone: '', alamat: '',
  jenis_kelamin: '', tanggal_lahir: '', active: true
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
      style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
      {children}
    </label>
  )
}

function FieldInput({ value, onChange, type = 'text', placeholder, required, rows }) {
  const filled = !!value
  const base = {
    border: `1.5px solid ${filled ? primary : purple100}`,
    background: filled ? purple50 : '#FFFFFF',
    color: '#111827',
  }
  if (rows) return (
    <textarea rows={rows} placeholder={placeholder} value={value} onChange={onChange}
      className="w-full px-4 py-3 text-sm rounded-xl transition-all resize-none"
      style={base}/>
  )
  return (
    <input type={type} required={required} placeholder={placeholder} value={value} onChange={onChange}
      className="w-full px-4 py-3 text-sm rounded-xl transition-all"
      style={base}/>
  )
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="px-6 py-5 flex items-center justify-between flex-shrink-0"
      style={{ borderBottom: `1px solid ${purple100}` }}>
      <div>
        <h2 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{subtitle}</p>}
      </div>
      <button onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors flex-shrink-0"
        style={{ color: '#9ca3af', background: purple50 }}>
        ✕
      </button>
    </div>
  )
}

export default function MuridPage() {
  const router = useRouter()

  const [profile,     setProfile]     = useState(null)
  const [murids,      setMurids]      = useState([])
  const [classes,     setClasses]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const [showDetail,  setShowDetail]  = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [editMurid,   setEditMurid]   = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [formError,   setFormError]   = useState('')
  const [showQR,      setShowQR]      = useState(null)
  const [qrDataUrl,   setQrDataUrl]   = useState('')
  const [activeTab,   setActiveTab]   = useState('all')

  const [showImport,  setShowImport]  = useState(false)
  const [csvPreview,  setCsvPreview]  = useState([])
  const [csvErrors,   setCsvErrors]   = useState([])
  const [importing,   setImporting]   = useState(false)
  const [importDone,  setImportDone]  = useState(null)
  const fileInputRef                  = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      await Promise.all([fetchMurids(), fetchClasses()])
    }
    init()
  }, [])

  const fetchMurids = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*, classes(nama_kelas, tahun_ajaran)')
      .order('full_name', { ascending: true })
    if (error) console.error('fetchMurids error:', error)
    setMurids(data || [])
    setLoading(false)
  }

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes').select('id, nama_kelas, tahun_ajaran')
      .eq('active', true).order('nama_kelas', { ascending: true })
    setClasses(data || [])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        full_name: form.full_name, nisn: form.nisn || null, class_id: form.class_id || null,
        tahun_ajaran: form.tahun_ajaran || null, wali_name: form.wali_name || null,
        wali_phone: form.wali_phone || null, alamat: form.alamat || null,
        jenis_kelamin: form.jenis_kelamin || null, tanggal_lahir: form.tanggal_lahir || null,
        active: form.active,
      }
      if (editMurid) {
        const { error } = await supabase.from('students').update(payload).eq('id', editMurid.id)
        if (error) throw error
      } else {
        const qr_code = 'MRD-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        const { error } = await supabase.from('students').insert({ ...payload, qr_code })
        if (error) throw error
      }
      await fetchMurids()
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditMurid(null)
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan.')
    }
    setSaving(false)
  }

  const openEdit = (murid) => {
    setEditMurid(murid)
    setForm({
      full_name: murid.full_name, nisn: murid.nisn || '', class_id: murid.class_id || '',
      tahun_ajaran: murid.tahun_ajaran || '', wali_name: murid.wali_name || '',
      wali_phone: murid.wali_phone || '', alamat: murid.alamat || '',
      jenis_kelamin: murid.jenis_kelamin || '', tanggal_lahir: murid.tanggal_lahir || '',
      active: murid.active,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus data murid ini?')) return
    await supabase.from('students').delete().eq('id', id)
    await fetchMurids()
  }

  const generateQR = async (murid) => {
    setShowQR(murid)
    setQrDataUrl('')
    const QRCode = (await import('qrcode')).default
    const url = await QRCode.toDataURL(murid.qr_code || murid.id, {
      width: 300, margin: 2, color: { dark: '#1a1a18', light: '#ffffff' }
    })
    setQrDataUrl(url)
  }

  const printQR = (murid) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Murid - ${murid.full_name}</title>
      <style>
        body{margin:0;font-family:sans-serif;background:#fff;}
        .card{width:320px;margin:40px auto;padding:32px 24px;border:2px solid ${purple100};border-radius:16px;text-align:center;}
        .label{font-size:11px;color:${accent};font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;}
        .name{font-size:20px;font-weight:700;color:#111;margin:12px 0 2px;}
        .kelas{font-size:13px;color:#6b7280;margin-bottom:20px;}
        .qr{width:200px;height:200px;margin:0 auto 16px;display:block;}
        .qr-id{font-size:10px;color:#9ca3af;font-family:monospace;letter-spacing:.06em;}
        .footer{margin-top:16px;font-size:10px;color:#d1d5db;}
      </style></head><body>
      <div class="card">
        <div class="label">Kartu Absensi Murid</div>
        <div class="name">${murid.full_name}</div>
        <div class="kelas">${murid.classes?.nama_kelas || ''} · ${murid.tahun_ajaran || ''}</div>
        <img src="${qrDataUrl}" class="qr"/>
        <div class="qr-id">${murid.qr_code || murid.id}</div>
        <div class="footer">Tunjukkan kartu ini di depan kamera absensi</div>
      </div></body></html>
    `)
    win.document.close()
    win.print()
  }

  const filtered = murids
    .filter(m => activeTab === 'all' ? true : activeTab === 'active' ? m.active : !m.active)
    .filter(m => !filterKelas || m.class_id === filterKelas)
    .filter(m =>
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.nisn?.toLowerCase().includes(search.toLowerCase()) ||
      m.wali_name?.toLowerCase().includes(search.toLowerCase())
    )

  const totalAktif   = murids.filter(m => m.active).length
  const totalNonaktif = murids.filter(m => !m.active).length

  const downloadTemplate = () => {
    const header  = 'full_name,nisn,nama_kelas,tahun_ajaran,wali_name,wali_phone,jenis_kelamin,tanggal_lahir,alamat'
    const example = 'Ahmad Fauzi,1234567890,Kelas A,2025/2026,Budi Santoso,08123456789,Laki-laki,2019-05-10,Jl. Contoh No. 1 Denpasar'
    const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'template_import_murid.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleCSVFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvPreview([]); setCsvErrors([]); setImportDone(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text    = ev.target.result
      const lines   = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { setCsvErrors(['File kosong atau tidak ada data selain header.']); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const missing = ['full_name'].filter(r => !headers.includes(r))
      if (missing.length > 0) { setCsvErrors([`Kolom wajib tidak ditemukan: ${missing.join(', ')}`]); return }
      const rows = [], errs = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim())
        const row  = {}
        headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
        if (!row.full_name) { errs.push(`Baris ${i + 1}: full_name kosong, dilewati.`); continue }
        const matchedClass = classes.find(c =>
          c.nama_kelas?.toLowerCase() === row.nama_kelas?.toLowerCase() &&
          (!row.tahun_ajaran || c.tahun_ajaran === row.tahun_ajaran)
        )
        rows.push({
          full_name: row.full_name, nisn: row.nisn || null, class_id: matchedClass?.id || null,
          nama_kelas: row.nama_kelas || '', tahun_ajaran: row.tahun_ajaran || null,
          wali_name: row.wali_name || null, wali_phone: row.wali_phone || null,
          jenis_kelamin: row.jenis_kelamin || null, tanggal_lahir: row.tanggal_lahir || null,
          alamat: row.alamat || null, _classFound: !!matchedClass,
        })
      }
      setCsvPreview(rows); setCsvErrors(errs)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (csvPreview.length === 0) return
    setImporting(true)
    let success = 0, failed = 0
    for (const row of csvPreview) {
      try {
        const qr_code = 'MRD-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        const { error } = await supabase.from('students').insert({
          full_name: row.full_name, nisn: row.nisn || null, class_id: row.class_id || null,
          tahun_ajaran: row.tahun_ajaran || null, wali_name: row.wali_name || null,
          wali_phone: row.wali_phone || null, jenis_kelamin: row.jenis_kelamin || null,
          tanggal_lahir: row.tanggal_lahir || null, alamat: row.alamat || null,
          active: true, qr_code,
        })
        if (error) failed++; else success++
      } catch { failed++ }
    }
    setImportDone({ success, failed })
    setImporting(false)
    await fetchMurids()
  }

  const f = form

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus,textarea:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
        .overlay{position:fixed;inset:0;background:rgba(67,47,120,0.3);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        .modal{animation:modalIn .2s ease both}
        tr:hover td{background:${purple50}}
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <div>
            <h1 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>Data Murid</h1>
            {/* ── IMPROVEMENT: tambah breakdown aktif/nonaktif di subtitle ── */}
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              {totalAktif} aktif · {totalNonaktif} nonaktif · {murids.length} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Template CSV
            </button>
            <button onClick={() => { setShowImport(true); setCsvPreview([]); setCsvErrors([]); setImportDone(null) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import CSV
            </button>
            <button onClick={() => { setShowModal(true); setEditMurid(null); setForm(EMPTY_FORM) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: accent, boxShadow: `0 4px 14px ${accent}30`, fontFamily: "'Rubik', sans-serif" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Tambah Murid
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Filters */}
          <div className="fu flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15"
                viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Cari nama, NISN, atau wali..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all"
                style={{
                  border: `1.5px solid ${search ? primary : purple100}`,
                  background: search ? purple50 : '#FFFFFF',
                  color: '#111827',
                }}/>
            </div>

            {/* ── IMPROVEMENT: filter kelas pakai theme konsisten ── */}
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl appearance-none transition-all"
              style={{
                border: `1.5px solid ${filterKelas ? primary : purple100}`,
                background: filterKelas ? purple50 : '#FFFFFF',
                color: filterKelas ? '#111827' : '#9ca3af',
              }}>
              <option value="">Semua Kelas</option>
              {classes.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas} — {k.tahun_ajaran}</option>
              ))}
            </select>

            {/* ── IMPROVEMENT: tab toggle pakai purple50/accent theme ── */}
            <div className="flex p-1 rounded-xl" style={{ background: purple50, border: `1px solid ${purple100}` }}>
              {[
                { key: 'all',       label: 'Semua'    },
                { key: 'active',    label: 'Aktif'    },
                { key: 'nonactive', label: 'Nonaktif' },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={activeTab === t.key
                    ? { background: accent, color: '#FFFFFF', fontFamily: "'Rubik', sans-serif" }
                    : { color: accent }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
            </div>

          ) : filtered.length === 0 ? (
            <div className="fu flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: purple50, border: `1px solid ${purple100}` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="font-semibold mb-1" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                {search || filterKelas ? 'Murid tidak ditemukan' : 'Belum ada murid'}
              </p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                {search || filterKelas ? 'Coba ubah filter pencarian' : 'Klik "Tambah Murid" untuk mulai'}
              </p>
            </div>

          ) : (
            <div className="fu rounded-2xl overflow-hidden"
              style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                    {['Nama Murid', 'NISN', 'Kelas', 'Wali', 'Status', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((murid) => (
                    <tr key={murid.id} className="transition-colors" style={{ borderBottom: `1px solid ${purple100}` }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: murid.active ? accent : '#d1d5db', fontFamily: "'Rubik', sans-serif" }}>
                            {murid.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: '#111827' }}>{murid.full_name}</div>
                            <div className="text-xs" style={{ color: '#9ca3af' }}>
                              {murid.jenis_kelamin || '—'}
                              {murid.tanggal_lahir ? ` · ${new Date(murid.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'DM Mono' }}>
                          {murid.nisn || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium" style={{ color: '#111827' }}>{murid.classes?.nama_kelas || '—'}</div>
                        <div className="text-xs" style={{ color: '#9ca3af' }}>{murid.tahun_ajaran || murid.classes?.tahun_ajaran || ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm" style={{ color: '#374151' }}>{murid.wali_name || '—'}</div>
                        <div className="text-xs" style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>{murid.wali_phone || ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={murid.active
                            ? { background: '#f0fdf4', color: '#16a34a' }
                            : { background: '#f3f4f6', color: '#9ca3af' }}>
                          {murid.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => generateQR(murid)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                              <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/>
                            </svg>
                            QR
                          </button>
                          <button onClick={() => setShowDetail(murid)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                            </svg>
                            Detail
                          </button>
                          <button onClick={() => openEdit(murid)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(murid.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: '#fef2f2', color: '#dc2626' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL TAMBAH/EDIT ── */}
      {showModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col rounded-2xl"
            style={{ background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>
            <ModalHeader
              title={editMurid ? 'Edit Data Murid' : 'Tambah Murid Baru'}
              onClose={() => setShowModal(false)}
            />
            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">

              <div>
                <FieldLabel>Nama Lengkap <span className="text-red-400">*</span></FieldLabel>
                <FieldInput required placeholder="Nama lengkap murid"
                  value={f.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>NISN</FieldLabel>
                  <FieldInput placeholder="Nomor Induk Siswa"
                    value={f.nisn} onChange={e => setForm(p => ({ ...p, nisn: e.target.value }))}/>
                </div>
                <div>
                  <FieldLabel>Jenis Kelamin</FieldLabel>
                  <select value={f.jenis_kelamin} onChange={e => setForm(p => ({ ...p, jenis_kelamin: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                    style={{
                      border: `1.5px solid ${f.jenis_kelamin ? primary : purple100}`,
                      background: f.jenis_kelamin ? purple50 : '#FFFFFF',
                      color: f.jenis_kelamin ? '#111827' : '#9ca3af',
                    }}>
                    <option value="">Pilih...</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel>Tanggal Lahir</FieldLabel>
                <FieldInput type="date"
                  value={f.tanggal_lahir} onChange={e => setForm(p => ({ ...p, tanggal_lahir: e.target.value }))}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Kelas</FieldLabel>
                  <select value={f.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                    style={{
                      border: `1.5px solid ${f.class_id ? primary : purple100}`,
                      background: f.class_id ? purple50 : '#FFFFFF',
                      color: f.class_id ? '#111827' : '#9ca3af',
                    }}>
                    <option value="">Pilih kelas...</option>
                    {classes.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Tahun Ajaran</FieldLabel>
                  <select value={f.tahun_ajaran} onChange={e => setForm(p => ({ ...p, tahun_ajaran: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                    style={{
                      border: `1.5px solid ${f.tahun_ajaran ? primary : purple100}`,
                      background: f.tahun_ajaran ? purple50 : '#FFFFFF',
                      color: f.tahun_ajaran ? '#111827' : '#9ca3af',
                    }}>
                    <option value="">Pilih...</option>
                    {['2024/2025','2025/2026','2026/2027'].map(ta => <option key={ta} value={ta}>{ta}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Nama Wali</FieldLabel>
                  <FieldInput placeholder="Nama orang tua/wali"
                    value={f.wali_name} onChange={e => setForm(p => ({ ...p, wali_name: e.target.value }))}/>
                </div>
                <div>
                  <FieldLabel>No. HP Wali</FieldLabel>
                  <FieldInput placeholder="0812xxxxxxxx"
                    value={f.wali_phone} onChange={e => setForm(p => ({ ...p, wali_phone: e.target.value }))}/>
                </div>
              </div>

              <div>
                <FieldLabel>Alamat</FieldLabel>
                <FieldInput rows={2} placeholder="Alamat lengkap"
                  value={f.alamat} onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))}/>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: purple50, color: accent, border: `1px solid ${purple100}`, fontFamily: "'Rubik', sans-serif" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: saving ? primary : accent, fontFamily: "'Rubik', sans-serif" }}>
                  {saving
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Menyimpan...</>
                    : editMurid ? 'Simpan Perubahan' : 'Tambah Murid'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETAIL ── */}
      {showDetail && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal w-full max-w-sm mx-4 overflow-hidden rounded-2xl"
            style={{ background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>
            <ModalHeader title="Detail Murid" onClose={() => setShowDetail(null)} />
            <div className="px-6 py-5 flex flex-col gap-3">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ background: accent, fontFamily: "'Rubik', sans-serif" }}>
                  {showDetail.full_name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                    {showDetail.full_name}
                  </div>
                  <div className="text-sm" style={{ color: '#9ca3af' }}>
                    {showDetail.classes?.nama_kelas || '—'} · {showDetail.tahun_ajaran || '—'}
                  </div>
                </div>
              </div>

              {/* ── IMPROVEMENT: detail rows pakai purple50 bg alternating ── */}
              {[
                { label: 'NISN',          val: showDetail.nisn },
                { label: 'Jenis Kelamin', val: showDetail.jenis_kelamin },
                { label: 'Tanggal Lahir', val: showDetail.tanggal_lahir ? new Date(showDetail.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                { label: 'Nama Wali',     val: showDetail.wali_name },
                { label: 'No. HP Wali',   val: showDetail.wali_phone },
                { label: 'Alamat',        val: showDetail.alamat },
                { label: 'Status',        val: showDetail.active ? 'Aktif' : 'Nonaktif' },
              ].filter(({ val }) => val).map(({ label, val }, i) => (
                <div key={label} className="flex justify-between py-2.5 px-3 rounded-lg"
                  style={{ background: i % 2 === 0 ? purple50 : '#FFFFFF', border: i % 2 === 0 ? `1px solid ${purple100}` : 'none' }}>
                  <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>{label}</span>
                  <span className="text-sm text-right max-w-48" style={{ color: accent }}>{val}</span>
                </div>
              ))}

              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowDetail(null); openEdit(showDetail) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: purple50, color: accent, border: `1px solid ${purple100}`, fontFamily: "'Rubik', sans-serif" }}>
                  Edit Data
                </button>
                <button onClick={() => { setShowDetail(null); generateQR(showDetail) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: accent, fontFamily: "'Rubik', sans-serif" }}>
                  Lihat QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL QR ── */}
      {showQR && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowQR(null)}>
          <div className="modal w-80 mx-4 overflow-hidden rounded-2xl"
            style={{ background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>
            <ModalHeader title="QR Code Murid" onClose={() => setShowQR(null)} />
            <div className="px-6 py-6 flex flex-col items-center gap-4">
              <div className="w-full rounded-2xl p-5 text-center"
                style={{ background: purple50, border: `2px solid ${purple100}` }}>
                <img src="/logoborder.png" alt="Logo"
                  style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 10px' }} />
                <div className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: accent, fontFamily: 'DM Mono' }}>
                  Kartu Absensi Murid
                </div>
                <div className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                  {showQR.full_name}
                </div>
                <div className="text-xs mb-4" style={{ color: '#9ca3af' }}>
                  {showQR.classes?.nama_kelas || '—'} · {showQR.tahun_ajaran || '—'}
                </div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="w-44 h-44 mx-auto rounded-xl"/>
                ) : (
                  <div className="w-44 h-44 mx-auto flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
                  </div>
                )}
                <div className="text-xs mt-3" style={{ color: '#d1d5db', fontFamily: 'DM Mono' }}>
                  {showQR.qr_code || showQR.id}
                </div>
              </div>
              <button onClick={() => printQR(showQR)} disabled={!qrDataUrl}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: qrDataUrl ? accent : primary,
                  fontFamily: "'Rubik', sans-serif",
                  boxShadow: qrDataUrl ? `0 4px 14px ${accent}30` : 'none',
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Kartu QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORT CSV ── */}
      {showImport && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowImport(false)}>
          <div className="modal w-full max-w-2xl mx-4 overflow-hidden flex flex-col rounded-2xl"
            style={{ maxHeight: '90vh', background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>
            <ModalHeader
              title="Import Data Murid"
              subtitle="Upload file CSV sesuai template untuk import massal"
              onClose={() => setShowImport(false)}
            />

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* Upload area */}
              {!importDone && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: csvPreview.length > 0 ? primary : purple100,
                    background: csvPreview.length > 0 ? purple50 : '#FAFAFA',
                  }}>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: csvPreview.length > 0 ? purple100 : '#f3f4f6' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke={csvPreview.length > 0 ? accent : '#9ca3af'} strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  {csvPreview.length > 0 ? (
                    <p className="text-sm font-semibold" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>
                      {csvPreview.length} baris data siap diimport
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: accent }}>Klik untuk pilih file CSV</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Format: .csv · Download template di atas untuk format yang benar</p>
                    </>
                  )}
                </div>
              )}

              {/* Errors */}
              {csvErrors.length > 0 && (
                <div className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                  <p className="font-semibold mb-1">⚠ Peringatan ({csvErrors.length})</p>
                  {csvErrors.map((e, i) => <p key={i} className="text-xs">{e}</p>)}
                </div>
              )}

              {/* Import done */}
              {importDone && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: '#dcfce7' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>Import Selesai</p>
                    <p className="text-sm mt-1">
                      <span className="text-green-600 font-semibold">{importDone.success} berhasil</span>
                      {importDone.failed > 0 && <span className="text-red-500 font-semibold"> · {importDone.failed} gagal</span>}
                    </p>
                  </div>
                  <button onClick={() => setShowImport(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: accent, fontFamily: "'Rubik', sans-serif" }}>
                    Selesai
                  </button>
                </div>
              )}

              {/* Preview table */}
              {csvPreview.length > 0 && !importDone && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
                    Preview Data ({csvPreview.length} murid)
                  </p>
                  <div className="rounded-xl overflow-auto" style={{ maxHeight: 280, border: `1px solid ${purple100}` }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                          {['Nama', 'NISN', 'Kelas', 'Tahun Ajaran', 'Wali', 'Status Kelas'].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                              style={{ color: accent, fontFamily: 'DM Mono' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${purple100}` }}>
                            <td className="px-3 py-2 font-medium" style={{ color: '#111827' }}>{row.full_name}</td>
                            <td className="px-3 py-2" style={{ color: '#6b7280', fontFamily: 'DM Mono' }}>{row.nisn || '—'}</td>
                            <td className="px-3 py-2" style={{ color: '#6b7280' }}>{row.nama_kelas || '—'}</td>
                            <td className="px-3 py-2" style={{ color: '#6b7280' }}>{row.tahun_ajaran || '—'}</td>
                            <td className="px-3 py-2" style={{ color: '#6b7280' }}>{row.wali_name || '—'}</td>
                            <td className="px-3 py-2">
                              {row.nama_kelas ? (
                                row._classFound
                                  ? <span className="text-green-600 font-semibold">✓ Ditemukan</span>
                                  : <span style={{ color: '#d97706', fontWeight: 600 }}>⚠ Tidak ada</span>
                              ) : <span style={{ color: '#d1d5db' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.some(r => r.nama_kelas && !r._classFound) && (
                    <p className="text-xs mt-2" style={{ color: '#d97706' }}>
                      ⚠ Beberapa kelas tidak ditemukan — murid tetap diimport tapi tanpa kelas. Pastikan nama kelas di CSV sama persis dengan data kelas yang sudah dibuat.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {csvPreview.length > 0 && !importDone && (
              <div className="px-6 py-4 flex gap-3 flex-shrink-0"
                style={{ borderTop: `1px solid ${purple100}` }}>
                <button onClick={() => { setCsvPreview([]); setCsvErrors([]); fileInputRef.current.value = '' }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: purple50, color: accent, border: `1px solid ${purple100}`, fontFamily: "'Rubik', sans-serif" }}>
                  Ganti File
                </button>
                <button onClick={handleImport} disabled={importing}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: importing ? '#86efac' : '#16a34a', fontFamily: "'Rubik', sans-serif" }}>
                  {importing ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Mengimport...</>
                  ) : (
                    <>Import {csvPreview.length} Murid</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}