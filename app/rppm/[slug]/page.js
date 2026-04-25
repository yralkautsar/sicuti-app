'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Constants ──────────────────────────────────────────────
const SCHOOL = 'PAUD Mutiara Bunda'
const C = {
  accent:    '#442F78',
  primary:   '#A78BFA',
  border:    '#EAB6FF',
  bg:        '#FAFAFA',
  surface:   '#FFFFFF',
  inkMid:    '#44403C',
  inkDim:    '#78716C',
  inkFaint:  '#A8A29E',
  yellowHdr: '#FDE047',
}

const HARI_LIST  = ['senin','selasa','rabu','kamis','jumat']
const HARI_LABEL = { senin:'Senin', selasa:'Selasa', rabu:'Rabu', kamis:'Kamis', jumat:"Jum'at" }

function getDayDates(periodeStart) {
  if (!periodeStart) return {}
  const monday = new Date(periodeStart)
  const map = {}
  HARI_LIST.forEach((h, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    map[h] = d.toLocaleDateString('id-ID', { day:'numeric', month:'long' })
  })
  return map
}

function formatPeriode(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opt = { day:'numeric', month:'long' }
  return `${s.toLocaleDateString('id-ID', opt)} – ${e.toLocaleDateString('id-ID', { ...opt, year:'numeric' })}`
}

function findActivePlan(plans) {
  if (!plans?.length) return null
  const today = new Date().toISOString().split('T')[0]
  return plans.find(p => p.periode_start <= today && p.periode_end >= today) || plans[plans.length - 1]
}

