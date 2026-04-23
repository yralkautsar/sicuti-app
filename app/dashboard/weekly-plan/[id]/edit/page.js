'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/ProfileContext'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import WeeklyPlanForm from '../../WeeklyPlanForm'

const purple    = '#A78BFA'
const accent    = '#442F78'
const purple100 = '#EAB6FF'

export default function EditWeeklyPlanPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile } = useProfile()
  const isAdmin = profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'

  const [plan,        setPlan]        = useState(null)
  const [classes,     setClasses]     = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!profile) return
    loadData()
  }, [profile, id])

  async function loadData() {
    const [planRes, classRes] = await Promise.all([
      supabase.from('weekly_plans').select('*').eq('id', id).single(),
      (() => {
        let q = supabase.from('classes').select('id, nama_kelas, tahun_ajaran').eq('active', true).order('nama_kelas')
        if (!isAdmin && profile?.class_id) q = q.eq('id', profile.class_id)
        return q
      })(),
    ])

    if (planRes.error || !planRes.data) { router.push('/dashboard/weekly-plan'); return }
    if (!isAdmin && planRes.data.class_id !== profile?.class_id) { router.push('/dashboard/weekly-plan'); return }

    setPlan(planRes.data)
    setClasses(classRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(formData) {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('weekly_plans').update({
        class_id: formData.class_id, tahun_ajaran: formData.tahun_ajaran,
        semester: formData.semester, minggu_ke: formData.minggu_ke,
        periode_start: formData.periode_start, periode_end: formData.periode_end,
        pilar_konsep: formData.pilar_konsep, tema: formData.tema,
        hari_data: formData.hari_data, asmaul_husna: formData.asmaul_husna,
        doa_harian: formData.doa_harian, surah_pendek: formData.surah_pendek,
        mutiara_hikmah: formData.mutiara_hikmah,
      }).eq('id', id)
      if (error) { alert('Gagal menyimpan: ' + error.message); return }
      router.push(`/dashboard/weekly-plan/${id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <Sidebar profile={profile} />
      <main className="flex-1 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `#EAB6FF #EAB6FF #EAB6FF ${purple}` }}/>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAFA', fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        input:focus,select:focus,textarea:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${purple100}; border-radius:4px; }
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-8 py-4 flex items-center gap-4 flex-shrink-0"
          style={{ background: '#FFFFFF', borderBottom: `1px solid ${purple100}` }}>
          <Link href={`/dashboard/weekly-plan/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-lg" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>Edit RPPM</h1>
            <p className="text-xs" style={{ color: purple }}>Minggu ke-{plan?.minggu_ke} · {plan?.tema}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-6">
            <WeeklyPlanForm initialData={plan} classes={classes} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </main>
    </div>
  )
}