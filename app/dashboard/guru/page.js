'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const primary    = '#A78BFA'
const accent     = '#442F78'
const purple50   = '#F5F0FF'
const purple100  = '#EAB6FF'
const SCHOOL     = 'TK Karakter Mutiara Bunda Bali'

const EMPTY_FORM = { full_name: '', email: '', password: '', nip: '', jabatan: '', no_hp: '', role: 'guru', kuota_cuti: 12 }

// ─── Reusable label ───────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
      style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
      {children}
    </label>
  )
}

// ─── Reusable text input ──────────────────────────────────────────
function FieldInput({ value, onChange, type = 'text', placeholder, required }) {
  const filled = !!value
  return (
    <input
      type={type}
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 text-sm rounded-xl transition-all"
      style={{
        border: `1.5px solid ${filled ? primary : purple100}`,
        background: filled ? purple50 : '#FFFFFF',
        color: '#111827',
      }}
    />
  )
}

export default function GuruPage() {
  const router = useRouter()
  const [profile,   setProfile]   = useState(null)
  const [gurus,     setGurus]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const [showQR,    setShowQR]    = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [editGuru,  setEditGuru]  = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
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

  const printQR = (guru) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Guru - ${guru.full_name}</title>
      <style>
        body { margin:0; font-family:'Rubik',sans-serif; background:#fff; }
        .card {
          width: 320px; margin: 40px auto; padding: 32px 24px;
          border: 2px solid ${purple100}; border-radius: 16px; text-align: center;
        }
        .logo { width: 60px; height: 60px; object-fit: contain; margin: 0 auto 12px; display: block; }
        .school { font-size: 11px; color: ${accent}; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
        .name { font-size: 20px; font-weight: 700; color: #111; margin: 12px 0 4px; }
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

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      if (editGuru) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name:  form.full_name,
            nip:        form.nip || null,
            jabatan:    form.jabatan || null,
            no_hp:      form.no_hp || null,
            role:       form.role || 'guru',
            kuota_cuti: Number(form.kuota_cuti) || 12,
          })
          .eq('id', editGuru.id)
        if (error) throw error
      } else {
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
      style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease both; }
        input:focus, select:focus, textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${purple100}; border-radius: 4px; }
        .overlay { position:fixed;inset:0;background:rgba(67,47,120,0.3);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center; }
        @keyframes modalIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .modal { animation: modalIn .2s ease both; }
        tr:hover td { background: ${purple50}; }
      `}</style>

      {/* SIDEBAR */}
      <Sidebar profile={profile} />

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <div>
            <h1 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
              Data Guru
            </h1>
            <p className="text-xs" style={{ color: '#9ca3af' }}>{gurus.length} guru terdaftar di sistem</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setEditGuru(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: accent, boxShadow: `0 4px 14px ${accent}30`, fontFamily: "'Rubik', sans-serif" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
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
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all"
              style={{
                border: `1.5px solid ${search ? primary : purple100}`,
                background: search ? purple50 : '#FFFFFF',
                color: '#111827',
              }}
            />
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
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <p className="font-semibold mb-1" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                {search ? 'Guru tidak ditemukan' : 'Belum ada guru'}
              </p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                {search ? 'Coba kata kunci lain' : 'Klik "Tambah Guru" untuk mulai menambahkan data'}
              </p>
            </div>

          ) : (
            <div className="fu rounded-2xl overflow-hidden"
              style={{ background: '#FFFFFF', border: `1px solid ${purple100}` }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: purple50, borderBottom: `1px solid ${purple100}` }}>
                    {['Nama Guru', 'NIP', 'Jabatan', 'No. HP', 'Kuota Cuti', 'QR Code', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: accent, fontFamily: 'DM Mono' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((guru) => (
                    <tr key={guru.id}
                      className="transition-colors last:border-0"
                      style={{ borderBottom: `1px solid ${purple100}` }}>

                      {/* Nama */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: accent, fontFamily: "'Rubik', sans-serif" }}>
                            {guru.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: '#111827' }}>{guru.full_name}</div>
                            <div className="text-xs capitalize" style={{ color: '#9ca3af' }}>{guru.role || 'guru'}</div>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'DM Mono' }}>
                          {guru.nip || '—'}
                        </span>
                      </td>

                      {/* Jabatan */}
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: '#6b7280' }}>{guru.jabatan || '—'}</span>
                      </td>

                      {/* No HP */}
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'DM Mono' }}>
                          {guru.no_hp || '—'}
                        </span>
                      </td>

                      {/* Kuota Cuti */}
                      <td className="px-5 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={{ background: purple50, color: accent, fontFamily: 'DM Mono' }}>
                          {guru.kuota_cuti ?? 12} hari
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
                            style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                              <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/>
                            </svg>
                            QR
                          </button>
                          <button onClick={() => openEdit(guru)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(guru.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: '#fef2f2', color: '#dc2626' }}>
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
          <div className="modal w-full max-w-md mx-4 overflow-hidden rounded-2xl"
            style={{ background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>

            {/* Modal header */}
            <div className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${purple100}` }}>
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                {editGuru ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm"
                style={{ color: '#9ca3af', background: purple50 }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">

              {[
                { key: 'full_name', label: 'Nama Lengkap', placeholder: 'contoh: Siti Nurhaliza, S.Pd', required: true,  type: 'text' },
                { key: 'nip',       label: 'NIP',          placeholder: 'Nomor Induk Pegawai (opsional)', required: false, type: 'text' },
                { key: 'no_hp',     label: 'No. HP / WA',  placeholder: 'contoh: 0812xxxxxxxx',          required: false, type: 'text' },
              ].map(({ key, label, placeholder, required, type }) => (
                <div key={key}>
                  <FieldLabel>{label}{required && <span className="text-red-400 ml-1">*</span>}</FieldLabel>
                  <FieldInput
                    type={type}
                    required={required}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}

              {/* Jabatan */}
              <div>
                <FieldLabel>Jabatan</FieldLabel>
                <select value={form.jabatan} onChange={e => setForm(p => ({ ...p, jabatan: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                  style={{
                    border: `1.5px solid ${form.jabatan ? primary : purple100}`,
                    background: form.jabatan ? purple50 : '#FFFFFF',
                    color: form.jabatan ? '#111827' : '#9ca3af',
                  }}>
                  <option value="">Pilih jabatan...</option>
                  <option value="Kepala Sekolah">Kepala Sekolah</option>
                  <option value="Admin">Admin</option>
                  <option value="Wali Kelas">Wali Kelas</option>
                  <option value="Guru Pendamping">Guru Pendamping</option>
                </select>
              </div>

              {/* Role */}
              <div>
                <FieldLabel>Role Sistem</FieldLabel>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl transition-all appearance-none"
                  style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}>
                  <option value="guru">Guru — akses terbatas</option>
                  <option value="admin">Admin — akses penuh</option>
                </select>
              </div>

              {/* Kuota Cuti */}
              <div>
                <FieldLabel>
                  Kuota Cuti <span style={{ color: '#d1d5db' }}>(hari/tahun)</span>
                </FieldLabel>
                <input type="number" min="0" max="365" value={form.kuota_cuti}
                  onChange={e => setForm(p => ({ ...p, kuota_cuti: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                  style={{ border: `1.5px solid ${primary}`, background: purple50, color: '#111827' }}
                />
              </div>

              {/* Email + Password — hanya saat tambah baru */}
              {!editGuru && (
                <>
                  <div className="pt-3" style={{ borderTop: `1px solid ${purple100}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
                      Akun Login
                    </p>
                    {[
                      { key: 'email',    label: 'Email',    placeholder: 'email@sekolah.com', required: true, type: 'email'    },
                      { key: 'password', label: 'Password', placeholder: 'min. 6 karakter',   required: true, type: 'password' },
                    ].map(({ key, label, placeholder, required, type }) => (
                      <div key={key} className="mb-3">
                        <FieldLabel>{label}<span className="text-red-400 ml-1">*</span></FieldLabel>
                        <FieldInput
                          type={type}
                          required={required}
                          placeholder={placeholder}
                          value={form[key]}
                          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs px-3 py-2.5 rounded-lg" style={{ background: purple50, color: accent, border: `1px solid ${purple100}` }}>
                    💡 QR code absensi akan dibuat otomatis. Guru dapat login ke sistem dengan email & password di atas.
                  </p>
                </>
              )}

              {/* Error */}
              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              {/* Actions */}
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
          <div className="modal w-80 mx-4 overflow-hidden rounded-2xl"
            style={{ background: '#FFFFFF', boxShadow: `0 24px 64px ${accent}25` }}>

            {/* Modal header */}
            <div className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${purple100}` }}>
              <h2 className="font-bold" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>QR Code Guru</h2>
              <button onClick={() => setShowQR(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors"
                style={{ color: '#9ca3af', background: purple50 }}>✕</button>
            </div>

            <div className="px-6 py-6 flex flex-col items-center gap-4">
              {/* Card preview */}
              <div className="w-full rounded-2xl p-5 text-center"
                style={{ border: `2px solid ${purple100}`, background: purple50 }}>
                <img src="/logoborder.png" alt="Logo"
                  style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 10px' }} />
                <div className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: accent, fontFamily: 'DM Mono' }}>
                  Kartu Absensi Guru
                </div>
                <div className="font-bold text-lg" style={{ fontFamily: "'Rubik', sans-serif", color: '#111827' }}>
                  {showQR.full_name}
                </div>
                <div className="text-xs mb-4" style={{ color: '#9ca3af' }}>{showQR.jabatan || 'Guru'}</div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 mx-auto rounded-xl" />
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