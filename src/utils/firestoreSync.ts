import type { User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  createDefaultForwardingItems,
  createDefaultGiverParty,
  createDefaultRecipientParty,
  createDefaultSkData,
  resolveLetterKind,
} from '../data/presets';
import type {
  BuiltInLogoId,
  ContactLastLineMode,
  DecreeData,
  DividerStyle,
  ForwardingItem,
  GiverPartyInfo,
  LetterCategory,
  LetterDetailRow,
  LetterDocument,
  LetterFont,
  LetterFormatStyle,
  LetterheadConfig,
  LetterheadLayout,
  LetterKind,
  MarginPreset,
  PaperSize,
  QrSourceMode,
  RecipientPartyInfo,
  SignatureMode,
  StampMode,
} from '../types/letter';

const MAX_DATA_URL_LENGTH = 135000;

export function sanitizeFirestoreId(rawId: string, fallbackPrefix: string): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.length > maxLen ? val.slice(0, maxLen) : val;
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

function ensureEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

/**
 * Downscales oversized base64 image Data URLs so every uploaded image fits safely
 * inside Firestore's per-field size constraints and 1 MiB document limit.
 */
export async function constrainDataUrlForFirestore(
  dataUrl: string | null | undefined,
  maxLength = MAX_DATA_URL_LENGTH
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (dataUrl.length <= maxLength) return dataUrl;
  if (!dataUrl.startsWith('data:image/')) return '';
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return '';
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = dataUrl;
    });

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((img.width || 200) * scale));
    canvas.height = Math.max(1, Math.round((img.height || 200) * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Prefer PNG first to preserve transparency for stamps/signatures/logos
    const pngUrl = canvas.toDataURL('image/png');
    if (pngUrl.length <= maxLength) return pngUrl;

    // Fallback to WebP (supports transparency + much smaller) then JPEG
    for (const quality of [0.82, 0.65, 0.45]) {
      const webpUrl = canvas.toDataURL('image/webp', quality);
      if (webpUrl.length <= maxLength) return webpUrl;
    }
    for (const quality of [0.75, 0.55, 0.4]) {
      const jpgUrl = canvas.toDataURL('image/jpeg', quality);
      if (jpgUrl.length <= maxLength) return jpgUrl;
    }
  } catch {
    // Ignore image compression errors and omit oversized asset
  }
  return '';
}

async function normalizeLetterheadMap(lh: LetterheadConfig) {
  const customLogo = await constrainDataUrlForFirestore(lh.customLogoDataUrl);
  const rightLogo = await constrainDataUrlForFirestore(lh.rightLogoDataUrl);
  const contactLastLineMode: ContactLastLineMode = ensureEnum(
    lh.contactLastLineMode || (lh.websiteOnLastLine ? 'website-last' : 'inline'),
    ['inline', 'website-last', 'email-last'],
    'inline'
  );

  return {
    id: sanitizeFirestoreId(lh.id, 'kop'),
    profileName: clampString(lh.profileName, 120),
    category: ensureEnum<LetterCategory>(
      lh.category,
      ['Pemerintahan', 'Perusahaan', 'Pendidikan', 'Organisasi'],
      'Pendidikan'
    ),
    parentOrg: clampString(lh.parentOrg, 200),
    orgName: clampString(lh.orgName, 200),
    subUnit: clampString(lh.subUnit, 200),
    address: clampString(lh.address, 500),
    contactLine: clampString(lh.contactLine, 200),
    websiteLine: clampString(lh.websiteLine || '', 200),
    websiteEmailLine: clampString(lh.websiteEmailLine, 200),
    websiteOnLastLine: Boolean(lh.websiteOnLastLine || contactLastLineMode === 'website-last'),
    contactLastLineMode,
    layout: ensureEnum<LetterheadLayout>(
      lh.layout,
      ['left-center', 'left-left', 'dual-center'],
      'dual-center'
    ),
    dividerStyle: ensureEnum<DividerStyle>(
      lh.dividerStyle,
      ['double-official', 'single-bold', 'accent-line'],
      'double-official'
    ),
    accentColor: clampString(lh.accentColor || '#1e3a5f', 20),
    builtInLogo: ensureEnum<BuiltInLogoId>(
      lh.builtInLogo,
      ['shield', 'corporate', 'academic', 'organization', 'none'],
      'academic'
    ),
    rightBuiltInLogo: ensureEnum<BuiltInLogoId>(
      lh.rightBuiltInLogo ?? lh.builtInLogo,
      ['shield', 'corporate', 'academic', 'organization', 'none'],
      'none'
    ),
    customLogoDataUrl: customLogo,
    leftLogoSize: clampNumber(lh.leftLogoSize, 24, 160, 68),
    showRightLogo: Boolean(lh.showRightLogo),
    rightLogoDataUrl: rightLogo,
    rightLogoSize: clampNumber(lh.rightLogoSize, 24, 160, 68),
  };
}

