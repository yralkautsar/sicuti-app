'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'

const NAV = [
  { href: '/dashboard',         label: 'Dashboard',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: '/dashboard/kelas',   label: 'Kelas',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/dashboard/guru',    label: 'Data Guru',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { href: '/dashboard/murid',   label: 'Data Murid', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/dashboard/laporan', label: 'Laporan',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
  { href: '/dashboard/cuti',    label: 'Cuti Guru',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { href: '/dashboard/qr-massal', label: 'Print QR', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg> },
]

const EMPTY_FORM = { nama_kelas: '', tahun_ajaran: '', wali_kelas_id: '', active: true }

const TAHUN_AJARAN_OPTIONS = ['2024/2025', '2025/2026', '2026/2027']

export default function KelasPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile]     = useState(null)
  const [classes, setClasses]     = useState([])
  const [gurus, setGurus]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editKelas, setEditKelas] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')
  const [filterTA, setFilterTA]   = useState('')

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
      console.error('fetchClasses error:', error)
      // Fallback — fetch tanpa join
      const { data: plain } = await supabase
        .from('classes')
        .select('*')
        .order('tahun_ajaran', { ascending: false })
        .order('nama_kelas', { ascending: true })
      setClasses(plain || [])
      setLoading(false)
      return
    }

    console.log('fetchClasses result:', data)
    setClasses(data || [])
    setLoading(false)
  }

  const fetchGurus = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, jabatan')
      .order('full_name', { ascending: true })
    setGurus(data || [])
  }

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
        const { data: newClass, error } = await supabase
          .from('classes')
          .insert(payload)
          .select()
          .single()

        if (error) {
          console.error('Insert error:', error)
          throw error
        }

        console.log('Kelas created:', newClass)

        if (form.wali_kelas_id && newClass) {
          await supabase.from('profiles')
            .update({ class_id: newClass.id })
            .eq('id', form.wali_kelas_id)
        }
      }

      await fetchClasses()
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditKelas(null)
    } catch (err) {
      console.error('Save error:', err)
      setFormError(err.message || 'Terjadi kesalahan.')
    }
    setSaving(false)
  }

  const openEdit = (kelas) => {
    setEditKelas(kelas)
    setForm({
      nama_kelas:    kelas.nama_kelas,
      tahun_ajaran:  kelas.tahun_ajaran,
      wali_kelas_id: kelas.wali_kelas_id || '',
      active:        kelas.active,
    })
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tahunanList = [...new Set(classes.map(c => c.tahun_ajaran))].sort().reverse()
  const filtered = filterTA ? classes.filter(c => c.tahun_ajaran === filterTA) : classes

  // Count murid per kelas
  const [muridCounts, setMuridCounts] = useState({})
  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from('students').select('class_id').eq('active', true)
      const counts = {}
      data?.forEach(s => { if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1 })
      setMuridCounts(counts)
    }
    fetchCounts()
  }, [classes])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease both; }
        input:focus,select:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${purple100}; border-radius:4px; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center; }
        @keyframes modalIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .modal { animation: modalIn .2s ease both; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="w-60 flex flex-col border-r border-gray-100 bg-white flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <div className="font-bold text-gray-900 text-xs leading-tight">Mutiara Bunda</div>
              <div className="text-gray-400 text-xs" style={{ fontFamily: 'DM Mono' }}>SiCuti v1.0</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <a key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active ? { background: purple50, color: purple } : { color: '#6b7280' }}>
                <span style={{ color: active ? purple : '#9ca3af' }}>{icon}</span>
                {label}
              </a>
            )
          })}
        </nav>
        <div className="px-3 pb-3">
          <a href="/scan" target="_blank"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: purple50, color: purple }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Halaman Scan Tablet
          </a>
        </div>
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: purple }}>
              {profile?.full_name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name || 'Admin'}</div>
              <div className="text-xs text-gray-400 truncate" style={{ fontFamily: 'DM Mono' }}>{profile?.role || 'admin'}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Manajemen Kelas</h1>
            <p className="text-xs text-gray-400">{classes.length} kelas terdaftar</p>
          </div>
          <button onClick={() => { setShowModal(true); setEditKelas(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tambah Kelas
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Filter tahun ajaran */}
          {tahunanList.length > 1 && (
            <div className="fu flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Tahun Ajaran:</span>
              <button onClick={() => setFilterTA('')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={!filterTA ? { background: purple, color: 'white' } : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                Semua
              </button>
              {tahunanList.map(ta => (
                <button key={ta} onClick={() => setFilterTA(ta)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={filterTA === ta ? { background: purple, color: 'white' } : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {ta}
                </button>
              ))}
            </div>
          )}

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
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">Belum ada kelas</p>
              <p className="text-sm text-gray-400">Klik "Tambah Kelas" untuk mulai membuat data kelas</p>
            </div>
          ) : (
            <div className="fu grid grid-cols-1 gap-3">
              {filtered.map((kelas) => (
                <div key={kelas.id}
                  className="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between hover:shadow-sm transition-shadow">

                  {/* Left — kelas info */}
                  <div className="flex items-center gap-5">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: kelas.active ? purple50 : '#f3f4f6' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke={kelas.active ? purple : '#9ca3af'} strokeWidth="2" strokeLinecap="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-gray-900 text-base">{kelas.nama_kelas}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          kelas.active
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {kelas.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>
                          TA {kelas.tahun_ajaran}
                        </span>
                        <span className="text-xs text-gray-400">
                          Wali: <span className="font-medium text-gray-600">
                            {kelas.wali?.full_name || kelas.profiles?.full_name || '— belum ditentukan'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center — stats */}
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="font-bold text-gray-900 text-xl">
                        {muridCounts[kelas.id] || 0}
                      </div>
                      <div className="text-xs text-gray-400">Murid</div>
                    </div>
                  </div>

                  {/* Right — actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(kelas)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={kelas.active
                        ? { background: '#f0fdf4', color: '#16a34a' }
                        : { background: '#f3f4f6', color: '#6b7280' }}>
                      {kelas.active ? '✓ Aktif' : 'Nonaktif'}
                    </button>
                    <button onClick={() => openEdit(kelas)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(kelas.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
      </main>

      {/* ── MODAL TAMBAH / EDIT KELAS ── */}
      {showModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">
                {editKelas ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">

              {/* Nama Kelas */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>
                  Nama Kelas <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: Kelas A, Kelas B, Kelas Melati"
                  value={form.nama_kelas}
                  onChange={e => setForm(p => ({ ...p, nama_kelas: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                  style={{
                    border: `1.5px solid ${form.nama_kelas ? purple : '#e5e7eb'}`,
                    background: form.nama_kelas ? purple50 : 'white',
                    color: '#111'
                  }}
                />
              </div>

              {/* Tahun Ajaran */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>
                  Tahun Ajaran <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={form.tahun_ajaran}
                  onChange={e => setForm(p => ({ ...p, tahun_ajaran: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                  style={{
                    border: `1.5px solid ${form.tahun_ajaran ? purple : '#e5e7eb'}`,
                    background: form.tahun_ajaran ? purple50 : 'white',
                    color: form.tahun_ajaran ? '#111' : '#9ca3af'
                  }}>
                  <option value="">Pilih tahun ajaran...</option>
                  {TAHUN_AJARAN_OPTIONS.map(ta => (
                    <option key={ta} value={ta}>{ta}</option>
                  ))}
                </select>
              </div>

              {/* Wali Kelas */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>
                  Wali Kelas
                </label>
                <select
                  value={form.wali_kelas_id}
                  onChange={e => setForm(p => ({ ...p, wali_kelas_id: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all appearance-none"
                  style={{
                    border: `1.5px solid ${form.wali_kelas_id ? purple : '#e5e7eb'}`,
                    background: form.wali_kelas_id ? purple50 : 'white',
                    color: form.wali_kelas_id ? '#111' : '#9ca3af'
                  }}>
                  <option value="">— Belum ditentukan</option>
                  {gurus.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.full_name}{g.jabatan ? ` — ${g.jabatan}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status aktif */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Status Kelas</div>
                  <div className="text-xs text-gray-400 mt-0.5">Kelas aktif akan muncul di pilihan saat tambah murid</div>
                </div>
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className="w-12 h-6 rounded-full transition-all flex-shrink-0 relative"
                  style={{ background: form.active ? purple : '#d1d5db' }}>
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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: saving ? '#a78bfa' : purple }}>
                  {saving ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Menyimpan...</>
                  ) : (
                    editKelas ? 'Simpan Perubahan' : 'Buat Kelas'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}