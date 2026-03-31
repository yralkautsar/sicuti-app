'use client'

const purple    = '#6d28d9'
const purple50  = '#f5f3ff'
const purple100 = '#ede9fe'
const SCHOOL    = 'TK Karakter Mutiara Bunda Bali'

const stepsMurid = [
  {
    num: '01',
    title: 'Siapkan Kartu QR',
    desc: 'Ambil kartu absensi murid yang diberikan oleh sekolah. Pastikan kartu tidak rusak, kotor, atau tertekuk.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg>
  },
  {
    num: '02',
    title: 'Pilih Mode "Absensi Murid"',
    desc: 'Pastikan tombol "Absensi Murid" sudah dipilih (warna ungu) di bagian atas layar tablet.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
  },
  {
    num: '03',
    title: 'Aktifkan Kamera',
    desc: 'Jika kamera belum aktif, klik tombol "Mulai Scan" dan izinkan akses kamera saat browser meminta.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
  },
  {
    num: '04',
    title: 'Arahkan Kartu ke Kamera',
    desc: 'Dekatkan kartu QR ke kamera tablet. Posisikan kartu di tengah layar hingga sistem mendeteksinya.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>
  },
  {
    num: '05',
    title: 'Layar Hijau = Berhasil',
    desc: 'Jika layar berubah hijau dan muncul nama murid, absensi berhasil tercatat. Scan pertama = masuk, scan kedua = pulang.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
  },
]

