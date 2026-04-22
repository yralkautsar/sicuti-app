'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useProfile } from '@/lib/ProfileContext'

const purple    = '#A78BFA'
const purple50  = 'rgba(167,139,250,0.10)'
const purple100 = '#EAB6FF'

// Portrait ID card: 5.4cm × 8.5cm → at 192dpi: 408px × 642px
const CARD_W = 408
const CARD_H = 642
const QR_SIZE = 260  // ~40% of card height

function buildCardHTML({ name, sub, label, qrDataUrl, logoDataUrl, qrCode }) {
  return `
    <div style="
      width:${CARD_W}px;height:${CARD_H}px;background:#fff;border-radius:18px;
      overflow:hidden;display:flex;flex-direction:column;
      font-family:'Segoe UI',Arial,sans-serif;position:relative;
    ">
      <div style="background:#442F78;height:12px;width:100%;flex-shrink:0;"></div>
      <div style="display:flex;align-items:center;gap:10px;padding:16px 20px 12px;flex-shrink:0;">
        ${logoDataUrl
          ? `<img src="${logoDataUrl}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;flex-shrink:0;" />`
          : `<div style="width:44px;height:44px;background:#ede9fe;border-radius:8px;flex-shrink:0;"></div>`
        }
        <div>
          <div style="font-size:8px;font-weight:700;color:#442F78;letter-spacing:.12em;text-transform:uppercase;">TK Karakter</div>
          <div style="font-size:10px;font-weight:800;color:#1e1b4b;letter-spacing:.02em;line-height:1.3;">Mutiara Bunda Bali</div>
        </div>
      </div>
      <div style="height:1px;background:#ede9fe;margin:0 20px;flex-shrink:0;"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:14px 20px;text-align:center;">
        <div style="display:inline-block;background:#EAB6FF;color:#442F78;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:10px;align-self:center;">${label}</div>
        <div style="font-size:21px;font-weight:800;color:#111827;line-height:1.2;word-break:break-word;">${name}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:5px;font-weight:500;">${sub}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;padding:0 20px 14px;flex-shrink:0;">
        <div style="width:${QR_SIZE}px;height:${QR_SIZE}px;background:#f9fafb;border:2px solid #ede9fe;border-radius:16px;display:flex;align-items:center;justify-content:center;padding:10px;">
          <img src="${qrDataUrl}" style="width:${QR_SIZE - 24}px;height:${QR_SIZE - 24}px;display:block;" />
        </div>
        <div style="font-size:7.5px;color:#9ca3af;font-family:monospace;letter-spacing:.06em;margin-top:7px;">${qrCode}</div>
      </div>
      <div style="background:#442F78;height:10px;width:100%;flex-shrink:0;"></div>
    </div>
  `
}

