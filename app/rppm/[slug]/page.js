'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SCHOOL = 'PAUD Mutiara Bunda'
const purple = '#442F78'
const purpleLight = '#A78BFA'
const purpleBg = 'rgba(167,139,250,0.1)'

const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat']
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: 'Jumat' }

const SLOTS_REGULAR = [
  { time: '07.30–07.45', label: 'Mengaji Tilawati & Hafalan' },
  { time: '07.45–08.00', label: "Sholat Dhuha" },
  { time: '08.00–08.45', label: "Circle Morning" },
  { time: '08.45–09.05', label: 'Jurnal' },
  { time: '09.00–09.25', label: 'Pilar Karakter' },
  { time: '09.25–10.00', label: 'Istirahat' },
  { time: '10.00–10.45', label: 'Kegiatan Inti' },
  { time: '10.45–11.00', label: 'Penutup' },
]

const SLOTS_JUMAT = [
  { time: '07.30–08.00', label: 'Fun English' },
  { time: '08.00–08.45', label: "Circle Morning" },
  { time: '08.45–09.15', label: 'Istirahat' },
  { time: '09.15–09.45', label: 'Kegiatan Inti' },
  { time: '09.45–10.00', label: 'Penutup' },
]

function formatPeriode(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opt = { day: 'numeric', month: 'long' }
  return `${s.toLocaleDateString('id-ID', opt)} – ${e.toLocaleDateString('id-ID', { ...opt, year: 'numeric' })}`
}

// Cari minggu aktif berdasarkan tanggal hari ini
function findActiveMinggu(plans) {
  if (!plans?.length) return null
  const today = new Date().toISOString().split('T')[0]
  const active = plans.find(p => p.periode_start <= today && p.periode_end >= today)
  return active || plans[plans.length - 1]
}

