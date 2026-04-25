'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

// Slot waktu standar per tipe hari
const SLOTS_REGULAR = [
  { time:'07.30–07.45', label:'Mengaji Tilawati & Hafalan',   type:'standard' },
  { time:'07.45–08.00', label:"Sholat Dhuha",                 type:'standard' },
  { time:'08.00–08.45', label:'Circle Morning',               type:'standard' },
  { time:'08.45–09.05', label:'Jurnal',                       type:'standard' },
  { time:'09.00–09.25', label:'Pilar Karakter',               type:'standard' },
  { time:'09.25–10.00', label:'Istirahat',                    type:'break'    },
  { time:'10.00–10.45', label:'Kegiatan Inti',                type:'main'     },
  { time:'10.45–11.00', label:'Penutup',                      type:'standard' },
]

const SLOTS_JUMAT = [
  { time:'07.30–08.00', label:'Fun English',                  type:'standard' },
  { time:'08.00–08.45', label:'Circle Morning',               type:'standard' },
  { time:'08.45–09.15', label:'Istirahat',                    type:'break'    },
  { time:'09.15–09.45', label:'Kegiatan Inti',                type:'main'     },
  { time:'09.45–10.00', label:'Penutup',                      type:'standard' },
]

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
  return plans.find(p => p.periode_start <= today && p.periode_end >= today)
    || plans[plans.length - 1]
}

// ── Day Card ────────────────────────────────────────────────
function DayCard({ hari, data, tanggal, isJumat }) {
  const slots = isJumat ? SLOTS_JUMAT : SLOTS_REGULAR
  const alatBahan = data?.alat_bahan?.filter(x => x.trim()) || []
  const tujuanAll = data?.cp_blocks
    ?.filter(b => b.cp)
    .flatMap(b => b.tujuan?.filter(t => t.trim()) || []) || []

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
            color: isJumat ? 'rgba(255,255,255,0.7)' : C.inkDim,
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
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
          }}>
            Jadwal Khusus
          </span>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: '4px 0 8px' }}>
        {slots.map((slot, si) => {
          const isMain   = slot.type === 'main'
          const isBreak  = slot.type === 'break'
          const isLast   = si === slots.length - 1

          return (
            <div key={si} style={{
              display: 'flex',
              gap: 0,
              position: 'relative',
            }}>
              {/* Time column */}
              <div style={{
                width: 86,
                flexShrink: 0,
                padding: '10px 0 10px 20px',
                display: 'flex',
                alignItems: isMain ? 'flex-start' : 'center',
                paddingTop: isMain ? 12 : 10,
              }}>
                <span style={{
                  fontSize: 11,
                  fontFamily: "'DM Mono', monospace",
                  color: isMain ? C.primary : C.inkFaint,
                  fontWeight: isMain ? 500 : 400,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}>
                  {slot.time}
                </span>
              </div>

              {/* Connector line + dot */}
              <div style={{
                width: 24,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: isMain ? 16 : 14,
              }}>
                {/* Dot */}
                <div style={{
                  width:  isMain ? 10 : isBreak ? 6 : 7,
                  height: isMain ? 10 : isBreak ? 6 : 7,
                  borderRadius: '50%',
                  background: isMain ? C.primary : isBreak ? C.border : '#E5E4E2',
                  border: isMain ? `2px solid ${C.accent}` : 'none',
                  flexShrink: 0,
                  zIndex: 1,
                }} />
                {/* Line below dot */}
                {!isLast && (
                  <div style={{
                    flex: 1,
                    width: 1.5,
                    background: '#E7E5E4',
                    marginTop: 3,
                    minHeight: 16,
                  }} />
                )}
              </div>

              {/* Content column */}
              <div style={{
                flex: 1,
                padding: isMain ? '10px 20px 16px 8px' : '9px 20px 9px 8px',
                borderBottom: !isLast ? `1px solid transparent` : 'none',
              }}>
                {isBreak ? (
                  <span style={{
                    fontSize: 13,
                    color: C.inkFaint,
                    fontStyle: 'italic',
                  }}>
                    {slot.label}
                  </span>
                ) : isMain ? (
                  /* Kegiatan Inti — highlighted */
                  <div>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: C.primary,
                      marginBottom: 5,
                    }}>
                      Kegiatan Inti
                    </p>
                    {data?.tema_kegiatan ? (
                      <>
                        <p style={{
                          fontFamily: "'Rubik', sans-serif",
                          fontWeight: 600,
                          fontSize: 14,
                          color: C.accent,
                          marginBottom: data.detail_kegiatan ? 2 : 8,
                        }}>
                          {data.tema_kegiatan}
                        </p>
                        {data.detail_kegiatan && (
                          <p style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.5, marginBottom: 10 }}>
                            {data.detail_kegiatan}
                          </p>
                        )}
                        {/* Alat & Bahan */}
                        {alatBahan.length > 0 && (
                          <div style={{
                            background: 'rgba(167,139,250,0.07)',
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}>
                            <p style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.07em',
                              textTransform: 'uppercase',
                              color: C.accent,
                              marginBottom: 7,
                            }}>
                              Yang Perlu Disiapkan
                            </p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap: 5 }}>
                              {alatBahan.map((item, i) => (
                                <span key={i} style={{
                                  display: 'inline-block',
                                  background: C.surface,
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 20,
                                  padding: '2px 10px',
                                  fontSize: 12,
                                  color: C.accent,
                                  fontWeight: 500,
                                }}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Tujuan — collapsible */}
                        {tujuanAll.length > 0 && (
                          <details style={{ marginTop: 10 }}>
                            <summary style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.inkFaint,
                              listStyle: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}>
                              <span style={{ fontSize:10, color: C.primary }}>▸</span>
                              Tujuan Pembelajaran ({tujuanAll.length})
                            </summary>
                            <ul style={{ marginTop: 8, paddingLeft: 2, display:'flex', flexDirection:'column', gap: 5 }}>
                              {tujuanAll.map((t, i) => (
                                <li key={i} style={{
                                  display:'flex', gap:7, fontSize:12,
                                  color: C.inkDim, lineHeight:1.5, listStyle:'none',
                                }}>
                                  <span style={{ color: C.primary, flexShrink:0 }}>—</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: C.inkFaint, fontStyle:'italic' }}>
                        Kegiatan belum diisi
                      </p>
                    )}
                  </div>
                ) : (
                  /* Standard slot */
                  <span style={{
                    fontSize: 13,
                    color: C.inkDim,
                    lineHeight: 1.4,
                  }}>
                    {slot.label}
                  </span>
                )}
              </div>
            </div>
          )
        })}
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
      <p style={{ color: C.inkFaint, fontSize:14, textAlign:'center' }}>Link tidak valid atau kelas sudah tidak aktif.</p>
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
          <button onClick={handleCopy} style={{
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
          }}>
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
                const isActive = activePlan?.id === p.id
                return (
                  <button key={p.id} onClick={() => setActivePlan(p)} style={{
                    padding: '5px 14px',
                    borderRadius: 20,
                    border: `1px solid ${isActive ? C.accent : C.border}`,
                    background: isActive ? C.accent : C.surface,
                    color: isActive ? '#fff' : C.inkDim,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
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