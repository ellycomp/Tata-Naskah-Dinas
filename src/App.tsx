import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Printer,
  BookmarkCheck,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Search,
  PanelLeft,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  LogIn,
  LogOut,
  User as UserIcon,
  CloudUpload,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  deleteLetterFromFirestore,
  deleteLetterheadFromFirestore,
  fromFirestoreLetter,
  fromFirestoreLetterhead,
  sanitizeFirestoreId,
  saveLetterheadToFirestore,
  saveLetterToFirestore,
} from './utils/firestoreSync';
import {
  LETTERHEAD_PRESETS,
  LETTER_TEMPLATES,
  createDefaultForwardingItems,
  createDefaultGiverParty,
  createDefaultRecipientParty,
  createDefaultSkData,
  formatOfficialLetterNumber,
  getDefaultSubjectCodeForTemplate,
  getInstitutionCodeFromKop,
  parseOfficialLetterNumber,
  resolveLetterKind,
} from './data/presets';
import { LetterCategory, LetterDocument, LetterheadConfig } from './types/letter';
import { LetterEditor } from './components/LetterEditor';
import { LetterPreview, PAPER_DIMENSIONS } from './components/LetterPreview';
import { LetterheadManagerView } from './components/LetterheadManagerView';
import { ArchiveView } from './components/ArchiveView';
import { QrSignaturePanel } from './components/QrSignaturePanel';
import { exportLetterToPdf } from './utils/pdfExport';
import { recordDeletedArchive, recordDeletedProfile, recordProfileUpdated, syncWorkspaceWithGoogleDrive } from './utils/googleDriveSync';
import {
  decodeLetterFromShareToken,
  extractSuratTokenFromInput,
} from './utils/qrSignature';

type AppView = 'editor' | 'pratinjau' | 'kop' | 'arsip' | 'scan';

const STORAGE_KEYS = {
  CURRENT_DOC: 'tatanaskah_current_doc_v2',
  PROFILES: 'tatanaskah_kop_profiles_v2',
  ARCHIVE: 'tatanaskah_archive_v2',
};

function migrateSchoolSubUnit(kop: LetterheadConfig): LetterheadConfig {
  let updated = kop;
  if (
    (updated.id === 'kop-sdit-qudwah' &&
      updated.subUnit === 'TERAKREDITASI · SEKOLAH DASAR ISLAM TERPADU') ||
    (updated.id === 'kop-kbit-qudwah' &&
      updated.subUnit === 'PENDIDIKAN ANAK USIA DINI · KB IT QUDWAH')
  ) {
    updated = { ...updated, subUnit: 'NPSN: - | Akreditasi: -' };
  }
  if (updated.websiteLine === undefined) {
    const presetMatch = LETTERHEAD_PRESETS.find((p) => p.id === updated.id);
    if (presetMatch) {
      updated = {
        ...updated,
        websiteLine: presetMatch.websiteLine || '',
        websiteEmailLine:
          updated.id === 'kop-yayasan-kksr' &&
          updated.websiteEmailLine === 'Pos-el: sekretariat@yayasankksr.or.id'
            ? presetMatch.websiteEmailLine
            : updated.websiteEmailLine,
      };
    }
  }
  if (
    (updated.id === 'kop-sdit-qudwah' || updated.id === 'kop-kbit-qudwah') &&
    updated.contactLastLineMode === undefined
  ) {
    const splitAddress = updated.address.includes('\n')
      ? updated.address
      : updated.address.replace(/,\s*(Kab\.)/i, '\n$1');
    updated = {
      ...updated,
      address: splitAddress,
      websiteOnLastLine: true,
      contactLastLineMode: 'website-last',
    };
  }
  if (
    (updated.id === 'kop-yayasan-kksr' || updated.id === 'kop-yayasan-sit-qudwah') &&
    updated.contactLastLineMode === undefined
  ) {
    const nextAddress = updated.address.includes('\n')
      ? updated.address
      : updated.id === 'kop-yayasan-kksr'
        ? `${updated.address.replace(/,\s*Sumsel$/i, '')}\nProvinsi Sumatera Selatan`
        : updated.address.replace(
            /,\s*(Sumsel|Provinsi Sumatera Selatan)$/i,
            '\nProvinsi Sumatera Selatan'
          );
    updated = {
      ...updated,
      address: nextAddress,
      contactLastLineMode: 'email-last',
    };
  }
  return updated;
}

function loadInitialProfiles(): LetterheadConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(migrateSchoolSubUnit);
      }
    }
  } catch {
    // ignore storage errors
  }
  return LETTERHEAD_PRESETS;
}

