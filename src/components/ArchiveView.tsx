import React, { useMemo, useState } from 'react';
import { Search, FileDown, Copy, Trash2, FolderOpen, Eye } from 'lucide-react';
import { LetterCategory, LetterDocument } from '../types/letter';

interface ArchiveViewProps {
  archivedLetters: LetterDocument[];
  onLoadLetter: (doc: LetterDocument) => void;
  onPreviewLetter: (doc: LetterDocument) => void;
  onDuplicateLetter: (doc: LetterDocument) => void;
  onDeleteLetter: (id: string) => void;
  onCreateNew: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  archivedLetters,
  onLoadLetter,
  onPreviewLetter,
  onDuplicateLetter,
  onDeleteLetter,
  onCreateNew,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | LetterCategory>('Semua');

  const filtered = useMemo(() => {
    return archivedLetters.filter((item) => {
      const matchCat = categoryFilter === 'Semua' || item.category === categoryFilter;
      const q = query.trim().toLowerCase();
      if (!q) return matchCat;
      return (
        matchCat &&
        (item.letterNumber.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.decreeTitle.toLowerCase().includes(q) ||
          item.templateName.toLowerCase().includes(q) ||
          item.letterhead.orgName.toLowerCase().includes(q))
      );
    });
  }, [archivedLetters, query, categoryFilter]);

  const categories: ('Semua' | LetterCategory)[] = [
    'Semua',
    'Pemerintahan',
    'Perusahaan',
    'Pendidikan',
    'Organisasi',
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Arsip Surat Tersimpan</h1>
          <p className="text-sm text-slate-600 mt-1">
            Arsip tersimpan di perangkat ini. Gunakan tombol Sinkronkan Drive di bagian atas untuk mencadangkan dan membukanya di perangkat lain.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Buat Surat Baru
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor, perihal, atau instansi..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none"
          />
        </div>
      </div>

      {/* Populated vs Empty Table */}
      {filtered.length === 0 ? (
        <div className="mt-6 bg-white border border-slate-200 rounded-lg p-12 text-center">
          <div className="mx-auto w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
            <FolderOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {archivedLetters.length === 0
              ? 'Belum ada surat di dalam arsip'
              : 'Tidak ada surat yang sesuai dengan pencarian'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {archivedLetters.length === 0
              ? 'Setelah Anda menyusun surat di Editor, klik tombol "Simpan ke Arsip" agar naskah dapat dibuka atau dicetak ulang kapan saja.'
              : 'Coba ubah kata kunci pencarian atau pilih kategori lain.'}
          </p>
          {archivedLetters.length === 0 && (
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-lg cursor-pointer"
            >
              Buka Editor Surat
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">Nomor Surat</th>
                  <th className="py-3 px-4">Jenis &amp; Perihal</th>
                  <th className="py-3 px-4">Kop Instansi</th>
                  <th className="py-3 px-4">Kertas</th>
                  <th className="py-3 px-4">Tanggal Surat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => {
                  const title =
                    item.formatStyle === 'decree'
                      ? item.decreeTitle || item.templateName
                      : item.subject || item.templateName;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {item.letterNumber || '-'}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">{title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.category} · {item.templateName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 max-w-[200px] truncate">
                        {item.letterhead.orgName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {item.paperSize}
                      </td>
                      <td className="py-3 px-4 text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {item.dateString}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewLetter(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Pratinjau
                          </button>
                          <button
                            type="button"
                            onClick={() => onLoadLetter(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            Sunting
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateLetter(item)}
                            title="Duplikasi surat"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLetter(item.id)}
                            title="Hapus dari arsip"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