function normalizeSkData(sk: DecreeData | undefined, kop: LetterheadConfig, dateString: string) {
  const source = sk || createDefaultSkData(kop, dateString);
  return {
    about: clampString(source.about, 500),
    considering: (Array.isArray(source.considering) ? source.considering : [])
      .slice(0, 25)
      .map((item) => clampString(item, 1500)),
    legalBasis: (Array.isArray(source.legalBasis) ? source.legalBasis : [])
      .slice(0, 25)
      .map((item) => clampString(item, 1500)),
    decisionWord: clampString(source.decisionWord || 'MEMUTUSKAN', 100),
    enactLabel: clampString(source.enactLabel || 'Menetapkan :', 100),
    enactStatement: clampString(source.enactStatement, 1000),
    clauses: (Array.isArray(source.clauses) ? source.clauses : []).slice(0, 30).map((c, idx) => ({
      id: clampString(c?.id || `clause-${idx + 1}`, 128),
      label: clampString(c?.label, 80),
      text: clampString(c?.text, 2500),
    })),
    establishedIn: clampString(source.establishedIn, 120),
    establishedDate: clampString(source.establishedDate, 120),
  };
}

function normalizeGiverParty(gp: GiverPartyInfo | undefined, kop: LetterheadConfig) {
  const source = gp || createDefaultGiverParty(kop);
  return {
    name: clampString(source.name, 150),
    title: clampString(source.title, 150),
    address: clampString(source.address, 400),
  };
}

function normalizeRecipientParty(rp: RecipientPartyInfo | undefined) {
  const source = rp || createDefaultRecipientParty('guru');
  return {
    roleType: ensureEnum<'guru' | 'siswa'>(source.roleType, ['guru', 'siswa'], 'guru'),
    name: clampString(source.name, 150),
    birthPlaceDate: clampString(source.birthPlaceDate, 150),
    studentNisn: clampString(source.studentNisn, 40),
    teacherIdType: ensureEnum<'NIY' | 'NUPTK'>(source.teacherIdType, ['NIY', 'NUPTK'], 'NIY'),
    teacherIdNumber: clampString(source.teacherIdNumber, 50),
    position: clampString(source.position, 150),
    address: clampString(source.address, 400),
  };
}

