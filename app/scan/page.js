'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SCHOOL_NAME   = 'TK Karakter Mutiara Bunda Bali'
const SCAN_COOLDOWN = 3000
const purple        = '#6d28d9'
const purple50      = '#f5f3ff'
const purple100     = '#ede9fe'

export default function ScanPage() {
  const qrInstanceRef       = useRef(null)
  const lastScannedRef      = useRef(null)
  const lastScannedTimeRef  = useRef(0)
  const scanModeRef         = useRef('murid')

  const [status, setStatus]               = useState('idle')
  const [result, setResult]               = useState(null)
  const [time, setTime]                   = useState('')
  const [date, setDate]                   = useState('')
  const [scanMode, setScanMode]           = useState('murid')
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraError, setCameraError]     = useState('')

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

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  const stopCamera = async () => {
    if (qrInstanceRef.current) {
      try { await qrInstanceRef.current.clear() } catch {}
      qrInstanceRef.current = null
    }
  }

  const startCamera = async () => {
    setCameraError('')
    await stopCamera()
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')

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
          console.error('Scan handler error:', e)
          setStatus('error')
          setResult({ message: 'Terjadi kesalahan sistem. Coba lagi.' })
          setTimeout(() => { setStatus('idle'); setResult(null) }, 3000)
        }
      }

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 15, qrbox: { width: 250, height: 250 }, facingMode: 'user' },
        false
      )
      qrInstanceRef.current = scanner
      scanner.render(handleDecode, () => {})
      setCameraStarted(true)
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan di browser, lalu coba lagi.')
    }
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
    const { data: student, error } = await supabase.from('students').select('*').eq('qr_code', qrCode).eq('active', true).single()
    if (error || !student) { setStatus('error'); setResult({ message: 'Kartu tidak dikenali. Hubungi admin.' }); resetAfterDelay(); return }
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('attendance_students').select('*').eq('student_id', student.id).eq('date', today).order('scanned_at', { ascending: false }).limit(1)
    const type = (existing?.length > 0 && existing[0].type === 'masuk') ? 'pulang' : 'masuk'
    const { error: ie } = await supabase.from('attendance_students').insert({ student_id: student.id, type, date: today })
    if (ie) throw ie
    setStatus('success')
    setResult({ name: student.full_name, sub: student.kelas || '', type })
    resetAfterDelay()
  }

  const handleGuruScan = async (qrCode) => {
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('qr_code', qrCode).single()
    if (error || !profile) { setStatus('error'); setResult({ message: 'Kartu guru tidak dikenali. Hubungi admin.' }); resetAfterDelay(); return }
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('attendance_guru').select('*').eq('profile_id', profile.id).eq('date', today).order('scanned_at', { ascending: false }).limit(1)
    const type = (existing?.length > 0 && existing[0].type === 'masuk') ? 'pulang' : 'masuk'
    const { error: ie } = await supabase.from('attendance_guru').insert({ profile_id: profile.id, type, date: today })
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

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        #qr-reader { width:100%!important; height:100%!important; border:none!important; background:transparent!important; }
        #qr-reader video { width:100%!important; height:100%!important; object-fit:cover!important; border-radius:20px; }
        #qr-reader__scan_region { border:none!important; padding:0!important; }
        #qr-reader__header_message { display:none!important; }
        #qr-reader__status_span { display:none!important; }
        #qr-reader__dashboard_section_swaplink { display:none!important; }
        select#qr-reader__camera_selection { display:none!important; }
        #qr-reader__dashboard_section_fsr { display:none!important; }
        #qr-reader__dashboard { padding:16px!important; text-align:center!important; }
        #qr-reader__dashboard_section_csr button,
        #qr-reader__dashboard_section_csr a {
          display:inline-block!important; padding:12px 28px!important;
          background:#6d28d9!important; color:white!important;
          border-radius:12px!important; font-size:14px!important;
          font-weight:600!important; text-decoration:none!important;
          cursor:pointer!important; border:none!important; opacity:1!important;
          font-family:Plus Jakarta Sans,sans-serif!important;
        }
        .scan-line {
          position:absolute; left:8%; right:8%; height:2px; z-index:10; pointer-events:none;
          background: linear-gradient(90deg, transparent, ${purple} 35%, #a78bfa 65%, transparent);
          box-shadow: 0 0 12px 2px ${purple}60;
          animation: sweep 2.6s ease-in-out infinite;
        }
        @keyframes sweep { 0%{top:8%;opacity:0} 6%{opacity:1} 94%{opacity:1} 100%{top:92%;opacity:0} }
        @keyframes popIn { 0%{transform:scale(0.85);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .pop-in  { animation: popIn  0.4s cubic-bezier(.34,1.56,.64,1) forwards; }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
        @keyframes cornerPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .corner-pulse { animation: cornerPulse 2s ease-in-out infinite; }
      `}</style>

      {/* TOP BAR */}
      <header className="flex items-center justify-between px-8 py-3.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{SCHOOL_NAME}</div>
            <div className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>Sistem Absensi Digital</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-0.5">{date}</div>
            <div className="font-bold tabular-nums" style={{ fontSize: 24, color: purple, fontFamily: 'DM Mono' }}>
              {time}<span className="text-xs font-normal text-gray-400 ml-1">WITA</span>
            </div>
          </div>
          <a href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 transition-all"
            style={{}} onMouseEnter={e => { e.currentTarget.style.borderColor = purple; e.currentTarget.style.color = purple }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
            Login Admin
          </a>
        </div>
      </header>

      {/* MODE TOGGLE */}
      <div className="flex justify-center pt-5 pb-4 flex-shrink-0">
        <div className="flex p-1 rounded-2xl" style={{ background: purple50 }}>
          {[
            { key: 'murid', label: 'Absensi Murid', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
            { key: 'guru',  label: 'Absensi Guru',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => handleModeChange(key)}
              className="flex items-center gap-2.5 px-8 py-3 rounded-xl text-base font-semibold transition-all"
              style={scanMode === key ? { background: purple, color: 'white', boxShadow: `0 4px 16px ${purple}40` } : { color: purple }}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* SCANNER */}
      <div className="flex-1 flex items-center justify-center px-8 pb-4 min-h-0">
        <div className="relative w-full h-full max-w-2xl"
          style={{
            borderRadius: 24,
            border: `3px solid ${success ? '#86efac' : isError ? '#fca5a5' : purple100}`,
            background: '#fafafa', overflow: 'hidden',
            transition: 'border-color .3s, box-shadow .3s',
            boxShadow: success ? '0 0 0 6px #4ade8020' : isError ? '0 0 0 6px #f8717120' : `0 0 0 6px ${purple}10`
          }}>

          {/* Camera div — always in DOM */}
          <div id="qr-reader" style={{ position: 'absolute', inset: 0, opacity: cameraStarted && idle ? 1 : 0, transition: 'opacity .25s', zIndex: 1 }}/>

          {/* Corner marks */}
          {['top-4 left-4 border-t-[3px] border-l-[3px] rounded-tl-2xl','top-4 right-4 border-t-[3px] border-r-[3px] rounded-tr-2xl','bottom-4 left-4 border-b-[3px] border-l-[3px] rounded-bl-2xl','bottom-4 right-4 border-b-[3px] border-r-[3px] rounded-br-2xl'].map((cls, i) => (
            <div key={i} className={`absolute w-10 h-10 ${cls} corner-pulse`} style={{ borderColor: purple, zIndex: 5 }}/>
          ))}

          {idle && cameraStarted && <div className="scan-line"/>}

          {/* START CAMERA */}
          {!cameraStarted && idle && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ zIndex: 10, background: '#fafafa' }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: purple50 }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div className="text-center px-6">
                <div className="font-bold text-gray-900 text-lg mb-1">Aktifkan Kamera</div>
                <div className="text-sm text-gray-400">Scan {isMurid ? 'kartu murid' : 'kartu guru'} — klik tombol untuk mulai</div>
                {cameraError && <div className="mt-3 text-sm text-red-500 max-w-sm mx-auto">{cameraError}</div>}
              </div>
              <button onClick={startCamera}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-semibold text-white"
                style={{ background: purple, boxShadow: `0 8px 24px ${purple}40` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Mulai Scan
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 fade-up" style={{ zIndex: 20 }}>
              <div className="w-14 h-14 rounded-full border-[3px] border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
              <span className="text-base text-gray-400 font-medium" style={{ fontFamily: 'DM Mono' }}>Memproses...</span>
            </div>
          )}

          {/* SUCCESS */}
          {success && result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pop-in" style={{ background: '#f0fdf4', zIndex: 20 }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#dcfce7' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#15803d', fontFamily: 'DM Mono' }}>
                  {result.type === 'masuk' ? '— Selamat Datang —' : '— Sampai Jumpa —'}
                </div>
                <div className="font-bold text-gray-900 leading-tight" style={{ fontSize: 36 }}>{result.name}</div>
                <div className="text-gray-400 text-lg mt-1">{result.sub}</div>
              </div>
              <div className="px-8 py-3 rounded-full text-base font-semibold"
                style={result.type === 'masuk' ? { background: '#dcfce7', color: '#15803d' } : { background: purple50, color: purple }}>
                {result.type === 'masuk' ? '✓  Absen Masuk Tercatat' : '✓  Absen Pulang Tercatat'}
              </div>
            </div>
          )}

          {/* ERROR */}
          {isError && result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pop-in" style={{ background: '#fff7f7', zIndex: 20 }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#dc2626', fontFamily: 'DM Mono' }}>Scan Gagal</div>
                <div className="text-gray-500 text-lg">{result.message}</div>
              </div>
            </div>
          )}

          {/* Instruction */}
          {idle && cameraStarted && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6" style={{ zIndex: 6 }}>
              <div className="px-6 py-2.5 rounded-full text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.9)', color: purple, backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', fontFamily: 'DM Mono', letterSpacing: '0.05em' }}>
                Arahkan kartu QR {isMurid ? 'murid' : 'guru'} ke kamera
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div className="flex-shrink-0 border-t border-gray-100 px-8 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {[
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg>, label: 'Ambil kartu QR' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>, label: 'Arahkan ke kamera' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>, label: 'Layar hijau = berhasil' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: purple50 }}>{s.icon}</div>
              <span className="text-xs text-gray-500 font-medium">{s.label}</span>
              {i < 2 && <div className="w-4 h-px bg-gray-200 ml-2"/>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-xs text-gray-400">Kartu hilang? Hubungi guru piket.</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
            <span className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>Sistem Aktif</span>
          </div>
        </div>
      </div>
    </div>
  )
}