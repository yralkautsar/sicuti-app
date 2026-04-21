'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProfileContext } from '@/lib/ProfileContext'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [ready,   setReady]   = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      setReady(true)
    }
    init()
  }, [])

  // Belum ready — jangan render children dulu
  if (!ready) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#FAFAFA' }}>
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#EAB6FF #EAB6FF #EAB6FF #A78BFA' }}/>
    </div>
  )

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}