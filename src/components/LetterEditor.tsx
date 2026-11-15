import React, { useState } from 'react';
import {
  Trash2,
  Upload,
  RefreshCw,
  Calendar,
  BookmarkPlus,
  Building2,
  FileText,
  AlignLeft,
  PenTool,
  QrCode,
} from 'lucide-react';
import {
  BuiltInLogoId,
  ContactLastLineMode,
  DividerStyle,
  LetterDocument,
  LetterFont,
  LetterFormatStyle,
  LetterKind,
  LetterheadConfig,
  LetterheadLayout,
  MarginPreset,
  PaperSize,
  SignatureMode,
  StampMode,
} from '../types/letter';
import {
  LETTER_SUBJECT_CODES,
  INSTITUTION_CODES,
  createDefaultForwardingItems,
  createDefaultGiverParty,
  createDefaultRecipientParty,
  createDefaultSkData,
  formatIndonesianDate,
  formatOfficialLetterNumber,
  generateLetterNumber,
  getDefaultSubjectCodeForTemplate,
  getInstitutionCodeFromKop,
  getRomanMonthAndYearFromDateString,
  parseOfficialLetterNumber,
  resolveLetterKind,
} from '../data/presets';
import { SignaturePad } from './SignaturePad';
import { QrSignaturePanel } from './QrSignaturePanel';
import { CorrespondenceContentForm } from './CorrespondenceContentForm';
import { DecreeContentForm } from './DecreeContentForm';

export type EditorTab = 'kop' | 'kepala' | 'isi' | 'qr' | 'pengesahan';

interface LetterEditorProps {
  doc: LetterDocument;
  onChange: (updated: LetterDocument) => void;
  letterheadProfiles: LetterheadConfig[];
  onSaveLetterheadProfile: (profile: LetterheadConfig) => void;
  onOpenLetterLink: (url: string) => void;
}

const ACCENT_SWATCHES = [
  { label: 'Hitam Resmi', value: '#0f172a' },
  { label: 'Biru Instansi', value: '#1e3a5f' },
  { label: 'Hijau Kementerian', value: '#14532d' },
  { label: 'Merah Marun', value: '#7c2d12' },
];

