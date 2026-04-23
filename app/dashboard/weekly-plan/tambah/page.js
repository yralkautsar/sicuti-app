'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/ProfileContext'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import WeeklyPlanForm from '../WeeklyPlanForm'

const purple    = '#A78BFA'
const accent    = '#442F78'
const purple100 = '#EAB6FF'

export default function TambahWeeklyPlanPage() {
  const { profile } = useProfile()
  const router = useRouter()
  const isAdmin = profile?.role === 'admin' || profile?.jabatan === 'Kepala Sekolah'

  const [classes,     setClasses]     = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadClasses()
  }, [profile])

  async function loadClasses() {
    let q = supabase.from('classes').select('id, nama_kelas, tahun_ajaran').eq('active', true).order('nama_kelas')
    if (!isAdmin && profile?.class_id) q = q.eq('id', profile.class_id)
    const { data } = await q
    setClasses(data || [])
  }

  async function handleSubmit(formData) {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('weekly_plans').insert({ ...formData, created_by: profile.id })
      if (error) {
        if (error.code === '23505') {
          alert('RPPM untuk kelas, tahun ajaran, semester, dan minggu ke- tersebut sudah ada.')
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
          <Link href="/dashboard/weekly-plan" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-lg" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>Tambah RPPM</h1>
            <p className="text-xs" style={{ color: purple }}>Rencana Pelaksanaan Pembelajaran Mingguan baru</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-6">
            {classes.length > 0
              ? <WeeklyPlanForm classes={classes} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
              : <div className="text-center py-10 text-gray-400 text-sm">Memuat data kelas...</div>
            }
          </div>
        </div>
      </main>
    </div>
  )
}