import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  PenTool,
  QrCode,
  ScanLine,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { LetterDocument, QrSourceMode, SignatureMode } from '../types/letter';
import {
  buildLetterShareUrl,
  decodeQrFromImageDataUrl,
  decodeQrFromVideoElement,
  extractSuratTokenFromInput,
  generateQrCodeDataUrl,
} from '../utils/qrSignature';
import { SignaturePad } from './SignaturePad';

interface QrSignaturePanelProps {
  doc: LetterDocument;
  onUpdateDoc: (patch: Partial<LetterDocument>) => void;
  onOpenLetterLink: (url: string) => void;
}

export const QrSignaturePanel: React.FC<QrSignaturePanelProps> = ({
  doc,
  onUpdateDoc,
  onOpenLetterLink,
}) => {
  const signatureMode: SignatureMode = doc.signatureMode || 'manual';
  const qrSourceMode: QrSourceMode = doc.qrSourceMode || 'auto-link';
  const qrSize = doc.qrSize ?? 76;
  const qrShowCaption = doc.qrShowCaption ?? true;

  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Scanner states
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const targetLetterUrl = useMemo(() => buildLetterShareUrl(doc), [doc]);

  useEffect(() => {
    let cancelled = false;
    generateQrCodeDataUrl(targetLetterUrl, 240, '#0f172a')
      .then((dataUrl) => {
        if (!cancelled) setGeneratedQrUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setGeneratedQrUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [targetLetterUrl]);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleDetectedScan = (decodedText: string) => {
    setScanError(null);
    setScanResult(decodedText);
    const token = extractSuratTokenFromInput(decodedText);
    if (token) {
      onOpenLetterLink(decodedText);
    }
  };

  const startCameraScanner = async () => {
    setScanError(null);
    setScanResult(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('Peramban tidak mendukung akses kamera. Gunakan fitur Scan dari File Gambar.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const tick = () => {
          if (!videoRef.current || !scratchCanvasRef.current || !streamRef.current) return;
          const decoded = decodeQrFromVideoElement(videoRef.current, scratchCanvasRef.current);
          if (decoded) {
            stopCamera();
            handleDetectedScan(decoded);
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch {
      setScanError(
        'Kamera tidak dapat diakses atau izin ditolak. Anda tetap dapat mengunggah gambar QR untuk discan.'
      );
      stopCamera();
    }
  };

  const handleUploadCustomQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const decoded = await decodeQrFromImageDataUrl(dataUrl);
        onUpdateDoc({
          signatureMode: signatureMode === 'manual' ? 'qr' : signatureMode,
          qrSourceMode: 'custom-upload',
          customQrDataUrl: dataUrl,
          qrUploadedDecodedUrl: decoded || '',
        });
        if (decoded) {
          setScanResult(decoded);
        } else {
          setScanError('Gambar QR diunggah, namun tautan di dalam QR tidak terbaca.');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScanImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const decoded = await decodeQrFromImageDataUrl(reader.result);
        if (decoded) {
          handleDetectedScan(decoded);
        } else {
          setScanResult(null);
          setScanError('QR-Code tidak terdeteksi pada gambar tersebut.');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const activeQrPreview =
    qrSourceMode === 'custom-upload' && doc.customQrDataUrl
      ? doc.customQrDataUrl
      : generatedQrUrl;

  const isInternalSuratLink = (text: string) => Boolean(extractSuratTokenFromInput(text));
  const isHttpUrl = (text: string) => /^https?:\/\//i.test(text.trim());

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] transition-colors';

  return (
    <div className="space-y-4">
      {/* 1. Pilih Mode Tanda Tangan */}
      <div>
        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
          Jenis Pengesahan Tanda Tangan
        </label>
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
              onClick={() => onUpdateDoc({ signatureMode: item.id })}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                signatureMode === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          {signatureMode === 'manual'
            ? 'Surat menggunakan kotak tanda tangan manual/PNG beserta Nama dan NIY penandatangan.'
            : signatureMode === 'qr'
              ? 'Area tanda tangan menampilkan QR-Code Tanda Tangan Elektronik yang mengarah ke tautan surat ini.'
              : 'Menampilkan QR-Code Elektronik berdampingan dengan kotak tanda tangan manual/PNG.'}
        </p>
      </div>

      {/* 1B. Formulir Identitas Penandatangan (Nama & NIY) - Selalu Tersedia */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#1e3a5f]" />
          Identitas Penandatangan (Nama &amp; NIY)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Jabatan / Atas Nama
            </label>
            <input
              type="text"
              value={doc.signerDepartment}
              onChange={(e) => onUpdateDoc({ signerDepartment: e.target.value })}
              placeholder="Contoh: Kepala Sekolah,"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Sub-Jabatan (Opsional)
            </label>
            <input
              type="text"
              value={doc.signerTitle}
              onChange={(e) => onUpdateDoc({ signerTitle: e.target.value })}
              placeholder="Contoh: SD IT Qudwah Sungai Rengit"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Nama Lengkap &amp; Gelar Penandatangan
          </label>
          <input
            type="text"
            value={doc.signerName}
            onChange={(e) => onUpdateDoc({ signerName: e.target.value })}
            placeholder="Contoh: Ahmad Fauzi, S.Pd.I."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-600">Label ID</label>
              <div className="flex items-center gap-1">
                {(['NIY', 'NIP', 'NUPTK'] as const).map((presetLabel) => (
                  <button
                    key={presetLabel}
                    type="button"
                    onClick={() => onUpdateDoc({ signerIdLabel: presetLabel })}
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
              onChange={(e) => onUpdateDoc({ signerIdLabel: e.target.value })}
              placeholder="NIY / NIP"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Nomor {doc.signerIdLabel || 'NIY / NIP / NUPTK'} Penandatangan
            </label>
            <input
              type="text"
              value={doc.signerIdValue}
              onChange={(e) => onUpdateDoc({ signerIdValue: e.target.value })}
              placeholder="Masukkan nomor NIY / NIP / NUPTK"
              className={`${inputClass} font-mono tabular-nums`}
            />
          </div>
        </div>
      </div>

      {/* 1C. Kotak Tanda Tangan Manual */}
      {signatureMode !== 'qr' && (
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-[#1e3a5f]" />
              Kotak Tanda Tangan Manual
            </div>
            {doc.signatureDataUrl && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {doc.signatureScale}%
                </span>
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={doc.signatureScale}
                  onChange={(e) => onUpdateDoc({ signatureScale: Number(e.target.value) })}
                  className="w-16 accent-[#1e3a5f] cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <div className="text-xs font-medium text-slate-800">
                Bingkai Kotak TTD Manual di Surat
              </div>
              <div className="text-[11px] text-slate-500">
                Menampilkan kotak tanda tangan manual di atas Nama &amp; {doc.signerIdLabel || 'NIY'} penandatangan
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(doc.showManualSignatureBox)}
              onClick={() =>
                onUpdateDoc({ showManualSignatureBox: !doc.showManualSignatureBox })
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
            onChange={(signatureDataUrl) => onUpdateDoc({ signatureDataUrl })}
          />
        </div>
      )}

      {/* 2. Sumber QR-Code (Generate Otomatis atau Upload QR-Code) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-[#1e3a5f]" />
            Sumber QR-Code TTD Elektronik
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() =>
              onUpdateDoc({
                qrSourceMode: 'auto-link',
                signatureMode: signatureMode === 'manual' ? 'qr' : signatureMode,
              })
            }
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              qrSourceMode === 'auto-link'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            QR Otomatis (Link Surat)
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateDoc({
                qrSourceMode: 'custom-upload',
                signatureMode: signatureMode === 'manual' ? 'qr' : signatureMode,
              })
            }
            className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              qrSourceMode === 'custom-upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unggah Gambar QR
          </button>
        </div>

        {/* Preview QR aktif + Aksi */}
        <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-md p-3">
          <div className="w-24 h-24 rounded border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
            {activeQrPreview ? (
              <img
                src={activeQrPreview}
                alt="QR-Code Tanda Tangan Elektronik"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-[10px] text-slate-400 text-center px-1">
                {qrSourceMode === 'custom-upload' ? 'Belum ada QR' : 'Membuat QR...'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {qrSourceMode === 'auto-link' ? (
              <>
                <div className="text-[11px] font-medium text-slate-700">
                  Link Tujuan Saat QR Discan:
                </div>
                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 truncate">
                  {targetLetterUrl}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(targetLetterUrl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer whitespace-nowrap"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Salin Link
                      </>
                    )}
                  </button>

                  {isInternalSuratLink(targetLetterUrl) ? (
                    <button
                      type="button"
                      onClick={() => onOpenLetterLink(targetLetterUrl)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded cursor-pointer whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka Link Surat
                    </button>
                  ) : (
                    <a
                      href={targetLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka Link
                    </a>
                  )}

                  {generatedQrUrl && (
                    <a
                      href={generatedQrUrl}
                      download={`QR-TTD-${(doc.signerName || 'surat').replace(/\s+/g, '-')}.png`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded whitespace-nowrap"
                    >
                      <Download className="w-3 h-3" />
                      Unduh QR
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    {doc.customQrDataUrl ? 'Ganti Gambar QR' : 'Unggah QR-Code'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleUploadCustomQr}
                      className="hidden"
                    />
                  </label>
                  {doc.customQrDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDoc({ customQrDataUrl: null, qrUploadedDecodedUrl: '' })
                      }
                      title="Hapus QR unggahan"
                      className="p-1.5 text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {doc.qrUploadedDecodedUrl ? (
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-emerald-700">
                      Link terdeteksi dari QR:
                    </div>
                    <div className="text-[11px] font-mono text-slate-700 bg-emerald-50/70 border border-emerald-200 rounded px-2 py-1 break-all">
                      {doc.qrUploadedDecodedUrl}
                    </div>
                    {isInternalSuratLink(doc.qrUploadedDecodedUrl) ? (
                      <button
                        type="button"
                        onClick={() => onOpenLetterLink(doc.qrUploadedDecodedUrl!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Buka Surat dari QR
                      </button>
                    ) : (
                      isHttpUrl(doc.qrUploadedDecodedUrl) && (
                        <a
                          href={doc.qrUploadedDecodedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Kunjungi Link QR
                        </a>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Unggah file gambar QR-Code; sistem akan otomatis membaca tautan di dalamnya dan menampilkannya pada area tanda tangan surat.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Custom target link override untuk QR Otomatis */}
        {qrSourceMode === 'auto-link' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-700">
                Link Tujuan Kustom (Opsional)
              </label>
              {doc.qrCustomLink && (
                <button
                  type="button"
                  onClick={() => onUpdateDoc({ qrCustomLink: '' })}
                  className="text-[11px] font-medium text-[#1e3a5f] hover:underline cursor-pointer"
                >
                  Pakai Link Surat Otomatis
                </button>
              )}
            </div>
            <input
              type="url"
              value={doc.qrCustomLink || ''}
              onChange={(e) => onUpdateDoc({ qrCustomLink: e.target.value })}
              placeholder="Kosongkan untuk otomatis mengarah ke halaman verifikasi surat ini"
              className={inputClass}
            />
          </div>
        )}

        {/* Pengaturan ukuran & keterangan QR */}
        <div className="border-t border-slate-200/80 pt-3 space-y-2.5">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Ukuran QR-Code pada Surat</span>
              <span className="font-mono tabular-nums">{qrSize} px</span>
            </div>
            <input
              type="range"
              min={56}
              max={112}
              value={qrSize}
              onChange={(e) => onUpdateDoc({ qrSize: Number(e.target.value) })}
              className="w-full accent-[#1e3a5f] cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qrShowCaption}
              onChange={(e) => onUpdateDoc({ qrShowCaption: e.target.checked })}
              className="rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
            <span>Tampilkan keterangan &ldquo;Ditandatangani secara elektronik&rdquo;</span>
          </label>
        </div>
      </div>

      {/* 3. Menu Scanner / Uji Scan QR-Code */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-[#1e3a5f]" />
              Scan QR-Code Surat
            </div>
            <div className="text-[11px] text-slate-500">
              Pindai QR melalui kamera atau file gambar untuk membuka link surat bersangkutan
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {!isCameraActive ? (
            <button
              type="button"
              onClick={startCameraScanner}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded-md cursor-pointer whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              Scan Kamera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Hentikan Kamera
            </button>
          )}

          <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            Scan dari Gambar
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleScanImageFile}
              className="hidden"
            />
          </label>
        </div>

        <canvas ref={scratchCanvasRef} className="hidden" />

        {isCameraActive && (
          <div className="relative rounded-md overflow-hidden border border-slate-300 bg-slate-950">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-48 object-cover block"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-emerald-400/90 rounded-lg" />
            </div>
          </div>
        )}

        {scanError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {scanError}
          </div>
        )}

        {scanResult && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5 space-y-2">
            <div className="text-[11px] font-semibold text-emerald-800">
              QR-Code Terbaca:
            </div>
            <div className="text-[11px] font-mono text-slate-800 break-all bg-white border border-emerald-200 rounded px-2 py-1">
              {scanResult}
            </div>
            <div className="flex items-center gap-2">
              {isInternalSuratLink(scanResult) ? (
                <button
                  type="button"
                  onClick={() => onOpenLetterLink(scanResult)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Surat Bersangkutan
                </button>
              ) : (
                isHttpUrl(scanResult) && (
                  <a
                    href={scanResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#162d4a] rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Tautan QR
                  </a>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
