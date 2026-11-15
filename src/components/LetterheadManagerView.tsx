import React, { useState } from 'react';
import { Plus, Trash2, Check, Upload } from 'lucide-react';
import {
  BuiltInLogoId,
  ContactLastLineMode,
  DividerStyle,
  LetterCategory,
  LetterheadConfig,
  LetterheadLayout,
} from '../types/letter';
import { OfficialEmblem } from './OfficialEmblems';

interface LetterheadManagerViewProps {
  profiles: LetterheadConfig[];
  activeProfileId: string;
  onApplyProfile: (profile: LetterheadConfig) => void;
  onAddProfile: (profile: LetterheadConfig) => void;
  onUpdateProfile: (profile: LetterheadConfig) => void;
  onDeleteProfile: (id: string) => void;
}

export const LetterheadManagerView: React.FC<LetterheadManagerViewProps> = ({
  profiles,
  activeProfileId,
  onApplyProfile,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
}) => {
  const [selectedId, setSelectedId] = useState<string>(profiles[0]?.id || '');
  const selected = profiles.find((p) => p.id === selectedId) || profiles[0];

  const handleCreateNew = () => {
    const newProfile: LetterheadConfig = {
      id: `kop-custom-${Date.now()}`,
      profileName: 'KOP Surat Baru',
      category: 'Pendidikan',
      parentOrg: 'YAYASAN',
      orgName: 'NAMA LEMBAGA / INSTANSI',
      subUnit: 'Unit / Bidang Administrasi',
      address: 'Jl. Palembang – Jambi, Sungai Rengit, Kab. Banyuasin',
      contactLine: 'Telp. / WhatsApp: 0812-0000-0000',
      websiteLine: 'Website: www.lembaga.or.id',
      websiteEmailLine: 'Email: sekretariat@lembaga.or.id',
      layout: 'dual-center',
      dividerStyle: 'double-official',
      accentColor: '#1e3a5f',
      builtInLogo: 'academic',
      rightBuiltInLogo: 'organization',
      customLogoDataUrl: null,
      leftLogoSize: 68,
      showRightLogo: true,
      rightLogoDataUrl: null,
      rightLogoSize: 68,
    };
    onAddProfile(newProfile);
    setSelectedId(newProfile.id);
  };

  const handleLogoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'left' | 'right'
  ) => {
    if (!selected) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (side === 'left') {
          onUpdateProfile({ ...selected, customLogoDataUrl: reader.result });
        } else {
          onUpdateProfile({
            ...selected,
            rightLogoDataUrl: reader.result,
            showRightLogo: true,
          });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Manajemen Profil Kop Surat Resmi
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Simpan berbagai identitas instansi, perusahaan, atau organisasi agar siap digunakan pada template surat mana pun.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Buat Profil Kop Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left List */}
        <div className="lg:col-span-4 space-y-2">
          {profiles.map((profile) => {
            const isSelected = selected?.id === profile.id;
            const isApplied = activeProfileId === profile.id;
            const isBuiltIn = profile.id.startsWith('kop-') && !profile.id.startsWith('kop-custom-');

            return (
              <div
                key={profile.id}
                onClick={() => setSelectedId(profile.id)}
                className={`p-3.5 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#1e3a5f]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {profile.profileName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {profile.category}
                      {isApplied ? ' · Sedang Dipakai' : ''}
                    </div>
                  </div>
                  {!isBuiltIn && profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProfile(profile.id);
                      }}
                      title="Hapus profil"
                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail & Live Kop Preview */}
        {selected && (
          <div className="lg:col-span-8 space-y-6">
            {/* Live Letterhead Preview Strip */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-500">
                  Pratinjau Kop Surat
                </span>
                <button
                  type="button"
                  onClick={() => onApplyProfile(selected)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Gunakan pada Surat Aktif
                </button>
              </div>

              <div className="border border-slate-200 bg-white p-6 rounded">
                <div
                  className={`flex items-center gap-4 ${
                    selected.layout === 'left-left' ? 'justify-start' : 'justify-between'
                  }`}
                >
                  {selected.customLogoDataUrl ? (
                    <img
                      src={selected.customLogoDataUrl}
                      alt="Lambang Kiri"
                      referrerPolicy="no-referrer"
                      style={{
                        width: `${selected.leftLogoSize || 68}px`,
                        height: `${selected.leftLogoSize || 68}px`,
                        objectFit: 'contain',
                      }}
                      className="shrink-0"
                    />
                  ) : selected.builtInLogo !== 'none' ? (
                    <OfficialEmblem
                      logoId={selected.builtInLogo}
                      color={selected.accentColor}
                      size={selected.leftLogoSize || 68}
                    />
                  ) : null}

                  <div
                    className={`flex-1 ${
                      selected.layout === 'left-left' ? 'text-left' : 'text-center'
                    }`}
                  >
                    {selected.parentOrg && (
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                        {selected.parentOrg}
                      </div>
                    )}
                    <div
                      className="text-lg font-bold uppercase leading-tight"
                      style={{
                        color:
                          selected.dividerStyle === 'accent-line'
                            ? selected.accentColor
                            : '#0f172a',
                      }}
                    >
                      {selected.orgName}
                    </div>
                    {selected.subUnit && (
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">
                        {selected.subUnit}
                      </div>
                    )}
                    <div className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                      {selected.address}
                    </div>
                    {(() => {
                      const mode =
                        selected.contactLastLineMode ||
                        (selected.websiteOnLastLine ? 'website-last' : 'inline');
                      if (mode === 'website-last') {
                        return (
                          <>
                            <div className="text-xs text-slate-600">
                              {[selected.contactLine, selected.websiteEmailLine]
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {selected.websiteLine && selected.websiteLine.trim() && (
                              <div className="text-xs text-slate-600">
                                {selected.websiteLine.trim()}
                              </div>
                            )}
                          </>
                        );
                      }
                      if (mode === 'email-last') {
                        return (
                          <>
                            <div className="text-xs text-slate-600">
                              {[selected.contactLine, selected.websiteLine || '']
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {selected.websiteEmailLine.trim() && (
                              <div className="text-xs text-slate-600">
                                {selected.websiteEmailLine.trim()}
                              </div>
                            )}
                          </>
                        );
                      }
                      return (
                        <div className="text-xs text-slate-600">
                          {[
                            selected.contactLine,
                            selected.websiteLine || '',
                            selected.websiteEmailLine,
                          ]
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      );
                    })()}
                  </div>

                  {selected.layout !== 'left-left' && (
                    <div className="shrink-0 flex items-center justify-end">
                      {(selected.showRightLogo || selected.layout === 'dual-center') ? (
                        selected.rightLogoDataUrl ? (
                          <img
                            src={selected.rightLogoDataUrl}
                            alt="Lambang Kanan"
                            referrerPolicy="no-referrer"
                            style={{
                              width: `${selected.rightLogoSize || 68}px`,
                              height: `${selected.rightLogoSize || 68}px`,
                              objectFit: 'contain',
                            }}
                          />
                        ) : (selected.rightBuiltInLogo ?? selected.builtInLogo) !== 'none' ? (
                          <OfficialEmblem
                            logoId={selected.rightBuiltInLogo ?? selected.builtInLogo}
                            color={selected.accentColor}
                            size={selected.rightLogoSize || 68}
                          />
                        ) : null
                      ) : (
                        <div style={{ width: `${selected.leftLogoSize || 68}px` }} />
                      )}
                    </div>
                  )}
                </div>
                {selected.dividerStyle === 'double-official' ? (
                  <div className="mt-3">
                    <div className="h-[3px]" style={{ backgroundColor: selected.accentColor }} />
                    <div className="h-[1px] mt-0.5" style={{ backgroundColor: selected.accentColor }} />
                  </div>
                ) : (
                  <div
                    className="mt-3 h-[2.5px]"
                    style={{ backgroundColor: selected.accentColor }}
                  />
                )}
              </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Profil
                  </label>
                  <input
                    type="text"
                    value={selected.profileName}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, profileName: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={selected.category}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...selected,
                        category: e.target.value as LetterCategory,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="Pemerintahan">Pemerintahan</option>
                    <option value="Perusahaan">Perusahaan</option>
                    <option value="Pendidikan">Pendidikan</option>
                    <option value="Organisasi">Organisasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Instansi Induk (Opsional)
                  </label>
                  <input
                    type="text"
                    value={selected.parentOrg}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, parentOrg: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Instansi / Perusahaan Utama
                  </label>
                  <input
                    type="text"
                    value={selected.orgName}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, orgName: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {selected.id === 'kop-sdit-qudwah' ||
              selected.id === 'kop-kbit-qudwah' ||
              /^NPSN:/i.test(selected.subUnit.trim()) ? (
                (() => {
                  const match = selected.subUnit.match(
                    /^NPSN:\s*(.*?)\s*\|\s*Akreditasi:\s*(.*)$/i
                  );
                  const npsnVal = match ? match[1] : '';
                  const akredVal = match ? match[2] : '';
                  const updateNpsnAkred = (nextNpsn: string, nextAkred: string) => {
                    onUpdateProfile({
                      ...selected,
                      subUnit: `NPSN: ${nextNpsn} | Akreditasi: ${nextAkred}`,
                    });
                  };
                  return (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        NPSN &amp; Akreditasi
                      </label>
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sub Unit / Bidang / Divisi
                  </label>
                  <input
                    type="text"
                    value={selected.subUnit}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, subUnit: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Lengkap (Tekan Enter untuk baris ke-2)
                </label>
                <textarea
                  rows={2}
                  value={selected.address}
                  onChange={(e) =>
                    onUpdateProfile({ ...selected, address: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={selected.contactLine}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, contactLine: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={selected.websiteLine || ''}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, websiteLine: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Resmi
                  </label>
                  <input
                    type="text"
                    value={selected.websiteEmailLine}
                    onChange={(e) =>
                      onUpdateProfile({ ...selected, websiteEmailLine: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Susunan Baris Kontak &amp; Tautan
                </label>
                <select
                  value={
                    selected.contactLastLineMode ||
                    (selected.websiteOnLastLine ? 'website-last' : 'inline')
                  }
                  onChange={(e) => {
                    const mode = e.target.value as ContactLastLineMode;
                    onUpdateProfile({
                      ...selected,
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tata Letak
                  </label>
                  <select
                    value={selected.layout}
                    onChange={(e) => {
                      const layout = e.target.value as LetterheadLayout;
                      onUpdateProfile({
                        ...selected,
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Gaya Garis
                  </label>
                  <select
                    value={selected.dividerStyle}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...selected,
                        dividerStyle: e.target.value as DividerStyle,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="double-official">Garis Ganda Dinas</option>
                    <option value="single-bold">Garis Tunggal Tebal</option>
                    <option value="accent-line">Garis Aksen Warna</option>
                  </select>
                </div>
              </div>

              {/* Dua Tempat Unggah Lambang & Pengaturan Ukuran */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Dua Tempat Unggah Lambang &amp; Ukuran
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfile({
                        ...selected,
                        rightLogoSize: selected.leftLogoSize || 68,
                      })
                    }
                    className="text-xs font-medium text-[#1e3a5f] hover:underline cursor-pointer"
                  >
                    Samakan Ukuran Kiri &amp; Kanan
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lambang Kiri */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        1. Lambang Kiri
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-600">
                        {selected.leftLogoSize || 68}px
                      </span>
                    </div>

                    <select
                      value={selected.builtInLogo}
                      onChange={(e) =>
                        onUpdateProfile({
                          ...selected,
                          builtInLogo: e.target.value as BuiltInLogoId,
                          customLogoDataUrl: null,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="organization">Lambang Yayasan / Organisasi</option>
                      <option value="academic">Lambang Pendidikan / Sekolah</option>
                      <option value="shield">Perisai Resmi</option>
                      <option value="corporate">Monogram Lembaga</option>
                      <option value="none">Tanpa Lambang</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        {selected.customLogoDataUrl ? 'Ganti Lambang Kiri' : 'Unggah Lambang Kiri'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          onChange={(e) => handleLogoUpload(e, 'left')}
                          className="hidden"
                        />
                      </label>
                      {selected.customLogoDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProfile({ ...selected, customLogoDataUrl: null })
                          }
                          className="px-2.5 py-2 text-xs text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          Hapus
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
                        value={selected.leftLogoSize || 68}
                        onChange={(e) =>
                          onUpdateProfile({
                            ...selected,
                            leftLogoSize: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#1e3a5f] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Lambang Kanan */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        2. Lambang Kanan
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-600">
                        {selected.rightLogoSize || 68}px
                      </span>
                    </div>

                    <select
                      value={selected.rightBuiltInLogo ?? selected.builtInLogo}
                      onChange={(e) =>
                        onUpdateProfile({
                          ...selected,
                          rightBuiltInLogo: e.target.value as BuiltInLogoId,
                          rightLogoDataUrl: null,
                          showRightLogo: e.target.value !== 'none',
                        })
                      }
                      className={inputClass}
                    >
                      <option value="organization">Lambang Yayasan / Organisasi</option>
                      <option value="academic">Lambang Pendidikan / Sekolah</option>
                      <option value="shield">Perisai Resmi</option>
                      <option value="corporate">Monogram Lembaga</option>
                      <option value="none">Tanpa Lambang</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        {selected.rightLogoDataUrl ? 'Ganti Lambang Kanan' : 'Unggah Lambang Kanan'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          onChange={(e) => handleLogoUpload(e, 'right')}
                          className="hidden"
                        />
                      </label>
                      {selected.rightLogoDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProfile({ ...selected, rightLogoDataUrl: null })
                          }
                          className="px-2.5 py-2 text-xs text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          Hapus
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
                        value={selected.rightLogoSize || 68}
                        onChange={(e) =>
                          onUpdateProfile({
                            ...selected,
                            rightLogoSize: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#1e3a5f] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
