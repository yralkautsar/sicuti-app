'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/ProfileContext'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

const purple    = '#A78BFA'
const accent    = '#442F78'
const purple50  = 'rgba(167,139,250,0.10)'
const purple100 = '#EAB6FF'

const TAHUN_OPTIONS = ['2024/2025', '2025/2026', '2026/2027']

function getPeriodeLabel(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opt = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('id-ID', opt)} – ${e.toLocaleDateString('id-ID', { ...opt, year: 'numeric' })}`
}

export default function WeeklyPlanPage() {
  const { profile } = useProfile()
  const isAdmin = profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'

  const [plans,       setPlans]       = useState([])
  const [classes,     setClasses]     = useState([])
  const [filterClass, setFilterClass] = useState('all')
  const [filterTahun, setFilterTahun] = useState('2025/2026')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!profile) return
    setFilterTahun(profile.tahun_ajaran || '2025/2026')
    loadClasses()
  }, [profile])

  useEffect(() => { if (filterTahun) loadPlans() }, [filterClass, filterTahun])

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, nama_kelas').eq('active', true).order('nama_kelas')
    setClasses(data || [])
  }

  async function loadPlans() {
    setLoading(true)
    let q = supabase
      .from('weekly_plans')
      .select('id, class_id, tahun_ajaran, semester, minggu_ke, periode_start, periode_end, pilar_konsep, tema, classes(nama_kelas)')
      .eq('tahun_ajaran', filterTahun)
      .order('periode_start', { ascending: false })
    if (filterClass !== 'all') q = q.eq('class_id', filterClass)
    const { data, error } = await q
    if (!error) setPlans(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Hapus RPPM ini? Aksi tidak bisa dibatalkan.')) return
    await supabase.from('weekly_plans').delete().eq('id', id)
    loadPlans()
  }

  const grouped = plans.reduce((acc, p) => {
    const key = `Semester ${p.semester}`
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease both; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${purple100}; border-radius:4px; }
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-8 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <div>
            <h1 className="font-bold text-lg" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>
              Rencana Pelaksanaan Pembelajaran Mingguan
            </h1>
            <p className="text-xs" style={{ color: purple }}>RPPM per kelas dan per minggu</p>
          </div>
          <Link href="/dashboard/weekly-plan/tambah"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tambah RPPM
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-[#1C1917]" style={{ fontFamily: "'Karla', sans-serif" }}>
              {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {isAdmin && (
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-[#1C1917]" style={{ fontFamily: "'Karla', sans-serif" }}>
                <option value="all">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nama_kelas}</option>)}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
            </div>
          ) : plans.length === 0 ? (
            <div className="fu flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: purple50 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="2" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-700 mb-1">Belum ada RPPM</p>
              <p className="text-sm text-gray-400">Klik "Tambah RPPM" untuk mulai</p>
            </div>
          ) : (
            <div className="fu flex flex-col gap-6">
              {Object.entries(grouped).map(([sem, semPlans]) => (
                <div key={sem}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: purple }}>{sem}</p>
                  <div className="flex flex-col gap-2">
                    {semPlans.map(plan => (
                      <div key={plan.id}
                        className="bg-white rounded-2xl border border-gray-100 px-6 py-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: purple50, color: accent }}>
                              {plan.classes?.nama_kelas}
                            </span>
                            <span className="text-xs text-gray-400" style={{ fontFamily: "'DM Mono', monospace" }}>
                              Minggu ke-{plan.minggu_ke}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 truncate">{plan.tema || '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {getPeriodeLabel(plan.periode_start, plan.periode_end)}
                            {plan.pilar_konsep ? ` · ${plan.pilar_konsep}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link href={`/dashboard/weekly-plan/${plan.id}`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                            style={{ color: accent }}>Lihat</Link>
                          <Link href={`/dashboard/weekly-plan/${plan.id}/edit`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                            style={{ color: accent }}>Edit</Link>
                          {isAdmin && (
                            <button onClick={() => handleDelete(plan.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}