async function normalizeLetterUpdatableFields(docData: LetterDocument) {
  const normalizedKop = await normalizeLetterheadMap(docData.letterhead);
  const signatureDataUrl = await constrainDataUrlForFirestore(docData.signatureDataUrl);
  const customQrDataUrl = await constrainDataUrlForFirestore(docData.customQrDataUrl);
  const customStampDataUrl = await constrainDataUrlForFirestore(docData.customStampDataUrl);
  const kind = resolveLetterKind(docData);

  const detailRows: LetterDetailRow[] = (Array.isArray(docData.detailRows) ? docData.detailRows : [])
    .slice(0, 30)
    .map((r, idx) => ({
      id: clampString(r?.id || `row-${idx + 1}`, 128),
      label: clampString(r?.label, 200),
      value: clampString(r?.value, 1000),
    }));

  const forwardingItems: ForwardingItem[] = (
    Array.isArray(docData.forwardingItems)
      ? docData.forwardingItems
      : kind === 'surat-pengantar'
        ? createDefaultForwardingItems()
        : []
  )
    .slice(0, 40)
    .map((item, idx) => ({
      id: clampString(item?.id || `fwd-${idx + 1}`, 128),
      description: clampString(item?.description, 500),
      quantity: clampString(item?.quantity, 100),
      notes: clampString(item?.notes, 300),
    }));

  const fontSizePt: 10 | 11 | 12 =
    docData.fontSizePt === 10 || docData.fontSizePt === 12 ? docData.fontSizePt : 11;

  return {
    templateId: clampString(docData.templateId, 100),
    templateName: clampString(docData.templateName, 150),
    category: ensureEnum<LetterCategory>(
      docData.category,
      ['Pemerintahan', 'Perusahaan', 'Pendidikan', 'Organisasi'],
      'Pendidikan'
    ),
    formatStyle: ensureEnum<LetterFormatStyle>(
      docData.formatStyle,
      ['correspondence', 'decree'],
      'correspondence'
    ),
    letterKind: ensureEnum<LetterKind>(
      kind,
      ['standard', 'sk', 'surat-tugas', 'surat-keterangan', 'surat-kuasa', 'surat-pengantar'],
      'standard'
    ),
    decreeTitle: clampString(docData.decreeTitle, 200),
    letterhead: normalizedKop,
    letterNumber: clampString(docData.letterNumber, 150),
    attachment: clampString(docData.attachment, 150),
    urgency: clampString(docData.urgency, 80),
    subject: clampString(docData.subject, 300),
    city: clampString(docData.city, 120),
    dateString: clampString(docData.dateString, 120),
    recipientLines: (Array.isArray(docData.recipientLines) ? docData.recipientLines : [])
      .slice(0, 15)
      .map((l) => clampString(l, 300)),
    salutation: clampString(docData.salutation, 200),
    openingParagraph: clampString(docData.openingParagraph, 4000),
    detailRows,
    bodyParagraphs: (Array.isArray(docData.bodyParagraphs) ? docData.bodyParagraphs : [])
      .slice(0, 30)
      .map((p) => clampString(p, 5000)),
    closingParagraph: clampString(docData.closingParagraph, 4000),
    skData: normalizeSkData(docData.skData, docData.letterhead, docData.dateString),
    giverParty: normalizeGiverParty(docData.giverParty, docData.letterhead),
    recipientParty: normalizeRecipientParty(docData.recipientParty),
    forwardingItems,
    signerDepartment: clampString(docData.signerDepartment, 200),
    signerTitle: clampString(docData.signerTitle, 200),
    signerName: clampString(docData.signerName, 150),
    signerIdLabel: clampString(docData.signerIdLabel, 60),
    signerIdValue: clampString(docData.signerIdValue, 80),
    signatureDataUrl,
    signatureScale: clampNumber(docData.signatureScale, 30, 200, 100),
    signatureMode: ensureEnum<SignatureMode>(
      docData.signatureMode || 'manual',
      ['manual', 'qr', 'both'],
      'manual'
    ),
    showManualSignatureBox: Boolean(docData.showManualSignatureBox),
    qrSourceMode: ensureEnum<QrSourceMode>(
      docData.qrSourceMode || 'auto-link',
      ['auto-link', 'custom-upload'],
      'auto-link'
    ),
    qrCustomLink: clampString(docData.qrCustomLink || '', 4000),
    customQrDataUrl,
    qrUploadedDecodedUrl: clampString(docData.qrUploadedDecodedUrl || '', 4000),
    qrSize: clampNumber(docData.qrSize, 40, 200, 84),
    qrShowCaption: docData.qrShowCaption ?? true,
    showStamp: Boolean(docData.showStamp),
    stampMode: ensureEnum<StampMode>(
      docData.stampMode || 'auto-svg',
      ['auto-svg', 'custom-png'],
      'auto-svg'
    ),
    customStampDataUrl,
    stampScale: clampNumber(docData.stampScale, 40, 200, 100),
    stampTextTop: clampString(docData.stampTextTop, 150),
    stampTextCenter: clampString(docData.stampTextCenter, 150),
    stampColor: clampString(docData.stampColor || '#1e3a8a', 20),
    ccList: (Array.isArray(docData.ccList) ? docData.ccList : [])
      .slice(0, 20)
      .map((item) => clampString(item, 300)),
    paperSize: ensureEnum<PaperSize>(docData.paperSize, ['A4', 'F4'], 'A4'),
    fontFamily: ensureEnum<LetterFont>(
      docData.fontFamily,
      ['times', 'arial', 'georgia'],
      'times'
    ),
    fontSizePt,
    marginPreset: ensureEnum<MarginPreset>(
      docData.marginPreset,
      ['standard', 'compact', 'wide'],
      'standard'
    ),
    clientUpdatedAt: clampString(docData.updatedAt || new Date().toISOString(), 64),
  };
}