export default function QRMassalPage() {
  const { profile, setProfile } = useProfile()
  const router = useRouter()
  const [gurus,         setGurus]         = useState([])
  const [murids,        setMurids]        = useState([])
  const [classes,       setClasses]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [generating,    setGenerating]    = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [tab,           setTab]           = useState('guru')
  const [filterKelas,   setFilterKelas]   = useState('')
  const [selectedIds,   setSelectedIds]   = useState(new Set())
  const [qrMap,         setQrMap]         = useState({})
  const [logoDataUrl,   setLogoDataUrl]   = useState(null)

  useEffect(() => {
    fetch('/logoborder.png')
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onload = () => setLogoDataUrl(reader.result)
        reader.readAsDataURL(blob)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const init = async () => {
      const [{ data: g }, { data: m }, { data: c }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, jabatan, qr_code').order('full_name'),
        supabase.from('students').select('id, full_name, class_id, tahun_ajaran, qr_code, classes(nama_kelas)').eq('active', true).order('full_name'),
        supabase.from('classes').select('id, nama_kelas, tahun_ajaran').eq('active', true).order('nama_kelas'),
      ])
      setGurus(g || [])
      setMurids(m || [])
      setClasses(c || [])
      setLoading(false)
    }
    init()
  }, [])

  const currentList = tab === 'guru'
    ? gurus
    : murids.filter(m => !filterKelas || m.class_id === filterKelas)

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(
      selectedIds.size === currentList.length
        ? new Set()
        : new Set(currentList.map(x => x.id))
    )
  }

  const getItemMeta = (item) => {
    const isGuru = tab === 'guru'
    return {
      name:   item.full_name,
      sub:    isGuru
        ? (item.jabatan || 'Guru')
        : `${item.classes?.nama_kelas || ''} · ${item.tahun_ajaran || ''}`,
      label:  isGuru ? 'Kartu Absensi Guru' : 'Kartu Absensi Murid',
      qrCode: item.qr_code || item.id,
    }
  }

  const ensureQRs = async (items) => {
    const QRCode = (await import('qrcode')).default
    const newMap = { ...qrMap }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!newMap[item.id]) {
        newMap[item.id] = await QRCode.toDataURL(item.qr_code || item.id, {
          width: 400, margin: 1, color: { dark: '#000000', light: '#ffffff' }
        })
      }
      setProgress(Math.round(((i + 1) / items.length) * 55))
    }
    setQrMap(newMap)
    return newMap
  }

  const renderCardToPng = (item, map) => {
    return new Promise((resolve) => {
      const meta = getItemMeta(item)
      const html = buildCardHTML({ ...meta, qrDataUrl: map[item.id], logoDataUrl })
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
      container.innerHTML = html
      document.body.appendChild(container)
      const card = container.firstElementChild
      import('html2canvas').then(({ default: html2canvas }) => {
        html2canvas(card, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff',
          width: CARD_W, height: CARD_H,
        }).then(canvas => {
          document.body.removeChild(container)
          resolve(canvas.toDataURL('image/png'))
        })
      })
    })
  }

  const downloadSinglePng = async (item) => {
    setGenerating(true)
    setProgressLabel('Membuat QR...')
    setProgress(20)
    const QRCode = (await import('qrcode')).default
    const newMap = { ...qrMap }
    if (!newMap[item.id]) {
      newMap[item.id] = await QRCode.toDataURL(item.qr_code || item.id, {
        width: 400, margin: 1, color: { dark: '#000000', light: '#ffffff' }
      })
      setQrMap(newMap)
    }
    setProgress(50)
    setProgressLabel('Render kartu...')
    const pngUrl = await renderCardToPng(item, newMap)
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `QR_${item.full_name.replace(/\s+/g, '_')}.png`
    a.click()
    setProgress(100)
    setGenerating(false)
    setProgressLabel('')
  }

  const exportPDF = async () => {
    const toExport = currentList.filter(x => selectedIds.has(x.id))
    if (toExport.length === 0) return
    setGenerating(true)
    setProgress(0)
    setProgressLabel('Membuat QR codes...')
    const map = await ensureQRs(toExport)
    setProgressLabel('Render kartu...')
    const pngs = []
    for (let i = 0; i < toExport.length; i++) {
      const png = await renderCardToPng(toExport[i], map)
      pngs.push(png)
      setProgress(55 + Math.round(((i + 1) / toExport.length) * 35))
    }
    setProgressLabel('Menyusun PDF...')
    const { jsPDF } = await import('jspdf')

    // A4 landscape — kartu portrait 5.4×8.5 cm, susun 4 kolom × 2 baris = 8 kartu/halaman
    const PAGE_W   = 297, PAGE_H   = 210
    const CARD_WMM = 54,  CARD_HMM = 85
    const COLS = 4, ROWS = 2
    const GAP_X = (PAGE_W - COLS * CARD_WMM) / (COLS + 1)
    const GAP_Y = (PAGE_H - ROWS * CARD_HMM) / (ROWS + 1)
    const PER_PAGE = COLS * ROWS

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    pngs.forEach((png, idx) => {
      if (idx > 0 && idx % PER_PAGE === 0) pdf.addPage()
      const pos = idx % PER_PAGE
      const col = pos % COLS
      const row = Math.floor(pos / COLS)
      const x = GAP_X + col * (CARD_WMM + GAP_X)
      const y = GAP_Y + row * (CARD_HMM + GAP_Y)
      pdf.addImage(png, 'PNG', x, y, CARD_WMM, CARD_HMM)
    })
    pdf.save(`QR_${tab === 'guru' ? 'Guru' : 'Murid'}_${new Date().toISOString().slice(0,10)}.pdf`)
    setProgress(100)
    setGenerating(false)
    setProgressLabel('')
  }

  const allSelected = currentList.length > 0 && selectedIds.size === currentList.length

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: '#FAFAFA' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease both}
        input:focus,select:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${purple100};border-radius:4px}
      `}</style>

      <Sidebar profile={profile} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Print QR Massal</h1>
            <p className="text-xs text-gray-400">ID card portrait 5.4×8.5 cm · PNG per kartu atau PDF massal (8 kartu/halaman A4)</p>
          </div>
          <button
            onClick={exportPDF}
            disabled={selectedIds.size === 0 || generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: selectedIds.size === 0 || generating ? '#a78bfa' : purple,
              boxShadow: selectedIds.size > 0 ? `0 4px 14px ${purple}30` : 'none',
              cursor: selectedIds.size === 0 || generating ? 'not-allowed' : 'pointer'
            }}>
            {generating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                {progressLabel || `${progress}%`}
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <polyline points="9 15 12 18 15 15"/>
                </svg>
                Export PDF {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </>
            )}
          </button>
        </header>

        {generating && (
          <div className="h-1 bg-gray-100 flex-shrink-0">
            <div className="h-1 transition-all duration-300" style={{ width: `${progress}%`, background: purple }}/>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Tabs + filter + select all */}
          <div className="fu flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
              {[
                { key: 'guru',  label: `Guru (${gurus.length})` },
                { key: 'murid', label: `Murid (${murids.length})` },
              ].map(t => (
                <button key={t.key} onClick={() => { setTab(t.key); setSelectedIds(new Set()) }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={tab === t.key
                    ? { background: 'white', color: purple, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                    : { color: '#6b7280' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'murid' && (
              <select value={filterKelas}
                onChange={e => { setFilterKelas(e.target.value); setSelectedIds(new Set()) }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none"
                style={{ color: filterKelas ? '#111' : '#9ca3af' }}>
                <option value="">Semua Kelas</option>
                {classes.map(k => (
                  <option key={k.id} value={k.id}>{k.nama_kelas} — {k.tahun_ajaran}</option>
                ))}
              </select>
            )}

            <button onClick={selectAll}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{
                border: `1.5px solid ${allSelected ? purple : '#e5e7eb'}`,
                background: allSelected ? purple50 : 'white',
                color: allSelected ? purple : '#6b7280'
              }}>
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{ border: `2px solid ${allSelected ? purple : '#d1d5db'}`, background: allSelected ? purple : 'white' }}>
                {allSelected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
              </div>
              {allSelected ? 'Batalkan semua' : `Pilih semua (${currentList.length})`}
            </button>
          </div>

          {/* Info bar */}
          <div className="fu mb-5 p-4 rounded-2xl flex items-center gap-4"
            style={{ background: purple50, border: `1px solid ${purple100}` }}>
            {/* Mini portrait card preview */}
            <div className="flex-shrink-0 rounded-lg overflow-hidden flex flex-col"
              style={{ width: 46, height: 72, border: `2px solid ${purple100}`, background: 'white' }}>
              <div style={{ height: 5, background: purple, flexShrink: 0 }}/>
              <div style={{ padding: '4px 5px', display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, background: purple100, borderRadius: 2, flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 2, background: purple100, borderRadius: 1, marginBottom: 1.5, width: '90%' }}/>
                  <div style={{ height: 1.5, background: '#e5e7eb', borderRadius: 1, width: '60%' }}/>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 26, height: 26, background: '#f3f4f6', borderRadius: 3, border: `1px solid ${purple100}` }}/>
              </div>
              <div style={{ height: 4, background: purple, flexShrink: 0 }}/>
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: purple }}>Template Portrait · 5.4 × 8.5 cm</div>
              <div className="text-xs mb-1" style={{ color: '#7c3aed' }}>Logo sekolah · Nama · Kelas/Jabatan · QR Code (~40% kartu)</div>
              <div className="text-xs" style={{ color: '#9ca3af' }}>
                <span className="font-semibold" style={{ color: '#6b7280' }}>PNG</span> — download 1 kartu via tombol di tiap item &nbsp;·&nbsp;
                <span className="font-semibold" style={{ color: '#6b7280' }}>PDF</span> — pilih beberapa → Export PDF (4×2 per halaman A4)
              </div>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${purple100} ${purple100} ${purple100} ${purple}` }}/>
            </div>
          ) : (
            <div className="fu grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {currentList.map(item => {
                const selected = selectedIds.has(item.id)
                const hasQR    = !!qrMap[item.id]
                const sub      = tab === 'guru'
                  ? (item.jabatan || 'Guru')
                  : `${item.classes?.nama_kelas || '—'}`

                return (
                  <div key={item.id} className="rounded-2xl border transition-all"
                    style={{
                      border: `2px solid ${selected ? purple : '#e5e7eb'}`,
                      background: selected ? purple50 : 'white',
                    }}>
                    <button className="w-full text-left p-4 flex items-center gap-3"
                      onClick={() => toggleSelect(item.id)}>
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{ border: `2px solid ${selected ? purple : '#d1d5db'}`, background: selected ? purple : 'white' }}>
                        {selected && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: selected ? purple : '#9ca3af' }}>
                        {item.full_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.full_name}</div>
                        <div className="text-xs text-gray-400 truncate">{sub}</div>
                        {hasQR && <div className="text-xs mt-0.5 font-medium" style={{ color: '#16a34a' }}>✓ QR siap</div>}
                      </div>
                    </button>
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => downloadSinglePng(item)}
                        disabled={generating}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: generating ? '#f3f4f6' : purple50,
                          color: generating ? '#9ca3af' : purple,
                          cursor: generating ? 'not-allowed' : 'pointer'
                        }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download PNG
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}