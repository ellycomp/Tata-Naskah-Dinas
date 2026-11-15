import React from 'react';
import { Mail, Plus, Trash2 } from 'lucide-react';
import {
  ForwardingItem,
  GiverPartyInfo,
  LetterDocument,
  LetterKind,
} from '../types/letter';
import {
  createDefaultForwardingItems,
  createDefaultGiverParty,
} from '../data/presets';
import { RecipientListEditor } from './RecipientListEditor';

interface CorrespondenceContentFormProps {
  doc: LetterDocument;
  letterKind: LetterKind;
  onUpdateDoc: (patch: Partial<LetterDocument>) => void;
  onChangeLetterKind: (nextKind: LetterKind) => void;
}

const SALUTATION_PRESETS = [
  'Dengan hormat,',
  'Assalamu’alaikum Warahmatullahi Wabarakatuh,',
  'Salam sejahtera,',
];

const DETAIL_ROW_PRESETS = [
  { label: 'Hari / Tanggal', value: '' },
  { label: 'Waktu', value: 'Pukul 08.00 WIB s.d. selesai' },
  { label: 'Tempat', value: '' },
  { label: 'Agenda / Acara', value: '' },
];

export const CorrespondenceContentForm: React.FC<CorrespondenceContentFormProps> = ({
  doc,
  letterKind,
  onUpdateDoc,
  onChangeLetterKind,
}) => {
  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1';

  const isPengantar = letterKind === 'surat-pengantar';
  const giverParty: GiverPartyInfo =
    doc.giverParty || createDefaultGiverParty(doc.letterhead);
  const forwardingItems: ForwardingItem[] = doc.forwardingItems || [];

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
      {/* Header Konteks Form Korespondensi */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#1e3a5f]" />
            Form Isi Naskah · Surat Korespondensi
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Format Nomor, Hal &amp; Yth.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeLetterKind('standard')}
            className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              !isPengantar
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Korespondensi Umum
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeLetterKind('surat-pengantar');
              if (!doc.forwardingItems || doc.forwardingItems.length === 0) {
                onUpdateDoc({ forwardingItems: createDefaultForwardingItems() });
              }
            }}
            className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              isPengantar
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Surat Pengantar Berkas
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          {isPengantar
            ? 'Form khusus Surat Pengantar dengan data pemberi pengantar, pembawa berkas, dan tabel daftar kiriman.'
            : 'Form khusus Surat Undangan, Permohonan, Kerjasama/MoU, dan surat dinas korespondensi.'}
        </p>
      </div>

      {/* Bagian Khusus Surat Pengantar */}
      {isPengantar ? (
        <div className="space-y-4">
          {/* 1. Yang Memberi Pengantar */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">
                1. Formulir Yang Memberi Pengantar
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateDoc({
                    signerName: giverParty.name,
                    signerDepartment: giverParty.title
                      ? `${giverParty.title},`
                      : doc.signerDepartment,
                    signerTitle: '',
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
                placeholder="Alamat lembaga pemberi pengantar..."
                className={inputClass}
              />
            </div>
          </div>

          {/* 2. Yang Diberi Pengantar */}
          <RecipientListEditor
            title="2. Formulir Yang Diberi Pengantar"
            allowMultiple
            recipientParty={doc.recipientParty}
            recipientParties={doc.recipientParties}
            onChange={(primary, list) =>
              onUpdateDoc({ recipientParty: primary, recipientParties: list })
            }
          />

          {/* 3. Daftar Berkas Dikirim */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                3. Daftar Naskah / Berkas yang Dikirim
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateDoc({
                    forwardingItems: [
                      ...forwardingItems,
                      {
                        id: `fwd-${Date.now()}`,
                        description: '',
                        quantity: '1 (satu) berkas',
                        notes: 'Disampaikan dengan hormat.',
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Item
              </button>
            </div>

            {forwardingItems.length === 0 ? (
              <p className="text-xs text-slate-500">
                Belum ada daftar berkas. Klik &ldquo;Tambah Item&rdquo; untuk menampilkan tabel pengantar.
              </p>
            ) : (
              <div className="space-y-2.5">
                {forwardingItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-slate-200 bg-white p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDoc({
                            forwardingItems: forwardingItems.filter(
                              (f) => f.id !== item.id
                            ),
                          })
                        }
                        className="text-xs text-red-600 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        onUpdateDoc({
                          forwardingItems: forwardingItems.map((f) =>
                            f.id === item.id
                              ? { ...f, description: e.target.value }
                              : f
                          ),
                        })
                      }
                      placeholder="Jenis naskah / berkas / barang"
                      className={inputClass}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateDoc({
                            forwardingItems: forwardingItems.map((f) =>
                              f.id === item.id
                                ? { ...f, quantity: e.target.value }
                                : f
                            ),
                          })
                        }
                        placeholder="Banyaknya (mis. 1 berkas)"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          onUpdateDoc({
                            forwardingItems: forwardingItems.map((f) =>
                              f.id === item.id ? { ...f, notes: e.target.value } : f
                            ),
                          })
                        }
                        placeholder="Keterangan"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Kalimat Pengantar Pihak</label>
            <textarea
              rows={2}
              value={doc.openingParagraph}
              onChange={(e) => onUpdateDoc({ openingParagraph: e.target.value })}
              placeholder="Dengan ini memberikan surat pengantar kepada:"
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        /* Bagian Korespondensi Umum (Undangan, Permohonan, Kerjasama) */
        <>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-xs font-medium text-slate-700">
                Salam Pembuka Korespondensi
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {SALUTATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onUpdateDoc({ salutation: preset })}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded border cursor-pointer transition-colors ${
                      doc.salutation === preset
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.startsWith('Assalamu') ? 'Salam Islami' : preset.replace(',', '')}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={doc.salutation}
              onChange={(e) => onUpdateDoc({ salutation: e.target.value })}
              placeholder="Dengan hormat, / Assalamu’alaikum Warahmatullahi Wabarakatuh,"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Paragraf Pembuka Surat</label>
            <textarea
              rows={4}
              value={doc.openingParagraph}
              onChange={(e) => onUpdateDoc({ openingParagraph: e.target.value })}
              placeholder="Tuliskan maksud dan pengantar surat korespondensi (undangan, permohonan, atau penawaran)..."
              className={inputClass}
            />
          </div>

          {/* Rincian Agenda / Jadwal / Poin Korespondensi */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-700">
                Rincian Jadwal / Agenda / Lingkup (Opsional)
              </label>
              <button
                type="button"
                onClick={() => addDetailRow('Hari / Tanggal', '')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris
              </button>
            </div>

            {doc.detailRows.length === 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDoc({
                      detailRows: DETAIL_ROW_PRESETS.map((item, idx) => ({
                        id: `row-${Date.now()}-${idx}`,
                        label: item.label,
                        value: item.value,
                      })),
                    })
                  }
                  className="text-[11px] font-medium text-[#1e3a5f] bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-md cursor-pointer"
                >
                  + Isi Format Jadwal Undangan (Hari, Waktu, Tempat, Agenda)
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
                      placeholder="Label (mis. Hari / Tanggal)"
                      className="w-36 shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateDetailRow(row.id, 'value', e.target.value)}
                      placeholder="Isi rincian acara/kegiatan"
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
        </>
      )}

      {/* Paragraf Isi Lanjutan */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-700">
            {isPengantar ? 'Keterangan Pengantar Tambahan' : 'Paragraf Isi Lanjutan'}
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
              placeholder="Tuliskan paragraf isi surat..."
              className={inputClass}
            />
          </div>
        ))}
      </div>

      {/* Paragraf Penutup Korespondensi */}
      <div className="border-t border-slate-100 pt-4">
        <label className={labelClass}>Paragraf Penutup &amp; Ucapan Terima Kasih</label>
        <textarea
          rows={3}
          value={doc.closingParagraph}
          onChange={(e) => onUpdateDoc({ closingParagraph: e.target.value })}
          placeholder="Demikian surat ini kami sampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih."
          className={inputClass}
        />
      </div>

      {/* Tembusan */}
      <div className="border-t border-slate-100 pt-4">
        <label className={labelClass}>Tembusan (1 baris per tujuan, opsional)</label>
        <textarea
          rows={3}
          value={doc.ccList.join('\n')}
          onChange={(e) => onUpdateDoc({ ccList: e.target.value.split('\n') })}
          placeholder={'1. Dewan Pembina Yayasan;\n2. Arsip Sekretariat.'}
          className={inputClass}
        />
      </div>
    </div>
  );
};