export function fromFirestoreLetterhead(raw: Record<string, unknown>): LetterheadConfig {
  return {
    id: String(raw.id || ''),
    profileName: String(raw.profileName || ''),
    category: ensureEnum<LetterCategory>(
      raw.category,
      ['Pemerintahan', 'Perusahaan', 'Pendidikan', 'Organisasi'],
      'Pendidikan'
    ),
    parentOrg: String(raw.parentOrg || ''),
    orgName: String(raw.orgName || ''),
    subUnit: String(raw.subUnit || ''),
    address: String(raw.address || ''),
    contactLine: String(raw.contactLine || ''),
    websiteLine: String(raw.websiteLine || ''),
    websiteEmailLine: String(raw.websiteEmailLine || ''),
    websiteOnLastLine: Boolean(raw.websiteOnLastLine),
    contactLastLineMode: ensureEnum<ContactLastLineMode>(
      raw.contactLastLineMode,
      ['inline', 'website-last', 'email-last'],
      'inline'
    ),
    layout: ensureEnum<LetterheadLayout>(
      raw.layout,
      ['left-center', 'left-left', 'dual-center'],
      'dual-center'
    ),
    dividerStyle: ensureEnum<DividerStyle>(
      raw.dividerStyle,
      ['double-official', 'single-bold', 'accent-line'],
      'double-official'
    ),
    accentColor: String(raw.accentColor || '#1e3a5f'),
    builtInLogo: ensureEnum<BuiltInLogoId>(
      raw.builtInLogo,
      ['shield', 'corporate', 'academic', 'organization', 'none'],
      'academic'
    ),
    rightBuiltInLogo: ensureEnum<BuiltInLogoId>(
      raw.rightBuiltInLogo,
      ['shield', 'corporate', 'academic', 'organization', 'none'],
      'none'
    ),
    customLogoDataUrl:
      typeof raw.customLogoDataUrl === 'string' && raw.customLogoDataUrl.length > 0
        ? raw.customLogoDataUrl
        : null,
    leftLogoSize: typeof raw.leftLogoSize === 'number' ? raw.leftLogoSize : 68,
    showRightLogo: Boolean(raw.showRightLogo),
    rightLogoDataUrl:
      typeof raw.rightLogoDataUrl === 'string' && raw.rightLogoDataUrl.length > 0
        ? raw.rightLogoDataUrl
        : null,
    rightLogoSize: typeof raw.rightLogoSize === 'number' ? raw.rightLogoSize : 68,
  };
}

