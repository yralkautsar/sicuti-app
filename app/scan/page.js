'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SCHOOL_NAME = 'TK Karakter Mutiara Bunda Bali'
const SCAN_COOLDOWN = 3000

export default function ScanPage() {
  const scannerInstanceRef = useRef(null)
  const lastScannedRef = useRef(null)
  const lastScannedTimeRef = useRef(0)

  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [scanMode, setScanMode] = useState('murid')

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Makassar'
      }))
      setDate(now.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Makassar'
      }))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  // QR Scanner
  useEffect(() => {
    const startScanner = async () => {
      if (scannerInstanceRef.current) {
        await scannerInstanceRef.current.clear().catch(() => {})
        scannerInstanceRef.current = null
      }
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        false
      )
      scannerInstanceRef.current = scanner
      scanner.render(onScanSuccess, () => {})
    }
    startScanner()
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {})
      }
    }
  }, [scanMode])

  const onScanSuccess = async (decodedText) => {
    const now = Date.now()
    if (
      decodedText === lastScannedRef.current &&
      now - lastScannedTimeRef.current < SCAN_COOLDOWN
    ) return
    lastScannedRef.current = decodedText
    lastScannedTimeRef.current = now
    setStatus('loading')
    try {
      if (scanMode === 'murid') await handleStudentScan(decodedText)
      else await handleGuruScan(decodedText)
    } catch {
      setStatus('error')
      setResult({ message: 'Terjadi kesalahan sistem. Coba lagi.' })
      resetAfterDelay()
    }
  }

  const handleStudentScan = async (qrCode) => {
    const { data: student, error } = await supabase
      .from('students').select('*')
      .eq('qr_code', qrCode).eq('active', true).single()
    if (error || !student) {
      setStatus('error')
      setResult({ message: 'Kartu tidak dikenali. Hubungi admin.' })
      resetAfterDelay(); return
    }
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('attendance_students').select('*')
      .eq('student_id', student.id).eq('date', today)
      .order('scanned_at', { ascending: false }).limit(1)
    const type = (existing?.length > 0 && existing[0].type === 'masuk') ? 'pulang' : 'masuk'
    const { error: ie } = await supabase
      .from('attendance_students')
      .insert({ student_id: student.id, type, date: today })
    if (ie) throw ie
    setStatus('success')
    setResult({ name: student.full_name, sub: student.kelas, type })
    resetAfterDelay()
  }

  const handleGuruScan = async (qrCode) => {
    const { data: profile, error } = await supabase
      .from('profiles').select('*').eq('qr_code', qrCode).single()
    if (error || !profile) {
      setStatus('error')
      setResult({ message: 'Kartu guru tidak dikenali. Hubungi admin.' })
      resetAfterDelay(); return
    }
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('attendance_guru').select('*')
      .eq('profile_id', profile.id).eq('date', today)
      .order('scanned_at', { ascending: false }).limit(1)
    const type = (existing?.length > 0 && existing[0].type === 'masuk') ? 'pulang' : 'masuk'
    const { error: ie } = await supabase
      .from('attendance_guru')
      .insert({ profile_id: profile.id, type, date: today })
    if (ie) throw ie
    setStatus('success')
    setResult({ name: profile.full_name, sub: profile.kelas || 'Guru', type })
    resetAfterDelay()
  }

  const resetAfterDelay = () => {
    setTimeout(() => { setStatus('idle'); setResult(null) }, 2800)
  }

  // Shorthands
  const idle     = status === 'idle'
  const loading  = status === 'loading'
  const success  = status === 'success'
  const isError  = status === 'error'
  const isMurid  = scanMode === 'murid'

  // Colors
  const purple   = '#6d28d9'
  const purple100 = '#ede9fe'
  const purple50  = '#f5f3ff'

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');

        /* Strip all html5-qrcode default UI */
        #qr-reader { width:100% !important; height:100% !important; border:none !important; background:transparent !important; }
        #qr-reader video { width:100% !important; height:100% !important; object-fit:cover !important; border-radius:14px; }
        #qr-reader__scan_region { border:none !important; padding:0 !important; }
        #qr-reader__dashboard,
        #qr-reader__status_span,
        #qr-reader__header_message,
        #qr-reader__camera_permission_button { display:none !important; }

        /* Scan line */
        .scan-line {
          position:absolute; left:14%; right:14%; height:1.5px; z-index:10; pointer-events:none;
          background: linear-gradient(90deg, transparent, ${purple} 40%, #a78bfa 60%, transparent);
          animation: scanline 2.4s ease-in-out infinite;
        }
        @keyframes scanline {
          0%   { top:12%; opacity:0; }
          8%   { opacity:1; }
          92%  { opacity:1; }
          100% { top:88%; opacity:0; }
        }

        /* Entrance animations */
        @keyframes popIn {
          0%   { transform:scale(0.88); opacity:0; }
          65%  { transform:scale(1.04); }
          100% { transform:scale(1);    opacity:1; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        .pop-in  { animation: popIn  0.35s cubic-bezier(.34,1.56,.64,1) forwards; }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-10 py-4 border-b border-gray-100">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: purple }}>
            {/* School / shield icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm leading-tight">{SCHOOL_NAME}</div>
            <div className="text-xs text-gray-400 mt-0.5"
              style={{ fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>
              Sistem Absensi Digital
            </div>
          </div>
        </div>

        {/* Clock */}
        <div className="text-right">
          <div className="text-sm text-gray-400">{date}</div>
          <div className="font-bold tabular-nums leading-tight"
            style={{ fontSize: 26, color: purple, fontFamily: 'DM Mono' }}>
            {time}
            <span className="text-xs font-normal text-gray-400 ml-1">WITA</span>
          </div>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — scanner */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-8 border-r border-gray-100">

          {/* Mode toggle */}
          <div className="flex p-1 rounded-xl mb-8" style={{ background: purple50 }}>
            {[
              {
                key: 'murid', label: 'Absensi Murid',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                )
              },
              {
                key: 'guru', label: 'Absensi Guru',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                )
              }
            ].map(({ key, label, icon }) => (
              <button key={key} onClick={() => setScanMode(key)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={scanMode === key
                  ? { background: purple, color: 'white', boxShadow: `0 2px 12px ${purple}40` }
                  : { color: purple }}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Scanner frame */}
          <div className="relative rounded-2xl overflow-hidden"
            style={{
              width: 320, height: 320,
              border: `2px solid ${success ? '#bbf7d0' : isError ? '#fecaca' : purple100}`,
              background: '#fafafa',
              transition: 'border-color .3s, box-shadow .3s',
              boxShadow: success  ? '0 0 0 4px #4ade8026'
                       : isError ? '0 0 0 4px #f8717126'
                       : `0 0 0 4px ${purple}14`
            }}>

            {/* Live camera feed */}
            <div id="qr-reader" style={{
              position: 'absolute', inset: 0,
              opacity: idle ? 1 : 0, transition: 'opacity .2s'
            }}/>

            {/* Animated scan line — visible only when idle */}
            {idle && <div className="scan-line"/>}

            {/* Corner accent marks */}
            {[
              'top-3 left-3 border-t-2 border-l-2 rounded-tl-xl',
              'top-3 right-3 border-t-2 border-r-2 rounded-tr-xl',
              'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-xl',
              'bottom-3 right-3 border-b-2 border-r-2 rounded-br-xl',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-5 h-5 ${cls}`}
                style={{ borderColor: purple, zIndex: 5 }}/>
            ))}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3
                bg-white/95 fade-up">
                <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
                <span className="text-xs text-gray-400"
                  style={{ fontFamily: 'DM Mono', letterSpacing: '.06em' }}>
                  Memproses...
                </span>
              </div>
            )}

            {/* Success overlay */}
            {success && result && (
              <div className="absolute inset-0 flex flex-col items-center justify-center
                gap-2 pop-in" style={{ background: '#f0fdf4' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: '#dcfce7' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                    stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest mt-1"
                  style={{ color: '#15803d', fontFamily: 'DM Mono' }}>
                  {result.type === 'masuk' ? 'Selamat Datang' : 'Sampai Jumpa'}
                </div>
                <div className="text-gray-900 font-semibold text-lg text-center px-4 leading-snug">
                  {result.name}
                </div>
                <div className="text-gray-400 text-sm">{result.sub}</div>
                <div className="mt-1 px-4 py-1.5 rounded-full text-xs font-medium"
                  style={result.type === 'masuk'
                    ? { background: '#dcfce7', color: '#15803d' }
                    : { background: purple50, color: purple }}>
                  {result.type === 'masuk' ? 'Absen Masuk Tercatat' : 'Absen Pulang Tercatat'}
                </div>
              </div>
            )}

            {/* Error overlay */}
            {isError && result && (
              <div className="absolute inset-0 flex flex-col items-center justify-center
                gap-2 pop-in" style={{ background: '#fff7f7' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: '#fee2e2' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: '#dc2626', fontFamily: 'DM Mono' }}>
                  Scan Gagal
                </div>
                <div className="text-gray-500 text-sm text-center px-6 leading-relaxed">
                  {result.message}
                </div>
              </div>
            )}
          </div>

          {/* Status hint */}
          <p className="mt-5 text-sm text-gray-400 text-center"
            style={{ fontFamily: 'DM Mono', letterSpacing: '.04em' }}>
            {idle    && `Arahkan kartu QR ${isMurid ? 'murid' : 'guru'} ke kamera`}
            {loading && 'Memeriksa data...'}
            {success && 'Berhasil dicatat ✓'}
            {isError && 'Coba scan ulang'}
          </p>
        </div>

        {/* RIGHT — info panel */}
        <div className="w-72 flex flex-col justify-between py-8 px-7 bg-white">

          {/* Active mode */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3"
              style={{ fontFamily: 'DM Mono' }}>Mode Aktif</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: purple }}/>
              <span className="font-semibold text-gray-900">
                {isMurid ? 'Absensi Murid' : 'Absensi Guru'}
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed ml-4">
              {isMurid
                ? 'Scan kartu QR anak untuk mencatat masuk atau pulang.'
                : 'Scan kartu QR guru untuk mencatat kehadiran harian.'}
            </p>
          </div>

          <div className="h-px bg-gray-100"/>

          {/* Steps */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-4"
              style={{ fontFamily: 'DM Mono' }}>Cara Penggunaan</p>
            <div className="flex flex-col gap-4">
              {[
                {
                  title: 'Siapkan kartu QR',
                  desc:  'Ambil kartu sesuai nama',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={purple} strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <path d="M14 14h3v3M17 17v3h3M14 20h3"/>
                    </svg>
                  )
                },
                {
                  title: 'Arahkan ke kamera',
                  desc:  'Posisikan di dalam kotak scan',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={purple} strokeWidth="2" strokeLinecap="round">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2
                               M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )
                },
                {
                  title: 'Tunggu konfirmasi',
                  desc:  'Layar hijau = berhasil tercatat',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={purple} strokeWidth="2" strokeLinecap="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <path d="M22 4L12 14.01l-3-3"/>
                    </svg>
                  )
                },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: purple50 }}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{s.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100"/>

          {/* Help card */}
          <div className="rounded-xl p-4" style={{ background: purple50 }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: purple100 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke={purple} strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800 mb-0.5">Ada masalah?</div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Kartu hilang atau tidak terbaca? Hubungi guru piket di ruang guru.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="px-10 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-300" style={{ fontFamily: 'DM Mono' }}>
          SiCuti · {SCHOOL_NAME}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
          <span className="text-xs text-gray-300" style={{ fontFamily: 'DM Mono' }}>
            Sistem Aktif
          </span>
        </div>
      </footer>
    </div>
  )
}