'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useProfile } from '@/lib/ProfileContext'

const purple     = '#A78BFA'
const purple50   = 'rgba(167,139,250,0.10)'
const purple100  = '#EAB6FF'
const SCHOOL     = 'TK Karakter Mutiara Bunda Bali'


const EMPTY_FORM = { full_name: '', email: '', password: '', nip: '', jabatan: '', no_hp: '', role: 'guru', kuota_cuti: 12 }

export default function GuruPage() {
  const { profile, setProfile } = useProfile()
  const router = useRouter()
  const [gurus, setGurus]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')
  const [showQR, setShowQR]     = useState(null) // guru object
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [editGuru, setEditGuru] = useState(null)

  useEffect(() => {
    const init = async () => {
      await fetchGurus()
    }
    init()
  }, [])

  const fetchGurus = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
    if (error) console.error('fetchGurus error:', error)
    setGurus(data || [])
    setLoading(false)
  }

  // Generate QR code as data URL
  const generateQR = async (guru) => {
    setShowQR(guru)
    setQrDataUrl('')
    const QRCode = (await import('qrcode')).default
    const url = await QRCode.toDataURL(guru.qr_code || guru.id, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a18', light: '#ffffff' }
    })
    setQrDataUrl(url)
  }

  // Print QR card
  const printQR = (guru) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Guru - ${guru.full_name}</title>
      <style>
        body { margin:0; font-family:'Karla',sans-serif; background:#fff; }
        .card {
          width: 320px; margin: 40px auto; padding: 32px 24px;
          border: 2px solid #ede9fe; border-radius: 16px; text-align: center;
        }
        .logo { width: 60px; height: 60px; object-fit: contain; margin: 0 auto 12px; display: block; }
        .school { font-size: 11px; color: #442F78; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
        .name { font-size: 20px; font-weight: 800; color: #111; margin: 12px 0 4px; }
        .jabatan { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
        .qr { width: 200px; height: 200px; margin: 0 auto 16px; display: block; }
        .qr-id { font-size: 10px; color: #9ca3af; font-family: monospace; letter-spacing: 0.06em; }
        .footer { margin-top: 16px; font-size: 10px; color: #d1d5db; }
      </style></head><body>
      <div class="card">
        <img src="${window.location.origin}/logoborder.png" class="logo" />
        <div class="school">Kartu Absensi Guru</div>
        <div class="name">${guru.full_name}</div>
        <div class="jabatan">${guru.jabatan || 'Guru'} · ${SCHOOL}</div>
        <img src="${qrDataUrl}" class="qr" />
        <div class="qr-id">${guru.qr_code || guru.id}</div>
        <div class="footer">Tunjukkan kartu ini di depan kamera absensi</div>
      </div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  // Save guru
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      if (editGuru) {
        // Update profile only (email/password tidak diubah di sini)
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name:   form.full_name,
            nip:         form.nip || null,
            jabatan:     form.jabatan || null,
            no_hp:       form.no_hp || null,
            role:        form.role || 'guru',
            kuota_cuti:  Number(form.kuota_cuti) || 12,
          })
          .eq('id', editGuru.id)
        if (error) throw error
      } else {
        // Create auth user + profile via API route (pakai service role key)
        if (!form.email || !form.password) throw new Error('Email dan password wajib diisi.')
        if (form.password.length < 6) throw new Error('Password minimal 6 karakter.')

        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:      form.email,
            password:   form.password,
            full_name:  form.full_name,
            nip:        form.nip || null,
            jabatan:    form.jabatan || null,
            no_hp:      form.no_hp || null,
            role:       form.role || 'guru',
            kuota_cuti: Number(form.kuota_cuti) || 12,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Gagal membuat akun.')
      }

      await fetchGurus()
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditGuru(null)
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan. Coba lagi.')
    }
    setSaving(false)
  }

  const openEdit = (guru) => {
    setEditGuru(guru)
    setForm({ full_name: guru.full_name, nip: guru.nip || '', jabatan: guru.jabatan || '', no_hp: guru.no_hp || '', role: guru.role || 'guru', kuota_cuti: guru.kuota_cuti ?? 12 })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus guru ini dari sistem?')) return
    await supabase.from('profiles').delete().eq('id', id)
    await fetchGurus()
  }


  const filtered = gurus.filter(g =>
    g.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.nip?.toLowerCase().includes(search.toLowerCase()) ||
    g.jabatan?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease both; }
        input:focus,textarea:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${purple100}; border-radius:4px; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center; }
        @keyframes modalIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .modal { animation: modalIn .2s ease both; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <Sidebar profile={profile} />

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Data Guru</h1>
            <p className="text-xs text-gray-400">{gurus.length} guru terdaftar di sistem</p>
          </div>
          <button onClick={() => { setShowModal(true); setEditGuru(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Tambah Guru
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Search */}
          <div className="fu relative mb-6 max-w-sm">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
              style={{ color: '#111' }}
            />
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
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">
                {search ? 'Guru tidak ditemukan' : 'Belum ada guru'}
              </p>
              <p className="text-sm text-gray-400">
                {search ? 'Coba kata kunci lain' : 'Klik "Tambah Guru" untuk mulai menambahkan data'}
              </p>
            </div>
          ) : (
            <div className="fu bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    {['Nama Guru', 'NIP', 'Jabatan', 'No. HP', 'QR Code', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        style={{ fontFamily: 'DM Mono' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((guru, i) => (
                    <tr key={guru.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                      {/* Nama */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: purple }}>
                            {guru.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{guru.full_name}</div>
                            <div className="text-xs text-gray-400 capitalize">{guru.role || 'guru'}</div>
                          </div>
                        </div>
                      </td>
                      {/* NIP */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Mono' }}>
                          {guru.nip || '—'}
                        </span>
                      </td>
                      {/* Jabatan */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{guru.jabatan || '—'}</span>
                      </td>
                      {/* No HP */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Mono' }}>
                          {guru.no_hp || '—'}
                        </span>
                      </td>
                      {/* QR */}
                      <td className="px-5 py-4">
                        {guru.qr_code ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: '#f0fdf4', color: '#16a34a' }}>
                            ✓ Ada
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: '#fef2f2', color: '#dc2626' }}>
                            ✗ Belum
                          </span>
                        )}
                      </td>
                      {/* Aksi */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => generateQR(guru)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: purple50, color: purple }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                              <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/>
                            </svg>
                            QR
                          </button>
                          <button onClick={() => openEdit(guru)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(guru.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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

      {/* ── MODAL TAMBAH / EDIT GURU ── */}
      {showModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">
                {editGuru ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">

              {/* Nama */}
              {[
                { key: 'full_name', label: 'Nama Lengkap', placeholder: 'contoh: Siti Nurhaliza, S.Pd', required: true,  type: 'text'     },
                { key: 'nip',       label: 'NIP',          placeholder: 'Nomor Induk Pegawai (opsional)', required: false, type: 'text'    },
                { key: 'no_hp',     label: 'No. HP / WA',  placeholder: 'contoh: 0812xxxxxxxx',          required: false, type: 'text'    },
              ].map(({ key, label, placeholder, required, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: 'DM Mono' }}>
                    {label}{required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input type={type} required={required} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                    style={{ border: `1.5px solid ${form[key] ? purple : '#e5e7eb'}`, background: form[key] ? purple50 : 'white', color: '#111' }}
                  />
                </div>
              ))}

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: 'DM Mono' }}>Jabatan</label>
                <select value={form.jabatan} onChange={e => setForm(p => ({ ...p, jabatan: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                  style={{ border: `1.5px solid ${form.jabatan ? purple : '#e5e7eb'}`, background: form.jabatan ? purple50 : 'white', color: form.jabatan ? '#111' : '#9ca3af' }}>
                  <option value="">Pilih jabatan...</option>
                  <option value="Kepala Sekolah">Kepala Sekolah</option>
                  <option value="Admin">Admin</option>
                  <option value="Wali Kelas">Wali Kelas</option>
                  <option value="Guru Pendamping">Guru Pendamping</option>
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: 'DM Mono' }}>Role Sistem</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                  style={{ border: `1.5px solid ${purple}`, background: purple50, color: '#111' }}>
                  <option value="guru">Guru — akses terbatas</option>
                  <option value="admin">Admin — akses penuh</option>
                </select>
              </div>

              {/* Kuota Cuti */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: 'DM Mono' }}>
                  Kuota Cuti <span className="text-gray-300">(hari/tahun)</span>
                </label>
                <input type="number" min="0" max="365" value={form.kuota_cuti}
                  onChange={e => setForm(p => ({ ...p, kuota_cuti: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                  style={{ border: `1.5px solid ${purple}`, background: purple50, color: '#111' }}
                />
              </div>

              {/* Email + Password — hanya saat tambah baru */}
              {!editGuru && (
                <>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3" style={{ fontFamily: 'DM Mono' }}>
                      Akun Login
                    </p>
                    {[
                      { key: 'email',    label: 'Email',    placeholder: 'email@sekolah.com', required: true, type: 'email'    },
                      { key: 'password', label: 'Password', placeholder: 'min. 6 karakter',   required: true, type: 'password' },
                    ].map(({ key, label, placeholder, required, type }) => (
                      <div key={key} className="mb-3">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: 'DM Mono' }}>
                          {label}<span className="text-red-400 ml-1">*</span>
                        </label>
                        <input type={type} required={required} placeholder={placeholder} value={form[key]}
                          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                          style={{ border: `1.5px solid ${form[key] ? purple : '#e5e7eb'}`, background: form[key] ? purple50 : 'white', color: '#111' }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2.5 rounded-lg">
                    💡 QR code absensi akan dibuat otomatis. Guru dapat login ke sistem dengan email & password di atas.
                  </p>
                </>
              )}

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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: saving ? '#a78bfa' : purple }}>
                  {saving ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Menyimpan...</>
                  ) : (
                    editGuru ? 'Simpan Perubahan' : 'Tambah Guru'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL QR CODE ── */}
      {showQR && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowQR(null)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-80 mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">QR Code Guru</h2>
              <button onClick={() => setShowQR(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-6 flex flex-col items-center gap-4">
              {/* Card preview */}
              <div className="w-full rounded-2xl border-2 p-5 text-center" style={{ borderColor: purple100 }}>
                <img src="/logoborder.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 10px' }} />
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: purple, fontFamily: 'DM Mono' }}>
                  Kartu Absensi Guru
                </div>
                <div className="font-bold text-gray-900 text-lg">{showQR.full_name}</div>
                <div className="text-xs text-gray-400 mb-4">{showQR.jabatan || 'Guru'}</div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
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
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: qrDataUrl ? purple : '#a78bfa' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Kartu QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}