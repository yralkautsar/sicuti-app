'use client'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'
const SCHOOL    = 'TK Karakter Mutiara Bunda Bali'

const stepsMusid = [
  {
    num: '01',
    title: 'Siapkan Kartu QR',
    desc: 'Ambil kartu absensi murid yang diberikan oleh sekolah. Pastikan kartu tidak rusak atau tertekuk.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/>
      </svg>
    )
  },
  {
    num: '02',
    title: 'Pilih Mode "Absensi Murid"',
    desc: 'Pastikan tombol "Absensi Murid" sudah dipilih (warna ungu) di bagian atas layar tablet.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      </svg>
    )
  },
  {
    num: '03',
    title: 'Aktifkan Kamera',
    desc: 'Jika kamera belum aktif, klik tombol "Mulai Scan" dan izinkan akses kamera saat browser meminta.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    )
  },
  {
    num: '04',
    title: 'Arahkan Kartu ke Kamera',
    desc: 'Dekatkan kartu QR ke kamera tablet. Posisikan kartu di tengah layar hingga sistem mendeteksinya.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  },
  {
    num: '05',
    title: 'Layar Hijau = Berhasil',
    desc: 'Jika layar berubah hijau dan muncul nama murid, absensi berhasil tercatat. Murid bisa masuk kelas.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
      </svg>
    )
  },
]

const stepsGuru = [
  {
    num: '01',
    title: 'Siapkan Kartu QR Guru',
    desc: 'Ambil kartu absensi guru yang diberikan oleh admin sekolah. Kartu berbeda dengan kartu murid.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/>
      </svg>
    )
  },
  {
    num: '02',
    title: 'Pilih Mode "Absensi Guru"',
    desc: 'Klik tombol "Absensi Guru" di bagian atas layar tablet hingga berubah warna ungu.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )
  },
  {
    num: '03',
    title: 'Scan Kartu Saat Datang',
    desc: 'Arahkan kartu QR ke kamera saat tiba di sekolah. Sistem otomatis mencatat sebagai absen masuk.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  },
  {
    num: '04',
    title: 'Scan Kartu Saat Pulang',
    desc: 'Scan kartu yang sama saat hendak pulang. Sistem otomatis mencatat sebagai absen pulang.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
    )
  },
  {
    num: '05',
    title: 'Cek Rekap di Dashboard',
    desc: 'Login ke dashboard untuk melihat rekap kehadiran pribadi Anda di menu "Profil Saya".',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
]

const faqs = [
  {
    q: 'Kartu QR tidak terbaca oleh kamera, apa yang harus dilakukan?',
    a: 'Pastikan kartu tidak kotor, buram, atau tertekuk. Coba bersihkan permukaan kartu dan jauhkan dari pantulan cahaya langsung. Jika masih tidak terbaca, hubungi guru piket.'
  },
  {
    q: 'Layar merah muncul setelah scan, apa artinya?',
    a: 'Layar merah berarti kartu tidak dikenali sistem. Kemungkinan kartu belum terdaftar atau rusak. Segera hubungi admin atau guru piket untuk mendapatkan kartu pengganti.'
  },
  {
    q: 'Apakah murid perlu scan dua kali (masuk dan pulang)?',
    a: 'Ya. Scan pertama di pagi hari otomatis tercatat sebagai absen masuk. Scan kedua saat pulang otomatis tercatat sebagai absen pulang. Sistem membedakannya secara otomatis.'
  },
  {
    q: 'Bagaimana jika murid lupa scan saat masuk?',
    a: 'Hubungi admin atau wali kelas untuk koreksi data manual melalui dashboard. Data absensi hanya bisa dikoreksi oleh admin sekolah.'
  },
  {
    q: 'Batas jam tepat waktu jam berapa?',
    a: 'Batas waktu tepat waktu adalah pukul 07.30 WITA. Murid atau guru yang scan setelah jam tersebut akan tercatat sebagai terlambat.'
  },
  {
    q: 'Kartu QR murid hilang, apa yang harus dilakukan?',
    a: 'Segera laporkan ke admin sekolah. Admin akan mencetak kartu QR pengganti dari dashboard. Kartu lama akan tetap valid hingga admin menonaktifkannya.'
  },
]

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease both}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoborder.png" alt="Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{SCHOOL}</div>
              <div className="text-xs text-gray-400" style={{ fontFamily: 'DM Mono' }}>Panduan Absensi Digital</div>
            </div>
          </div>
          <div className="no-print flex items-center gap-2">
            <a href="/scan"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: purple }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Buka Scan
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-12">

        {/* HERO */}
        <div className="fu text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: purple50 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={purple} strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
            Panduan Absensi Digital
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Ikuti langkah-langkah di bawah untuk melakukan absensi menggunakan kartu QR di tablet sekolah.
          </p>
        </div>

        {/* CARA SCAN MURID */}
        <div className="fu">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: purple }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">Cara Absensi Murid</h2>
          </div>

          <div className="flex flex-col gap-3">
            {stepsMusid.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: purple50, color: purple }}>
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{ color: purple, fontFamily: 'DM Mono' }}>{step.num}</span>
                    <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
                {i < stepsMusid.length - 1 && (
                  <div className="absolute" />
                )}
              </div>
            ))}
          </div>

          {/* Result preview */}
          <div className="mt-4 p-4 rounded-2xl flex items-center gap-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-green-700">Tampilan saat berhasil</div>
              <div className="text-xs text-green-600 mt-0.5">Layar berubah hijau dan menampilkan nama murid beserta status "Absen Masuk Tercatat" atau "Absen Pulang Tercatat"</div>
            </div>
          </div>
        </div>

        {/* CARA SCAN GURU */}
        <div className="fu">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: '#0891b2' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">Cara Absensi Guru</h2>
          </div>

          <div className="flex flex-col gap-3">
            {stepsGuru.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#ecfeff', color: '#0891b2' }}>
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{ color: '#0891b2', fontFamily: 'DM Mono' }}>{step.num}</span>
                    <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-2xl flex items-center gap-4" style={{ background: '#ecfeff', border: '1px solid #a5f3fc' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#cffafe' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#0e7490' }}>Perlu diingat</div>
              <div className="text-xs mt-0.5" style={{ color: '#0891b2' }}>Batas waktu tepat waktu adalah <strong>07.30 WITA</strong>. Scan setelah jam tersebut otomatis tercatat sebagai terlambat.</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="fu">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: '#d97706' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">Pertanyaan Umum</h2>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ background: '#fffbeb', color: '#d97706', fontFamily: 'DM Mono' }}>
                    Q
                  </span>
                  <p className="text-sm font-semibold text-gray-900">{faq.q}</p>
                </div>
                <div className="flex items-start gap-3 mt-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ background: '#f0fdf4', color: '#16a34a', fontFamily: 'DM Mono' }}>
                    A
                  </span>
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="fu text-center pb-6">
          <div className="h-px bg-gray-200 mb-6" />
          <img src="/logoborder.png" alt="Logo" className="w-10 h-10 object-contain mx-auto mb-3" />
          <p className="text-xs text-gray-400">{SCHOOL}</p>
          <p className="text-xs text-gray-300 mt-1" style={{ fontFamily: 'DM Mono' }}>SiCuti — Sistem Absensi Digital</p>
          <a href="/scan"
            className="no-print inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
            Mulai Absensi Sekarang →
          </a>
        </div>

      </div>
    </div>
  )
}