function loadInitialArchive(): LetterDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARCHIVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function hydrateLetterDoc(rawDoc: LetterDocument): LetterDocument {
  const migratedKop = migrateSchoolSubUnit(rawDoc.letterhead);
  const legacyNumbers = [
    '005/UND-KKSR/XI/2026',
    '042/ST-SDIT/XI/2026',
    '019/SE-KBIT/XI/2026',
    '088/SKET-YSIT/XI/2026',
    '124/SKAS-SDIT/XI/2026',
    '034/PAN-OUTING/SDIT/XI/2026',
    '089/KKSR/XI/2026',
    '042/YSIT-QUDWAH/KS/XI/2026',
    '118/KKSR/SKK/XI/2026',
    '029/YSIT-QUDWAH/SP/XI/2026',
  ];
  let nextNumber = rawDoc.letterNumber;
  if (legacyNumbers.includes(rawDoc.letterNumber)) {
    const parsedParts = parseOfficialLetterNumber('', migratedKop, rawDoc.dateString);
    nextNumber = formatOfficialLetterNumber({
      ...parsedParts,
      seq: '',
      subjectCode: getDefaultSubjectCodeForTemplate(rawDoc.templateId),
      orgCode: getInstitutionCodeFromKop(migratedKop),
    });
  }
  const kind = resolveLetterKind(rawDoc);
  return {
    ...rawDoc,
    letterKind: kind,
    letterhead: migratedKop,
    letterNumber: nextNumber,
    stampMode: rawDoc.stampMode || 'auto-svg',
    stampScale: rawDoc.stampScale ?? 100,
    customStampDataUrl: rawDoc.customStampDataUrl ?? null,
    showManualSignatureBox: Boolean(rawDoc.showManualSignatureBox),
    skData:
      kind === 'sk' && !rawDoc.skData
        ? createDefaultSkData(migratedKop, rawDoc.dateString)
        : rawDoc.skData,
    giverParty:
      kind !== 'standard' && kind !== 'sk' && !rawDoc.giverParty
        ? createDefaultGiverParty(migratedKop)
        : rawDoc.giverParty,
    recipientParty:
      kind !== 'standard' && kind !== 'sk' && !rawDoc.recipientParty
        ? createDefaultRecipientParty(
            rawDoc.templateId === 'keterangan-aktif-sekolah' ? 'siswa' : 'guru'
          )
        : rawDoc.recipientParty,
    forwardingItems:
      kind === 'surat-pengantar' && !rawDoc.forwardingItems
        ? createDefaultForwardingItems()
        : rawDoc.forwardingItems,
  };
}

function createInitialDoc(profiles: LetterheadConfig[]): LetterDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_DOC);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.templateId && parsed.letterhead) {
        return hydrateLetterDoc(parsed);
      }
    }
  } catch {
    // ignore storage errors
  }
  const firstTemplate = LETTER_TEMPLATES[0];
  const defaultKop =
    profiles.find((p) => p.id === firstTemplate.defaultLetterheadId) || profiles[0];
  return firstTemplate.buildDocument(defaultKop);
}

