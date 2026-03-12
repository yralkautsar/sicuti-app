'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SCHOOL_NAME   = 'TK Karakter Mutiara Bunda Bali'
const SCAN_COOLDOWN = 3000
const purple        = '#6d28d9'
const purple50      = '#f5f3ff'
const purple100     = '#ede9fe'

export default function ScanPage() {
  const qrInstanceRef      = useRef(null)
  const lastScannedRef     = useRef(null)
  const lastScannedTimeRef = useRef(0)
  const scanModeRef        = useRef('murid')

  const [status, setStatus]             = useState('idle')
  const [result, setResult]             = useState(null)
  const [time, setTime]                 = useState('')
  const [date, setDate]                 = useState('')
  const [scanMode, setScanMode]         = useState('murid')
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraError, setCameraError]   = useState('')
  const [starting, setStarting]         = useState(false)

  useEffect(() => { scanModeRef.current = scanMode }, [scanMode])

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Makassar' }))
      setDate(now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Makassar' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  const stopCamera = async () => {
    if (qrInstanceRef.current) {
      try {
        const state = qrInstanceRef.current.getState()
        if (state === 2) await qrInstanceRef.current.stop()
        qrInstanceRef.current.clear()
      } catch {}
      qrInstanceRef.current = null
    }
  }

  const startCamera = async () => {
    if (starting) return
    setStarting(true)
    setCameraError('')
    await stopCamera()

    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      // Request camera permission via native browser API first
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      stream.getTracks().forEach(t => t.stop()) // stop stream, just needed permission

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) throw new Error('Tidak ada kamera ditemukan.')

      // Pick back camera if available, else first
      const back = cameras.find(c => /front|user|depan|facing front/i.test(c.label))
      const cameraId = (back || cameras[cameras.length - 1]).id

      const qr = new Html5Qrcode('qr-reader-container')
      qrInstanceRef.current = qr

      const handleDecode = async (decodedText) => {
        const cleanQR = decodedText.trim()
        const now = Date.now()
        if (cleanQR === lastScannedRef.current && now - lastScannedTimeRef.current < SCAN_COOLDOWN) return
        lastScannedRef.current = cleanQR
        lastScannedTimeRef.current = now
        setStatus('loading')
        try {
          if (scanModeRef.current === 'murid') await handleStudentScan(cleanQR)
          else await handleGuruScan(cleanQR)
        } catch (e) {
          setStatus('error')
          setResult({ message: 'Terjadi kesalahan sistem. Coba lagi.' })
          setTimeout(() => { setStatus('idle'); setResult(null) }, 3000)
        }
      }

      await qr.start(
        cameraId,
        {
          fps: 15,
          qrbox: (w, h) => {
            const size = Math.min(w, h) * 0.7
            return { width: size, height: size }
          },
        },
        handleDecode,
        () => {}
      )

      setCameraStarted(true)
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setCameraError('Izin kamera ditolak. Buka pengaturan browser dan izinkan akses kamera.')
      } else {
        setCameraError(err.message || 'Tidak bisa mengakses kamera. Coba lagi.')
      }
    }
    setStarting(false)
  }

  const handleModeChange = async (mode) => {
    setScanMode(mode)
    scanModeRef.current = mode
    if (cameraStarted) {
      await stopCamera()
      setCameraStarted(false)
    }
  }

  const handleStudentScan = async (qrCode) => {
    const { data: student, error } = await supabase
      .from('students').select('*').eq('qr_code', qrCode).eq('active', true).single()
    if (error || !student) {
      setStatus('error')
      setResult({ message: 'Kartu tidak dikenali. Hubungi admin.' })
      resetAfterDelay()
      return
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
    const { data: existing } = await supabase
      .from('attendance_students').select('*').eq('student_id', student.id).eq('date', today)
      .order('scanned_at', { ascending: false }).limit(1)
    const type = (existing?.length > 0 && existing[0].type === 'masuk') ? 'pulang' : 'masuk'
    const { error: ie } = await supabase
      .from('attendance_students').insert({ student_id: student.id, type, date: today })
    if (ie) throw ie
    setStatus('success')
    setResult({ name: student.full_name, sub: student.kelas || '', type })
    resetAfterDelay()
  }

  const handleGuruScan = async (qrCode) => {
    const { data: profile, error } = await supabase
      .from('profiles').select('*').eq('qr_code', qrCode).single()
    if (error || !profile) {
      setStatus('error')
      setResult({ message: 'Kartu guru tidak dikenali. Hubungi admin.' })
      resetAfterDelay()
      return
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
    const { data: existing } = await supabase
      .from('attendance_guru').select('*').eq('profile_id', profile.id).eq('date', today)
      .order('scanned_at', { ascending: false }).limit(1)
    const type = (existing?.length > 0 && existing[0].type === 'masuk') ? 'pulang' : 'masuk'
    const { error: ie } = await supabase
      .from('attendance_guru').insert({ profile_id: profile.id, type, date: today })
    if (ie) throw ie
    setStatus('success')
    setResult({ name: profile.full_name, sub: profile.jabatan || 'Guru', type })
    resetAfterDelay()
  }

  const resetAfterDelay = () => setTimeout(() => { setStatus('idle'); setResult(null) }, 3000)

  const idle    = status === 'idle'
  const loading = status === 'loading'
  const success = status === 'success'
  const isError = status === 'error'
  const isMurid = scanMode === 'murid'

  const borderColor = success ? '#86efac' : isError ? '#fca5a5' : cameraStarted ? purple : purple100
  const shadowColor = success ? '#4ade8020' : isError ? '#f8717120' : `${purple}10`

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');

        /* Hide ALL html5-qrcode UI elements */
        #qr-reader-container { width:100%!important; height:100%!important; border:none!important; background:transparent!important; }
        #qr-reader-container video { width:100%!important; height:100%!important; object-fit:cover!important; display:block!important; }
        #qr-reader-container img { display:none!important; }
        #qr-reader-container__scan_region { border:none!important; padding:0!important; height:100%!important; }
        #qr-reader-container__scan_region > img { display:none!important; }
        #qr-reader-container__dashboard { display:none!important; }
        #qr-reader-container__header_message { display:none!important; }

        @keyframes sweep {
          0%   { top: 15%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .scan-line {
          position: absolute;
          left: 15%; right: 15%;
          height: 2px;
          z-index: 10;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, ${purple} 30%, #a78bfa 70%, transparent);
          box-shadow: 0 0 16px 3px ${purple}60;
          animation: sweep 2.8s ease-in-out infinite;
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .corner { animation: cornerPulse 2s ease-in-out infinite; }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .pop-in { animation: popIn 0.25s ease both; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.3s ease both; }
      `}</style>

      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/logoborder.png" alt="Logo" className="w-9 h-9 object-contain" />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">{SCHOOL_NAME}</div>
            <div className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>{date}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-bold tabular-nums" style={{ fontSize: 22, color: purple, fontFamily: 'DM Mono' }}>{time}</div>
            <div className="text-xs text-gray-400">WITA</div>
          </div>
          <a href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: purple50, color: purple }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
            Login Admin
          </a>
        </div>
      </header>

      {/* MODE TOGGLE */}
      <div className="flex justify-center pt-4 pb-3 flex-shrink-0">
        <div className="flex p-1 rounded-2xl" style={{ background: purple50 }}>
          {[
            { key: 'murid', label: 'Absensi Murid', icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            )},
            { key: 'guru', label: 'Absensi Guru', icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )},
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => handleModeChange(key)}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={scanMode === key
                ? { background: purple, color: 'white', boxShadow: `0 4px 14px ${purple}40` }
                : { color: purple }}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* SCANNER AREA */}
      <div className="flex-1 flex items-center justify-center px-6 pb-4 min-h-0">
        <div className="relative w-full h-full max-w-xl"
          style={{
            borderRadius: 24,
            border: `2.5px solid ${borderColor}`,
            background: '#f8f8f8',
            overflow: 'hidden',
            transition: 'border-color .3s, box-shadow .3s',
            boxShadow: `0 0 0 5px ${shadowColor}`,
          }}>

          {/* QR reader div — always mounted, hidden until camera starts */}
          <div id="qr-reader-container"
            style={{
              position: 'absolute', inset: 0,
              opacity: cameraStarted && idle ? 1 : 0,
              transition: 'opacity .3s',
              zIndex: 1,
            }}
          />

          {/* Corner brackets */}
          {cameraStarted && idle && (
            <>
              {[
                'top-5 left-5 border-t-[3px] border-l-[3px] rounded-tl-xl',
                'top-5 right-5 border-t-[3px] border-r-[3px] rounded-tr-xl',
                'bottom-5 left-5 border-b-[3px] border-l-[3px] rounded-bl-xl',
                'bottom-5 right-5 border-b-[3px] border-r-[3px] rounded-br-xl',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-10 h-10 corner ${cls}`}
                  style={{ borderColor: purple, zIndex: 5 }} />
              ))}
              <div className="scan-line" />
            </>
          )}

          {/* IDLE — belum mulai */}
          {!cameraStarted && idle && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 fade-up"
              style={{ zIndex: 10, background: '#fafafa' }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: purple50 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div className="text-center px-8">
                <div className="font-bold text-gray-900 text-base mb-1">Kamera Belum Aktif</div>
                <div className="text-sm text-gray-400 leading-relaxed">
                  Klik tombol di bawah untuk mulai scan {isMurid ? 'kartu absensi murid' : 'kartu absensi guru'}
                </div>
                {cameraError && (
                  <div className="mt-3 text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-xl leading-relaxed">
                    {cameraError}
                  </div>
                )}
              </div>
              <button onClick={startCamera} disabled={starting}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
                style={{
                  background: starting ? '#a78bfa' : purple,
                  boxShadow: `0 6px 20px ${purple}40`,
                  opacity: starting ? 0.8 : 1,
                }}>
                {starting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Memulai...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Mulai Scan
                  </>
                )}
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 fade-up"
              style={{ zIndex: 20, background: 'rgba(255,255,255,0.96)' }}>
              <div className="w-12 h-12 rounded-full border-[3px] border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }} />
              <span className="text-sm text-gray-400 font-medium" style={{ fontFamily: 'DM Mono' }}>
                Memproses kartu...
              </span>
            </div>
          )}

          {/* SUCCESS */}
          {success && result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pop-in"
              style={{ background: '#f0fdf4', zIndex: 20 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: '#dcfce7' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div className="text-center px-6">
                <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
                  style={{ color: '#15803d', fontFamily: 'DM Mono' }}>
                  {result.type === 'masuk' ? '— Selamat Datang —' : '— Sampai Jumpa —'}
                </div>
                <div className="font-bold text-gray-900 leading-tight mb-1" style={{ fontSize: 32 }}>
                  {result.name}
                </div>
                {result.sub && <div className="text-gray-400 text-base">{result.sub}</div>}
              </div>
              <div className="px-7 py-2.5 rounded-full text-sm font-bold"
                style={result.type === 'masuk'
                  ? { background: '#dcfce7', color: '#15803d' }
                  : { background: purple50, color: purple }}>
                {result.type === 'masuk' ? '✓  Absen Masuk Tercatat' : '✓  Absen Pulang Tercatat'}
              </div>
            </div>
          )}

          {/* ERROR */}
          {isError && result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pop-in"
              style={{ background: '#fff7f7', zIndex: 20 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: '#fee2e2' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div className="text-center px-6">
                <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
                  style={{ color: '#dc2626', fontFamily: 'DM Mono' }}>
                  Scan Gagal
                </div>
                <div className="text-gray-500 text-base leading-relaxed">{result.message}</div>
              </div>
            </div>
          )}

          {/* Instruction overlay saat kamera aktif */}
          {idle && cameraStarted && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-5" style={{ zIndex: 6 }}>
              <div className="px-5 py-2 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.88)',
                  color: purple,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  fontFamily: 'DM Mono',
                  letterSpacing: '0.05em',
                }}>
                Arahkan kartu QR {isMurid ? 'murid' : 'guru'} ke kamera
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div className="flex-shrink-0 border-t border-gray-100 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {[
            { label: 'Ambil kartu QR' },
            { label: 'Arahkan ke kamera' },
            { label: 'Layar hijau = berhasil' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color: purple }}>0{i + 1}</span>
              <span className="text-xs text-gray-400">{s.label}</span>
              {i < 2 && <div className="w-3 h-px bg-gray-200 ml-1" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300">Kartu hilang? Hubungi guru piket.</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>Sistem Aktif</span>
          </div>
        </div>
      </div>
    </div>
  )
}