export const LetterEditor: React.FC<LetterEditorProps> = ({
  doc,
  onChange,
  letterheadProfiles,
  onSaveLetterheadProfile,
  onOpenLetterLink,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('kop');
  const [savedNotice, setSavedNotice] = useState(false);

  const updateDoc = (patch: Partial<LetterDocument>) => {
    onChange({
      ...doc,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateKop = (patch: Partial<LetterheadConfig>) => {
    updateDoc({
      letterhead: {
        ...doc.letterhead,
        ...patch,
      },
    });
  };

  const handleUploadLogo = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'left' | 'right'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'left') {
          updateKop({ customLogoDataUrl: reader.result });
        } else {
          updateKop({ rightLogoDataUrl: reader.result, showRightLogo: true });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCurrentKop = () => {
    const profileToSave: LetterheadConfig = {
      ...doc.letterhead,
      id: `kop-custom-${Date.now()}`,
      profileName: doc.letterhead.orgName || 'Kop Surat Kustom',
    };
    onSaveLetterheadProfile(profileToSave);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const handleUploadStamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateDoc({
          showStamp: true,
          stampMode: 'custom-png',
          customStampDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const letterKind = resolveLetterKind(doc);

  const getDefaultDecreeTitleForKind = (kind: LetterKind): string => {
    if (kind === 'sk') return 'SURAT KEPUTUSAN';
    if (kind === 'surat-tugas') return 'SURAT TUGAS';
    if (kind === 'surat-keterangan') return 'SURAT KETERANGAN';
    if (kind === 'surat-kuasa') return 'SURAT KUASA';
    if (kind === 'surat-pengantar') return 'SURAT PENGANTAR';
    if (doc.templateId === 'surat-edaran') return 'SURAT EDARAN';
    if (doc.templateId === 'surat-peringatan') return 'SURAT PERINGATAN PERTAMA (SP-1)';
    return 'SURAT RESMI';
  };

  const handleChangeFormatStyle = (nextStyle: LetterFormatStyle) => {
    if (nextStyle === doc.formatStyle) return;
    const patch: Partial<LetterDocument> = { formatStyle: nextStyle };
    if (nextStyle === 'correspondence') {
      if (letterKind === 'sk') {
        patch.letterKind = 'standard';
      }
      if (!doc.salutation.trim()) {
        patch.salutation = 'Dengan hormat,';
      }
    } else {
      patch.salutation = '';
      if (letterKind === 'surat-pengantar') {
        patch.letterKind = 'standard';
      }
      if (!doc.decreeTitle.trim()) {
        patch.decreeTitle = getDefaultDecreeTitleForKind(
          letterKind === 'surat-pengantar' ? 'standard' : letterKind
        );
      }
    }
    updateDoc(patch);
  };

  const handleChangeLetterKind = (nextKind: LetterKind) => {
    const patch: Partial<LetterDocument> = { letterKind: nextKind };
    if (nextKind === 'sk') {
      patch.formatStyle = 'decree';
      if (!doc.decreeTitle.trim()) patch.decreeTitle = 'SURAT KEPUTUSAN';
      if (!doc.skData) patch.skData = createDefaultSkData(doc.letterhead, doc.dateString);
    } else if (nextKind !== 'standard') {
      if (nextKind === 'surat-pengantar') {
        patch.formatStyle = 'correspondence';
        if (!doc.decreeTitle.trim()) patch.decreeTitle = 'SURAT PENGANTAR';
        if (!doc.forwardingItems) patch.forwardingItems = createDefaultForwardingItems();
      } else {
        patch.formatStyle = 'decree';
        if (!doc.decreeTitle.trim()) {
          patch.decreeTitle = getDefaultDecreeTitleForKind(nextKind);
        }
      }
      if (!doc.giverParty) patch.giverParty = createDefaultGiverParty(doc.letterhead);
      if (!doc.recipientParty) patch.recipientParty = createDefaultRecipientParty('guru');
    } else if (doc.formatStyle === 'decree' && !doc.decreeTitle.trim()) {
      patch.decreeTitle = getDefaultDecreeTitleForKind('standard');
    }
    updateDoc(patch);
  };

  const getDefaultSubjectCode = () => getDefaultSubjectCodeForTemplate(doc.templateId);

  const parsedNumber = parseOfficialLetterNumber(
    doc.letterNumber,
    doc.letterhead,
    doc.dateString
  );

  const updateNumberParts = (patch: Partial<typeof parsedNumber>) => {
    const nextParts = { ...parsedNumber, ...patch };
    updateDoc({ letterNumber: formatOfficialLetterNumber(nextParts) });
  };

  const handleAutoNumber = () => {
    const orgCode = getInstitutionCodeFromKop(doc.letterhead);
    const subjectCode = parsedNumber.subjectCode || getDefaultSubjectCode();
    updateDoc({
      letterNumber: generateLetterNumber(
        subjectCode,
        orgCode,
        parsedNumber.scope,
        '',
        doc.dateString
      ),
    });
  };

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'kop', label: 'Kop Surat', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'kepala', label: 'Nomor & Tujuan', icon: <FileText className="w-3.5 h-3.5" /> },
    {
      id: 'isi',
      label: doc.formatStyle === 'correspondence' ? 'Isi Korespondensi' : 'Isi Judul Tengah',
      icon: <AlignLeft className="w-3.5 h-3.5" />,
    },
    { id: 'qr', label: 'TTD QR-Code', icon: <QrCode className="w-3.5 h-3.5" /> },
    { id: 'pengesahan', label: 'TTD & Kertas', icon: <PenTool className="w-3.5 h-3.5" /> },
  ];

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1';

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Editor Tab Navigation */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-3 pt-2 gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white rounded-t-md'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto workspace-scroll p-5 space-y-5">
        {activeTab === 'kop' && (
          <>
            {/* Preset Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Pilih Profil Kop Surat Tersimpan
                </label>
                <button
                  type="button"
                  onClick={handleSaveCurrentKop}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  {savedNotice ? 'Tersimpan ke Profil' : 'Simpan Profil Kop Ini'}
                </button>
              </div>
              <select
                value={
                  letterheadProfiles.some((p) => p.id === doc.letterhead.id)
                    ? doc.letterhead.id
                    : ''
                }
                onChange={(e) => {
                  const found = letterheadProfiles.find((p) => p.id === e.target.value);
                  if (found) {
                    const nextOrgCode = getInstitutionCodeFromKop(found);
                    const nextLetterNumber = formatOfficialLetterNumber({
                      ...parsedNumber,
                      orgCode: nextOrgCode,
                    });
                    updateDoc({
                      letterhead: { ...found },
                      stampTextTop: found.orgName,
                      letterNumber: nextLetterNumber,
                    });
                  }
                }}
                className={inputClass}
              >
                <option value="" disabled>
                  -- Pilih profil kop surat atau sunting manual di bawah --
                </option>
                {letterheadProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.profileName} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3.5">
              <div>
                <label className={labelClass}>Instansi Induk / Kementerian (Opsional)</label>
                <input
                  type="text"
                  value={doc.letterhead.parentOrg}
                  onChange={(e) => updateKop({ parentOrg: e.target.value })}
                  placeholder="Contoh: PEMERINTAH PROVINSI DKI JAKARTA"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Nama Instansi / Perusahaan / Lembaga</label>
                <input
                  type="text"
                  value={doc.letterhead.orgName}
                  onChange={(e) => updateKop({ orgName: e.target.value })}
                  placeholder="Contoh: PT NUSANTARA KARYA MANDIRI"
                  className={inputClass}
                />
              </div>

              {doc.letterhead.id === 'kop-sdit-qudwah' ||
              doc.letterhead.id === 'kop-kbit-qudwah' ||
              /^NPSN:/i.test(doc.letterhead.subUnit.trim()) ? (
                (() => {
                  const match = doc.letterhead.subUnit.match(
                    /^NPSN:\s*(.*?)\s*\|\s*Akreditasi:\s*(.*)$/i
                  );
                  const npsnVal = match ? match[1] : '';
                  const akredVal = match ? match[2] : '';
                  const updateNpsnAkred = (nextNpsn: string, nextAkred: string) => {
                    updateKop({
                      subUnit: `NPSN: ${nextNpsn} | Akreditasi: ${nextAkred}`,
                    });
                  };
                  return (
                    <div>
                      <label className={labelClass}>NPSN &amp; Akreditasi</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center rounded-md border border-slate-200 bg-white overflow-hidden focus-within:border-[#1e3a5f] focus-within:ring-1 focus-within:ring-[#1e3a5f]">
                          <span className="px-2.5 py-2 text-xs font-medium text-slate-600 bg-slate-50 border-r border-slate-200 whitespace-nowrap">
                            NPSN:
                          </span>
                          <input
                            type="text"
                            value={npsnVal}
                            onChange={(e) => updateNpsnAkred(e.target.value, akredVal)}
                            placeholder="Contoh: 69900000"
                            className="w-full px-2.5 py-2 text-sm text-slate-900 font-mono tabular-nums focus:outline-none"
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-400 select-none">
                          |
                        </span>
                        <div className="flex-1 flex items-center rounded-md border border-slate-200 bg-white overflow-hidden focus-within:border-[#1e3a5f] focus-within:ring-1 focus-within:ring-[#1e3a5f]">
                          <span className="px-2.5 py-2 text-xs font-medium text-slate-600 bg-slate-50 border-r border-slate-200 whitespace-nowrap">
                            Akreditasi:
                          </span>
                          <input
                            type="text"
                            value={akredVal}
                            onChange={(e) => updateNpsnAkred(npsnVal, e.target.value)}
                            placeholder="Contoh: B"
                            className="w-full px-2.5 py-2 text-sm text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <label className={labelClass}>Sub Unit / Fakultas / Divisi (Opsional)</label>
                  <input
                    type="text"
                    value={doc.letterhead.subUnit}
                    onChange={(e) => updateKop({ subUnit: e.target.value })}
                    placeholder="Contoh: DIVISI OPERASIONAL & SUMBER DAYA MANUSIA"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Alamat Lengkap (Tekan Enter untuk baris ke-2)</label>
                <textarea
                  rows={2}
                  value={doc.letterhead.address}
                  onChange={(e) => updateKop({ address: e.target.value })}
                  placeholder="Baris 1: Jalan, Desa, Kecamatan&#10;Baris 2: Kab. ..., Provinsi"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={doc.letterhead.contactLine}
                    onChange={(e) => updateKop({ contactLine: e.target.value })}
                    placeholder="Telp. 0813-xxxx-xxxx"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <input
                    type="text"
                    value={doc.letterhead.websiteLine || ''}
                    onChange={(e) => updateKop({ websiteLine: e.target.value })}
                    placeholder="Website: www.domain.sch.id"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email Resmi</label>
                  <input
                    type="text"
                    value={doc.letterhead.websiteEmailLine}
                    onChange={(e) => updateKop({ websiteEmailLine: e.target.value })}
                    placeholder="Email: info@domain.sch.id"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Susunan Baris Kontak &amp; Tautan</label>
                <select
                  value={
                    doc.letterhead.contactLastLineMode ||
                    (doc.letterhead.websiteOnLastLine ? 'website-last' : 'inline')
                  }
                  onChange={(e) => {
                    const mode = e.target.value as ContactLastLineMode;
                    updateKop({
                      contactLastLineMode: mode,
                      websiteOnLastLine: mode === 'website-last',
                    });
                  }}
                  className={inputClass}
                >
                  <option value="email-last">Email di baris terakhir (Telepon · Website / Email)</option>
                  <option value="website-last">Website di baris terakhir (Telepon · Email / Website)</option>
                  <option value="inline">Sejajar dalam 1 baris (Telepon · Website · Email)</option>
                </select>
              </div>
            </div>

            {/* Dua Tempat Unggah Lambang & Pengaturan Ukuran */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Lambang Kop Surat (Kiri &amp; Kanan)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateKop({
                      rightLogoSize: doc.letterhead.leftLogoSize || 68,
                    })
                  }
                  className="text-xs font-medium text-[#1e3a5f] hover:underline cursor-pointer"
                >
                  Samakan Ukuran
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Slot Lambang Kiri */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      1. Lambang Kiri
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      {doc.letterhead.leftLogoSize || 68}px
                    </span>
                  </div>

                  <select
                    value={doc.letterhead.builtInLogo}
                    onChange={(e) =>
                      updateKop({
                        builtInLogo: e.target.value as BuiltInLogoId,
                        customLogoDataUrl: null,
                      })
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                  >
                    <option value="organization">Lambang Yayasan / Organisasi</option>
                    <option value="academic">Lambang Pendidikan / Sekolah</option>
                    <option value="shield">Lambang Perisai Resmi</option>
                    <option value="corporate">Monogram Lembaga</option>
                    <option value="none">Tanpa Lambang</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      {doc.letterhead.customLogoDataUrl ? 'Ganti Lambang' : 'Unggah Lambang'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={(e) => handleUploadLogo(e, 'left')}
                        className="hidden"
                      />
                    </label>
                    {doc.letterhead.customLogoDataUrl && (
                      <button
                        type="button"
                        onClick={() => updateKop({ customLogoDataUrl: null })}
                        title="Hapus gambar unggahan"
                        className="p-1.5 text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Ukuran Lambang Kiri</span>
                      <span className="font-mono tabular-nums">36–110 px</span>
                    </div>
                    <input
                      type="range"
                      min={36}
                      max={110}
                      value={doc.letterhead.leftLogoSize || 68}
                      onChange={(e) =>
                        updateKop({ leftLogoSize: Number(e.target.value) })
                      }
                      className="w-full accent-[#1e3a5f] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Slot Lambang Kanan */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      2. Lambang Kanan
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      {doc.letterhead.rightLogoSize || 68}px
                    </span>
                  </div>

                  <select
                    value={doc.letterhead.rightBuiltInLogo ?? doc.letterhead.builtInLogo}
                    onChange={(e) =>
                      updateKop({
                        rightBuiltInLogo: e.target.value as BuiltInLogoId,
                        rightLogoDataUrl: null,
                        showRightLogo: e.target.value !== 'none',
                      })
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                  >
                    <option value="organization">Lambang Yayasan / Organisasi</option>
                    <option value="academic">Lambang Pendidikan / Sekolah</option>
                    <option value="shield">Lambang Perisai Resmi</option>
                    <option value="corporate">Monogram Lembaga</option>
                    <option value="none">Tanpa Lambang</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      {doc.letterhead.rightLogoDataUrl ? 'Ganti Lambang' : 'Unggah Lambang'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={(e) => handleUploadLogo(e, 'right')}
                        className="hidden"
                      />
                    </label>
                    {doc.letterhead.rightLogoDataUrl && (
                      <button
                        type="button"
                        onClick={() => updateKop({ rightLogoDataUrl: null })}
                        title="Hapus gambar unggahan"
                        className="p-1.5 text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Ukuran Lambang Kanan</span>
                      <span className="font-mono tabular-nums">36–110 px</span>
                    </div>
                    <input
                      type="range"
                      min={36}
                      max={110}
                      value={doc.letterhead.rightLogoSize || 68}
                      onChange={(e) =>
                        updateKop({ rightLogoSize: Number(e.target.value) })
                      }
                      className="w-full accent-[#1e3a5f] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tata Letak Kop</label>
                  <select
                    value={doc.letterhead.layout}
                    onChange={(e) => {
                      const layout = e.target.value as LetterheadLayout;
                      updateKop({
                        layout,
                        showRightLogo: layout === 'dual-center',
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="dual-center">Dua Lambang (Kiri &amp; Kanan) · Teks Tengah</option>
                    <option value="left-center">Lambang Kiri · Teks Tengah</option>
                    <option value="left-left">Lambang Kiri · Teks Kiri</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Garis Pembatas Kop</label>
                  <select
                    value={doc.letterhead.dividerStyle}
                    onChange={(e) =>
                      updateKop({ dividerStyle: e.target.value as DividerStyle })
                    }
                    className={inputClass}
                  >
                    <option value="double-official">Garis Ganda Tebal-Tipis (Resmi)</option>
                    <option value="single-bold">Garis Tunggal Tegas</option>
                    <option value="accent-line">Garis Aksen Berwarna</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Warna Aksen Kop &amp; Garis</label>
                <div className="flex items-center gap-2.5">
                  {ACCENT_SWATCHES.map((swatch) => {
                    const active = doc.letterhead.accentColor === swatch.value;
                    return (
                      <button
                        key={swatch.value}
                        type="button"
                        onClick={() => updateKop({ accentColor: swatch.value })}
                        title={swatch.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'border-slate-900 bg-slate-100 font-medium text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm inline-block shrink-0"
                          style={{ backgroundColor: swatch.value }}
                        />
                        {swatch.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'kepala' && (
          <>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Jenis Format Naskah Surat</label>
                <select
                  value={letterKind}
                  onChange={(e) => handleChangeLetterKind(e.target.value as LetterKind)}
                  className={inputClass}
                >
                  <option value="standard">Surat Umum / Korespondensi / Edaran</option>
                  <option value="sk">Surat Keputusan (SK)</option>
                  <option value="surat-tugas">Surat Tugas</option>
                  <option value="surat-keterangan">Surat Keterangan</option>
                  <option value="surat-kuasa">Surat Kuasa</option>
                  <option value="surat-pengantar">Surat Pengantar</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Struktur Kepala Surat</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleChangeFormatStyle('correspondence')}
                    className={`py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      doc.formatStyle === 'correspondence'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Korespondensi (Hal &amp; Yth.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeFormatStyle('decree')}
                    className={`py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      doc.formatStyle === 'decree'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Judul Tengah (SK/Tugas/Ket.)
                  </button>
                </div>
              </div>
            </div>

            {(doc.formatStyle === 'decree' || letterKind === 'surat-pengantar') && (
              <div>
                <label className={labelClass}>Judul Surat (Tengah Atas)</label>
                <input
                  type="text"
                  value={doc.decreeTitle}
                  onChange={(e) => updateDoc({ decreeTitle: e.target.value })}
                  placeholder="Contoh: SURAT KEPUTUSAN / SURAT KETERANGAN / SURAT TUGAS"
                  className={inputClass}
                />
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Pengaturan Nomor Surat Resmi
                </label>
                <button
                  type="button"
                  onClick={handleAutoNumber}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Kosongkan &amp; Sesuaikan
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={labelClass}>No. Urut (Opsional / Kosongkan)</label>
                  <input
                    type="text"
                    value={parsedNumber.seq}
                    onChange={(e) => updateNumberParts({ seq: e.target.value })}
                    placeholder="Dikosongkan (mis. 001)"
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Tujuan Surat (A / B)</label>
                  <select
                    value={parsedNumber.scope}
                    onChange={(e) =>
                      updateNumberParts({ scope: e.target.value as 'A' | 'B' })
                    }
                    className={inputClass}
                  >
                    <option value="A">A · Surat Internal</option>
                    <option value="B">B · Surat Eksternal</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Kode Perihal Surat</label>
                  <select
                    value={parsedNumber.subjectCode}
                    onChange={(e) => updateNumberParts({ subjectCode: e.target.value })}
                    className={inputClass}
                  >
                    {LETTER_SUBJECT_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Kode Lembaga Penerbit</label>
                  <select
                    value={parsedNumber.orgCode}
                    onChange={(e) => updateNumberParts({ orgCode: e.target.value })}
                    className={inputClass}
                  >
                    {INSTITUTION_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Hasil Nomor Surat (Dapat Diedit Manual)</label>
                <input
                  type="text"
                  value={doc.letterNumber}
                  onChange={(e) => updateDoc({ letterNumber: e.target.value })}
                  placeholder="    .A/UND-SDITQ/XI/2026"
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Kota Penerbitan</label>
                <input
                  type="text"
                  value={doc.city}
                  onChange={(e) => updateDoc({ city: e.target.value })}
                  placeholder="Jakarta"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Tanggal Surat</label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextDate = formatIndonesianDate();
                      const { romanMonth, year } =
                        getRomanMonthAndYearFromDateString(nextDate);
                      updateDoc({
                        dateString: nextDate,
                        letterNumber: formatOfficialLetterNumber({
                          ...parsedNumber,
                          romanMonth,
                          year,
                        }),
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-3 h-3" />
                    Hari Ini
                  </button>
                </div>
                <input
                  type="text"
                  value={doc.dateString}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    const { romanMonth, year } =
                      getRomanMonthAndYearFromDateString(nextDate);
                    updateDoc({
                      dateString: nextDate,
                      letterNumber: formatOfficialLetterNumber({
                        ...parsedNumber,
                        romanMonth,
                        year,
                      }),
                    });
                  }}
                  placeholder="14 November 2026"
                  className={inputClass}
                />
              </div>
            </div>

            {doc.formatStyle === 'correspondence' && (
              <>
                {letterKind !== 'surat-pengantar' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Sifat Surat</label>
                        <select
                          value={doc.urgency}
                          onChange={(e) => updateDoc({ urgency: e.target.value })}
                          className={inputClass}
                        >
                          <option value="-">Tidak Dicantumkan</option>
                          <option value="Biasa">Biasa</option>
                          <option value="Penting">Penting</option>
                          <option value="Segera">Segera</option>
                          <option value="Rahasia">Rahasia</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Lampiran</label>
                        <input
                          type="text"
                          value={doc.attachment}
                          onChange={(e) => updateDoc({ attachment: e.target.value })}
                          placeholder="- atau 1 (satu) berkas"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Perihal / Hal</label>
                      <input
                        type="text"
                        value={doc.subject}
                        onChange={(e) => updateDoc({ subject: e.target.value })}
                        placeholder="Pokok isi surat"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>Tujuan / Kepada Yth. (1 baris per elemen)</label>
                  <textarea
                    rows={4}
                    value={doc.recipientLines.join('\n')}
                    onChange={(e) =>
                      updateDoc({ recipientLines: e.target.value.split('\n') })
                    }
                    placeholder={'Yth. Bapak/Ibu Pimpinan\ndi Tempat'}
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'isi' && (
          <div className="space-y-4">
            {/* Pemilih Pemisah Form Isi Naskah: Korespondensi vs Judul Tengah */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleChangeFormatStyle('correspondence')}
                className={`py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  doc.formatStyle === 'correspondence'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Surat Korespondensi
              </button>
              <button
                type="button"
                onClick={() => handleChangeFormatStyle('decree')}
                className={`py-2 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  doc.formatStyle === 'decree'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Surat Judul Tengah
              </button>
            </div>

            {doc.formatStyle === 'correspondence' ? (
              <CorrespondenceContentForm
                doc={doc}
                letterKind={letterKind}
                onUpdateDoc={updateDoc}
                onChangeLetterKind={handleChangeLetterKind}
              />
            ) : (
              <DecreeContentForm
                doc={doc}
                letterKind={letterKind}
                onUpdateDoc={updateDoc}
                onChangeLetterKind={handleChangeLetterKind}
              />
            )}
          </div>
        )}

        {activeTab === 'qr' && (
          <QrSignaturePanel
            doc={doc}
            onUpdateDoc={updateDoc}
            onOpenLetterLink={onOpenLetterLink}
          />
        )}

        {activeTab === 'pengesahan' && (
          <>
            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>Keterangan Jabatan / Atas Nama (Baris 1)</label>
                <textarea
                  rows={2}
                  value={doc.signerDepartment}
                  onChange={(e) => updateDoc({ signerDepartment: e.target.value })}
                  placeholder="Contoh: a.n. Kepala Dinas / PT Nusantara Karya Mandiri"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Jabatan Penandatangan (Baris 2, opsional)</label>
                <input
                  type="text"
                  value={doc.signerTitle}
                  onChange={(e) => updateDoc({ signerTitle: e.target.value })}
                  placeholder="Contoh: Direktur Utama,"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Nama Lengkap &amp; Gelar Penandatangan</label>
                <input
                  type="text"
                  value={doc.signerName}
                  onChange={(e) => updateDoc({ signerName: e.target.value })}
                  placeholder="Drs. Hendra Wijaya, M.Si."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">Label ID</label>
                    <div className="flex items-center gap-1">
                      {(['NIY', 'NIP', 'NUPTK'] as const).map((presetLabel) => (
                        <button
                          key={presetLabel}
                          type="button"
                          onClick={() => updateDoc({ signerIdLabel: presetLabel })}
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded cursor-pointer transition-colors ${
                            doc.signerIdLabel === presetLabel
                              ? 'bg-[#1e3a5f] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {presetLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={doc.signerIdLabel}
                    onChange={(e) => updateDoc({ signerIdLabel: e.target.value })}
                    placeholder="NIY / NIP"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>
                    Nomor Induk ({doc.signerIdLabel || 'NIY / NIP / NUPTK'})
                  </label>
                  <input
                    type="text"
                    value={doc.signerIdValue}
                    onChange={(e) => updateDoc({ signerIdValue: e.target.value })}
                    placeholder="Masukkan nomor NIY / NIP / NUPTK"
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
              </div>
            </div>

            {/* Kotak Tanda Tangan Manual & Mode Pengesahan */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-700">
                  Kotak Tanda Tangan Manual
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('qr')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Menu TTD QR-Code
                  </button>
                  {doc.signatureDataUrl && (doc.signatureMode || 'manual') !== 'qr' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        {doc.signatureScale}%
                      </span>
                      <input
                        type="range"
                        min={60}
                        max={140}
                        value={doc.signatureScale}
                        onChange={(e) =>
                          updateDoc({ signatureScale: Number(e.target.value) })
                        }
                        className="w-16 accent-[#1e3a5f]"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'manual', label: 'TTD Manual' },
                    { id: 'qr', label: 'QR Elektronik' },
                    { id: 'both', label: 'QR + TTD' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateDoc({ signatureMode: item.id as SignatureMode })}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      (doc.signatureMode || 'manual') === item.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {(doc.signatureMode || 'manual') !== 'qr' ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <div>
                      <div className="text-xs font-medium text-slate-800">
                        Bingkai Kotak TTD Manual di Surat
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tampilkan kotak tanda tangan manual di atas Nama &amp; {doc.signerIdLabel || 'NIY'} penandatangan
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(doc.showManualSignatureBox)}
                      onClick={() =>
                        updateDoc({ showManualSignatureBox: !doc.showManualSignatureBox })
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        doc.showManualSignatureBox ? 'bg-[#1e3a5f]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                          doc.showManualSignatureBox ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <SignaturePad
                    value={doc.signatureDataUrl}
                    onChange={(signatureDataUrl) => updateDoc({ signatureDataUrl })}
                  />
                </>
              ) : (
                <p className="text-[11px] text-slate-500 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Mode aktif adalah <strong>QR Elektronik</strong>. Pilih &ldquo;TTD Manual&rdquo; atau &ldquo;QR + TTD&rdquo; di atas untuk mengaktifkan kotak tanda tangan manual; Nama dan {doc.signerIdLabel || 'NIY'} penandatangan tetap tampil di surat.
                </p>
              )}
            </div>

            {/* Stempel Instansi (Otomatis SVG atau Unggah PNG) */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    Stempel Instansi / Lembaga
                  </div>
                  <div className="text-xs text-slate-500">
                    Gunakan stempel otomatis atau unggah file stempel PNG transparan
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={doc.showStamp}
                  onClick={() => updateDoc({ showStamp: !doc.showStamp })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    doc.showStamp ? 'bg-[#1e3a5f]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                      doc.showStamp ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {doc.showStamp && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateDoc({ stampMode: 'auto-svg' as StampMode })}
                      className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        (doc.stampMode || 'auto-svg') === 'auto-svg'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Stempel Otomatis
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDoc({ stampMode: 'custom-png' as StampMode })}
                      className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        doc.stampMode === 'custom-png'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Unggah Stempel PNG
                    </button>
                  </div>

                  {doc.stampMode === 'custom-png' ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-md border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {doc.customStampDataUrl ? (
                            <img
                              src={doc.customStampDataUrl}
                              alt="Pratinjau Stempel PNG"
                              className="w-14 h-14 object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 text-center px-1">
                              Belum ada PNG
                            </span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap">
                              <Upload className="w-3.5 h-3.5" />
                              {doc.customStampDataUrl ? 'Ganti Stempel PNG' : 'Unggah Stempel PNG'}
                              <input
                                type="file"
                                accept="image/png,image/webp,image/svg+xml"
                                onChange={handleUploadStamp}
                                className="hidden"
                              />
                            </label>
                            {doc.customStampDataUrl && (
                              <button
                                type="button"
                                onClick={() => updateDoc({ customStampDataUrl: null })}
                                title="Hapus stempel PNG"
                                className="p-1.5 text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Disarankan file PNG berlatar belakang transparan agar menyatu rapi dengan tanda tangan.
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Ukuran Stempel PNG</span>
                          <span className="font-mono tabular-nums">
                            {doc.stampScale ?? 100}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={60}
                          max={160}
                          value={doc.stampScale ?? 100}
                          onChange={(e) =>
                            updateDoc({ stampScale: Number(e.target.value) })
                          }
                          className="w-full accent-[#1e3a5f] cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Teks Lingkar Stempel</label>
                          <input
                            type="text"
                            value={doc.stampTextTop}
                            onChange={(e) => updateDoc({ stampTextTop: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Teks Tengah Stempel</label>
                          <input
                            type="text"
                            value={doc.stampTextCenter}
                            onChange={(e) => updateDoc({ stampTextCenter: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Ukuran Stempel</span>
                          <span className="font-mono tabular-nums">
                            {doc.stampScale ?? 100}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={70}
                          max={140}
                          value={doc.stampScale ?? 100}
                          onChange={(e) =>
                            updateDoc({ stampScale: Number(e.target.value) })
                          }
                          className="w-full accent-[#1e3a5f] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pengaturan Kertas & Tipografi */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="text-xs font-medium text-slate-700">
                Format Kertas &amp; Tipografi Cetak
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Ukuran Kertas</label>
                  <select
                    value={doc.paperSize}
                    onChange={(e) => updateDoc({ paperSize: e.target.value as PaperSize })}
                    className={inputClass}
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="F4">F4 / Folio (215 × 330 mm)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Margin Kertas</label>
                  <select
                    value={doc.marginPreset}
                    onChange={(e) =>
                      updateDoc({ marginPreset: e.target.value as MarginPreset })
                    }
                    className={inputClass}
                  >
                    <option value="standard">Standar Dinas</option>
                    <option value="compact">Rapat (Muat Lebih Banyak)</option>
                    <option value="wide">Lebar (Eksekutif)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Jenis Huruf Surat</label>
                  <select
                    value={doc.fontFamily}
                    onChange={(e) => updateDoc({ fontFamily: e.target.value as LetterFont })}
                    className={inputClass}
                  >
                    <option value="times">Times New Roman (Dinas)</option>
                    <option value="arial">Arial / Sans-Serif (Korporat)</option>
                    <option value="georgia">Georgia Serif (Formal Klasik)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ukuran Huruf</label>
                  <select
                    value={doc.fontSizePt}
                    onChange={(e) =>
                      updateDoc({ fontSizePt: Number(e.target.value) as 10 | 11 | 12 })
                    }
                    className={inputClass}
                  >
                    <option value={10}>10 pt</option>
                    <option value={11}>11 pt (Rekomendasi)</option>
                    <option value={12}>12 pt</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
