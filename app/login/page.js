'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const primary      = '#A78BFA'
const accent       = '#442F78'
const primaryLight = 'rgba(167,139,250,0.12)'
const primaryPale  = '#F5F3FF'
const border       = '#EAB6FF'
const SCHOOL       = 'TK Karakter Mutiara Bunda Bali'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [forgotMode, setForgotMode]     = useState(false)
  const [forgotSent, setForgotSent]     = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) { setError('Masukkan email kamu dulu.'); return }
    setForgotLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setForgotLoading(false)
    if (err) {
      if (err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('email rate')) {
        setError('Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.')
      } else {
        setError('Gagal kirim email. Pastikan email terdaftar.')
      }
    } else {
      setForgotSent(true)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email atau password salah. Coba lagi.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Karla', sans-serif", background: '#FAFAFA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fu  { animation: fadeUp 0.5s ease forwards; }
        .fu1 { animation: fadeUp 0.5s ease 0.1s forwards; opacity:0; }
        .fu2 { animation: fadeUp 0.5s ease 0.2s forwards; opacity:0; }
        .fu3 { animation: fadeUp 0.5s ease 0.3s forwards; opacity:0; }
        .fu4 { animation: fadeUp 0.5s ease 0.4s forwards; opacity:0; }
        input:focus { outline: none; }
        h1,h2,h3 { font-family: 'Rubik', sans-serif; }
      `}</style>

      {/* ── LEFT — branding panel ── */}
      <div className="hidden lg:flex w-[25%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: accent }}>

        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(167,139,250,0.15)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(167,139,250,0.10)', pointerEvents:'none' }}/>

        {/* Logo */}
        <div className="fu relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <img src="/logoborder.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight" style={{ fontFamily: "'Rubik', sans-serif" }}>{SCHOOL}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>
                Sistem Manajemen Sekolah
              </div>
            </div>
          </div>
        </div>

        {/* Center headline */}
        <div className="relative z-10">
          <div className="fu1 text-xs font-semibold uppercase tracking-[0.2em] mb-4"
            style={{ color: primary, fontFamily: 'DM Mono' }}>
            SiCuti
          </div>
          <h1 className="fu2 font-bold leading-tight mb-6"
            style={{ fontSize: 42, color: 'white', letterSpacing: '-0.02em', fontFamily: "'Rubik', sans-serif" }}>
            Platform Pengelolaan<br/>Operasional Sekolah.
          </h1>
          <p className="fu3 text-base leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 340 }}>
            Absensi murid, kehadiran guru, dan pengajuan cuti dikelola dalam satu sistem yang sederhana.
          </p>
        </div>

        {/* Feature list */}
        <div className="fu4 flex flex-col gap-3 relative z-10">
          {[
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>, label: 'Absensi murid & guru via QR Code' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, label: 'Pengajuan dan persetujuan cuti online' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>, label: 'Laporan dan rekap kehadiran' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(167,139,250,0.2)', color: primary }}>
                {f.icon}
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — login form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <img src="/logoborder.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span className="font-semibold text-sm" style={{ color: accent }}>{SCHOOL}</span>
          </div>

          <div className="fu1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] mb-2"
              style={{ color: primary, fontFamily: 'DM Mono' }}>
              Selamat datang
            </div>
            <h2 className="font-bold mb-1" style={{ fontSize: 30, color: accent, fontFamily: "'Rubik', sans-serif" }}>
              Masuk ke Dashboard
            </h2>
            <p className="text-sm mb-8" style={{ color: '#78716C' }}>
              Gunakan email dan password yang diberikan oleh admin sekolah.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Email */}
            <div className="fu2">
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: '#A8A29E', fontFamily: 'DM Mono' }}>Email</label>
              <input
                type="email" required
                autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nama@mutiarabunda.sch.id"
                className="w-full px-4 py-3.5 text-sm rounded-xl transition-all"
                style={{
                  border: `1.5px solid ${email ? primary : border}`,
                  background: email ? primaryLight : 'white',
                  color: '#1C1917',
                }}
              />
            </div>

            {/* Password */}
            <div className="fu3">
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: '#A8A29E', fontFamily: 'DM Mono' }}>Password</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 text-sm rounded-xl transition-all"
                style={{
                  border: `1.5px solid ${password ? primary : border}`,
                  background: password ? primaryLight : 'white',
                  color: '#1C1917',
                }}
              />
            </div>

            {/* Forgot password */}
            <div className="text-right -mt-2">
              <button type="button"
                onClick={() => { setForgotMode(true); setError(''); setForgotSent(false) }}
                className="text-xs transition-all"
                style={{ color: primary }}>
                Lupa password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl fu"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Submit */}
            <div className="fu4 mt-1">
              <button type="submit" disabled={loading || !email || !password}
                className="w-full py-4 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: loading ? primary : accent,
                  boxShadow: loading ? 'none' : `0 4px 20px rgba(68,47,120,0.35)`,
                  cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                  fontFamily: "'Rubik', sans-serif",
                }}>
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Masuk...</>
                ) : (
                  <>Masuk <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: '#A8A29E' }}>
            Butuh bantuan? Hubungi{' '}
            <span className="font-medium" style={{ color: accent }}>admin sekolah</span>.
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: border }}/>
            <span className="text-xs" style={{ color: '#A8A29E', fontFamily: 'DM Mono' }}>atau</span>
            <div className="flex-1 h-px" style={{ background: border }}/>
          </div>

          <a href="/scan"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: `1.5px solid ${border}`, color: accent, background: primaryLight }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Buka Halaman Scan Tablet
          </a>

          <p className="text-center text-xs mt-8" style={{ color: '#D6D3D1', fontFamily: 'DM Mono' }}>
            SiCuti · {SCHOOL}
          </p>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {forgotMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(68,47,120,0.35)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
            style={{ border: `1px solid ${border}` }}>
            {forgotSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#F0FDF4' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <p className="font-bold mb-2" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>Email terkirim!</p>
                <p className="text-sm mb-6" style={{ color: '#78716C' }}>
                  Cek inbox <span className="font-medium" style={{ color: accent }}>{email}</span> dan klik link untuk reset password.
                </p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false) }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: accent }}>
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg" style={{ color: accent, fontFamily: "'Rubik', sans-serif" }}>Reset Password</h3>
                  <button onClick={() => { setForgotMode(false); setError('') }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
                </div>
                <p className="text-sm mb-5" style={{ color: '#78716C' }}>
                  Masukkan email akun kamu. Kami akan kirim link untuk membuat password baru.
                </p>
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <input type="email" required placeholder="email@sekolah.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                    style={{ border: `1.5px solid ${email ? primary : border}`, background: email ? primaryLight : 'white', color: '#1C1917' }}
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: forgotLoading ? primary : accent }}>
                    {forgotLoading ? 'Mengirim...' : 'Kirim Link Reset'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}