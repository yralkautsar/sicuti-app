'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const purple     = '#6d28d9'
const purple50   = '#f5f3ff'
const purple100  = '#ede9fe'

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

  // Supabase kirim token via URL hash — perlu di-exchange dulu
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      // Supabase JS v2 otomatis handle token dari hash
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setTokenReady(true)
        }
      })
    } else {
      setError('Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.')
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#f5f3ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        input:focus { outline: none; }
      `}</style>

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: purple }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="font-bold text-xl" style={{ color: '#1e1b4b' }}>SiCuti</span>
          </div>
          <p className="text-sm" style={{ color: '#6b7280' }}>Sistem Absensi Digital</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-50">
            <h1 className="font-bold text-xl text-gray-900 mb-1">Buat Password Baru</h1>
            <p className="text-sm text-gray-400">Masukkan password baru untuk akun kamu</p>
          </div>

          <div className="px-8 py-6">
            {success ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#f0fdf4' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 mb-1">Password berhasil diubah!</p>
                <p className="text-sm text-gray-400">Kamu akan diarahkan ke halaman login...</p>
              </div>
            ) : error && !tokenReady ? (
              /* Invalid token state */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#fef2f2' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 mb-1">Link tidak valid</p>
                <p className="text-sm text-gray-400 mb-5">{error}</p>
                <button onClick={() => router.push('/login')}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: purple }}>
                  Kembali ke Login
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* Password baru */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>
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
                        border: `1.5px solid ${password ? purple : '#e5e7eb'}`,
                        background: password ? purple50 : 'white',
                      }}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? (
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
                      )}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
                    style={{ fontFamily: 'DM Mono' }}>
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
                        border: `1.5px solid ${confirm ? (confirm === password ? '#86efac' : '#fca5a5') : '#e5e7eb'}`,
                        background: confirm ? (confirm === password ? '#f0fdf4' : '#fef2f2') : 'white',
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? (
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
                      )}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1">Password tidak cocok</p>
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
                    background: loading || !tokenReady ? '#a78bfa' : purple,
                    cursor: loading || !tokenReady ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 14px ${purple}30`
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