function formatFirestoreToastError(err: unknown, fallback: string): string {
  const rawMsg = err instanceof Error ? err.message : String(err);
  let detailMsg = rawMsg;

  try {
    const parsed = JSON.parse(rawMsg) as { error?: string; operationType?: string; path?: string };
    if (parsed && typeof parsed.error === 'string') {
      detailMsg = parsed.error;
    }
  } catch {
    // not JSON, keep rawMsg
  }

  if (detailMsg.includes('Free daily read units per project')) {
    return `Kuota baca harian Firestore terlampaui. Tingkatkan paket di: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
  }
  if (detailMsg.includes('Quota exceeded') || detailMsg.includes('resource-exhausted')) {
    return 'Kuota harian Firestore terlampaui. Kuota akan direset keesokan harinya.';
  }
  if (detailMsg.includes('Missing or insufficient permissions') || detailMsg.includes('permission-denied')) {
    return `${fallback} (Akses ditolak aturan keamanan Firestore — pastikan login Google terverifikasi dan aturan terbaru aktif.)`;
  }
  if (detailMsg.includes('offline') || detailMsg.includes('unavailable') || detailMsg.includes('Failed to get document')) {
    return `${fallback} (Koneksi ke layanan Cloud sedang terputus/offline.)`;
  }
  if (detailMsg.includes('invalid-argument') || detailMsg.includes('exceeds the maximum')) {
    return `${fallback} (Ukuran gambar atau data melebihi batas dokumen Cloud.)`;
  }
  if (detailMsg && detailMsg !== fallback) {
    const shortDetail = detailMsg.length > 140 ? `${detailMsg.slice(0, 140)}...` : detailMsg;
    return `${fallback} (${shortDetail})`;
  }
  return fallback;
}

function TataNaskahWorkspace() {
  const {
    user,
    authReady,
    profileReady,
    isSigningIn,
    authError,
    signInWithGoogle,
    signOutUser,
    clearAuthError,
  } = useAuth();

  const [activeView, setActiveView] = useState<AppView>('editor');
  const [letterheadProfiles, setLetterheadProfiles] = useState<LetterheadConfig[]>(
    loadInitialProfiles
  );
  const [archivedLetters, setArchivedLetters] = useState<LetterDocument[]>(
    loadInitialArchive
  );
  const [currentDoc, setCurrentDoc] = useState<LetterDocument>(() =>
    createInitialDoc(loadInitialProfiles())
  );

  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | LetterCategory>('Semua');
  const [zoom, setZoom] = useState<number>(0.78);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [isVerifiedFromQr, setIsVerifiedFromQr] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const syncedLettersUidRef = useRef<string | null>(null);
  const syncedProfilesUidRef = useRef<string | null>(null);
  const kopSaveTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timers = kopSaveTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (authError) {
      showToast('error', authError);
      clearAuthError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authError]);

  // Real-time Firestore sync when user is authenticated & verified
  useEffect(() => {
    if (!authReady || !profileReady || !user || !user.emailVerified) {
      syncedLettersUidRef.current = null;
      syncedProfilesUidRef.current = null;
      return;
    }

    const uid = sanitizeFirestoreId(user.uid, 'user');
    const lettersPath = `users/${uid}/letters`;
    const letterheadsPath = `users/${uid}/letterheads`;

    const lettersQuery = query(collection(db, lettersPath), where('ownerId', '==', uid));
    const unsubLetters = onSnapshot(
      lettersQuery,
      (snapshot) => {
        const remoteLetters = snapshot.docs.map((d) =>
          hydrateLetterDoc(fromFirestoreLetter(d.data() as Record<string, unknown>))
        );
        remoteLetters.sort((a, b) =>
          (b.updatedAt || '').localeCompare(a.updatedAt || '')
        );

        // One-time upload of offline local archive items not yet present in Firestore
        if (syncedLettersUidRef.current !== uid) {
          syncedLettersUidRef.current = uid;
          const remoteIds = new Set(remoteLetters.map((item) => item.id));
          const localOnly = loadInitialArchive().filter(
            (localItem) => !remoteIds.has(sanitizeFirestoreId(localItem.id, 'arch'))
          );
          if (localOnly.length > 0) {
            const hydratedLocalOnly = localOnly.map(hydrateLetterDoc);
            void Promise.all(
              hydratedLocalOnly.map((item) => saveLetterToFirestore(uid, item))
            ).catch((err) => {
              showToast(
                'error',
                formatFirestoreToastError(err, 'Sebagian arsip lokal gagal disinkronkan.')
              );
            });
            const merged = [...hydratedLocalOnly, ...remoteLetters];
            merged.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            setArchivedLetters(merged);
            return;
          }
        }

        setArchivedLetters(remoteLetters);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, lettersPath);
        } catch (err) {
          showToast(
            'error',
            formatFirestoreToastError(err, 'Gagal memuat arsip surat dari Cloud.')
          );
        }
      }
    );

    const kopQuery = query(collection(db, letterheadsPath), where('ownerId', '==', uid));
    const unsubKops = onSnapshot(
      kopQuery,
      (snapshot) => {
        const remoteProfiles = snapshot.docs.map((d) =>
          migrateSchoolSubUnit(fromFirestoreLetterhead(d.data() as Record<string, unknown>))
        );

        if (syncedProfilesUidRef.current !== uid) {
          syncedProfilesUidRef.current = uid;
          const remoteKopIds = new Set(remoteProfiles.map((p) => p.id));
          const localCustom = loadInitialProfiles().filter(
            (p) =>
              p.id.startsWith('kop-custom-') &&
              !remoteKopIds.has(sanitizeFirestoreId(p.id, 'kop'))
          );
          if (localCustom.length > 0) {
            void Promise.all(
              localCustom.map((p) => saveLetterheadToFirestore(uid, p))
            ).catch((err) => {
              showToast(
                'error',
                formatFirestoreToastError(err, 'Sebagian profil kop gagal disinkronkan.')
              );
            });
          }
        }

        const remoteById = new Map(remoteProfiles.map((p) => [p.id, p]));
        const mergedPresets = LETTERHEAD_PRESETS.map(
          (preset) => remoteById.get(preset.id) || preset
        );
        const customRemote = remoteProfiles.filter(
          (p) => !LETTERHEAD_PRESETS.some((preset) => preset.id === p.id)
        );
        setLetterheadProfiles([...customRemote, ...mergedPresets]);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, letterheadsPath);
        } catch (err) {
          showToast(
            'error',
            formatFirestoreToastError(err, 'Gagal memuat profil kop dari Cloud.')
          );
        }
      }
    );

    return () => {
      unsubLetters();
      unsubKops();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, profileReady, user]);

  // Detect ?surat=... verification link when opened from QR scan
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('surat');
    if (token) {
      const decoded = decodeLetterFromShareToken(token, letterheadProfiles);
      if (decoded) {
        setCurrentDoc(hydrateLetterDoc(decoded));
        setIsVerifiedFromQr(true);
        setActiveView('pratinjau');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenLetterLink = (url: string) => {
    const token = extractSuratTokenFromInput(url);
    if (token) {
      const decoded = decodeLetterFromShareToken(token, letterheadProfiles);
      if (decoded) {
        setCurrentDoc(hydrateLetterDoc(decoded));
        setIsVerifiedFromQr(true);
        setActiveView('pratinjau');
        showToast('success', 'QR-Code mengarahkan ke surat bersangkutan.');
        return;
      }
    }
    showToast('error', 'Link surat pada QR-Code tidak dapat dimuat secara internal.');
  };

  // Persist current draft, profiles, and archive to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, JSON.stringify(currentDoc));
    } catch {
      // ignore quota errors
    }
  }, [currentDoc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(letterheadProfiles));
    } catch {
      // ignore
    }
  }, [letterheadProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archivedLetters));
    } catch {
      // ignore
    }
  }, [archivedLetters]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return LETTER_TEMPLATES.filter((t) => {
      const catOk = selectedCategory === 'Semua' || t.category === selectedCategory;
      if (!q) return catOk;
      return (
        catOk &&
        (t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      );
    });
  }, [templateSearch, selectedCategory]);

  const handleSelectTemplate = (templateId: string) => {
    const tpl = LETTER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    // Match letterhead profile to template category if user currently uses a built-in preset,
    // or keep user's custom letterhead if they customized one.
    const isUsingCustomKop = currentDoc.letterhead.id.startsWith('kop-custom-');
    const targetKop = isUsingCustomKop
      ? currentDoc.letterhead
      : letterheadProfiles.find((p) => p.id === tpl.defaultLetterheadId) ||
        letterheadProfiles[0];

    setCurrentDoc(tpl.buildDocument(targetKop));
    setShowSidebarMobile(false);
    showToast('success', `Template "${tpl.name}" dimuat.`);
  };

  const handleResetTemplate = () => {
    const tpl =
      LETTER_TEMPLATES.find((t) => t.id === currentDoc.templateId) || LETTER_TEMPLATES[0];
    const targetKop =
      letterheadProfiles.find((p) => p.id === tpl.defaultLetterheadId) ||
      currentDoc.letterhead;
    setCurrentDoc(tpl.buildDocument(targetKop));
    showToast('success', 'Naskah surat dikembalikan ke isi bawaan template.');
  };

  const handleExportPdf = async () => {
    // Ensure preview DOM exists even if user is on Kop or Arsip tab
    if (activeView !== 'editor' && activeView !== 'pratinjau') {
      setActiveView('pratinjau');
      await new Promise((r) => setTimeout(r, 120));
    }
    setIsGeneratingPdf(true);
    try {
      const fileName = await exportLetterToPdf(currentDoc);
      showToast('success', `PDF berhasil diunduh: ${fileName}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal membuat file PDF otomatis.';
      showToast('error', message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleNativePrint = async () => {
    if (activeView !== 'editor' && activeView !== 'pratinjau') {
      setActiveView('pratinjau');
      await new Promise((r) => setTimeout(r, 120));
    }
    window.print();
  };

  const handleSaveToArchive = async () => {
    const entry: LetterDocument = {
      ...currentDoc,
      id: currentDoc.id.startsWith('arch-') ? currentDoc.id : `arch-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setCurrentDoc(entry);
    setArchivedLetters((prev) => {
      const exists = prev.some((item) => item.id === entry.id);
      if (exists) {
        return prev.map((item) => (item.id === entry.id ? entry : item));
      }
      return [entry, ...prev];
    });
    if (user && user.emailVerified) {
      try {
        await saveLetterToFirestore(user.uid, entry);
        showToast('success', 'Surat berhasil disimpan & disinkronkan ke Cloud.');
      } catch (err) {
        showToast(
          'error',
          formatFirestoreToastError(err, 'Tersimpan lokal, gagal sinkron ke Cloud.')
        );
      }
    } else if (user && !user.emailVerified) {
      showToast('error', 'Surat tersimpan lokal. Verifikasi email akun Google Anda untuk sinkronisasi Cloud.');
    } else {
      showToast('success', 'Surat berhasil disimpan ke Arsip lokal.');
    }
  };

  const handleSaveLetterheadProfile = async (profile: LetterheadConfig) => {
    recordProfileUpdated(profile.id);
    setLetterheadProfiles((prev) => {
      const exists = prev.some((p) => p.id === profile.id);
      if (exists) return prev.map((p) => (p.id === profile.id ? profile : p));
      return [profile, ...prev];
    });
    setCurrentDoc((prev) => ({ ...prev, letterhead: profile }));
    if (user && user.emailVerified) {
      try {
        await saveLetterheadToFirestore(user.uid, profile);
        showToast('success', `Profil kop "${profile.profileName}" disimpan ke Cloud.`);
      } catch (err) {
        showToast(
          'error',
          formatFirestoreToastError(err, 'Profil kop disimpan lokal, gagal sinkron ke Cloud.')
        );
      }
    } else {
      showToast('success', `Profil kop "${profile.profileName}" disimpan.`);
    }
  };

  const handleGoogleDriveSync = async () => {
    if (!user?.email || !user.emailVerified) {
      showToast('error', 'Masuk dengan akun Google dan verifikasi email terlebih dahulu.');
      return;
    }
    setIsDriveSyncing(true);
    try {
      const merged = await syncWorkspaceWithGoogleDrive(
        firebaseConfig.googleDriveClientId,
        {
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          ownerEmail: user.email,
          currentDoc,
          profiles: letterheadProfiles,
          archive: archivedLetters,
        }
      );
      setCurrentDoc(merged.currentDoc);
      setLetterheadProfiles(merged.profiles);
      setArchivedLetters(merged.archive);

      // Keep Firestore and Drive aligned during this first migration phase.
      const cloudWrites = await Promise.allSettled([
        ...merged.archive.map((item) => saveLetterToFirestore(user.uid, item)),
        ...merged.profiles
          .filter((profile) => profile.id.startsWith('kop-custom-'))
          .map((profile) => saveLetterheadToFirestore(user.uid, profile)),
      ]);
      const failedWrites = cloudWrites.filter((result) => result.status === 'rejected').length;
      showToast(
        failedWrites > 0 ? 'error' : 'success',
        failedWrites > 0
          ? 'Cadangan Google Drive berhasil disinkronkan, tetapi sebagian data belum tersalin ke Firestore.'
          : 'Arsip, profil kop, dan draf berhasil disinkronkan dengan Google Drive.'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sinkronisasi Google Drive gagal.';
      showToast('error', message);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const paperDim = PAPER_DIMENSIONS[currentDoc.paperSize];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7] text-slate-900">
      {/* TOP BAR CONTRACT: 3 zones separated by gap-8 */}
      <header className="no-print h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between gap-8 shrink-0 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => setActiveView('editor')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          TataNaskah
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveView('editor')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'editor'
                ? 'border-[#1e3a5f] text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Editor Surat
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pratinjau')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'pratinjau'
                ? 'border-[#1e3a5f] text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Pratinjau Surat
          </button>
          <button
            type="button"
            onClick={() => setActiveView('kop')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'kop'
                ? 'border-[#1e3a5f] text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Profil Kop
          </button>
          <button
            type="button"
            onClick={() => setActiveView('arsip')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'arsip'
                ? 'border-[#1e3a5f] text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Arsip Surat ({archivedLetters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('scan')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
              activeView === 'scan'
                ? 'border-[#1e3a5f] text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            TTD &amp; Scan QR
          </button>
        </nav>

        {/* Zone 3: Primary action + Google Account sync */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Akun'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className="hidden sm:inline text-xs font-medium text-slate-700 max-w-[120px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await signOutUser();
                  showToast('success', 'Berhasil keluar dari akun Google.');
                }}
                title="Keluar akun Google"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSigningIn || !authReady}
              onClick={async () => {
                const ok = await signInWithGoogle();
                if (ok) showToast('success', 'Berhasil masuk & menyinkronkan dengan Google.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              {isSigningIn ? 'Masuk...' : 'Masuk Google'}
            </button>
          )}

          <button
            type="button"
            onClick={handleGoogleDriveSync}
            disabled={!user || !user.emailVerified || isDriveSyncing}
            title={!user ? 'Masuk dengan Google terlebih dahulu' : 'Cadangkan dan sinkronkan data dengan Google Drive'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            {isDriveSyncing ? 'Menyinkronkan...' : 'Sinkronkan Drive'}
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF'}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Navigation / Pane Toggle Sub-row (visible below lg breakpoint) */}
      <div className="no-print lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2 gap-2">
        <div className="flex md:hidden items-center gap-3 text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveView('editor')}
            className={activeView === 'editor' ? 'text-[#1e3a5f] font-semibold whitespace-nowrap' : 'text-slate-600 whitespace-nowrap'}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pratinjau')}
            className={activeView === 'pratinjau' ? 'text-[#1e3a5f] font-semibold whitespace-nowrap' : 'text-slate-600 whitespace-nowrap'}
          >
            Pratinjau
          </button>
          <button
            type="button"
            onClick={() => setActiveView('kop')}
            className={activeView === 'kop' ? 'text-[#1e3a5f] font-semibold whitespace-nowrap' : 'text-slate-600 whitespace-nowrap'}
          >
            Profil Kop
          </button>
          <button
            type="button"
            onClick={() => setActiveView('arsip')}
            className={activeView === 'arsip' ? 'text-[#1e3a5f] font-semibold whitespace-nowrap' : 'text-slate-600 whitespace-nowrap'}
          >
            Arsip ({archivedLetters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('scan')}
            className={activeView === 'scan' ? 'text-[#1e3a5f] font-semibold whitespace-nowrap' : 'text-slate-600 whitespace-nowrap'}
          >
            Scan QR
          </button>
        </div>
        <div className="hidden md:block text-xs text-slate-500">
          {activeView === 'editor'
            ? `${currentDoc.templateName} · ${currentDoc.letterhead.profileName}`
            : ''}
        </div>
        {activeView === 'editor' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowSidebarMobile((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer whitespace-nowrap"
            >
              <PanelLeft className="w-3.5 h-3.5" />
              Jenis Surat
            </button>
            <button
              type="button"
              onClick={() =>
                setMobilePane((p) => (p === 'editor' ? 'preview' : 'editor'))
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded cursor-pointer whitespace-nowrap"
            >
              {mobilePane === 'editor' ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> Pratinjau
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" /> Sunting
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* MAIN WORKSPACE */}
      {activeView === 'editor' && (
        <div className="flex-1 flex min-h-0 relative lg:h-[calc(100vh-3.5rem)]">
          {/* LEFT SIDEBAR: Template Selector */}
          <aside
            className={`no-print ${
              showSidebarMobile
                ? 'fixed inset-y-0 left-0 z-40 w-72 shadow-xl'
                : 'hidden lg:flex'
            } lg:w-64 xl:w-72 flex-col bg-white border-r border-slate-200 shrink-0`}
          >
            <div className="p-3.5 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-900">
                  Pilih Jenis Surat ({LETTER_TEMPLATES.length})
                </h2>
                {showSidebarMobile && (
                  <button
                    type="button"
                    onClick={() => setShowSidebarMobile(false)}
                    className="text-xs text-slate-500 lg:hidden"
                  >
                    Tutup
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Cari template surat..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {(
                  ['Semua', 'Pemerintahan', 'Perusahaan', 'Pendidikan', 'Organisasi'] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto workspace-scroll p-2.5 space-y-1">
              {filteredTemplates.map((tpl) => {
                const isSelected = currentDoc.templateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-50 border-[#1e3a5f]'
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 leading-snug">
                      {tpl.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {tpl.category} ·{' '}
                      {tpl.letterKind === 'sk'
                        ? 'Format SK'
                        : tpl.letterKind === 'surat-tugas'
                          ? 'Surat Tugas'
                          : tpl.letterKind === 'surat-keterangan'
                            ? 'Surat Keterangan'
                            : tpl.letterKind === 'surat-kuasa'
                              ? 'Surat Kuasa'
                              : tpl.letterKind === 'surat-pengantar'
                                ? 'Surat Pengantar'
                                : tpl.formatStyle === 'decree'
                                  ? 'Judul Tengah'
                                  : 'Korespondensi'}
                    </div>
                  </button>
                );
              })}

              {filteredTemplates.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  Tidak ada template yang cocok.
                </div>
              )}
            </div>
          </aside>

          {/* CENTER PANEL: Structured Form Editor */}
          <section
            className={`no-print ${
              mobilePane === 'editor' ? 'flex' : 'hidden lg:flex'
            } flex-col w-full lg:w-[440px] xl:w-[480px] shrink-0 min-h-0`}
          >
            <LetterEditor
              doc={currentDoc}
              onChange={setCurrentDoc}
              letterheadProfiles={letterheadProfiles}
              onSaveLetterheadProfile={handleSaveLetterheadProfile}
              onOpenLetterLink={handleOpenLetterLink}
            />
          </section>

          {/* RIGHT PANEL: Live WYSIWYG Paper Preview */}
          <main
            className={`${
              mobilePane === 'preview' ? 'flex' : 'hidden lg:flex'
            } flex-1 flex-col min-w-0 min-h-0 bg-[#e5e7eb] print-container`}
          >
            {/* Workspace Preview Toolbar */}
            <div className="no-print h-11 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 truncate font-mono tabular-nums">
                {currentDoc.paperSize} · {paperDim.widthMm}×{paperDim.heightMm} mm ·{' '}
                {currentDoc.fontSizePt}pt
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center border border-slate-200 rounded-md bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                    title="Perkecil"
                    className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-mono tabular-nums text-slate-700">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(1.2, Number((z + 0.1).toFixed(2))))}
                    title="Perbesar"
                    className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveToArchive}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  Simpan Arsip
                </button>

                <button
                  type="button"
                  onClick={handleNativePrint}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak
                </button>

                <button
                  type="button"
                  onClick={handleResetTemplate}
                  title="Kembalikan isi template bawaan"
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Desk Area holding the A4/F4 Paper */}
            <div className="flex-1 overflow-auto workspace-scroll p-6 sm:p-8 flex justify-center items-start print-container">
              <LetterPreview doc={currentDoc} zoom={zoom} />
            </div>
          </main>
        </div>
      )}

      {activeView === 'pratinjau' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#e5e7eb] print-container">
          {/* Full-Page Preview Toolbar */}
          <div className="no-print bg-white border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveView('editor')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Kembali ke Editor
              </button>
              <div className="text-xs text-slate-600 truncate">
                <span className="font-semibold text-slate-900">
                  {currentDoc.formatStyle === 'decree'
                    ? currentDoc.decreeTitle || currentDoc.templateName
                    : currentDoc.subject || currentDoc.templateName}
                </span>
                {' · '}
                <span className="font-mono tabular-nums">
                  {currentDoc.paperSize} ({paperDim.widthMm}×{paperDim.heightMm} mm)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Quick Paper Switcher */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-md text-xs font-medium">
                {(['A4', 'F4'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setCurrentDoc((prev) => ({ ...prev, paperSize: size }))
                    }
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                      currentDoc.paperSize === size
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                  title="Perkecil"
                  className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Atur ke 100%"
                  className="px-2 text-xs font-mono tabular-nums text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
                  title="Perbesar"
                  className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveToArchive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                Simpan Arsip
              </button>

              <button
                type="button"
                onClick={handleNativePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF'}
              </button>
            </div>
          </div>

          {/* Banner Verifikasi QR-Code */}
          {isVerifiedFromQr && (
            <div className="no-print bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold">
                    Dokumen Terverifikasi Tanda Tangan Elektronik (QR-Code)
                  </span>
                  <span className="text-emerald-700 ml-2">
                    Nomor: <span className="font-mono">{currentDoc.letterNumber || '-'}</span> ·
                    Penandatangan: {currentDoc.signerName || '-'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifiedFromQr(false)}
                className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
              >
                Tutup Info Verifikasi
              </button>
            </div>
          )}

          {/* Centered Full Paper Preview Canvas */}
          <div className="flex-1 overflow-auto workspace-scroll p-6 sm:p-10 flex justify-center items-start print-container">
            <LetterPreview doc={currentDoc} zoom={zoom} />
          </div>
        </div>
      )}

      {activeView === 'scan' && (
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Tanda Tangan Elektronik &amp; Pemindai QR-Code
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Kelola QR-Code tanda tangan surat aktif, unggah gambar QR, atau pindai QR-Code untuk langsung membuka surat bersangkutan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('pratinjau')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                Pratinjau Surat
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <QrSignaturePanel
                doc={currentDoc}
                onUpdateDoc={(patch) =>
                  setCurrentDoc((prev) => ({
                    ...prev,
                    ...patch,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                onOpenLetterLink={handleOpenLetterLink}
              />
            </div>
          </div>
        </div>
      )}

      {activeView === 'kop' && (
        <div className="flex-1 overflow-y-auto">
          <LetterheadManagerView
            profiles={letterheadProfiles}
            activeProfileId={currentDoc.letterhead.id}
            onApplyProfile={(profile) => {
              setCurrentDoc((prev) => {
                const parts = parseOfficialLetterNumber(
                  prev.letterNumber,
                  profile,
                  prev.dateString
                );
                return {
                  ...prev,
                  letterhead: { ...profile },
                  stampTextTop: profile.orgName,
                  letterNumber: formatOfficialLetterNumber({
                    ...parts,
                    orgCode: getInstitutionCodeFromKop(profile),
                  }),
                };
              });
              setActiveView('editor');
              showToast('success', `Kop "${profile.profileName}" diterapkan pada surat.`);
            }}
            onAddProfile={async (profile) => {
              recordProfileUpdated(profile.id);
              setLetterheadProfiles((prev) => [profile, ...prev]);
              if (user && user.emailVerified) {
                try {
                  await saveLetterheadToFirestore(user.uid, profile);
                  showToast('success', 'Profil kop baru dibuat & disimpan ke Cloud.');
                  return;
                } catch (err) {
                  showToast(
                    'error',
                    formatFirestoreToastError(err, 'Profil kop dibuat lokal, gagal sinkron ke Cloud.')
                  );
                  return;
                }
              }
              showToast('success', 'Profil kop baru dibuat.');
            }}
            onUpdateProfile={(updated) => {
              recordProfileUpdated(updated.id);
              setLetterheadProfiles((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p))
              );
              if (currentDoc.letterhead.id === updated.id) {
                setCurrentDoc((prev) => ({ ...prev, letterhead: { ...updated } }));
              }
              if (user && user.emailVerified) {
                const prevTimer = kopSaveTimersRef.current[updated.id];
                if (prevTimer) window.clearTimeout(prevTimer);
                kopSaveTimersRef.current[updated.id] = window.setTimeout(() => {
                  delete kopSaveTimersRef.current[updated.id];
                  void saveLetterheadToFirestore(user.uid, updated).catch((err) => {
                    showToast(
                      'error',
                      formatFirestoreToastError(err, 'Gagal menyimpan perubahan kop ke Cloud.')
                    );
                  });
                }, 600);
              }
            }}
            onDeleteProfile={async (id) => {
              recordDeletedProfile(id);
              setLetterheadProfiles((prev) => prev.filter((p) => p.id !== id));
              if (user && user.emailVerified) {
                try {
                  await deleteLetterheadFromFirestore(user.uid, id);
                } catch (err) {
                  showToast(
                    'error',
                    formatFirestoreToastError(err, 'Gagal menghapus profil kop dari Cloud.')
                  );
                }
              }
              showToast('success', 'Profil kop dihapus.');
            }}
          />
        </div>
      )}

      {activeView === 'arsip' && (
        <div className="flex-1 overflow-y-auto">
          <ArchiveView
            archivedLetters={archivedLetters}
            isSignedIn={Boolean(user && user.emailVerified)}
            userEmail={user?.email || null}
            onSignIn={async () => {
              const ok = await signInWithGoogle();
              if (ok) showToast('success', 'Berhasil masuk & menyinkronkan arsip ke Google.');
            }}
            onLoadLetter={(doc) => {
              setCurrentDoc(hydrateLetterDoc(doc));
              setActiveView('editor');
              showToast('success', 'Surat dimuat ke editor.');
            }}
            onPreviewLetter={(doc) => {
              setCurrentDoc(hydrateLetterDoc(doc));
              setActiveView('pratinjau');
            }}
            onDuplicateLetter={async (doc) => {
              const copy: LetterDocument = {
                ...doc,
                id: `arch-${Date.now()}`,
                letterNumber: `${doc.letterNumber}-SALINAN`,
                updatedAt: new Date().toISOString(),
              };
              setArchivedLetters((prev) => [copy, ...prev]);
              if (user && user.emailVerified) {
                try {
                  await saveLetterToFirestore(user.uid, copy);
                  showToast('success', 'Surat berhasil diduplikasi & disimpan ke Cloud.');
                  return;
                } catch (err) {
                  showToast(
                    'error',
                    formatFirestoreToastError(err, 'Duplikasi lokal berhasil, gagal sinkron ke Cloud.')
                  );
                  return;
                }
              }
              showToast('success', 'Surat berhasil diduplikasi di arsip.');
            }}
            onDeleteLetter={async (id) => {
              recordDeletedArchive(id);
              setArchivedLetters((prev) => prev.filter((d) => d.id !== id));
              if (user && user.emailVerified) {
                try {
                  await deleteLetterFromFirestore(user.uid, id);
                } catch (err) {
                  showToast(
                    'error',
                    formatFirestoreToastError(err, 'Gagal menghapus surat dari Cloud.')
                  );
                }
              }
              showToast('success', 'Surat dihapus dari arsip.');
            }}
            onCreateNew={() => setActiveView('editor')}
          />
        </div>
      )}

      {/* Subtle Toast Feedback */}
      {toast && (
        <div
          role="status"
          className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg border border-slate-800 max-w-md"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="break-words">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TataNaskahWorkspace />
    </AuthProvider>
  );
}