export default function PublicRppmPage() {
  const { slug } = useParams()
  const searchParams = useSearchParams()

  const [kelas, setKelas] = useState(null)
  const [plans, setPlans] = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  // Query params dari URL share
  const qTahun = searchParams.get('tahun') || '2025/2026'
  const qSemester = Number(searchParams.get('semester') || 2)
  const qMinggu = Number(searchParams.get('minggu') || 0)

  useEffect(() => {
    loadData()
  }, [slug, qTahun, qSemester])

  async function loadData() {
    setLoading(true)

    // 1. Cari kelas by slug + active
    const { data: kelasData } = await supabase
      .from('classes')
      .select('id, nama_kelas, slug, tahun_ajaran, profiles:wali_kelas_id(full_name)')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (!kelasData) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setKelas(kelasData)

    // 2. Load semua RPPM kelas ini untuk tahun/semester yang diminta
    const { data: plansData } = await supabase
      .from('weekly_plans')
      .select('id, minggu_ke, semester, tahun_ajaran, periode_start, periode_end, pilar_konsep, tema, hari_data, asmaul_husna, doa_harian, surah_pendek, mutiara_hikmah')
      .eq('class_id', kelasData.id)
      .eq('tahun_ajaran', qTahun)
      .eq('semester', qSemester)
      .order('minggu_ke', { ascending: true })

    const list = plansData || []
    setPlans(list)

    // 3. Tentukan plan yang aktif ditampilkan
    if (qMinggu) {
      const specific = list.find(p => p.minggu_ke === qMinggu)
      setActivePlan(specific || findActiveMinggu(list))
    } else {
      setActivePlan(findActiveMinggu(list))
    }

    setLoading(false)
  }

  async function handleCopyLink() {
    if (!activePlan) return
    const url = `${window.location.origin}/rppm/${slug}?tahun=${encodeURIComponent(activePlan.tahun_ajaran)}&semester=${activePlan.semester}&minggu=${activePlan.minggu_ke}`
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Render helpers ──────────────────────────────────────
  function renderCPContent(hd) {
    if (!hd) return <span className="text-gray-300 text-xs">—</span>
    return (
      <div className="space-y-2">
        {hd.cp_blocks?.filter(b => b.cp).map((block, i) => (
          <div key={i}>
            <div className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded inline-block mb-1"
              style={{ background: '#EAB6FF44', color: purple }}>
              {block.cp}
            </div>
            <ul className="space-y-0.5">
              {block.tujuan?.filter(t => t).map((t, ti) => (
                <li key={ti} className="flex gap-1 text-xs text-gray-700 leading-snug">
                  <span style={{ color: purpleLight }} className="shrink-0 mt-0.5">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {hd.tema_kegiatan && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-[10px] font-bold uppercase text-center py-1 rounded mb-1"
              style={{ background: '#442F7811', color: purple }}>
              {hd.tema_kegiatan}
            </div>
            {hd.detail_kegiatan && <p className="text-xs text-center text-gray-600">{hd.detail_kegiatan}</p>}
            {hd.alat_bahan?.filter(x => x).length > 0 && (
              <p className="text-[10px] text-gray-400 text-center mt-1">
                {hd.alat_bahan.filter(x => x).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Not found ──
  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="text-4xl mb-2">📋</div>
      <p className="font-bold text-gray-700">Kelas tidak ditemukan</p>
      <p className="text-sm text-gray-400 text-center">Link yang kamu buka tidak valid atau kelas sudah tidak aktif.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400&display=swap');`}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logoborder.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-xs leading-tight truncate" style={{ color: purple }}>{SCHOOL}</div>
              <div className="text-xs truncate" style={{ color: purpleLight, fontFamily: 'DM Mono' }}>
                {kelas?.nama_kelas || '...'} · RPPM
              </div>
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: copied ? purple : purpleBg,
              color: copied ? '#fff' : purple,
            }}
          >
            {copied ? (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Tersalin!</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Bagikan</>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Minggu selector */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: purpleLight }}>
              Pilih Minggu — {qTahun} Semester {qSemester}
            </p>
            <div className="flex flex-wrap gap-2">
              {plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePlan(p)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: activePlan?.id === p.id ? purple : purpleBg,
                    color: activePlan?.id === p.id ? '#fff' : purple,
                  }}
                >
                  Minggu {p.minggu_ke}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${purpleBg} ${purpleBg} ${purpleBg} ${purple}` }} />
          </div>
        ) : !activePlan ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-gray-500 text-sm">Belum ada RPPM untuk periode ini.</p>
          </div>
        ) : (
          <>
            {/* Metadata */}
            <div className="rounded-2xl p-5 text-white grid grid-cols-2 sm:grid-cols-3 gap-3"
              style={{ background: `linear-gradient(135deg, ${purple}, #6B46C1)` }}>
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">Tema</p>
                <p className="text-lg font-bold">{activePlan.tema}</p>
              </div>
              {[
                { label: 'Kelompok', value: kelas?.nama_kelas },
                { label: 'Semester / Minggu', value: `${activePlan.semester} / ${activePlan.minggu_ke}` },
                { label: 'Pilar / Konsep', value: activePlan.pilar_konsep || '—' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">Periode</p>
                <p className="text-sm font-semibold">{formatPeriode(activePlan.periode_start, activePlan.periode_end)}</p>
              </div>
              {kelas?.profiles?.full_name && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">Wali Kelas</p>
                  <p className="text-sm font-semibold">{kelas.profiles.full_name}</p>
                </div>
              )}
            </div>

            {/* Table Senin–Kamis */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: purpleLight }}>
                Senin – Kamis
              </p>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr style={{ background: '#FDE047' }}>
                      <th className="border border-gray-200 p-2 text-left font-bold w-24">Waktu</th>
                      <th className="border border-gray-200 p-2 text-left font-bold w-32">Kegiatan</th>
                      {['senin','selasa','rabu','kamis'].map(h => (
                        <th key={h} className="border border-gray-200 p-2 text-center font-bold capitalize">{HARI_LABEL[h]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SLOTS_REGULAR.map((slot, si) => {
                      const isIstirahat = slot.label === 'Istirahat'
                      return (
                        <tr key={si} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="border border-gray-200 p-2 font-mono text-[9px] text-gray-400 whitespace-nowrap align-top">{slot.time}</td>
                          <td className="border border-gray-200 p-2 text-gray-600 align-top leading-snug">{slot.label}</td>
                          {['senin','selasa','rabu','kamis'].map(h => (
                            isIstirahat
                              ? <td key={h} className="border border-gray-200 p-2 bg-gray-50" />
                              : <td key={h} className="border border-gray-200 p-2 align-top">
                                  {renderCPContent(activePlan.hari_data?.[h])}
                                </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Jumat */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: purpleLight }}>
                Jumat
              </p>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-xs border-collapse min-w-[400px]">
                  <thead>
                    <tr style={{ background: '#FDE047' }}>
                      <th className="border border-gray-200 p-2 text-left font-bold w-24">Waktu</th>
                      <th className="border border-gray-200 p-2 text-left font-bold w-32">Kegiatan</th>
                      <th className="border border-gray-200 p-2 text-center font-bold">Jumat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SLOTS_JUMAT.map((slot, si) => {
                      const isIstirahat = slot.label === 'Istirahat'
                      return (
                        <tr key={si} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="border border-gray-200 p-2 font-mono text-[9px] text-gray-400 whitespace-nowrap align-top">{slot.time}</td>
                          <td className="border border-gray-200 p-2 text-gray-600 align-top leading-snug">{slot.label}</td>
                          {isIstirahat
                            ? <td className="border border-gray-200 p-2 bg-gray-50" />
                            : <td className="border border-gray-200 p-2 align-top">
                                {renderCPContent(activePlan.hari_data?.jumat)}
                              </td>
                          }
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Muatan Harian */}
            {(activePlan.asmaul_husna || activePlan.doa_harian || activePlan.mutiara_hikmah ||
              activePlan.surah_pendek?.jilid_paud || activePlan.surah_pendek?.jilid1) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5 text-sm">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: purpleLight }}>Muatan Harian</p>
                {activePlan.asmaul_husna && (
                  <div><span className="font-semibold text-gray-600">Asmaul Husna: </span><span className="text-gray-600">{activePlan.asmaul_husna}</span></div>
                )}
                {activePlan.doa_harian && (
                  <div><span className="font-semibold text-gray-600">Do'a Harian: </span><span className="text-gray-600">{activePlan.doa_harian}</span></div>
                )}
                {(activePlan.surah_pendek?.jilid_paud || activePlan.surah_pendek?.jilid1 || activePlan.surah_pendek?.jilid2 || activePlan.surah_pendek?.jilid3) && (
                  <div>
                    <span className="font-semibold text-gray-600">Surah Pendek: </span>
                    <span className="text-gray-600">
                      {[
                        activePlan.surah_pendek.jilid_paud && `Jilid PAUD: ${activePlan.surah_pendek.jilid_paud}`,
                        activePlan.surah_pendek.jilid1 && `Jilid 1: ${activePlan.surah_pendek.jilid1}`,
                        activePlan.surah_pendek.jilid2 && `Jilid 2: ${activePlan.surah_pendek.jilid2}`,
                        activePlan.surah_pendek.jilid3 && `Jilid 3: ${activePlan.surah_pendek.jilid3}`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
                {activePlan.mutiara_hikmah && (
                  <div><span className="font-semibold text-gray-600">Mutiara Hikmah: </span><span className="text-gray-600">{activePlan.mutiara_hikmah}</span></div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-300" style={{ fontFamily: 'DM Mono' }}>SiCuti · {SCHOOL}</p>
        </div>
      </div>
    </div>
  )
}