// ── Day Card ────────────────────────────────────────────────
function DayCard({ hari, data, tanggal, isJumat }) {
  if (!data) return null

  const tujuanAll = data.cp_blocks
    ?.filter(b => b.cp)
    .flatMap(b => b.tujuan?.filter(t => t.trim()) || []) || []

  const alatBahan = data.alat_bahan?.filter(x => x.trim()) || []
  const hasContent = data.tema_kegiatan || data.detail_kegiatan || tujuanAll.length > 0
  if (!hasContent) return null

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      overflow: 'hidden',
      fontFamily: "'Karla', sans-serif",
    }}>
      {/* Day header */}
      <div style={{
        background: isJumat ? C.accent : C.yellowHdr,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
      }}>
        <span style={{
          fontFamily: "'Rubik', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: isJumat ? '#fff' : C.accent,
        }}>
          {HARI_LABEL[hari]}
        </span>
        {tanggal && (
          <span style={{
            fontSize: 13,
            color: isJumat ? 'rgba(255,255,255,0.75)' : C.inkDim,
          }}>
            {tanggal}
          </span>
        )}
        {isJumat && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
          }}>
            Jadwal Khusus
          </span>
        )}
      </div>

      <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap: 16 }}>

        {/* Kegiatan Inti */}
        {(data.tema_kegiatan || data.detail_kegiatan) && (
          <div>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.primary,
              marginBottom: 6,
            }}>
              Kegiatan Hari Ini
            </p>
            {data.tema_kegiatan && (
              <p style={{
                fontFamily: "'Rubik', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: C.accent,
                marginBottom: data.detail_kegiatan ? 3 : 0,
              }}>
                {data.tema_kegiatan}
              </p>
            )}
            {data.detail_kegiatan && (
              <p style={{ fontSize: 14, color: C.inkMid, lineHeight: 1.5 }}>
                {data.detail_kegiatan}
              </p>
            )}
          </div>
        )}

        {/* Alat & Bahan */}
        {alatBahan.length > 0 && (
          <div style={{
            background: 'rgba(167,139,250,0.08)',
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '12px 16px',
          }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.accent,
              marginBottom: 8,
            }}>
              Yang Perlu Disiapkan
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
              {alatBahan.map((item, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 20,
                  padding: '3px 12px',
                  fontSize: 13,
                  color: C.accent,
                  fontWeight: 500,
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tujuan Pembelajaran — collapsible, secondary */}
        {tujuanAll.length > 0 && (
          <details>
            <summary style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.inkFaint,
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{
                fontSize: 10,
                color: C.primary,
                display: 'inline-block',
                width: 16,
                textAlign: 'center',
              }}>▸</span>
              Tujuan Pembelajaran ({tujuanAll.length})
            </summary>
            <ul style={{ marginTop: 10, paddingLeft: 4, display:'flex', flexDirection:'column', gap: 6 }}>
              {tujuanAll.map((t, i) => (
                <li key={i} style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: 13,
                  color: C.inkDim,
                  lineHeight: 1.5,
                  listStyle: 'none',
                }}>
                  <span style={{ color: C.primary, flexShrink: 0 }}>—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────
export default function PublicRppmPage() {
  const { slug }     = useParams()
  const searchParams = useSearchParams()

  const [kelas,      setKelas]      = useState(null)
  const [plans,      setPlans]      = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [copied,     setCopied]     = useState(false)

  const qTahun    = searchParams.get('tahun')    || '2025/2026'
  const qSemester = Number(searchParams.get('semester') || 2)
  const qMinggu   = Number(searchParams.get('minggu')   || 0)

  useEffect(() => { loadData() }, [slug, qTahun, qSemester])

  async function loadData() {
    setLoading(true)
    const { data: kelasData } = await supabase
      .from('classes')
      .select('id, nama_kelas, slug, tahun_ajaran, profiles:wali_kelas_id(full_name)')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (!kelasData) { setNotFound(true); setLoading(false); return }
    setKelas(kelasData)

    const { data: plansData } = await supabase
      .from('weekly_plans')
      .select('id, minggu_ke, semester, tahun_ajaran, periode_start, periode_end, pilar_konsep, tema, hari_data, asmaul_husna, doa_harian, surah_pendek, mutiara_hikmah')
      .eq('class_id', kelasData.id)
      .eq('tahun_ajaran', qTahun)
      .eq('semester', qSemester)
      .order('minggu_ke', { ascending: true })

    const list = plansData || []
    setPlans(list)
    setActivePlan(qMinggu
      ? (list.find(p => p.minggu_ke === qMinggu) || findActivePlan(list))
      : findActivePlan(list)
    )
    setLoading(false)
  }

  async function handleCopy() {
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

  const dayDates = activePlan ? getDayDates(activePlan.periode_start) : {}

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:32, fontFamily:"'Karla', sans-serif" }}>
      <p style={{ fontWeight:700, color: C.inkMid, fontSize:16 }}>Halaman tidak ditemukan</p>
      <p style={{ color: C.inkFaint, fontSize:14, textAlign:'center' }}>Link yang kamu buka tidak valid atau kelas sudah tidak aktif.</p>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background: C.bg, fontFamily:"'Karla', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Karla:wght@300;400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        details > summary::-webkit-details-marker { display: none; }
      `}</style>

      {/* Header */}
      <header style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <img src="/logoborder.png" alt="Logo" style={{ width:32, height:32, objectFit:'contain', flexShrink:0 }} />
            <div style={{ minWidth:0 }}>
              <p style={{ fontFamily:"'Rubik', sans-serif", fontWeight:700, fontSize:12, color: C.accent }}>
                {SCHOOL}
              </p>
              <p style={{ fontSize:11, color: C.primary, fontFamily:"'DM Mono', monospace" }}>
                {kelas?.nama_kelas || '...'} · RPPM
              </p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              padding: '7px 16px',
              borderRadius: 10,
              border: `1px solid ${copied ? C.accent : C.border}`,
              background: copied ? C.accent : C.surface,
              color: copied ? '#fff' : C.accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Karla', sans-serif",
              transition: 'all 0.2s',
            }}
          >
            {copied ? 'Tersalin!' : 'Bagikan'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px 48px' }}>

        {/* Minggu selector */}
        {plans.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color: C.inkFaint, marginBottom:8 }}>
              Pilih Minggu — {qTahun} Semester {qSemester}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {plans.map(p => {
                const active = activePlan?.id === p.id
                return (
                  <button key={p.id} onClick={() => setActivePlan(p)} style={{
                    padding: '5px 14px',
                    borderRadius: 20,
                    border: `1px solid ${active ? C.accent : C.border}`,
                    background: active ? C.accent : C.surface,
                    color: active ? '#fff' : C.inkDim,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: "'Karla', sans-serif",
                  }}>
                    Minggu {p.minggu_ke}
                    {p.periode_start && (
                      <span style={{ fontSize:11, marginLeft:6, opacity:0.6 }}>
                        {new Date(p.periode_start).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:'64px 0', color: C.inkFaint, fontSize:14 }}>Memuat...</div>
        ) : !activePlan ? (
          <div style={{ textAlign:'center', padding:'64px 0' }}>
            <p style={{ color: C.inkFaint, fontSize:14 }}>Belum ada RPPM untuk periode ini.</p>
          </div>
        ) : (
          <>
            {/* Metadata */}
            <div style={{
              background: `linear-gradient(135deg, ${C.accent}, #6B46C1)`,
              borderRadius: 20,
              padding: '20px 24px',
              marginBottom: 20,
              color: '#fff',
            }}>
              <p style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.6, marginBottom:4 }}>
                Tema Minggu Ini
              </p>
              <p style={{ fontFamily:"'Rubik', sans-serif", fontWeight:700, fontSize:20, lineHeight:1.3, marginBottom:16 }}>
                {activePlan.tema}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'10px 24px' }}>
                {[
                  { label:'Kelompok',       value: kelas?.nama_kelas },
                  { label:'Periode',        value: formatPeriode(activePlan.periode_start, activePlan.periode_end) },
                  { label:'Pilar / Konsep', value: activePlan.pilar_konsep || '—' },
                  { label:'Wali Kelas',     value: kelas?.profiles?.full_name || '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ fontSize:10, opacity:0.6, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>{item.label}</p>
                    <p style={{ fontSize:13, fontWeight:600, lineHeight:1.4 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Day cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              {HARI_LIST.map(h => (
                <DayCard
                  key={h}
                  hari={h}
                  data={activePlan.hari_data?.[h]}
                  tanggal={dayDates[h]}
                  isJumat={h === 'jumat'}
                />
              ))}
            </div>

            {/* Muatan Harian */}
            {(activePlan.asmaul_husna || activePlan.doa_harian || activePlan.mutiara_hikmah ||
              activePlan.surah_pendek?.jilid_paud || activePlan.surah_pendek?.jilid1) && (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '18px 20px',
              }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color: C.primary, marginBottom:14 }}>
                  Hafalan &amp; Muatan Harian
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {activePlan.asmaul_husna && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color: C.inkFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Asmaul Husna</p>
                      <p style={{ fontSize:14, color: C.inkMid, lineHeight:1.5 }}>{activePlan.asmaul_husna}</p>
                    </div>
                  )}
                  {activePlan.doa_harian && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color: C.inkFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Do'a Harian</p>
                      <p style={{ fontSize:14, color: C.inkMid }}>{activePlan.doa_harian}</p>
                    </div>
                  )}
                  {(activePlan.surah_pendek?.jilid_paud || activePlan.surah_pendek?.jilid1 ||
                    activePlan.surah_pendek?.jilid2 || activePlan.surah_pendek?.jilid3) && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color: C.inkFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Surah Pendek</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        {[
                          ['Jilid PAUD', activePlan.surah_pendek.jilid_paud],
                          ['Jilid 1',    activePlan.surah_pendek.jilid1],
                          ['Jilid 2',    activePlan.surah_pendek.jilid2],
                          ['Jilid 3',    activePlan.surah_pendek.jilid3],
                        ].filter(([, v]) => v).map(([label, val]) => (
                          <div key={label} style={{ display:'flex', gap:8, alignItems:'baseline' }}>
                            <span style={{ fontSize:12, color: C.inkFaint, minWidth:72 }}>{label}</span>
                            <span style={{ fontSize:14, color: C.inkMid, fontWeight:500 }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activePlan.mutiara_hikmah && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color: C.inkFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Mutiara Hikmah</p>
                      <p style={{ fontSize:14, color: C.inkMid }}>{activePlan.mutiara_hikmah}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign:'center', fontSize:11, color: C.inkFaint, marginTop:32, fontFamily:"'DM Mono', monospace" }}>
          SiCuti · {SCHOOL}
        </p>
      </div>
    </div>
  )
}