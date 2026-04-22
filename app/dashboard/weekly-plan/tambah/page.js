'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/ProfileContext'
import Link from 'next/link'
import WeeklyPlanForm from '../WeeklyPlanForm'

export default function TambahWeeklyPlanPage() {
  const { profile, isAdmin } = useProfile()
  const router = useRouter()

  const [classes, setClasses] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadClasses()
  }, [profile])

  async function loadClasses() {
    let q = supabase
      .from('classes')
      .select('id, nama_kelas, tahun_ajaran')
      .eq('active', true)
      .order('nama_kelas')

    // Guru: only their own class
    if (!isAdmin && profile?.class_id) {
      q = q.eq('id', profile.class_id)
    }

    const { data } = await q
    setClasses(data || [])
  }

  async function handleSubmit(formData) {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('weekly_plans')
        .insert({ ...formData, created_by: profile.id })

      if (error) {
        if (error.code === '23505') {
          alert('RPPM untuk kelas, tahun ajaran, semester, dan minggu ke- tersebut sudah ada. Gunakan fitur Edit.')
        } else {
          alert('Gagal menyimpan: ' + error.message)
        }
        return
      }

      router.push('/dashboard/weekly-plan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/weekly-plan"
          className="text-gray-400 hover:text-[#442F78] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#442F78]" style={{ fontFamily: 'Rubik, sans-serif' }}>
            Tambah RPPM
          </h1>
          <p className="text-sm text-gray-400">Rencana Pelaksanaan Pembelajaran Mingguan baru</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-7">
        {classes.length > 0 ? (
          <WeeklyPlanForm
            classes={classes}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">Memuat data kelas...</div>
        )}
      </div>
    </div>
  )
}