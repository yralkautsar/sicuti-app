'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const purple     = '#6d28d9'
const purple50   = '#f5f3ff'
const purple100  = '#ede9fe'
const SCHOOL     = 'TK Karakter Mutiara Bunda Bali'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email, password
    })

    if (authError) {
      setError('Email atau password salah. Coba lagi.')
      setLoading(false)
      return
    }

    // Get profile to determine role-based redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role
    if (role === 'admin' || role === 'kepala_sekolah') {
      router.push('/dashboard')
    } else {
      router.push('/guru')
    }
  }

  return (
    <div className="min-h-screen bg-white flex"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .fade-up-1 { animation: fadeUp 0.5s ease 0.1s forwards; opacity:0; }
        .fade-up-2 { animation: fadeUp 0.5s ease 0.2s forwards; opacity:0; }
        .fade-up-3 { animation: fadeUp 0.5s ease 0.3s forwards; opacity:0; }
        .fade-up-4 { animation: fadeUp 0.5s ease 0.4s forwards; opacity:0; }
        input:focus { outline: none; }
      `}</style>

      {/* LEFT — branding panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-14"
        style={{ background: purple }}>

        {/* Logo */}
        <div className="fade-up">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="Logo Sekolah"
              style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <div>
              <div className="font-semibold text-white text-sm leading-tight">{SCHOOL}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>
                Sistem Manajemen Sekolah
              </div>
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Logo Sekolah Karakter Mutiara Bunda Bali"
              style={{ width: 180, height: 180, objectFit: 'contain' }} />
          </div>
        </div>

        {/* Center headline */}
        <div>
          <div className="fade-up-1 text-xs font-semibold uppercase tracking-[0.2em] mb-4"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Mono' }}>
            SiCuti — v1.0
          </div>
          <h1 className="fade-up-2 font-bold leading-tight mb-6"
            style={{ fontSize: 44, color: 'white', letterSpacing: '-0.02em' }}>
            Sistem Absensi<br/>& Cuti Digital.
          </h1>
          <p className="fade-up-3 text-base leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 340 }}>
            Kelola absensi murid, kehadiran guru, dan pengajuan cuti dalam satu platform yang mudah digunakan.
          </p>
        </div>

        {/* Feature list */}
        <div className="fade-up-4 flex flex-col gap-3">
          {[
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>, label: 'Absensi via QR Code — murid & guru' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, label: 'Pengajuan & persetujuan cuti online' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>, label: 'Dashboard laporan & rekap kehadiran' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                {f.icon}
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — login form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <img src="/logo.png" alt="Logo Sekolah"
              style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span className="font-semibold text-gray-900 text-sm">{SCHOOL}</span>
          </div>

          <div className="fade-up-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] mb-2"
              style={{ color: purple, fontFamily: 'DM Mono' }}>
              Selamat datang
            </div>
            <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
              Masuk ke SiCuti
            </h2>
            <p className="text-gray-400 text-sm mb-10">
              Gunakan email dan password yang diberikan oleh admin sekolah.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Email */}
            <div className="fade-up-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2"
                style={{ fontFamily: 'DM Mono' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@mutiarabunda.sch.id"
                className="w-full px-4 py-3.5 text-sm text-gray-900 border rounded-xl
                  transition-all placeholder-gray-300"
                style={{
                  border: `1.5px solid ${email ? purple : '#e5e7eb'}`,
                  background: email ? purple50 : 'white',
                }}
              />
            </div>

            {/* Password */}
            <div className="fade-up-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2"
                style={{ fontFamily: 'DM Mono' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 text-sm text-gray-900 border rounded-xl
                  transition-all placeholder-gray-300"
                style={{
                  border: `1.5px solid ${password ? purple : '#e5e7eb'}`,
                  background: password ? purple50 : 'white',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl fade-up"
                style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Submit */}
            <div className="fade-up-4 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-white text-sm
                  transition-all flex items-center justify-center gap-2"
                style={{
                  background: loading ? '#a78bfa' : purple,
                  boxShadow: loading ? 'none' : `0 4px 20px ${purple}40`,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30
                      border-t-white animate-spin"/>
                    Masuk...
                  </>
                ) : (
                  <>
                    Masuk ke Dashboard
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Lupa password? Hubungi{' '}
            <span className="font-medium" style={{ color: purple }}>admin sekolah</span>
            {' '}untuk reset akun.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100"/>
            <span className="text-xs text-gray-300" style={{ fontFamily: 'DM Mono' }}>atau</span>
            <div className="flex-1 h-px bg-gray-100"/>
          </div>

          {/* Scan page link */}
          <a href="/scan"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
              text-sm font-medium transition-all"
            style={{
              border: `1.5px solid ${purple100}`,
              color: purple,
              background: purple50
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Buka Halaman Scan Tablet
          </a>

          <p className="text-center text-xs text-gray-300 mt-8"
            style={{ fontFamily: 'DM Mono' }}>
            SiCuti · {SCHOOL}
          </p>
        </div>
      </div>
    </div>
  )
}