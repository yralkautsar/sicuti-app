'use client'

import { useState } from 'react'

// ── Constants ─────────────────────────────────────────────
const TAHUN_OPTIONS = ['2024/2025', '2025/2026', '2026/2027']

const CP_OPTIONS = [
  'JATI DIRI',
  'DASAR-DASAR LITERASI DAN STEAM',
  'NILAI AGAMA MORAL DAN BUDI PEKERTI',
  'PANCASILA',
  'BAHASA INDONESIA',
  'SENI',
]

// Hari Senin–Kamis: sama
// Hari Jumat: slot berbeda (olahraga, pulang awal)
const HARI_LIST = ['senin', 'selasa', 'rabu', 'kamis', 'jumat']
const HARI_LABEL = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: 'Jumat' }

function emptyHariData() {
  return HARI_LIST.reduce((acc, h) => {
    acc[h] = { cp_blocks: [{ cp: '', tujuan: [''] }], tema_kegiatan: '', detail_kegiatan: '', alat_bahan: [''] }
    return acc
  }, {})
}

// ── Sub-components ─────────────────────────────────────────
function CPBlockEditor({ blocks, onChange }) {
  function updateBlock(i, field, val) {
    const next = blocks.map((b, idx) => idx === i ? { ...b, [field]: val } : b)
    onChange(next)
  }

  function updateTujuan(bi, ti, val) {
    const next = blocks.map((b, idx) => {
      if (idx !== bi) return b
      const t = b.tujuan.map((x, i) => i === ti ? val : x)
      return { ...b, tujuan: t }
    })
    onChange(next)
  }

  function addTujuan(bi) {
    const next = blocks.map((b, idx) =>
      idx === bi ? { ...b, tujuan: [...b.tujuan, ''] } : b
    )
    onChange(next)
  }

  function removeTujuan(bi, ti) {
    const next = blocks.map((b, idx) => {
      if (idx !== bi) return b
      const t = b.tujuan.filter((_, i) => i !== ti)
      return { ...b, tujuan: t.length ? t : [''] }
    })
    onChange(next)
  }

  function addBlock() {
    onChange([...blocks, { cp: '', tujuan: [''] }])
  }

  function removeBlock(i) {
    const next = blocks.filter((_, idx) => idx !== i)
    onChange(next.length ? next : [{ cp: '', tujuan: [''] }])
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => (
        <div key={bi} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
          <div className="flex gap-2 mb-2">
            <select
              value={block.cp}
              onChange={e => updateBlock(bi, 'cp', e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#A78BFA]"
            >
              <option value="">-- Pilih CP --</option>
              {CP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {blocks.length > 1 && (
              <button
                type="button"
                onClick={() => removeBlock(bi)}
                className="text-red-400 hover:text-red-500 text-xs px-2"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-1.5 ml-1">
            {block.tujuan.map((t, ti) => (
              <div key={ti} className="flex gap-1.5 items-start">
                <span className="text-gray-300 text-xs mt-1.5">•</span>
                <textarea
                  value={t}
                  onChange={e => updateTujuan(bi, ti, e.target.value)}
                  rows={2}
                  placeholder="Tujuan pembelajaran..."
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#A78BFA] resize-none"
                />
                <button
                  type="button"
                  onClick={() => removeTujuan(bi, ti)}
                  className="text-gray-300 hover:text-red-400 text-xs mt-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addTujuan(bi)}
              className="text-xs text-[#A78BFA] hover:underline ml-3"
            >
              + Tambah tujuan
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addBlock}
        className="text-xs font-semibold text-[#A78BFA] border border-dashed border-[#A78BFA] rounded-lg px-3 py-1.5 hover:bg-[#A78BFA11] w-full"
      >
        + Tambah CP
      </button>
    </div>
  )
}

function HariTab({ hari, data, onChange }) {
  const isJumat = hari === 'jumat'

  function update(field, val) {
    onChange({ ...data, [field]: val })
  }

  function updateAlatBahan(i, val) {
    const next = data.alat_bahan.map((x, idx) => idx === i ? val : x)
    update('alat_bahan', next)
  }

  return (
    <div className="space-y-5">
      {/* CP & Tujuan */}
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
          Capaian Pembelajaran & Tujuan
        </label>
        <CPBlockEditor
          blocks={data.cp_blocks}
          onChange={val => update('cp_blocks', val)}
        />
      </div>

      {/* Kegiatan Inti */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
            Tema Kegiatan Inti
          </label>
          <input
            type="text"
            value={data.tema_kegiatan}
            onChange={e => update('tema_kegiatan', e.target.value)}
            placeholder={isJumat ? 'OLAHRAGA' : 'RANCANG BANGUN'}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#A78BFA] font-semibold uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
            Detail Kegiatan
          </label>
          <input
            type="text"
            value={data.detail_kegiatan}
            onChange={e => update('detail_kegiatan', e.target.value)}
            placeholder={isJumat ? 'Bergerak Mengikuti Instruksi' : 'Membangun Taman Lalu Lintas'}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#A78BFA]"
          />
        </div>
      </div>

      {/* Alat & Bahan */}
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
          Alat & Bahan
        </label>
        <div className="space-y-1.5">
          {data.alat_bahan.map((ab, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={ab}
                onChange={e => updateAlatBahan(i, e.target.value)}
                placeholder="Nama alat/bahan..."
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#A78BFA]"
              />
              <button
                type="button"
                onClick={() => update('alat_bahan', data.alat_bahan.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-400 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update('alat_bahan', [...data.alat_bahan, ''])}
            className="text-xs text-[#A78BFA] hover:underline"
          >
            + Tambah alat/bahan
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Form ──────────────────────────────────────────────
export default function WeeklyPlanForm({ initialData, classes, onSubmit, isSubmitting }) {
  const defaultData = {
    class_id: '',
    tahun_ajaran: '2025/2026',
    semester: 1,
    minggu_ke: 1,
    periode_start: '',
    periode_end: '',
    pilar_konsep: '',
    tema: '',
    hari_data: emptyHariData(),
    asmaul_husna: '',
    doa_harian: '',
    surah_pendek: { jilid_paud: '', jilid1: '', jilid2: '', jilid3: '' },
    mutiara_hikmah: '',
  }

  const [form, setForm] = useState(initialData || defaultData)
  const [activeHari, setActiveHari] = useState('senin')

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function updateHari(hari, data) {
    setForm(f => ({ ...f, hari_data: { ...f.hari_data, [hari]: data } }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    // Basic validation
    if (!form.class_id) return alert('Pilih kelas terlebih dahulu.')
    if (!form.periode_start || !form.periode_end) return alert('Isi periode minggu.')
    if (!form.tema) return alert('Isi tema RPPM.')

    // Sanitize: remove empty alat_bahan entries
    const cleaned = { ...form }
    HARI_LIST.forEach(h => {
      if (cleaned.hari_data[h]) {
        cleaned.hari_data[h] = {
          ...cleaned.hari_data[h],
          alat_bahan: cleaned.hari_data[h].alat_bahan.filter(x => x.trim()),
          cp_blocks: cleaned.hari_data[h].cp_blocks.map(b => ({
            ...b,
            tujuan: b.tujuan.filter(t => t.trim())
          })).filter(b => b.cp.trim())
        }
      }
    })

    onSubmit(cleaned)
  }

  const inputClass = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#A78BFA]"
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide"

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Metadata ── */}
      <section>
        <h2 className="text-sm font-bold text-[#442F78] mb-4 pb-2 border-b border-gray-100" style={{ fontFamily: 'Rubik' }}>
          Informasi Umum
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Kelas</label>
            <select
              value={form.class_id}
              onChange={e => update('class_id', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nama_kelas}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tahun Ajaran</label>
            <select
              value={form.tahun_ajaran}
              onChange={e => update('tahun_ajaran', e.target.value)}
              className={inputClass}
            >
              {TAHUN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Semester</label>
            <select
              value={form.semester}
              onChange={e => update('semester', Number(e.target.value))}
              className={inputClass}
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Minggu ke-</label>
            <input
              type="number"
              min={1}
              max={52}
              value={form.minggu_ke}
              onChange={e => update('minggu_ke', Number(e.target.value))}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Periode Mulai</label>
            <input
              type="date"
              value={form.periode_start}
              onChange={e => update('periode_start', e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Periode Akhir</label>
            <input
              type="date"
              value={form.periode_end}
              onChange={e => update('periode_end', e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Pilar / Konsep</label>
            <input
              type="text"
              value={form.pilar_konsep}
              onChange={e => update('pilar_konsep', e.target.value)}
              placeholder="K4/Keamanan"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tema</label>
            <input
              type="text"
              value={form.tema}
              onChange={e => update('tema', e.target.value)}
              placeholder="Saya Senang Bertualang"
              className={inputClass}
              required
            />
          </div>
        </div>
      </section>

      {/* ── Per-hari content ── */}
      <section>
        <h2 className="text-sm font-bold text-[#442F78] mb-4 pb-2 border-b border-gray-100" style={{ fontFamily: 'Rubik' }}>
          Konten Per Hari
        </h2>

        {/* Tab selector */}
        <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
          {HARI_LIST.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => setActiveHari(h)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
              style={{
                background: activeHari === h ? '#442F78' : 'transparent',
                color: activeHari === h ? '#fff' : '#6B7280',
                fontFamily: 'Karla, sans-serif',
              }}
            >
              {HARI_LABEL[h]}
            </button>
          ))}
        </div>

        {/* Active hari form */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          {activeHari === 'jumat' && (
            <div className="mb-4 p-3 bg-[#EAB6FF22] rounded-xl text-xs text-[#442F78] font-medium">
              ℹ️ Jumat: jadwal berbeda — fokus olahraga, tidak ada Sholat Dhuha/Jurnal.
            </div>
          )}
          <HariTab
            hari={activeHari}
            data={form.hari_data[activeHari]}
            onChange={data => updateHari(activeHari, data)}
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <section>
        <h2 className="text-sm font-bold text-[#442F78] mb-4 pb-2 border-b border-gray-100" style={{ fontFamily: 'Rubik' }}>
          Muatan Harian (Footer)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Asmaul Husna & Artinya</label>
            <textarea
              value={form.asmaul_husna}
              onChange={e => update('asmaul_husna', e.target.value)}
              rows={2}
              placeholder="84, 85, 86 (Malikul Mulk, Dzul Jalaali Wal Ikraam, Al Muqsith)"
              className={inputClass + ' resize-none'}
            />
          </div>

          <div>
            <label className={labelClass}>Do'a Harian</label>
            <input
              type="text"
              value={form.doa_harian}
              onChange={e => update('doa_harian', e.target.value)}
              placeholder="Do'a Naik Kendaraan"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Mutiara Hikmah</label>
            <input
              type="text"
              value={form.mutiara_hikmah}
              onChange={e => update('mutiara_hikmah', e.target.value)}
              placeholder="Mutiara Hikmah 12 tentang Cinta Tanah Air"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Surah Pendek — Jilid PAUD</label>
            <input
              type="text"
              value={form.surah_pendek.jilid_paud || ''}
              onChange={e => update('surah_pendek', { ...form.surah_pendek, jilid_paud: e.target.value })}
              placeholder="Al Quraisy"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Surah Pendek — Jilid 1</label>
            <input
              type="text"
              value={form.surah_pendek.jilid1}
              onChange={e => update('surah_pendek', { ...form.surah_pendek, jilid1: e.target.value })}
              placeholder="Al Asr"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Surah Pendek — Jilid 2</label>
            <input
              type="text"
              value={form.surah_pendek.jilid2}
              onChange={e => update('surah_pendek', { ...form.surah_pendek, jilid2: e.target.value })}
              placeholder="Al Takatsur"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Surah Pendek — Jilid 3</label>
            <input
              type="text"
              value={form.surah_pendek.jilid3}
              onChange={e => update('surah_pendek', { ...form.surah_pendek, jilid3: e.target.value })}
              placeholder="Al Qori'ah"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{ background: '#442F78', fontFamily: 'Karla' }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan RPPM'}
        </button>
      </div>
    </form>
  )
}