export function fromFirestoreLetter(raw: Record<string, unknown>): LetterDocument {
  const lh = fromFirestoreLetterhead((raw.letterhead || {}) as Record<string, unknown>);
  return {
    id: String(raw.id || ''),
    templateId: String(raw.templateId || ''),
    templateName: String(raw.templateName || ''),
    category: ensureEnum<LetterCategory>(
      raw.category,
      ['Pemerintahan', 'Perusahaan', 'Pendidikan', 'Organisasi'],
      'Pendidikan'
    ),
    formatStyle: ensureEnum<LetterFormatStyle>(
      raw.formatStyle,
      ['correspondence', 'decree'],
      'correspondence'
    ),
    letterKind: ensureEnum<LetterKind>(
      raw.letterKind,
      ['standard', 'sk', 'surat-tugas', 'surat-keterangan', 'surat-kuasa', 'surat-pengantar'],
      'standard'
    ),
    decreeTitle: String(raw.decreeTitle || ''),
    letterhead: lh,
    letterNumber: String(raw.letterNumber || ''),
    attachment: String(raw.attachment || ''),
    urgency: String(raw.urgency || ''),
    subject: String(raw.subject || ''),
    city: String(raw.city || ''),
    dateString: String(raw.dateString || ''),
    recipientLines: Array.isArray(raw.recipientLines) ? raw.recipientLines.map(String) : [],
    salutation: String(raw.salutation || ''),
    openingParagraph: String(raw.openingParagraph || ''),
    detailRows: Array.isArray(raw.detailRows) ? (raw.detailRows as LetterDetailRow[]) : [],
    bodyParagraphs: Array.isArray(raw.bodyParagraphs) ? raw.bodyParagraphs.map(String) : [],
    closingParagraph: String(raw.closingParagraph || ''),
    skData: raw.skData as DecreeData | undefined,
    giverParty: raw.giverParty as GiverPartyInfo | undefined,
    recipientParty: raw.recipientParty as RecipientPartyInfo | undefined,
    forwardingItems: Array.isArray(raw.forwardingItems)
      ? (raw.forwardingItems as ForwardingItem[])
      : [],
    signerDepartment: String(raw.signerDepartment || ''),
    signerTitle: String(raw.signerTitle || ''),
    signerName: String(raw.signerName || ''),
    signerIdLabel: String(raw.signerIdLabel || ''),
    signerIdValue: String(raw.signerIdValue || ''),
    signatureDataUrl:
      typeof raw.signatureDataUrl === 'string' && raw.signatureDataUrl.length > 0
        ? raw.signatureDataUrl
        : null,
    signatureScale: typeof raw.signatureScale === 'number' ? raw.signatureScale : 100,
    signatureMode: ensureEnum<SignatureMode>(
      raw.signatureMode,
      ['manual', 'qr', 'both'],
      'manual'
    ),
    showManualSignatureBox: Boolean(raw.showManualSignatureBox),
    qrSourceMode: ensureEnum<QrSourceMode>(
      raw.qrSourceMode,
      ['auto-link', 'custom-upload'],
      'auto-link'
    ),
    qrCustomLink: String(raw.qrCustomLink || ''),
    customQrDataUrl:
      typeof raw.customQrDataUrl === 'string' && raw.customQrDataUrl.length > 0
        ? raw.customQrDataUrl
        : null,
    qrUploadedDecodedUrl: String(raw.qrUploadedDecodedUrl || ''),
    qrSize: typeof raw.qrSize === 'number' ? raw.qrSize : 84,
    qrShowCaption: raw.qrShowCaption !== false,
    showStamp: Boolean(raw.showStamp),
    stampMode: ensureEnum<StampMode>(raw.stampMode, ['auto-svg', 'custom-png'], 'auto-svg'),
    customStampDataUrl:
      typeof raw.customStampDataUrl === 'string' && raw.customStampDataUrl.length > 0
        ? raw.customStampDataUrl
        : null,
    stampScale: typeof raw.stampScale === 'number' ? raw.stampScale : 100,
    stampTextTop: String(raw.stampTextTop || ''),
    stampTextCenter: String(raw.stampTextCenter || ''),
    stampColor: String(raw.stampColor || '#1e3a8a'),
    ccList: Array.isArray(raw.ccList) ? raw.ccList.map(String) : [],
    paperSize: ensureEnum<PaperSize>(raw.paperSize, ['A4', 'F4'], 'A4'),
    fontFamily: ensureEnum<LetterFont>(
      raw.fontFamily,
      ['times', 'arial', 'georgia'],
      'times'
    ),
    fontSizePt:
      raw.fontSizePt === 10 || raw.fontSizePt === 12 ? raw.fontSizePt : 11,
    marginPreset: ensureEnum<MarginPreset>(
      raw.marginPreset,
      ['standard', 'compact', 'wide'],
      'standard'
    ),
    updatedAt: String(raw.clientUpdatedAt || new Date().toISOString()),
  };
}

const inFlightProfileSync = new Map<string, Promise<void>>();
const ensuredProfileUids = new Set<string>();

