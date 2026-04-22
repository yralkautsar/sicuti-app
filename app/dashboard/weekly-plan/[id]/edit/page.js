'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/ProfileContext'
import Link from 'next/link'
import WeeklyPlanForm from '../../WeeklyPlanForm'

export default function EditWeeklyPlanPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, isAdmin } = useProfile()

  const [plan, setPlan] = useState(null)
  const [classes, setClasses] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadData()
  }, [profile, id])

  async function loadData() {
    const [planRes, classRes] = await Promise.all([
      supabase
        .from('weekly_plans')
        .select('*')
        .eq('id', id)
        .single(),
      (() => {
        let q = supabase.from('classes').select('id, nama_kelas, tahun_ajaran').eq('active', true).order('nama_kelas')
        if (!isAdmin && profile?.class_id) q = q.eq('id', profile.class_id)
        return q
      })(),
    ])

    if (planRes.error || !planRes.data) {
      router.push('/dashboard/weekly-plan')
      return
    }

    // Guard: guru can only edit their own class
    if (!isAdmin && planRes.data.class_id !== profile?.class_id) {
      router.push('/dashboard/weekly-plan')
      return
    }

    setPlan(planRes.data)
    setClasses(classRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(formData) {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('weekly_plans')
        .update({
          class_id: formData.class_id,
          tahun_ajaran: formData.tahun_ajaran,
          semester: formData.semester,
          minggu_ke: formData.minggu_ke,
          periode_start: formData.periode_start,
          periode_end: formData.periode_end,
          pilar_konsep: formData.pilar_konsep,
          tema: formData.tema,
          hari_data: formData.hari_data,
          asmaul_husna: formData.asmaul_husna,
          doa_harian: formData.doa_harian,
          surah_pendek: formData.surah_pendek,
          mutiara_hikmah: formData.mutiara_hikmah,
        })
        .eq('id', id)

      if (error) {
        alert('Gagal menyimpan: ' + error.message)
        return
      }

      router.push(`/dashboard/weekly-plan/${id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Memuat data...</div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/weekly-plan/${id}`}
          className="text-gray-400 hover:text-[#442F78] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#442F78]" style={{ fontFamily: 'Rubik, sans-serif' }}>
            Edit RPPM
          </h1>
          <p className="text-sm text-gray-400">Minggu ke-{plan?.minggu_ke} · {plan?.tema}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-7">
        <WeeklyPlanForm
          initialData={plan}
          classes={classes}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}