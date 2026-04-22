'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import Link from 'next/link'

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat']

function getPeriodeLabel(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opt = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('id-ID', opt)} – ${e.toLocaleDateString('id-ID', { ...opt, year: 'numeric' })}`
}

export default function WeeklyPlanPage() {
  const { profile, isAdmin } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [plans, setPlans] = useState([])
  const [classes, setClasses] = useState([])
  const [filterClass, setFilterClass] = useState('all')
  const [filterTahun, setFilterTahun] = useState('')
  const [loading, setLoading] = useState(true)

  const tahunOptions = ['2024/2025', '2025/2026', '2026/2027']

  useEffect(() => {
    if (!profile) return
    setFilterTahun(profile.tahun_ajaran || '2025/2026')
    loadClasses()
  }, [profile])

  useEffect(() => {
    if (filterTahun) loadPlans()
  }, [filterClass, filterTahun])

  async function loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('id, nama_kelas, tahun_ajaran')
      .eq('active', true)
      .order('nama_kelas')
    setClasses(data || [])
  }

  async function loadPlans() {
    setLoading(true)
    let q = supabase
      .from('weekly_plans')
      .select(`
        id, class_id, tahun_ajaran, semester, minggu_ke,
        periode_start, periode_end, pilar_konsep, tema,
        created_at, updated_at,
        classes(nama_kelas)
      `)
      .eq('tahun_ajaran', filterTahun)
      .order('periode_start', { ascending: false })

    if (filterClass !== 'all') {
      q = q.eq('class_id', filterClass)
    }

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
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#442F78]" style={{ fontFamily: 'Rubik, sans-serif' }}>
            Rencana Pelaksanaan Pembelajaran Mingguan
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">RPPM per kelas dan per minggu</p>
        </div>
        <Link
          href="/dashboard/weekly-plan/tambah"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#442F78', fontFamily: 'Karla, sans-serif' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah RPPM
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTahun}
          onChange={e => setFilterTahun(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#A78BFA]"
          style={{ fontFamily: 'Karla, sans-serif' }}
        >
          {tahunOptions.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#A78BFA]"
            style={{ fontFamily: 'Karla, sans-serif' }}
          >
            <option value="all">Semua Kelas</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.nama_kelas}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">Belum ada RPPM untuk filter ini.</p>
          <Link
            href="/dashboard/weekly-plan/tambah"
            className="mt-4 inline-block text-sm font-semibold text-[#A78BFA] hover:underline"
          >
            Buat RPPM pertama →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([sem, semPlans]) => (
            <div key={sem}>
              <h2
                className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] mb-3"
                style={{ fontFamily: 'Karla, sans-serif' }}
              >
                {sem}
              </h2>
              <div className="space-y-2">
                {semPlans.map(plan => (
                  <div
                    key={plan.id}
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#A78BFA] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                          style={{ background: '#EAB6FF33', color: '#442F78' }}
                        >
                          {plan.classes?.nama_kelas}
                        </span>
                        <span className="text-xs text-gray-400">Minggu ke-{plan.minggu_ke}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {plan.tema || '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {getPeriodeLabel(plan.periode_start, plan.periode_end)}
                        {plan.pilar_konsep ? ` · ${plan.pilar_konsep}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/dashboard/weekly-plan/${plan.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#A78BFA22] text-[#442F78] transition-colors"
                      >
                        Lihat
                      </Link>
                      <Link
                        href={`/dashboard/weekly-plan/${plan.id}/edit`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#A78BFA22] text-[#442F78] transition-colors"
                      >
                        Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                        >
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
  )
}