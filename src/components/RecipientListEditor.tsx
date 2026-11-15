import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { RecipientPartyInfo } from '../types/letter';
import { createDefaultRecipientParty } from '../data/presets';

interface RecipientListEditorProps {
  title: string;
  allowMultiple?: boolean;
  recipientParty?: RecipientPartyInfo;
  recipientParties?: RecipientPartyInfo[];
  onChange: (primary: RecipientPartyInfo, list: RecipientPartyInfo[]) => void;
}

function createBlankRecipient(roleType: 'guru' | 'siswa'): RecipientPartyInfo {
  return {
    roleType,
    name: '',
    birthPlaceDate: '',
    studentNisn: '',
    teacherIdType: 'NIY',
    teacherIdNumber: '',
    position: '',
    address: '',
  };
}

export const RecipientListEditor: React.FC<RecipientListEditorProps> = ({
  title,
  allowMultiple = false,
  recipientParty,
  recipientParties,
  onChange,
}) => {
  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1';

  const recipients: RecipientPartyInfo[] =
    recipientParties && recipientParties.length > 0
      ? recipientParties
      : [recipientParty || createDefaultRecipientParty('guru')];

  const isMulti = allowMultiple && recipients.length > 1;

  const commitList = (nextList: RecipientPartyInfo[]) => {
    const safeList =
      nextList.length > 0 ? nextList : [createDefaultRecipientParty('guru')];
    onChange(safeList[0], safeList);
  };

  const updateRecipientAt = (
    idx: number,
    patch: Partial<RecipientPartyInfo>
  ) => {
    const nextList = recipients.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );
    commitList(nextList);
  };

  const handleAddPerson = () => {
    if (recipients.length >= 50) return;
    const lastRole = recipients[recipients.length - 1]?.roleType || 'guru';
    commitList([...recipients, createBlankRecipient(lastRole)]);
  };

  const handleRemovePerson = (idx: number) => {
    if (recipients.length <= 1) return;
    commitList(recipients.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-slate-900 block">
            {title}
          </span>
          {allowMultiple && (
            <span className="text-[11px] text-slate-500 block">
              {isMulti
                ? `${recipients.length} orang — pratinjau otomatis berbentuk tabel daftar.`
                : '1 orang (tampilan daftar rincian). Tambah orang untuk format tabel.'}
            </span>
          )}
        </div>

        {allowMultiple && recipients.length < 50 && (
          <button
            type="button"
            onClick={handleAddPerson}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1e3a5f] bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Orang
          </button>
        )}
      </div>

      <div className="space-y-3">
        {recipients.map((person, idx) => (
          <div
            key={idx}
            className={
              isMulti
                ? 'rounded-md border border-slate-200 bg-white p-3 space-y-2.5'
                : 'space-y-2.5'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              {isMulti ? (
                <span className="text-[11px] font-semibold text-slate-700">
                  Orang #{idx + 1}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-500">
                  Kategori Penerima
                </span>
              )}

              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-md text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => updateRecipientAt(idx, { roleType: 'guru' })}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                      person.roleType === 'guru'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Guru / Staf
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRecipientAt(idx, { roleType: 'siswa' })}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                      person.roleType === 'siswa'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Siswa
                  </button>
                </div>

                {isMulti && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(idx)}
                    title="Hapus orang"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={labelClass}>Nama Lengkap</label>
                <input
                  type="text"
                  value={person.name}
                  onChange={(e) =>
                    updateRecipientAt(idx, { name: e.target.value })
                  }
                  placeholder="Nama lengkap"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tempat / Tanggal Lahir</label>
                <input
                  type="text"
                  value={person.birthPlaceDate}
                  onChange={(e) =>
                    updateRecipientAt(idx, { birthPlaceDate: e.target.value })
                  }
                  placeholder="Contoh: Palembang, 21 Mei 1995"
                  className={inputClass}
                />
              </div>
            </div>

            {person.roleType === 'siswa' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={labelClass}>
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <input
                    type="text"
                    value={person.studentNisn}
                    onChange={(e) =>
                      updateRecipientAt(idx, { studentNisn: e.target.value })
                    }
                    placeholder="Contoh: 0154829104"
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Kelas</label>
                  <input
                    type="text"
                    value={person.position}
                    onChange={(e) =>
                      updateRecipientAt(idx, { position: e.target.value })
                    }
                    placeholder="Contoh: IV (Empat)"
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className={labelClass}>Jenis ID Guru</label>
                  <select
                    value={person.teacherIdType}
                    onChange={(e) =>
                      updateRecipientAt(idx, {
                        teacherIdType: e.target.value as 'NIY' | 'NUPTK',
                      })
                    }
                    className={inputClass}
                  >
                    <option value="NIY">NIY</option>
                    <option value="NUPTK">NUPTK</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    Nomor {person.teacherIdType}
                  </label>
                  <input
                    type="text"
                    value={person.teacherIdNumber}
                    onChange={(e) =>
                      updateRecipientAt(idx, {
                        teacherIdNumber: e.target.value,
                      })
                    }
                    placeholder={`Masukkan nomor ${person.teacherIdType}`}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Jabatan</label>
                  <input
                    type="text"
                    value={person.position}
                    onChange={(e) =>
                      updateRecipientAt(idx, { position: e.target.value })
                    }
                    placeholder="Contoh: Guru Kelas"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>
                Alamat
                {isMulti && (
                  <span className="ml-1 font-normal text-slate-400">
                    (opsional pada tampilan tabel)
                  </span>
                )}
              </label>
              <textarea
                rows={isMulti ? 1 : 2}
                value={person.address}
                onChange={(e) =>
                  updateRecipientAt(idx, { address: e.target.value })
                }
                placeholder="Alamat lengkap..."
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