const stepsGuru = [
  {
    num: '01',
    title: 'Siapkan Kartu QR Guru',
    desc: 'Ambil kartu absensi guru yang diberikan oleh admin sekolah. Kartu guru berbeda dengan kartu murid.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17v3h3M14 20h3"/></svg>
  },
  {
    num: '02',
    title: 'Pilih Mode "Absensi Guru"',
    desc: 'Klik tombol "Absensi Guru" di bagian atas layar tablet hingga berubah warna ungu.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
  {
    num: '03',
    title: 'Scan Kartu Saat Datang',
    desc: 'Arahkan kartu QR ke kamera saat tiba di sekolah. Sistem otomatis mencatat sebagai absen masuk. Batas tepat waktu guru: 07.00 WITA.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>
  },
  {
    num: '04',
    title: 'Scan Kartu Saat Pulang',
    desc: 'Scan kartu yang sama saat hendak pulang. Sistem otomatis mencatat sebagai absen pulang.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
  },
  {
    num: '05',
    title: 'Cek Rekap di Dashboard',
    desc: 'Login ke dashboard untuk melihat rekap kehadiran pribadi, detail keterlambatan, dan ringkasan cuti di menu "Profil Saya".',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
]

const stepsCuti = [
  {
    num: '01',
    title: 'Login ke Dashboard',
    desc: 'Buka sicuti-app.vercel.app/login dan masukkan email serta password yang diberikan oleh admin sekolah.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  },
  {
    num: '02',
    title: 'Buka Menu Cuti',
    desc: 'Klik menu "Cuti Guru" di sidebar kiri. Kamu akan melihat daftar pengajuan cuti dan status masing-masing.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  },
  {
    num: '03',
    title: 'Klik "Ajukan Cuti"',
    desc: 'Klik tombol "Ajukan Cuti" di pojok kanan atas. Isi tanggal mulai, tanggal selesai, alasan, dan nama guru pengganti.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  },
  {
    num: '04',
    title: 'Tunggu Persetujuan Admin',
    desc: 'Setelah diajukan, status cuti akan "Menunggu". Admin atau kepala sekolah akan menyetujui atau menolak pengajuan.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
  },
  {
    num: '05',
    title: 'Cek Status & Sisa Kuota',
    desc: 'Di menu "Profil Saya", kamu bisa melihat total kuota cuti, berapa hari sudah terpakai, sisa kuota, dan daftar cuti yang sudah disetujui.',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
  },
]

const faqs = [
  {
    q: 'Kartu QR tidak terbaca oleh kamera, apa yang harus dilakukan?',
    a: 'Pastikan kartu tidak kotor, buram, atau tertekuk. Coba bersihkan permukaan kartu dan jauhkan dari pantulan cahaya langsung. Jika masih tidak terbaca, hubungi admin atau guru piket.'
  },
  {
    q: 'Layar merah muncul setelah scan, apa artinya?',
    a: 'Layar merah berarti kartu tidak dikenali sistem. Kemungkinan kartu belum terdaftar atau rusak. Segera hubungi admin untuk mendapatkan kartu pengganti.'
  },
  {
    q: 'Apakah murid perlu scan dua kali?',
    a: 'Ya. Scan pertama di pagi hari tercatat sebagai absen masuk, scan kedua saat pulang tercatat sebagai absen pulang. Sistem membedakannya secara otomatis.'
  },
  {
    q: 'Batas jam tepat waktu jam berapa?',
    a: 'Batas tepat waktu guru adalah 07.00 WITA. Batas tepat waktu murid adalah 07.30 WITA. Scan setelah jam tersebut otomatis tercatat sebagai terlambat beserta jumlah menitnya.'
  },
  {
    q: 'Bagaimana jika murid atau guru lupa scan?',
    a: 'Hubungi admin sekolah untuk koreksi data manual melalui dashboard. Data absensi hanya bisa dikoreksi oleh admin.'
  },
  {
    q: 'Kartu QR hilang, apa yang harus dilakukan?',
    a: 'Segera laporkan ke admin sekolah. Admin akan mencetak kartu QR pengganti dari halaman Print QR di dashboard. Kartu lama tetap valid hingga admin menonaktifkannya.'
  },
  {
    q: 'Lupa password login, bagaimana cara reset?',
    a: 'Buka halaman login, klik "Lupa password?" di bawah kolom password. Masukkan email akun kamu, lalu cek email untuk link reset password. Klik link tersebut dan buat password baru.'
  },
  {
    q: 'Berapa kuota cuti yang saya miliki?',
    a: 'Kuota cuti ditentukan oleh admin sekolah per guru. Kamu bisa melihat total kuota, hari terpakai, dan sisa kuota di menu "Profil Saya" setelah login.'
  },
]

function StepCard({ step, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
          {step.icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold" style={{ color, fontFamily: 'DM Mono' }}>{step.num}</span>
          <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, color }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
        style={{ background: color }}>
        {icon}
      </div>
      <h2 className="font-bold text-gray-900 text-xl">{title}</h2>
    </div>
  )
}

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease both}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
      `}</style>

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoborder.png" alt="Logo" className="w-9 h-9 object-contain" />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{SCHOOL}</div>
              <div className="text-xs" style={{ color: purple, fontFamily: 'DM Mono' }}>SiCuti — Panduan</div>
            </div>
          </div>
          <a href="/scan"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
            style={{ background: purple }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Mulai Scan
          </a>
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
            Panduan Penggunaan SiCuti
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Panduan lengkap absensi QR, pengajuan cuti, dan penggunaan dashboard untuk guru dan admin.
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {[
              { label: 'Absensi Murid', href: '#murid', color: purple },
              { label: 'Absensi Guru',  href: '#guru',  color: '#0891b2' },
              { label: 'Pengajuan Cuti', href: '#cuti', color: '#16a34a' },
              { label: 'FAQ',            href: '#faq',  color: '#d97706' },
            ].map(n => (
              <a key={n.href} href={n.href}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: '#f3f4f6', color: n.color }}>
                {n.label}
              </a>
            ))}
          </div>
        </div>

        {/* ABSENSI MURID */}
        <div className="fu" id="murid">
          <SectionHeader
            title="Cara Absensi Murid"
            color={purple}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
          />
          <div className="flex flex-col gap-3">
            {stepsMurid.map((step, i) => (
              <StepCard key={i} step={step} color={purple} bg={purple50} />
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl flex items-start gap-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#dcfce7' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-green-700 mb-0.5">Batas tepat waktu murid: 07.30 WITA</div>
              <div className="text-xs text-green-600">Scan setelah jam 07.30 WITA otomatis tercatat sebagai terlambat beserta jumlah menitnya.</div>
            </div>
          </div>
        </div>

        {/* ABSENSI GURU */}
        <div className="fu" id="guru">
          <SectionHeader
            title="Cara Absensi Guru"
            color="#0891b2"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          />
          <div className="flex flex-col gap-3">
            {stepsGuru.map((step, i) => (
              <StepCard key={i} step={step} color="#0891b2" bg="#ecfeff" />
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl flex items-start gap-4" style={{ background: '#ecfeff', border: '1px solid #a5f3fc' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#cffafe' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold mb-0.5" style={{ color: '#0e7490' }}>Batas tepat waktu guru: 07.00 WITA</div>
              <div className="text-xs" style={{ color: '#0891b2' }}>Hari kerja guru: Senin — Sabtu. Scan setelah jam 07.00 WITA tercatat terlambat beserta jumlah menitnya.</div>
            </div>
          </div>
        </div>

        {/* PENGAJUAN CUTI */}
        <div className="fu" id="cuti">
          <SectionHeader
            title="Cara Mengajukan Cuti"
            color="#16a34a"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
          />
          <div className="flex flex-col gap-3">
            {stepsCuti.map((step, i) => (
              <StepCard key={i} step={step} color="#16a34a" bg="#f0fdf4" />
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl flex items-start gap-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#dcfce7' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-green-700 mb-0.5">Cuti dihitung berdasarkan hari kalender</div>
              <div className="text-xs text-green-600">Kuota cuti per guru ditentukan oleh admin sekolah. Hanya cuti yang sudah disetujui yang mengurangi kuota.</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="fu" id="faq">
          <SectionHeader
            title="Pertanyaan Umum"
            color="#d97706"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>}
          />
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ background: '#fffbeb', color: '#d97706', fontFamily: 'DM Mono' }}>Q</span>
                  <p className="text-sm font-semibold text-gray-900">{faq.q}</p>
                </div>
                <div className="flex items-start gap-3 mt-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ background: '#f0fdf4', color: '#16a34a', fontFamily: 'DM Mono' }}>A</span>
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
          <div className="flex items-center justify-center gap-3 mt-4">
            <a href="/scan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: purple, boxShadow: `0 4px 14px ${purple}30` }}>
              Mulai Absensi →
            </a>
            <a href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: purple50, color: purple, border: `1px solid ${purple100}` }}>
              Login Dashboard
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}