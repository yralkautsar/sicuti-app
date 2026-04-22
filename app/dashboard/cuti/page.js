'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useProfile } from '@/lib/ProfileContext'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'
const MAX_CUTI  = 12


function hitungHari(start, end) {
  if (!start || !end) return 0
  const s = new Date(start), e = new Date(end)
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
}

function formatTgl(tgl) {
  if (!tgl) return '—'
  return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const statusStyle = (s) => {
  if (s === 'approved') return { bg: '#f0fdf4', color: '#16a34a', label: 'Disetujui' }
  if (s === 'rejected') return { bg: '#fef2f2', color: '#dc2626', label: 'Ditolak' }
  return { bg: '#fffbeb', color: '#d97706', label: 'Menunggu' }
}

export default function CutiPage() {
  const { profile, setProfile } = useProfile()
  const router   = useRouter()

  const [isAdmin, setIsAdmin]       = useState(false)
  const [requests, setRequests]     = useState([])
  const [gurus, setGurus]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGuru, setFilterGuru] = useState('')

  // Modal ajukan cuti
  const [showAjukan, setShowAjukan] = useState(false)
  const [form, setForm]             = useState({ date_start: '', date_end: '', reason: '' })
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')

  // Modal review (admin)
  const [showReview, setShowReview]   = useState(null)
  const [reviewNote, setReviewNote]   = useState('')
  const [reviewing, setReviewing]     = useState(false)
  const [showDetail, setShowDetail]   = useState(null)
  const [showRekap, setShowRekap]     = useState(false)

  useEffect(() => {
    if (!profile) return  // tunggu profile dari context
    const init = async () => {
      const admin = profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'
      setIsAdmin(admin)
      if (admin) {
        const { data: g } = await supabase.from('profiles').select('id, full_name, jabatan').order('full_name')
        setGurus(g || [])
      }
      await fetchRequests(profile.id, admin)
    }
    init()
  }, [profile])

  const fetchRequests = async (uid, admin) => {
    setLoading(true)
    let q = supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (!admin) q = q.eq('profile_id', uid)
    const { data, error } = await q
    if (error) console.error(error)
    // Manually attach profile data
    if (data && data.length > 0) {
      const profileIds = [...new Set(data.map(r => r.profile_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, jabatan, nip')
        .in('id', profileIds)
      const profileMap = {}
      ;(profilesData || []).forEach(p => { profileMap[p.id] = p })
      const enriched = data.map(r => ({ ...r, profiles: profileMap[r.profile_id] || null }))
      setRequests(enriched)
    } else {
      setRequests([])
    }
    setLoading(false)
  }

  // Hitung sisa cuti guru ini di tahun berjalan
  const sisaCuti = useMemo(() => {
    if (!profile) return MAX_CUTI
    const tahun = new Date().getFullYear()
    const approved = requests.filter(r =>
      r.profile_id === profile.id &&
      r.status === 'approved' &&
      new Date(r.date_start).getFullYear() === tahun
    )
    const terpakai = approved.reduce((sum, r) => sum + hitungHari(r.date_start, r.date_end), 0)
    return MAX_CUTI - terpakai
  }, [requests, profile])

  const handleAjukan = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const hari = hitungHari(form.date_start, form.date_end)
      if (hari > sisaCuti) throw new Error(`Sisa cuti Anda hanya ${sisaCuti} hari. Pengajuan ini membutuhkan ${hari} hari.`)
      if (new Date(form.date_end) < new Date(form.date_start)) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      const { error } = await supabase.from('leave_requests').insert({
        profile_id: profile.id,
        type: 'Cuti Tahunan',
        date_start: form.date_start,
        date_end: form.date_end,
        reason: form.reason,
        status: 'pending',
      })
      if (error) throw error
      await fetchRequests(profile.id, isAdmin)
      setShowAjukan(false)
      setForm({ date_start: '', date_end: '', reason: '' })
    } catch (err) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const handleReview = async (status) => {
    if (!showReview) return
    setReviewing(true)
    const { error } = await supabase.from('leave_requests').update({
      status,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', showReview.id)
    if (!error) {
      await fetchRequests(profile.id, isAdmin)
      setShowReview(null)
      setReviewNote('')
    }
    setReviewing(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Batalkan pengajuan cuti ini?')) return
    await supabase.from('leave_requests').delete().eq('id', id)
    await fetchRequests(profile.id, isAdmin)
  }

  const filtered = requests
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r => !filterGuru || r.profile_id === filterGuru)

  const pendingCount = requests.filter(r => r.status === 'pending').length

  // Rekap cuti per guru (admin only)
  const rekapPerGuru = useMemo(() => {
    if (!isAdmin) return []
    const tahun = new Date().getFullYear()
    return gurus.map(g => {
      const mine     = requests.filter(r => r.profile_id === g.id && new Date(r.date_start).getFullYear() === tahun)
      const approved = mine.filter(r => r.status === 'approved')
      const pending  = mine.filter(r => r.status === 'pending')
      const terpakai = approved.reduce((sum, r) => sum + hitungHari(r.date_start, r.date_end), 0)
      return { ...g, terpakai, pending: pending.length, sisa: MAX_CUTI - terpakai }
    }).sort((a, b) => b.terpakai - a.terpakai)
  }, [requests, gurus, isAdmin])


  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ background: '#FAFAFA' }}>
      <style>{`
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
      <Sidebar profile={profile} pendingCuti={pendingCount} />

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Cuti Guru</h1>
            <p className="text-xs text-gray-400">
              {isAdmin ? `${pendingCount} pengajuan menunggu persetujuan` : `Sisa cuti Anda: ${sisaCuti} hari dari ${MAX_CUTI} hari/tahun`}
            </p>
          </div>
          {!isAdmin && (
            <button onClick={() => { setShowAjukan(true); setForm({ date_start: '', date_end: '', reason: '' }); setFormError('') }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Ajukan Cuti
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Info sisa cuti (guru view) */}
          {!isAdmin && (
            <div className="fu mb-5 rounded-2xl p-5 border flex items-center gap-5"
              style={{ background: purple50, borderColor: purple100 }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: purple }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800 mb-1">Kuota Cuti Tahunan {new Date().getFullYear()}</div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ddd6fe' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${((MAX_CUTI - sisaCuti) / MAX_CUTI) * 100}%`, background: purple }}/>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Terpakai {MAX_CUTI - sisaCuti} hari · Sisa <strong style={{ color: purple }}>{sisaCuti} hari</strong>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: purple }}>{sisaCuti}</div>
                <div className="text-xs text-gray-400">hari tersisa</div>
              </div>
            </div>
          )}

          {/* Summary cards (admin view) */}
          {isAdmin && (
            <div className="fu grid grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Pengajuan', val: requests.length,                                   color: purple,    bg: purple50 },
                { label: 'Menunggu',        val: requests.filter(r=>r.status==='pending').length,   color: '#d97706', bg: '#fffbeb' },
                { label: 'Disetujui',       val: requests.filter(r=>r.status==='approved').length,  color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Ditolak',         val: requests.filter(r=>r.status==='rejected').length,  color: '#dc2626', bg: '#fef2f2' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl p-5 border border-gray-100 bg-white">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: c.color, fontFamily: 'DM Mono' }}>{c.label}</div>
                  <div className="text-3xl font-bold" style={{ color: c.color }}>{c.val}</div>
                </div>
              ))}
            </div>
          )}

          {/* Rekap per guru (admin view) */}
          {isAdmin && (
            <div className="fu mb-5 bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => setShowRekap(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span className="font-semibold text-gray-900 text-sm">Rekap Cuti Per Guru — {new Date().getFullYear()}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: purple50, color: purple }}>{gurus.length} guru</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                  style={{ transform: showRekap ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {showRekap && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                        {['Nama Guru', 'Jabatan', 'Terpakai', 'Sisa', 'Progress', 'Pending'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                            style={{ fontFamily: 'DM Mono' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rekapPerGuru.map((g, i) => {
                        const pct = Math.round((g.terpakai / MAX_CUTI) * 100)
                        const barColor = g.terpakai >= MAX_CUTI ? '#dc2626' : g.terpakai >= MAX_CUTI * 0.7 ? '#d97706' : '#16a34a'
                        return (
                          <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-all"
                            onClick={() => setFilterGuru(filterGuru === g.id ? '' : g.id)}
                            style={{ cursor: 'pointer' }}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ background: purple }}>
                                  {g.full_name?.[0]}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{g.full_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-400">{g.jabatan || '—'}</td>
                            <td className="px-5 py-3">
                              <span className="font-bold text-sm" style={{ color: barColor }}>{g.terpakai}</span>
                              <span className="text-xs text-gray-400"> / {MAX_CUTI} hari</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="font-semibold text-sm" style={{ color: g.sisa <= 2 ? '#dc2626' : '#16a34a' }}>{g.sisa} hari</span>
                            </td>
                            <td className="px-5 py-3" style={{ minWidth: 120 }}>
                              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}/>
                              </div>
                              <span className="text-xs text-gray-400 mt-0.5 block">{pct}%</span>
                            </td>
                            <td className="px-5 py-3">
                              {g.pending > 0
                                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fffbeb', color: '#d97706' }}>{g.pending} pending</span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400">Klik nama guru untuk filter pengajuan di bawah.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="fu flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
              {[
                { key: 'all',      label: 'Semua' },
                { key: 'pending',  label: 'Menunggu' },
                { key: 'approved', label: 'Disetujui' },
                { key: 'rejected', label: 'Ditolak' },
              ].map(t => (
                <button key={t.key} onClick={() => setFilterStatus(t.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={filterStatus === t.key
                    ? { background: 'white', color: purple, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                    : { color: '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>
            {isAdmin && (
              <select value={filterGuru} onChange={e => setFilterGuru(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                style={{ color: filterGuru ? '#111' : '#9ca3af' }}>
                <option value="">Semua Guru</option>
                {gurus.map(g => (
                  <option key={g.id} value={g.id}>{g.full_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* List */}
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
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">Belum ada pengajuan cuti</p>
              <p className="text-sm text-gray-400">
                {!isAdmin ? 'Klik "Ajukan Cuti" untuk membuat pengajuan baru' : 'Belum ada guru yang mengajukan cuti'}
              </p>
            </div>
          ) : (
            <div className="fu flex flex-col gap-3">
              {filtered.map(req => {
                const st = statusStyle(req.status)
                const hari = hitungHari(req.date_start, req.date_end)
                return (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 hover:border-gray-200 transition-all">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: purple }}>
                      {req.profiles?.full_name?.[0] || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-gray-900">{req.profiles?.full_name || 'Guru'}</span>
                        <span className="text-xs text-gray-400">{req.profiles?.jabatan || ''}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-2 flex-wrap">
                        <span style={{ fontFamily: 'DM Mono', fontSize: 12 }}>
                          {formatTgl(req.date_start)} — {formatTgl(req.date_end)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#f3f4f6', color: '#374151' }}>
                          {hari} hari
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#f3f4f6', color: '#374151' }}>
                          {req.type}
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-sm text-gray-500 line-clamp-2">{req.reason}</p>
                      )}
                      <div className="text-xs text-gray-300 mt-1.5" style={{ fontFamily: 'DM Mono' }}>
                        Diajukan {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {req.reviewed_at && ` · Direview ${new Date(req.reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                      <div className="flex gap-1.5">
                        {/* Admin: approve / reject jika masih pending */}
                        {isAdmin && req.status === 'pending' && (
                          <>
                            <button onClick={() => setShowReview(req)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                              style={{ background: purple }}>
                              Review
                            </button>
                          </>
                        )}
                        {/* Detail */}
                        <button onClick={() => setShowDetail(req)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                          Detail
                        </button>
                        {/* Guru: hapus jika masih pending */}
                        {!isAdmin && req.status === 'pending' && (
                          <button onClick={() => handleDelete(req.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            Batalkan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL AJUKAN CUTI */}
      {showAjukan && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAjukan(false)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Ajukan Cuti Tahunan</h2>
                <p className="text-xs text-gray-400 mt-0.5">Sisa kuota: <strong style={{ color: purple }}>{sisaCuti} hari</strong></p>
              </div>
              <button onClick={() => setShowAjukan(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <form onSubmit={handleAjukan} className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>Tanggal Mulai <span className="text-red-400">*</span></label>
                  <input type="date" required
                    value={form.date_start} onChange={e => setForm(p => ({ ...p, date_start: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                    style={{ border: `1.5px solid ${form.date_start ? purple : '#e5e7eb'}`, background: form.date_start ? purple50 : 'white', color: '#111' }}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>Tanggal Selesai <span className="text-red-400">*</span></label>
                  <input type="date" required
                    value={form.date_end} onChange={e => setForm(p => ({ ...p, date_end: e.target.value }))}
                    className="w-full px-4 py-3 text-sm border rounded-xl transition-all"
                    style={{ border: `1.5px solid ${form.date_end ? purple : '#e5e7eb'}`, background: form.date_end ? purple50 : 'white', color: '#111' }}/>
                </div>
              </div>

              {/* Preview jumlah hari */}
              {form.date_start && form.date_end && (
                <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: purple50, color: purple }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                  Durasi: <strong>{hitungHari(form.date_start, form.date_end)} hari</strong>
                  {hitungHari(form.date_start, form.date_end) > sisaCuti && (
                    <span className="ml-1 text-red-500">— melebihi sisa kuota!</span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                  style={{ fontFamily: 'DM Mono' }}>Alasan <span className="text-red-400">*</span></label>
                <textarea rows={3} required placeholder="Tuliskan alasan pengajuan cuti..."
                  value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full px-4 py-3 text-sm border rounded-xl transition-all resize-none"
                  style={{ border: `1.5px solid ${form.reason ? purple : '#e5e7eb'}`, background: form.reason ? purple50 : 'white', color: '#111' }}/>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAjukan(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: saving ? '#a78bfa' : purple }}>
                  {saving
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Mengirim...</>
                    : 'Kirim Pengajuan'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REVIEW (admin) */}
      {showReview && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowReview(null)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Review Pengajuan Cuti</h2>
              <button onClick={() => setShowReview(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Info pengajuan */}
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: '#fafafa', border: '1px solid #f3f4f6' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: purple }}>
                    {showReview.profiles?.full_name?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{showReview.profiles?.full_name}</div>
                    <div className="text-xs text-gray-400">{showReview.profiles?.jabatan}</div>
                  </div>
                </div>
                {[
                  { label: 'Jenis Cuti',  val: showReview.type },
                  { label: 'Tanggal',     val: `${formatTgl(showReview.date_start)} — ${formatTgl(showReview.date_end)}` },
                  { label: 'Durasi',      val: `${hitungHari(showReview.date_start, showReview.date_end)} hari` },
                  { label: 'Alasan',      val: showReview.reason },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-sm text-gray-700 text-right max-w-56">{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => handleReview('rejected')} disabled={reviewing}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                  Tolak
                </button>
                <button onClick={() => handleReview('approved')} disabled={reviewing}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: reviewing ? '#a78bfa' : '#16a34a' }}>
                  {reviewing
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Memproses...</>
                    : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>Setujui</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {showDetail && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Detail Pengajuan</h2>
              <button onClick={() => setShowDetail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: purple }}>
                  {showDetail.profiles?.full_name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{showDetail.profiles?.full_name}</div>
                  <div className="text-sm text-gray-400">{showDetail.profiles?.jabatan}</div>
                </div>
              </div>
              {[
                { label: 'Jenis Cuti',      val: showDetail.type },
                { label: 'Tanggal Mulai',   val: formatTgl(showDetail.date_start) },
                { label: 'Tanggal Selesai', val: formatTgl(showDetail.date_end) },
                { label: 'Durasi',          val: `${hitungHari(showDetail.date_start, showDetail.date_end)} hari` },
                { label: 'Alasan',          val: showDetail.reason },
                { label: 'Status',          val: statusStyle(showDetail.status).label },
                { label: 'Diajukan',        val: new Date(showDetail.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Direview',        val: showDetail.reviewed_at ? new Date(showDetail.reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
              ].map(({ label, val }) => val ? (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                  <span className="text-sm text-gray-700 text-right max-w-48">{val}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}