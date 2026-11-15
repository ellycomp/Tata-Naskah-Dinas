import React from 'react';
import { FileBadge2, Plus, Trash2 } from 'lucide-react';
import {
  DecreeData,
  GiverPartyInfo,
  LetterDocument,
  LetterKind,
} from '../types/letter';
import {
  ORDINAL_CLAUSE_LABELS,
  createDefaultGiverParty,
  createDefaultSkData,
} from '../data/presets';
import { RecipientListEditor } from './RecipientListEditor';

interface DecreeContentFormProps {
  doc: LetterDocument;
  letterKind: LetterKind;
  onUpdateDoc: (patch: Partial<LetterDocument>) => void;
  onChangeLetterKind: (nextKind: LetterKind) => void;
}

export const DecreeContentForm: React.FC<DecreeContentFormProps> = ({
  doc,
  letterKind,
  onUpdateDoc,
  onChangeLetterKind,
}) => {
  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1';

  const effectiveKind: LetterKind =
    letterKind === 'surat-pengantar' ? 'standard' : letterKind;

  const skData: DecreeData =
    doc.skData || createDefaultSkData(doc.letterhead, doc.dateString);
  const giverParty: GiverPartyInfo =
    doc.giverParty || createDefaultGiverParty(doc.letterhead);

  const updateSkData = (patch: Partial<DecreeData>) => {
    onUpdateDoc({ skData: { ...skData, ...patch } });
  };

  const updateGiverParty = (patch: Partial<GiverPartyInfo>) => {
    onUpdateDoc({ giverParty: { ...giverParty, ...patch } });
  };

  const addDetailRow = (label = 'Keterangan', value = '') => {
    onUpdateDoc({
      detailRows: [
        ...doc.detailRows,
        { id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label, value },
      ],
    });
  };

  const updateDetailRow = (id: string, field: 'label' | 'value', val: string) => {
    onUpdateDoc({
      detailRows: doc.detailRows.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    });
  };

  const removeDetailRow = (id: string) => {
    onUpdateDoc({
      detailRows: doc.detailRows.filter((r) => r.id !== id),
    });
  };

  const addBodyParagraph = () => {
    onUpdateDoc({ bodyParagraphs: [...doc.bodyParagraphs, ''] });
  };

  const updateBodyParagraph = (idx: number, val: string) => {
    const next = [...doc.bodyParagraphs];
    next[idx] = val;
    onUpdateDoc({ bodyParagraphs: next });
  };

  const removeBodyParagraph = (idx: number) => {
    onUpdateDoc({
      bodyParagraphs: doc.bodyParagraphs.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Konteks Form Judul Tengah */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <FileBadge2 className="w-3.5 h-3.5 text-[#1e3a5f]" />
            Form Isi Naskah · Surat Judul Tengah
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Format Judul &amp; Nomor di Tengah
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={labelClass}>Jenis Surat Judul Tengah</label>
            <select
              value={effectiveKind}
              onChange={(e) => onChangeLetterKind(e.target.value as LetterKind)}
              className={inputClass}
            >
              <option value="sk">Surat Keputusan (SK)</option>
              <option value="surat-tugas">Surat Tugas</option>
              <option value="surat-keterangan">Surat Keterangan</option>
              <option value="surat-kuasa">Surat Kuasa</option>
              <option value="standard">Edaran / Peringatan / Umum</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Judul Surat (Tengah Atas)</label>
            <input
              type="text"
              value={doc.decreeTitle}
              onChange={(e) => onUpdateDoc({ decreeTitle: e.target.value })}
              placeholder="SURAT KEPUTUSAN / SURAT EDARAN / SURAT TUGAS"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* 1. MODE KHUSUS SURAT KEPUTUSAN (SK) */}
      {effectiveKind === 'sk' && (
        <>
          <div>
            <label className={labelClass}>Tentang (Pokok Keputusan)</label>
            <textarea
              rows={2}
              value={skData.about}
              onChange={(e) => updateSkData({ about: e.target.value })}
              placeholder="PENGANGKATAN PANITIA / PENETAPAN TIM KERJA..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Jabatan Pejabat Penetap (Baris di bawah Tentang)</label>
            <input
              type="text"
              value={doc.openingParagraph}
              onChange={(e) => onUpdateDoc({ openingParagraph: e.target.value })}
              placeholder="Contoh: Kepala SD IT Qudwah Sungai Rengit,"
              className={inputClass}
            />
          </div>

          {/* Menimbang */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Menimbang (Konsiderans)
              </label>
              <button
                type="button"
                onClick={() =>
                  updateSkData({ considering: [...skData.considering, 'bahwa '] })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Poin
              </button>
            </div>
            {skData.considering.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="pt-2 text-xs font-mono font-semibold text-slate-500 w-5 shrink-0">
                  {String.fromCharCode(97 + idx)}.
                </span>
                <textarea
                  rows={2}
                  value={item}
                  onChange={(e) => {
                    const next = [...skData.considering];
                    next[idx] = e.target.value;
                    updateSkData({ considering: next });
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateSkData({
                      considering: skData.considering.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Mengingat */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Mengingat (Dasar Hukum / Pedoman)
              </label>
              <button
                type="button"
                onClick={() => updateSkData({ legalBasis: [...skData.legalBasis, ''] })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Dasar
              </button>
            </div>
            {skData.legalBasis.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="pt-2 text-xs font-mono font-semibold text-slate-500 w-5 shrink-0">
                  {idx + 1}.
                </span>
                <textarea
                  rows={2}
                  value={item}
                  onChange={(e) => {
                    const next = [...skData.legalBasis];
                    next[idx] = e.target.value;
                    updateSkData({ legalBasis: next });
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateSkData({
                      legalBasis: skData.legalBasis.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Memutuskan & Menetapkan */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div>
              <label className={labelClass}>Kalimat Penetapan (Menetapkan:)</label>
              <textarea
                rows={2}
                value={skData.enactStatement}
                onChange={(e) => updateSkData({ enactStatement: e.target.value })}
                placeholder="KEPUTUSAN KEPALA ... TENTANG ..."
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Diktum / Ketetapan (KESATU, KEDUA, dst.)
              </label>
              <button
                type="button"
                onClick={() => {
                  const nextLabel =
                    ORDINAL_CLAUSE_LABELS[skData.clauses.length] ||
                    `KE-${skData.clauses.length + 1}`;
                  updateSkData({
                    clauses: [
                      ...skData.clauses,
                      { id: `sk-${Date.now()}`, label: nextLabel, text: '' },
                    ],
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Diktum
              </button>
            </div>

            <div className="space-y-2.5">
              {skData.clauses.map((clause, idx) => (
                <div
                  key={clause.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={clause.label}
                      onChange={(e) => {
                        const next = [...skData.clauses];
                        next[idx] = { ...clause, label: e.target.value };
                        updateSkData({ clauses: next });
                      }}
                      className="w-32 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSkData({
                          clauses: skData.clauses.filter((c) => c.id !== clause.id),
                        })
                      }
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={clause.text}
                    onChange={(e) => {
                      const next = [...skData.clauses];
                      next[idx] = { ...clause, text: e.target.value };
                      updateSkData({ clauses: next });
                    }}
                    placeholder="Isi ketetapan..."
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tempat & Tanggal Penetapan */}
          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ditetapkan di</label>
              <input
                type="text"
                value={skData.establishedIn}
                onChange={(e) => updateSkData({ establishedIn: e.target.value })}
                placeholder="Sungai Rengit"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Pada tanggal</label>
              <input
                type="text"
                value={skData.establishedDate}
                onChange={(e) => updateSkData({ establishedDate: e.target.value })}
                placeholder={doc.dateString}
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Tembusan (1 baris per tujuan, opsional)</label>
            <textarea
              rows={3}
              value={doc.ccList.join('\n')}
              onChange={(e) => onUpdateDoc({ ccList: e.target.value.split('\n') })}
              placeholder={'1. Ketua Yayasan;\n2. Arsip.'}
              className={inputClass}
            />
          </div>
        </>
      )}

      {/* 2. MODE SURAT TUGAS / KETERANGAN / KUASA */}
      {effectiveKind !== 'sk' && effectiveKind !== 'standard' && (
        <>
          <div className="space-y-4">
            {/* 1. Pihak Pemberi */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  {effectiveKind === 'surat-tugas'
                    ? '1. Formulir Yang Memberi Tugas'
                    : effectiveKind === 'surat-keterangan'
                      ? '1. Formulir Yang Menerangkan'
                      : '1. Formulir Yang Memberi Kuasa (Pihak I)'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDoc({
                      signerName: giverParty.name,
                      signerDepartment:
                        effectiveKind === 'surat-kuasa'
                          ? 'Pemberi Kuasa,'
                          : giverParty.title
                            ? `${giverParty.title},`
                            : doc.signerDepartment,
                      signerTitle:
                        effectiveKind === 'surat-kuasa' ? giverParty.title : '',
                    })
                  }
                  className="text-[11px] font-medium text-[#1e3a5f] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Samakan dgn Penandatangan
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={labelClass}>Nama</label>
                  <input
                    type="text"
                    value={giverParty.name}
                    onChange={(e) => updateGiverParty({ name: e.target.value })}
                    placeholder="Nama lengkap & gelar"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Jabatan</label>
                  <input
                    type="text"
                    value={giverParty.title}
                    onChange={(e) => updateGiverParty({ title: e.target.value })}
                    placeholder="Contoh: Kepala Sekolah / Ketua Yayasan"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Alamat</label>
                <textarea
                  rows={2}
                  value={giverParty.address}
                  onChange={(e) => updateGiverParty({ address: e.target.value })}
                  placeholder="Alamat lengkap pemberi..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* 2. Pihak Penerima */}
            <RecipientListEditor
              title={
                effectiveKind === 'surat-tugas'
                  ? '2. Formulir Yang Diberi Tugas'
                  : effectiveKind === 'surat-keterangan'
                    ? '2. Formulir Yang Diterangkan'
                    : '2. Formulir Yang Diberi Kuasa (Pihak II)'
              }
              allowMultiple={
                effectiveKind === 'surat-tugas' ||
                effectiveKind === 'surat-keterangan'
              }
              recipientParty={doc.recipientParty}
              recipientParties={doc.recipientParties}
              onChange={(primary, list) =>
                onUpdateDoc({ recipientParty: primary, recipientParties: list })
              }
            />
          </div>

          <div>
            <label className={labelClass}>Kalimat Penghubung Pihak</label>
            <textarea
              rows={2}
              value={doc.openingParagraph}
              onChange={(e) => onUpdateDoc({ openingParagraph: e.target.value })}
              placeholder={
                effectiveKind === 'surat-tugas'
                  ? 'Dengan ini memberikan tugas kepada:'
                  : effectiveKind === 'surat-keterangan'
                    ? 'Dengan ini menerangkan dengan sesungguhnya bahwa:'
                    : 'Dengan ini memberikan kuasa penuh kepada:'
              }
              className={inputClass}
            />
          </div>

          {/* Rincian Pendukung Khusus Tugas/Keterangan/Kuasa */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                {effectiveKind === 'surat-tugas'
                  ? 'Rincian Pelaksanaan Tugas (Hari / Tanggal / Tempat)'
                  : effectiveKind === 'surat-keterangan'
                    ? 'Rincian Data Tambahan (Tahun Pelajaran / Masa Kerja / Wali)'
                    : 'Rincian Tambahan Pelimpahan Kuasa (Opsional)'}
              </label>
              <button
                type="button"
                onClick={() =>
                  addDetailRow(
                    effectiveKind === 'surat-tugas'
                      ? 'Hari / Tanggal'
                      : effectiveKind === 'surat-keterangan'
                        ? 'Tahun Pelajaran'
                        : 'Keperluan',
                    ''
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris
              </button>
            </div>

            {doc.detailRows.length === 0 ? (
              <p className="text-xs text-slate-500">
                Belum ada rincian tambahan. Klik &ldquo;Tambah Baris&rdquo; bila diperlukan.
              </p>
            ) : (
              <div className="space-y-2">
                {doc.detailRows.map((row) => (
                  <div key={row.id} className="flex items-start gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateDetailRow(row.id, 'label', e.target.value)}
                      placeholder="Label"
                      className="w-36 shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateDetailRow(row.id, 'value', e.target.value)}
                      placeholder="Isi keterangan"
                      className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeDetailRow(row.id)}
                      title="Hapus baris"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Uraian Isi */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                {effectiveKind === 'surat-tugas'
                  ? 'Uraian Tugas & Ketentuan Pelaksanaan'
                  : effectiveKind === 'surat-keterangan'
                    ? 'Isi Keterangan & Keperluan'
                    : 'Ruang Lingkup Pelimpahan Kuasa'}
              </label>
              <button
                type="button"
                onClick={addBodyParagraph}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Paragraf
              </button>
            </div>

            {doc.bodyParagraphs.map((para, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Paragraf {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeBodyParagraph(idx)}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={para}
                  onChange={(e) => updateBodyParagraph(idx, e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Kalimat Penutup</label>
            <textarea
              rows={2}
              value={doc.closingParagraph}
              onChange={(e) => onUpdateDoc({ closingParagraph: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Tembusan (1 baris per tujuan, opsional)</label>
            <textarea
              rows={3}
              value={doc.ccList.join('\n')}
              onChange={(e) => onUpdateDoc({ ccList: e.target.value.split('\n') })}
              placeholder={'1. Ketua Yayasan;\n2. Arsip.'}
              className={inputClass}
            />
          </div>
        </>
      )}

      {/* 3. MODE JUDUL TENGAH UMUM (SURAT EDARAN / SURAT PERINGATAN / PERNYATAAN) */}
      {effectiveKind === 'standard' && (
        <>
          <div>
            <label className={labelClass}>
              Kalimat Pembuka / Sasaran Edaran atau Peringatan
            </label>
            <textarea
              rows={4}
              value={doc.openingParagraph}
              onChange={(e) => onUpdateDoc({ openingParagraph: e.target.value })}
              placeholder="Contoh: Kepada Yth. Bapak/Ibu Orang Tua/Wali Peserta Didik... atau Pengurus Yayasan dengan ini memberikan Surat Peringatan kepada:"
              className={inputClass}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-700">
                Poin Ketentuan Edaran / Identitas Terkait
              </label>
              <button
                type="button"
                onClick={() => addDetailRow('1. Ketentuan', '')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Poin / Baris
              </button>
            </div>

            {doc.detailRows.length === 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDoc({
                      detailRows: [
                        { id: `row-${Date.now()}-1`, label: '1. Jadwal Kegiatan', value: '' },
                        { id: `row-${Date.now()}-2`, label: '2. Ketentuan Peserta', value: '' },
                        { id: `row-${Date.now()}-3`, label: '3. Keterangan Lain', value: '' },
                      ],
                    })
                  }
                  className="text-[11px] font-medium text-[#1e3a5f] bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-md cursor-pointer"
                >
                  + Format Poin Surat Edaran
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDoc({
                      detailRows: [
                        { id: `row-${Date.now()}-1`, label: 'Nama', value: '' },
                        { id: `row-${Date.now()}-2`, label: 'NIY', value: '' },
                        { id: `row-${Date.now()}-3`, label: 'Jabatan', value: '' },
                        { id: `row-${Date.now()}-4`, label: 'Unit Kerja', value: '' },
                      ],
                    })
                  }
                  className="text-[11px] font-medium text-[#1e3a5f] bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-md cursor-pointer"
                >
                  + Format Identitas SP / Pernyataan
                </button>
              </div>
            )}

            {doc.detailRows.length > 0 && (
              <div className="space-y-2">
                {doc.detailRows.map((row) => (
                  <div key={row.id} className="flex items-start gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateDetailRow(row.id, 'label', e.target.value)}
                      placeholder="Label poin / identitas"
                      className="w-36 shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateDetailRow(row.id, 'value', e.target.value)}
                      placeholder="Isi poin / keterangan"
                      className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeDetailRow(row.id)}
                      title="Hapus baris"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Uraian Penjelasan / Ketentuan Lanjutan
              </label>
              <button
                type="button"
                onClick={addBodyParagraph}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Paragraf
              </button>
            </div>

            {doc.bodyParagraphs.map((para, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Paragraf {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeBodyParagraph(idx)}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={para}
                  onChange={(e) => updateBodyParagraph(idx, e.target.value)}
                  placeholder="Tuliskan penjelasan atau ketentuan lanjutan..."
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Kalimat Penutup</label>
            <textarea
              rows={3}
              value={doc.closingParagraph}
              onChange={(e) => onUpdateDoc({ closingParagraph: e.target.value })}
              placeholder="Demikian surat ini disampaikan agar menjadi perhatian dan dilaksanakan sebagaimana mestinya."
              className={inputClass}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Tembusan (1 baris per tujuan, opsional)</label>
            <textarea
              rows={3}
              value={doc.ccList.join('\n')}
              onChange={(e) => onUpdateDoc({ ccList: e.target.value.split('\n') })}
              placeholder={'1. Ketua Yayasan;\n2. Arsip.'}
              className={inputClass}
            />
          </div>
        </>
      )}
    </div>
  );
};
