'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const primary    = '#A78BFA'
const accent     = '#442F78'
const purple50   = '#F5F0FF'
const purple100  = '#EAB6FF'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)
  const [tokenReady,  setTokenReady]  = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [checking,    setChecking]    = useState(true)

  useEffect(() => {
    let resolved = false

    const hash = window.location.hash
    const hasToken = hash.includes('access_token') || hash.includes('type=recovery')

    if (!hasToken) {
      setChecking(false)
      setError('Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.')
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        resolved = true
        setTokenReady(true)
        setChecking(false)
        setError('')
      }
    })

    const timeout = setTimeout(async () => {
      if (!resolved) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          resolved = true
          setTokenReady(true)
          setChecking(false)
          setError('')
        } else {
          setChecking(false)
          setError('Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.')
        }
      }
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (password !== confirm) {
      setError('Password dan konfirmasi tidak cocok.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message || 'Gagal update password. Coba lagi.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  const EyeIcon = ({ open }) => open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: purple50, fontFamily: "'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        input:focus { outline: none; }
      `}</style>

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: accent }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>SiCuti</span>
          </div>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Sistem Absensi Digital</p>
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#FFFFFF', border: `1px solid ${purple100}`, boxShadow: `0 4px 24px ${accent}10` }}>

          {/* Header */}
          <div className="px-8 pt-8 pb-6" style={{ borderBottom: `1px solid ${purple100}` }}>
            <h1 className="font-bold text-xl mb-1"
              style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
              Buat Password Baru
            </h1>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Masukkan password baru untuk akun kamu</p>
          </div>

          <div className="px-8 py-6">
            {checking ? (
              /* Checking token */
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                  style={{ borderColor: `${purple100} ${purple100} ${purple100} ${primary}` }}/>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Memverifikasi link...</p>
              </div>

            ) : success ? (
              /* Success */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#f0fdf4' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <p className="font-semibold mb-1" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                  Password berhasil diubah!
                </p>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Kamu akan diarahkan ke halaman login...</p>
              </div>

            ) : error && !tokenReady ? (
              /* Invalid token */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#fef2f2' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="font-semibold mb-1" style={{ fontFamily: "'Rubik', sans-serif", color: accent }}>
                  Link tidak valid
                </p>
                <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>{error}</p>
                <button onClick={() => router.push('/login')}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: accent, fontFamily: "'Rubik', sans-serif" }}>
                  Kembali ke Login
                </button>
              </div>

            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* Password baru */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
                    Password Baru <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 text-sm rounded-xl pr-11 transition-all"
                      style={{
                        border: `1.5px solid ${password ? primary : purple100}`,
                        background: password ? purple50 : '#FFFFFF',
                        color: '#111827',
                      }}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#9ca3af' }}>
                      <EyeIcon open={showPass} />
                    </button>
                  </div>
                </div>

                {/* Konfirmasi password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: '#9ca3af', fontFamily: 'DM Mono' }}>
                    Konfirmasi Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      placeholder="Ulangi password baru"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="w-full px-4 py-3 text-sm rounded-xl pr-11 transition-all"
                      style={{
                        border: `1.5px solid ${confirm ? (confirm === password ? '#86efac' : '#fca5a5') : purple100}`,
                        background: confirm ? (confirm === password ? '#f0fdf4' : '#fef2f2') : '#FFFFFF',
                        color: '#111827',
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#9ca3af' }}>
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1.5">Password tidak cocok</p>
                  )}
                </div>

                {/* Error */}
                {error && tokenReady && (
                  <div className="px-4 py-3 rounded-xl text-sm text-red-600"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading || !tokenReady}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mt-1"
                  style={{
                    background: loading || !tokenReady ? primary : accent,
                    cursor: loading || !tokenReady ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 14px ${accent}30`,
                    fontFamily: "'Rubik', sans-serif",
                  }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                      Menyimpan...
                    </span>
                  ) : 'Simpan Password Baru'}
                </button>

                <button type="button" onClick={() => router.push('/login')}
                  className="w-full py-2 text-sm text-center transition-all"
                  style={{ color: '#9ca3af' }}>
                  Kembali ke Login
                </button>

              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}