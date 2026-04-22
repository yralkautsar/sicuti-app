'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import Link from 'next/link'

const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat']
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: 'Jumat' }

// Time slots per day type
const SLOTS_REGULAR = [
  { time: '07.30 – 07.45', label: 'Mengaji Tilawati dan Hafalan' },
  { time: '07.45 – 08.00', label: "Sholat Dhuha dan do'a setelah sholat dhuha" },
  { time: '08.00 – 08.45', label: "Circle Morning (Do'a sebelum belajar, asmaul husna, baris dan senam)" },
  { time: '08.45 – 09.05', label: 'Jurnal (menggambar bebas/pilihan)' },
  { time: '09.00 – 09.25', label: 'Pilar Karakter' },
  { time: '09.25 – 10.00', label: 'Istirahat (Makan dan minum)' },
  { time: '10.00 – 10.45', label: 'Kegiatan Inti' },
  { time: '10.45 – 11.00', label: 'Penutup (Fokus jantung, membacakan cerita, refleksi dan do\'a penutup)' },
]

const SLOTS_JUMAT = [
  { time: '07.30 – 08.00', label: 'Fun English' },
  { time: '08.00 – 08.45', label: "Circle Morning (Do'a sebelum belajar, asmaul husna, baris dan senam)" },
  { time: '08.45 – 09.15', label: 'Istirahat (Makan dan minum)' },
  { time: '09.15 – 09.45', label: 'Kegiatan Inti' },
  { time: '09.45 – 10.00', label: 'Penutup (Fokus jantung, membacakan cerita, refleksi dan do\'a penutup)' },
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function HariColumn({ hari, data }) {
  if (!data) return <td className="border border-gray-200 p-3 text-xs text-gray-300 align-top">—</td>

  return (
    <td className="border border-gray-200 p-3 align-top text-xs">
      {/* CP Blocks */}
      {data.cp_blocks?.filter(b => b.cp).map((block, i) => (
        <div key={i} className="mb-3">
          <div
            className="text-center font-bold text-[10px] uppercase tracking-wide py-1 px-2 rounded-md mb-1.5"
            style={{ background: '#EAB6FF44', color: '#442F78' }}
          >
            CP: {block.cp}
          </div>
          <ul className="space-y-1">
            {block.tujuan?.filter(t => t).map((t, ti) => (
              <li key={ti} className="flex gap-1 text-gray-700 leading-snug">
                <span className="text-[#A78BFA] shrink-0">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Kegiatan Inti */}
      {data.tema_kegiatan && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div
            className="text-center font-bold text-[10px] uppercase tracking-wide py-1 px-2 rounded-md mb-1"
            style={{ background: '#442F7811', color: '#442F78' }}
          >
            {data.tema_kegiatan}
          </div>
          {data.detail_kegiatan && (
            <p className="text-center text-gray-700">{data.detail_kegiatan}</p>
          )}
        </div>
      )}

      {/* Alat & Bahan */}
      {data.alat_bahan?.filter(x => x).length > 0 && (
        <div className="mt-2 text-gray-500">
          {data.alat_bahan.filter(x => x).join(', ')}
        </div>
      )}
    </td>
  )
}

export default function WeeklyPlanViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, isAdmin } = useProfile()
  const supabase = createClient()

  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlan()
  }, [id])

  async function loadPlan() {
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*, classes(nama_kelas, wali_kelas_id, profiles:wali_kelas_id(full_name, jabatan))')
      .eq('id', id)
      .single()

    if (error || !data) {
      router.push('/dashboard/weekly-plan')
      return
    }
    setPlan(data)
    setLoading(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Memuat RPPM...</div>
  if (!plan) return null

  const waliKelas = plan.classes?.profiles
  const isJumatSlotsUsed = plan.hari_data?.jumat

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/weekly-plan"
            className="text-gray-400 hover:text-[#442F78] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#442F78]" style={{ fontFamily: 'Rubik' }}>
              RPPM — {plan.classes?.nama_kelas}
            </h1>
            <p className="text-sm text-gray-400">
              Minggu ke-{plan.minggu_ke} · {formatDate(plan.periode_start)} – {formatDate(plan.periode_end)}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/weekly-plan/${id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
          style={{ background: '#442F78' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </Link>
      </div>

      {/* Metadata card */}
      <div
        className="rounded-2xl p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4"
        style={{ background: 'linear-gradient(135deg, #442F78, #6B46C1)' }}
      >
        {[
          { label: 'Kelompok', value: plan.classes?.nama_kelas },
          { label: 'Semester/Minggu', value: `${plan.semester}/${plan.minggu_ke}` },
          { label: 'Pilar/Konsep', value: plan.pilar_konsep || '—' },
          { label: 'Tahun Ajaran', value: plan.tahun_ajaran },
        ].map(item => (
          <div key={item.label}>
            <p className="text-[10px] uppercase tracking-wider text-[#EAB6FF] mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-white">{item.value}</p>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-4">
          <p className="text-[10px] uppercase tracking-wider text-[#EAB6FF] mb-0.5">Tema</p>
          <p className="text-base font-bold text-white">{plan.tema}</p>
        </div>
      </div>

      {/* Main table — Senin–Kamis */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 mb-4">
        <table className="w-full text-xs border-collapse min-w-[700px]">
          <thead>
            <tr style={{ background: '#FDE047' }}>
              <th className="border border-gray-200 p-3 text-left font-bold w-28">Waktu</th>
              <th className="border border-gray-200 p-3 text-left font-bold w-40">Kegiatan</th>
              <th className="border border-gray-200 p-3 text-center font-bold w-8 text-[10px] leading-tight">
                Capaian & Tujuan
              </th>
              {['senin', 'selasa', 'rabu', 'kamis'].map(h => (
                <th key={h} className="border border-gray-200 p-3 text-center font-bold capitalize">{HARI_LABEL[h]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS_REGULAR.map((slot, si) => {
              const isKegiatanInti = slot.label === 'Kegiatan Inti'
              const isAlatBahan = slot.label.startsWith('Penutup')
              const isIstirahat = slot.label.startsWith('Istirahat')

              return (
                <tr key={si} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="border border-gray-200 p-3 font-mono text-[10px] text-gray-500 align-top whitespace-nowrap">
                    {slot.time}
                  </td>
                  <td className="border border-gray-200 p-3 text-gray-700 align-top leading-snug">
                    {slot.label}
                  </td>
                  <td className="border border-gray-200 p-1 w-8" style={{ background: '#FDE04733' }} />
                  {['senin', 'selasa', 'rabu', 'kamis'].map(h => {
                    const hd = plan.hari_data?.[h]
                    if (isIstirahat) {
                      return <td key={h} className="border border-gray-200 p-3 bg-gray-50" />
                    }
                    if (isKegiatanInti) {
                      return (
                        <td key={h} className="border border-gray-200 p-3 align-top text-xs">
                          {hd?.tema_kegiatan && (
                            <div
                              className="text-center font-bold text-[10px] uppercase tracking-wide py-1 px-2 rounded-md mb-1"
                              style={{ background: '#442F7811', color: '#442F78' }}
                            >
                              {hd.tema_kegiatan}
                            </div>
                          )}
                          {hd?.detail_kegiatan && (
                            <p className="text-center text-gray-700">{hd.detail_kegiatan}</p>
                          )}
                        </td>
                      )
                    }
                    if (isAlatBahan) {
                      return (
                        <td key={h} className="border border-gray-200 p-3 align-top text-xs text-gray-600">
                          {hd?.alat_bahan?.filter(x => x).join(', ') || '—'}
                        </td>
                      )
                    }
                    // CP rows
                    return (
                      <td key={h} className="border border-gray-200 p-3 align-top text-xs">
                        {hd?.cp_blocks?.filter(b => b.cp).map((block, i) => (
                          <div key={i} className="mb-2 last:mb-0">
                            <div
                              className="font-bold text-[10px] uppercase tracking-wide py-0.5 px-1.5 rounded mb-1 inline-block"
                              style={{ background: '#EAB6FF44', color: '#442F78' }}
                            >
                              CP: {block.cp}
                            </div>
                            <ul className="space-y-0.5">
                              {block.tujuan?.filter(t => t).map((t, ti) => (
                                <li key={ti} className="flex gap-1 text-gray-700 leading-snug">
                                  <span className="text-[#A78BFA] shrink-0">•</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Jumat table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 mb-6">
        <table className="w-full text-xs border-collapse min-w-[500px]">
          <thead>
            <tr style={{ background: '#FDE047' }}>
              <th className="border border-gray-200 p-3 text-left font-bold w-28">Waktu</th>
              <th className="border border-gray-200 p-3 text-left font-bold w-40">Kegiatan</th>
              <th className="border border-gray-200 p-3 w-8 text-[10px]">CP/Tujuan</th>
              <th className="border border-gray-200 p-3 text-center font-bold">Jumat</th>
            </tr>
          </thead>
          <tbody>
            {SLOTS_JUMAT.map((slot, si) => {
              const hd = plan.hari_data?.jumat
              const isKegiatanInti = slot.label === 'Kegiatan Inti'
              const isAlatBahan = slot.label.startsWith('Penutup')
              const isIstirahat = slot.label.startsWith('Istirahat')

              return (
                <tr key={si} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="border border-gray-200 p-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{slot.time}</td>
                  <td className="border border-gray-200 p-3 text-gray-700 leading-snug">{slot.label}</td>
                  <td className="border border-gray-200 p-1" style={{ background: '#FDE04733' }} />
                  {isIstirahat ? (
                    <td className="border border-gray-200 p-3 bg-gray-50" />
                  ) : isKegiatanInti ? (
                    <td className="border border-gray-200 p-3 align-top">
                      {hd?.tema_kegiatan && (
                        <div className="font-bold text-[10px] uppercase text-center py-1 px-2 rounded-md mb-1"
                          style={{ background: '#442F7811', color: '#442F78' }}
                        >
                          {hd.tema_kegiatan}
                        </div>
                      )}
                      {hd?.detail_kegiatan && <p className="text-center text-gray-700">{hd.detail_kegiatan}</p>}
                    </td>
                  ) : isAlatBahan ? (
                    <td className="border border-gray-200 p-3 text-gray-600">
                      {hd?.alat_bahan?.filter(x => x).join(', ') || '—'}
                    </td>
                  ) : (
                    <td className="border border-gray-200 p-3 align-top">
                      {hd?.cp_blocks?.filter(b => b.cp).map((block, i) => (
                        <div key={i} className="mb-2">
                          <div className="font-bold text-[10px] uppercase inline-block py-0.5 px-1.5 rounded mb-1"
                            style={{ background: '#EAB6FF44', color: '#442F78' }}
                          >
                            CP: {block.cp}
                          </div>
                          <ul className="space-y-0.5">
                            {block.tujuan?.filter(t => t).map((t, ti) => (
                              <li key={ti} className="flex gap-1 text-gray-700">
                                <span className="text-[#A78BFA]">•</span><span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer section */}
      {(plan.asmaul_husna || plan.doa_harian || plan.mutiara_hikmah) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 space-y-3 text-sm">
          <h3 className="font-bold text-[#442F78] text-xs uppercase tracking-wider mb-3">Muatan Harian</h3>
          {plan.asmaul_husna && (
            <div><span className="font-semibold text-gray-600">Asmaul Husna & Artinya: </span><span className="text-gray-700">{plan.asmaul_husna}</span></div>
          )}
          {plan.doa_harian && (
            <div><span className="font-semibold text-gray-600">Do'a Harian: </span><span className="text-gray-700">{plan.doa_harian}</span></div>
          )}
          {(plan.surah_pendek?.jilid1 || plan.surah_pendek?.jilid2 || plan.surah_pendek?.jilid3) && (
            <div>
              <span className="font-semibold text-gray-600">Surah Pendek: </span>
              <span className="text-gray-700">
                {[
                  plan.surah_pendek.jilid1 && `Jilid 1: ${plan.surah_pendek.jilid1}`,
                  plan.surah_pendek.jilid2 && `Jilid 2: ${plan.surah_pendek.jilid2}`,
                  plan.surah_pendek.jilid3 && `Jilid 3: ${plan.surah_pendek.jilid3}`,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {plan.mutiara_hikmah && (
            <div><span className="font-semibold text-gray-600">Mutiara Hikmah: </span><span className="text-gray-700">{plan.mutiara_hikmah}</span></div>
          )}
        </div>
      )}

      {/* Signature block */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <p className="text-gray-500 mb-12">Mengetahui,</p>
          <p className="text-gray-500 mb-1">Kepala PAUD Mutiara Bunda</p>
          <p className="font-semibold text-gray-700">Setya Harini, S.Pt., S.Pd</p>
        </div>
        <div>
          <p className="text-gray-500 mb-12">Wali Kelas</p>
          <div className="w-12 h-px bg-gray-300 mx-auto mb-1" />
          <p className="font-semibold text-gray-700">{waliKelas?.full_name || '—'}</p>
          {waliKelas?.jabatan && <p className="text-gray-400">{waliKelas.jabatan}</p>}
        </div>
        <div>
          <p className="text-gray-500 mb-12">PJ Kurikulum</p>
          <div className="w-12 h-px bg-gray-300 mx-auto mb-1" />
          <p className="font-semibold text-gray-700">Cahyaning Edytyas Sanubari</p>
        </div>
      </div>
    </div>
  )
}