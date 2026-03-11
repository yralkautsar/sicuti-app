'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const purple   = '#6d28d9'
const purple50 = '#f5f3ff'
const purple100= '#ede9fe'

const NAV = [
  { href: '/dashboard',         label: 'Dashboard',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: '/dashboard/kelas',   label: 'Kelas',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/dashboard/guru',    label: 'Data Guru',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { href: '/dashboard/murid',   label: 'Data Murid', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/dashboard/laporan', label: 'Laporan',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
  { href: '/dashboard/cuti',    label: 'Cuti Guru',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { href: '/dashboard/qr-massal', label: 'Print QR', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg> },
]

export default function QRMassalPage() {
  const router   = useRouter()
  const pathname = usePathname()

  const [profile, setProfile]   = useState(null)
  const [gurus, setGurus]       = useState([])
  const [murids, setMurids]     = useState([])
  const [classes, setClasses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const [tab, setTab]           = useState('guru') // guru | murid
  const [filterKelas, setFilterKelas] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [qrMap, setQrMap]       = useState({}) // id -> dataUrl

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const [{ data: g }, { data: m }, { data: c }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, jabatan, qr_code').order('full_name'),
        supabase.from('students').select('id, full_name, class_id, tahun_ajaran, qr_code, classes(nama_kelas)').eq('active', true).order('full_name'),
        supabase.from('classes').select('id, nama_kelas, tahun_ajaran').eq('active', true).order('nama_kelas'),
      ])
      setGurus(g || [])
      setMurids(m || [])
      setClasses(c || [])
      setLoading(false)
    }
    init()
  }, [])

  const currentList = tab === 'guru'
    ? gurus
    : murids.filter(m => !filterKelas || m.class_id === filterKelas)

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(currentList.map(x => x.id)))
    }
  }

  const generateAndPrint = async () => {
    const toGenerate = currentList.filter(x => selectedIds.has(x.id))
    if (toGenerate.length === 0) return

    setGenerating(true)
    setProgress(0)

    const QRCode = (await import('qrcode')).default
    const newMap = { ...qrMap }

    for (let i = 0; i < toGenerate.length; i++) {
      const item = toGenerate[i]
      const code = item.qr_code || item.id
      if (!newMap[item.id]) {
        newMap[item.id] = await QRCode.toDataURL(code, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        })
      }
      setProgress(Math.round(((i + 1) / toGenerate.length) * 100))
    }

    setQrMap(newMap)
    setGenerating(false)

    // Build print window
    const logoUrl = window.location.origin + '/logo.png'
    const isGuru = tab === 'guru'
    const cards = toGenerate.map(item => {
      const sub = isGuru
        ? (item.jabatan || '')
        : `${item.classes?.nama_kelas || ''}${item.tahun_ajaran ? ' · ' + item.tahun_ajaran : ''}`
      const label = isGuru ? 'Kartu Absensi Guru' : 'Kartu Absensi Murid'
      return `
        <div class="card">
          <div class="card-top">
            <img src="${logoUrl}" class="logo" />
            <div class="label">${label}</div>
          </div>
          <img src="${newMap[item.id]}" class="qr" />
          <div class="name">${item.full_name}</div>
          <div class="sub">${sub}</div>
          <div class="code">${item.qr_code || item.id}</div>
        </div>
      `
    }).join('')

    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Absensi — ${tab === 'guru' ? 'Guru' : 'Murid'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #fff;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5mm;
            padding: 8mm;
          }
          .card {
            border: 1.5px solid #ede9fe;
            border-radius: 10px;
            padding: 8px 6px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            break-inside: avoid;
            background: #fff;
          }
          .card-top {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            margin-bottom: 2px;
          }
          .logo {
            width: 28px;
            height: 28px;
            object-fit: contain;
          }
          .label {
            font-size: 7px;
            font-weight: 700;
            color: #6d28d9;
            letter-spacing: 0.07em;
            text-transform: uppercase;
          }
          .qr {
            width: 120px;
            height: 120px;
            display: block;
            margin: 2px auto;
          }
          .name {
            font-size: 11px;
            font-weight: 800;
            color: #111;
            line-height: 1.3;
            word-break: break-word;
          }
          .sub {
            font-size: 9px;
            color: #6b7280;
            line-height: 1.2;
          }
          .code {
            font-size: 7px;
            color: #9ca3af;
            font-family: monospace;
            letter-spacing: 0.03em;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${cards}
        </div>
        <script>
          window.onload = () => {
            window.print()
          }
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const allSelected = currentList.length > 0 && selectedIds.size === currentList.length

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
      `}</style>

      {/* SIDEBAR */}
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

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Print QR Massal</h1>
            <p className="text-xs text-gray-400">8 kartu per halaman A4 · Pilih lalu print</p>
          </div>
          <button
            onClick={generateAndPrint}
            disabled={selectedIds.size === 0 || generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: selectedIds.size === 0 || generating ? '#a78bfa' : purple,
              boxShadow: selectedIds.size > 0 ? `0 4px 14px ${purple}30` : 'none',
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer'
            }}>
            {generating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                Generating {progress}%
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </>
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Tabs + filter */}
          <div className="fu flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
              {[
                { key: 'guru',  label: `Guru (${gurus.length})` },
                { key: 'murid', label: `Murid (${murids.length})` },
              ].map(t => (
                <button key={t.key} onClick={() => { setTab(t.key); setSelectedIds(new Set()) }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={tab === t.key
                    ? { background: 'white', color: purple, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                    : { color: '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'murid' && (
              <select value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setSelectedIds(new Set()) }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                style={{ color: filterKelas ? '#111' : '#9ca3af' }}>
                <option value="">Semua Kelas</option>
                {classes.map(k => (
                  <option key={k.id} value={k.id}>{k.nama_kelas} — {k.tahun_ajaran}</option>
                ))}
              </select>
            )}

            {/* Select all */}
            <button onClick={selectAll}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{
                border: `1.5px solid ${allSelected ? purple : '#e5e7eb'}`,
                background: allSelected ? purple50 : 'white',
                color: allSelected ? purple : '#6b7280'
              }}>
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{ border: `2px solid ${allSelected ? purple : '#d1d5db'}`, background: allSelected ? purple : 'white' }}>
                {allSelected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
              </div>
              {allSelected ? 'Batalkan semua' : `Pilih semua (${currentList.length})`}
            </button>
          </div>

          {/* Grid list */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
            </div>
          ) : (
            <div className="fu grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {currentList.map(item => {
                const selected = selectedIds.has(item.id)
                const hasQR = !!qrMap[item.id]
                const sub = tab === 'guru'
                  ? (item.jabatan || '—')
                  : `${item.classes?.nama_kelas || '—'}`
                return (
                  <button key={item.id} onClick={() => toggleSelect(item.id)}
                    className="text-left rounded-2xl p-4 border transition-all flex items-center gap-3"
                    style={{
                      border: `2px solid ${selected ? purple : '#e5e7eb'}`,
                      background: selected ? purple50 : 'white',
                    }}>
                    {/* Checkbox */}
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ border: `2px solid ${selected ? purple : '#d1d5db'}`, background: selected ? purple : 'white' }}>
                      {selected && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      )}
                    </div>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: selected ? purple : '#9ca3af' }}>
                      {item.full_name?.[0]}
                    </div>
                    {/* Info */}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{item.full_name}</div>
                      <div className="text-xs text-gray-400 truncate">{sub}</div>
                      {hasQR && (
                        <div className="text-xs mt-0.5" style={{ color: '#16a34a' }}>✓ QR siap</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}