export function resetProfileSyncCache(uid?: string): void {
  if (uid) {
    const safeUid = sanitizeFirestoreId(uid, 'user');
    ensuredProfileUids.delete(safeUid);
    inFlightProfileSync.delete(safeUid);
  } else {
    ensuredProfileUids.clear();
    inFlightProfileSync.clear();
  }
}

export async function ensureUserProfileDoc(user: User, forceRefresh = false): Promise<void> {
  const uid = sanitizeFirestoreId(user.uid, 'user');
  if (!forceRefresh && ensuredProfileUids.has(uid)) {
    return;
  }

  const existingPromise = inFlightProfileSync.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async () => {
    const path = `users/${uid}`;
    const userRef = doc(db, 'users', uid);

    let existingData: Record<string, unknown> | null = null;
    try {
      const snap = await getDoc(userRef);
      existingData = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const nextDisplayName = clampString(
      user.displayName || user.email?.split('@')[0] || 'Pengguna TataNaskah',
      120
    );
    const nextEmail = clampString(user.email || '', 254);
    const nextPhotoURL = clampString(user.photoURL || '', 500);

    if (!existingData) {
      try {
        await setDoc(userRef, {
          uid,
          displayName: nextDisplayName,
          email: nextEmail,
          photoURL: nextPhotoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } else if (
      existingData.displayName !== nextDisplayName ||
      existingData.email !== nextEmail ||
      existingData.photoURL !== nextPhotoURL
    ) {
      try {
        await updateDoc(userRef, {
          displayName: nextDisplayName,
          email: nextEmail,
          photoURL: nextPhotoURL,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    ensuredProfileUids.add(uid);
  })();

  inFlightProfileSync.set(uid, run);
  try {
    await run;
  } finally {
    inFlightProfileSync.delete(uid);
  }
}

async function ensureParentUserReady(uid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser && sanitizeFirestoreId(currentUser.uid, 'user') === uid) {
    await ensureUserProfileDoc(currentUser);
  }
}

export async function saveLetterToFirestore(
  userId: string,
  letter: LetterDocument
): Promise<void> {
  const uid = sanitizeFirestoreId(userId, 'user');
  await ensureParentUserReady(uid);
  const letterId = sanitizeFirestoreId(letter.id, 'arch');
  const path = `users/${uid}/letters/${letterId}`;
  const letterRef = doc(db, 'users', uid, 'letters', letterId);

  let exists = false;
  try {
    const snap = await getDoc(letterRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const updatable = await normalizeLetterUpdatableFields({
    ...letter,
    id: letterId,
  });

  if (!exists) {
    try {
      await setDoc(letterRef, {
        ownerId: uid,
        id: letterId,
        ...updatable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(letterRef, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function deleteLetterFromFirestore(
  userId: string,
  letterId: string
): Promise<void> {
  const uid = sanitizeFirestoreId(userId, 'user');
  const safeId = sanitizeFirestoreId(letterId, 'arch');
  const path = `users/${uid}/letters/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'letters', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveLetterheadToFirestore(
  userId: string,
  profile: LetterheadConfig
): Promise<void> {
  const uid = sanitizeFirestoreId(userId, 'user');
  await ensureParentUserReady(uid);
  const profileId = sanitizeFirestoreId(profile.id, 'kop');
  const path = `users/${uid}/letterheads/${profileId}`;
  const ref = doc(db, 'users', uid, 'letterheads', profileId);

  let exists = false;
  try {
    const snap = await getDoc(ref);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const normalized = await normalizeLetterheadMap({ ...profile, id: profileId });
  const { id: _ignoredId, ...updatableWithoutId } = normalized;

  if (!exists) {
    try {
      await setDoc(ref, {
        ownerId: uid,
        ...normalized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        ...updatableWithoutId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function deleteLetterheadFromFirestore(
  userId: string,
  profileId: string
): Promise<void> {
  const uid = sanitizeFirestoreId(userId, 'user');
  const safeId = sanitizeFirestoreId(profileId, 'kop');
  const path = `users/${uid}/letterheads/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'letterheads', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
