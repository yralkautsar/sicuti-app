'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'


const EMPTY_FORM = {
  full_name: '', nisn: '', class_id: '', tahun_ajaran: '',
  wali_name: '', wali_phone: '', alamat: '',
  jenis_kelamin: '', tanggal_lahir: '', active: true
}

export default function MuridPage() {
  const router   = useRouter()

  const [profile, setProfile]         = useState(null)
  const [murids, setMurids]           = useState([])
  const [classes, setClasses]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [showDetail, setShowDetail]   = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [editMurid, setEditMurid]     = useState(null)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState('')
  const [showQR, setShowQR]           = useState(null)
  const [qrDataUrl, setQrDataUrl]     = useState('')
  const [activeTab, setActiveTab]     = useState('all')

  // Import CSV
  const [showImport, setShowImport]   = useState(false)
  const [csvPreview, setCsvPreview]   = useState([])
  const [csvErrors, setCsvErrors]     = useState([])
  const [importing, setImporting]     = useState(false)
  const [importDone, setImportDone]   = useState(null) // { success, failed }
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
      .from('classes')
      .select('id, nama_kelas, tahun_ajaran')
      .eq('active', true)
      .order('nama_kelas', { ascending: true })
    setClasses(data || [])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        full_name:     form.full_name,
        nisn:          form.nisn || null,
        class_id:      form.class_id || null,
        tahun_ajaran:  form.tahun_ajaran || null,
        wali_name:     form.wali_name || null,
        wali_phone:    form.wali_phone || null,
        alamat:        form.alamat || null,
        jenis_kelamin: form.jenis_kelamin || null,
        tanggal_lahir: form.tanggal_lahir || null,
        active:        form.active,
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
      full_name:     murid.full_name,
      nisn:          murid.nisn || '',
      class_id:      murid.class_id || '',
      tahun_ajaran:  murid.tahun_ajaran || '',
      wali_name:     murid.wali_name || '',
      wali_phone:    murid.wali_phone || '',
      alamat:        murid.alamat || '',
      jenis_kelamin: murid.jenis_kelamin || '',
      tanggal_lahir: murid.tanggal_lahir || '',
      active:        murid.active,
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
      width: 300, margin: 2,
      color: { dark: '#1a1a18', light: '#ffffff' }
    })
    setQrDataUrl(url)
  }

  const printQR = (murid) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Murid - ${murid.full_name}</title>
      <style>
        body{margin:0;font-family:sans-serif;background:#fff;}
        .card{width:320px;margin:40px auto;padding:32px 24px;border:2px solid #ede9fe;border-radius:16px;text-align:center;}
        .label{font-size:11px;color:#6d28d9;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;}
        .name{font-size:20px;font-weight:800;color:#111;margin:12px 0 2px;}
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

  const totalAktif = murids.filter(m => m.active).length

  // Download template CSV
  const downloadTemplate = () => {
    const header = 'full_name,nisn,nama_kelas,tahun_ajaran,wali_name,wali_phone,jenis_kelamin,tanggal_lahir,alamat'
    const example = 'Ahmad Fauzi,1234567890,Kelas A,2025/2026,Budi Santoso,08123456789,Laki-laki,2019-05-10,Jl. Contoh No. 1 Denpasar'
    const blob = new Blob([header + '\n' + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_import_murid.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Parse CSV file
  const handleCSVFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvPreview([])
    setCsvErrors([])
    setImportDone(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { setCsvErrors(['File kosong atau tidak ada data selain header.']); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const required = ['full_name']
      const missing = required.filter(r => !headers.includes(r))
      if (missing.length > 0) { setCsvErrors([`Kolom wajib tidak ditemukan: ${missing.join(', ')}`]); return }

      const rows = []
      const errs = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim())
        const row = {}
        headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
        if (!row.full_name) { errs.push(`Baris ${i + 1}: full_name kosong, dilewati.`); continue }
        // Match class_id dari nama_kelas
        const matchedClass = classes.find(c =>
          c.nama_kelas?.toLowerCase() === row.nama_kelas?.toLowerCase() &&
          (!row.tahun_ajaran || c.tahun_ajaran === row.tahun_ajaran)
        )
        rows.push({
          full_name:     row.full_name,
          nisn:          row.nisn || null,
          class_id:      matchedClass?.id || null,
          nama_kelas:    row.nama_kelas || '',
          tahun_ajaran:  row.tahun_ajaran || null,
          wali_name:     row.wali_name || null,
          wali_phone:    row.wali_phone || null,
          jenis_kelamin: row.jenis_kelamin || null,
          tanggal_lahir: row.tanggal_lahir || null,
          alamat:        row.alamat || null,
          _classFound:   !!matchedClass,
        })
      }
      setCsvPreview(rows)
      setCsvErrors(errs)
    }
    reader.readAsText(file)
  }

  // Batch insert
  const handleImport = async () => {
    if (csvPreview.length === 0) return
    setImporting(true)
    let success = 0, failed = 0
    for (const row of csvPreview) {
      try {
        const qr_code = 'MRD-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        const { error } = await supabase.from('students').insert({
          full_name:     row.full_name,
          nisn:          row.nisn || null,
          class_id:      row.class_id || null,
          tahun_ajaran:  row.tahun_ajaran || null,
          wali_name:     row.wali_name || null,
          wali_phone:    row.wali_phone || null,
          jenis_kelamin: row.jenis_kelamin || null,
          tanggal_lahir: row.tanggal_lahir || null,
          alamat:        row.alamat || null,
          active:        true,
          qr_code,
        })
        if (error) failed++
        else success++
      } catch { failed++ }
    }
    setImportDone({ success, failed })
    setImporting(false)
    await fetchMurids()
  }

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
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        .modal{animation:modalIn .2s ease both}
      `}</style>

      {/* SIDEBAR */}
      {/* ── SIDEBAR ── */}
      <Sidebar profile={profile} />

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Data Murid</h1>
            <p className="text-xs text-gray-400">{totalAktif} murid aktif · {murids.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: purple50, color: purple }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Template CSV
            </button>
            <button onClick={() => { setShowImport(true); setCsvPreview([]); setCsvErrors([]); setImportDone(null) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import CSV
            </button>
            <button onClick={() => { setShowModal(true); setEditMurid(null); setForm(EMPTY_FORM) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
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
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
                style={{ color: '#111' }}/>
            </div>
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
              style={{ color: filterKelas ? '#111' : '#9ca3af' }}>
              <option value="">Semua Kelas</option>
              {classes.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas} — {k.tahun_ajaran}</option>
              ))}
            </select>
            <div className="flex p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
              {[
                { key: 'all', label: 'Semua' },
                { key: 'active', label: 'Aktif' },
                { key: 'nonactive', label: 'Nonaktif' },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={activeTab === t.key
                    ? { background: 'white', color: purple, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                    : { color: '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="fu flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: purple50 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">
                {search || filterKelas ? 'Murid tidak ditemukan' : 'Belum ada murid'}
              </p>
              <p className="text-sm text-gray-400">
                {search || filterKelas ? 'Coba ubah filter pencarian' : 'Klik "Tambah Murid" untuk mulai'}
              </p>
            </div>
          ) : (
            <div className="fu bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    {['Nama Murid', 'NISN', 'Kelas', 'Wali', 'Status', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        style={{ fontFamily: 'DM Mono' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((murid) => (
                    <tr key={murid.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: murid.active ? purple : '#d1d5db' }}>
                            {murid.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{murid.full_name}</div>
                            <div className="text-xs text-gray-400">
                              {murid.jenis_kelamin || '—'}
                              {murid.tanggal_lahir ? ` · ${new Date(murid.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Mono' }}>
                          {murid.nisn || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <div className="text-sm text-gray-700 font-medium">{murid.classes?.nama_kelas || '—'}</div>
                          <div className="text-xs text-gray-400">{murid.tahun_ajaran || murid.classes?.tahun_ajaran || ''}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <div className="text-sm text-gray-700">{murid.wali_name || '—'}</div>
                          <div className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>{murid.wali_phone || ''}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={murid.active
                            ? { background: '#f0fdf4', color: '#16a34a' }
                            : { background: '#f3f4f6', color: '#6b7280' }}>
                          {murid.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => generateQR(murid)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: purple50, color: purple }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                              <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/>
                            </svg>
                            QR
                          </button>
                          <button onClick={() => setShowDetail(murid)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                            </svg>
                            Detail
                          </button>
                          <button onClick={() => openEdit(murid)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(murid.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
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

      {/* MODAL TAMBAH/EDIT */}
      {showModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">
                {editMurid ? 'Edit Data Murid' : 'Tambah Murid Baru'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>Nama Lengkap <span className="text-red-400">*</span></label>
                <input type="text" required placeholder="Nama lengkap murid"
                  value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                  style={{ border: `1.5px solid ${form.full_name ? purple : '#e5e7eb'}`, background: form.full_name ? purple50 : 'white', color: '#111' }}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>NISN</label>
                  <input type="text" placeholder="Nomor Induk Siswa"
                    value={form.nisn} onChange={e => setForm(p => ({ ...p, nisn: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                    style={{ border: `1.5px solid ${form.nisn ? purple : '#e5e7eb'}`, background: form.nisn ? purple50 : 'white', color: '#111' }}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>Jenis Kelamin</label>
                  <select value={form.jenis_kelamin} onChange={e => setForm(p => ({ ...p, jenis_kelamin: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                    style={{ border: `1.5px solid ${form.jenis_kelamin ? purple : '#e5e7eb'}`, background: form.jenis_kelamin ? purple50 : 'white', color: form.jenis_kelamin ? '#111' : '#9ca3af' }}>
                    <option value="">Pilih...</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>Tanggal Lahir</label>
                <input type="date"
                  value={form.tanggal_lahir} onChange={e => setForm(p => ({ ...p, tanggal_lahir: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                  style={{ border: `1.5px solid ${form.tanggal_lahir ? purple : '#e5e7eb'}`, background: form.tanggal_lahir ? purple50 : 'white', color: '#111' }}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>Kelas</label>
                  <select value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                    style={{ border: `1.5px solid ${form.class_id ? purple : '#e5e7eb'}`, background: form.class_id ? purple50 : 'white', color: form.class_id ? '#111' : '#9ca3af' }}>
                    <option value="">Pilih kelas...</option>
                    {classes.map(k => (
                      <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>Tahun Ajaran</label>
                  <select value={form.tahun_ajaran} onChange={e => setForm(p => ({ ...p, tahun_ajaran: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                    style={{ border: `1.5px solid ${form.tahun_ajaran ? purple : '#e5e7eb'}`, background: form.tahun_ajaran ? purple50 : 'white', color: form.tahun_ajaran ? '#111' : '#9ca3af' }}>
                    <option value="">Pilih...</option>
                    {['2024/2025','2025/2026','2026/2027'].map(ta => (
                      <option key={ta} value={ta}>{ta}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>Nama Wali</label>
                  <input type="text" placeholder="Nama orang tua/wali"
                    value={form.wali_name} onChange={e => setForm(p => ({ ...p, wali_name: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                    style={{ border: `1.5px solid ${form.wali_name ? purple : '#e5e7eb'}`, background: form.wali_name ? purple50 : 'white', color: '#111' }}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>No. HP Wali</label>
                  <input type="text" placeholder="0812xxxxxxxx"
                    value={form.wali_phone} onChange={e => setForm(p => ({ ...p, wali_phone: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                    style={{ border: `1.5px solid ${form.wali_phone ? purple : '#e5e7eb'}`, background: form.wali_phone ? purple50 : 'white', color: '#111' }}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>Alamat</label>
                <textarea rows={2} placeholder="Alamat lengkap"
                  value={form.alamat} onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all resize-none"
                  style={{ border: `1.5px solid ${form.alamat ? purple : '#e5e7eb'}`, background: form.alamat ? purple50 : 'white', color: '#111' }}/>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: saving ? '#a78bfa' : purple }}>
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

      {/* MODAL DETAIL */}
      {showDetail && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Detail Murid</h2>
              <button onClick={() => setShowDetail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ background: purple }}>
                  {showDetail.full_name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">{showDetail.full_name}</div>
                  <div className="text-sm text-gray-400">
                    {showDetail.classes?.nama_kelas || '—'} · {showDetail.tahun_ajaran || '—'}
                  </div>
                </div>
              </div>
              {[
                { label: 'NISN',          val: showDetail.nisn },
                { label: 'Jenis Kelamin', val: showDetail.jenis_kelamin },
                { label: 'Tanggal Lahir', val: showDetail.tanggal_lahir ? new Date(showDetail.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                { label: 'Nama Wali',     val: showDetail.wali_name },
                { label: 'No. HP Wali',   val: showDetail.wali_phone },
                { label: 'Alamat',        val: showDetail.alamat },
                { label: 'Status',        val: showDetail.active ? 'Aktif' : 'Nonaktif' },
              ].map(({ label, val }) => val ? (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                  <span className="text-sm text-gray-700 text-right max-w-48">{val}</span>
                </div>
              ) : null)}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowDetail(null); openEdit(showDetail) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: purple50, color: purple }}>
                  Edit Data
                </button>
                <button onClick={() => { setShowDetail(null); generateQR(showDetail) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: purple }}>
                  Lihat QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QR */}
      {showQR && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowQR(null)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-80 mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">QR Code Murid</h2>
              <button onClick={() => setShowQR(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-6 flex flex-col items-center gap-4">
              <div className="w-full rounded-2xl border-2 p-5 text-center" style={{ borderColor: purple100 }}>
                <img src="/logoborder.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 10px' }} />
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: purple, fontFamily: 'DM Mono' }}>
                  Kartu Absensi Murid
                </div>
                <div className="font-bold text-gray-900 text-lg">{showQR.full_name}</div>
                <div className="text-xs text-gray-400 mb-4">
                  {showQR.classes?.nama_kelas || '—'} · {showQR.tahun_ajaran || '—'}
                </div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="w-44 h-44 mx-auto"/>
                ) : (
                  <div className="w-44 h-44 mx-auto flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
                  </div>
                )}
                <div className="text-xs text-gray-300 mt-2" style={{ fontFamily: 'DM Mono' }}>
                  {showQR.qr_code || showQR.id}
                </div>
              </div>
              <button onClick={() => printQR(showQR)} disabled={!qrDataUrl}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: qrDataUrl ? purple : '#a78bfa' }}>
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
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Import Data Murid</h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload file CSV sesuai template untuk import massal</p>
              </div>
              <button onClick={() => setShowImport(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* Upload area */}
              {!importDone && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-purple-400"
                  style={{ borderColor: csvPreview.length > 0 ? purple : '#e5e7eb', background: csvPreview.length > 0 ? purple50 : '#fafafa' }}>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: csvPreview.length > 0 ? purple100 : '#f3f4f6' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={csvPreview.length > 0 ? purple : '#9ca3af'} strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  {csvPreview.length > 0 ? (
                    <p className="text-sm font-semibold" style={{ color: purple }}>{csvPreview.length} baris data siap diimport</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Klik untuk pilih file CSV</p>
                      <p className="text-xs text-gray-400">Format: .csv · Download template di atas untuk format yang benar</p>
                    </>
                  )}
                </div>
              )}

              {/* Errors */}
              {csvErrors.length > 0 && (
                <div className="px-4 py-3 rounded-xl text-sm text-yellow-700 bg-yellow-50 border border-yellow-200">
                  <p className="font-semibold mb-1">⚠ Peringatan ({csvErrors.length})</p>
                  {csvErrors.map((e, i) => <p key={i} className="text-xs">{e}</p>)}
                </div>
              )}

              {/* Import done */}
              {importDone && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#dcfce7' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Import Selesai</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="text-green-600 font-semibold">{importDone.success} berhasil</span>
                      {importDone.failed > 0 && <span className="text-red-500 font-semibold"> · {importDone.failed} gagal</span>}
                    </p>
                  </div>
                  <button onClick={() => setShowImport(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: purple }}>
                    Selesai
                  </button>
                </div>
              )}

              {/* Preview table */}
              {csvPreview.length > 0 && !importDone && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'DM Mono' }}>
                    Preview Data ({csvPreview.length} murid)
                  </p>
                  <div className="rounded-xl border border-gray-100 overflow-auto" style={{ maxHeight: 280 }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                          {['Nama', 'NISN', 'Kelas', 'Tahun Ajaran', 'Wali', 'Status Kelas'].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="px-3 py-2 font-medium text-gray-800">{row.full_name}</td>
                            <td className="px-3 py-2 text-gray-500" style={{ fontFamily: 'DM Mono' }}>{row.nisn || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{row.nama_kelas || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{row.tahun_ajaran || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{row.wali_name || '—'}</td>
                            <td className="px-3 py-2">
                              {row.nama_kelas ? (
                                row._classFound
                                  ? <span className="text-green-600 font-semibold">✓ Ditemukan</span>
                                  : <span className="text-yellow-600 font-semibold">⚠ Tidak ada</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.some(r => r.nama_kelas && !r._classFound) && (
                    <p className="text-xs text-yellow-600 mt-2">
                      ⚠ Beberapa kelas tidak ditemukan — murid tetap diimport tapi tanpa kelas. Pastikan nama kelas di CSV sama persis dengan data kelas yang sudah dibuat.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {csvPreview.length > 0 && !importDone && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button onClick={() => { setCsvPreview([]); setCsvErrors([]); fileInputRef.current.value = '' }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  Ganti File
                </button>
                <button onClick={handleImport} disabled={importing}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: importing ? '#a78bfa' : '#16a34a' }}>
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