export type LetterCategory = 'Pemerintahan' | 'Perusahaan' | 'Pendidikan' | 'Organisasi';

export type LetterFormatStyle = 'correspondence' | 'decree';

export type LetterKind =
  | 'standard'
  | 'sk'
  | 'surat-tugas'
  | 'surat-keterangan'
  | 'surat-kuasa'
  | 'surat-pengantar';

export type LetterheadLayout = 'left-center' | 'left-left' | 'dual-center';

export type DividerStyle = 'double-official' | 'single-bold' | 'accent-line';

export type BuiltInLogoId = 'shield' | 'corporate' | 'academic' | 'organization' | 'none';

export type PaperSize = 'A4' | 'F4';

export type LetterFont = 'times' | 'arial' | 'georgia';

export type MarginPreset = 'standard' | 'compact' | 'wide';

export type ContactLastLineMode = 'inline' | 'website-last' | 'email-last';

export type StampMode = 'auto-svg' | 'custom-png';

export type SignatureMode = 'manual' | 'qr' | 'both';

export type QrSourceMode = 'auto-link' | 'custom-upload';

export interface LetterheadConfig {
  id: string;
  profileName: string;
  category: LetterCategory;
  parentOrg: string;
  orgName: string;
  subUnit: string;
  address: string;
  contactLine: string;
  websiteLine?: string;
  websiteEmailLine: string;
  websiteOnLastLine?: boolean;
  contactLastLineMode?: ContactLastLineMode;
  layout: LetterheadLayout;
  dividerStyle: DividerStyle;
  accentColor: string;
  builtInLogo: BuiltInLogoId;
  rightBuiltInLogo: BuiltInLogoId;
  customLogoDataUrl: string | null;
  leftLogoSize: number;
  showRightLogo: boolean;
  rightLogoDataUrl: string | null;
  rightLogoSize: number;
}

export interface LetterDetailRow {
  id: string;
  label: string;
  value: string;
}

export interface GiverPartyInfo {
  name: string;
  title: string;
  address: string;
}

export interface RecipientPartyInfo {
  roleType: 'guru' | 'siswa';
  name: string;
  birthPlaceDate: string;
  studentNisn: string;
  teacherIdType: 'NIY' | 'NUPTK';
  teacherIdNumber: string;
  position: string;
  address: string;
}

export interface DecreeClauseItem {
  id: string;
  label: string;
  text: string;
}

export interface DecreeData {
  about: string;
  considering: string[];
  legalBasis: string[];
  decisionWord: string;
  enactLabel: string;
  enactStatement: string;
  clauses: DecreeClauseItem[];
  establishedIn: string;
  establishedDate: string;
}

export interface ForwardingItem {
  id: string;
  description: string;
  quantity: string;
  notes: string;
}

export interface LetterDocument {
  id: string;
  templateId: string;
  templateName: string;
  category: LetterCategory;
  formatStyle: LetterFormatStyle;
  letterKind?: LetterKind;
  decreeTitle: string;
  letterhead: LetterheadConfig;
  letterNumber: string;
  attachment: string;
  urgency: string;
  subject: string;
  city: string;
  dateString: string;
  recipientLines: string[];
  salutation: string;
  openingParagraph: string;
  detailRows: LetterDetailRow[];
  bodyParagraphs: string[];
  closingParagraph: string;
  skData?: DecreeData;
  giverParty?: GiverPartyInfo;
  recipientParty?: RecipientPartyInfo;
  recipientParties?: RecipientPartyInfo[];
  forwardingItems?: ForwardingItem[];
  signerDepartment: string;
  signerTitle: string;
  signerName: string;
  signerIdLabel: string;
  signerIdValue: string;
  signatureDataUrl: string | null;
  signatureScale: number;
  signatureMode?: SignatureMode;
  showManualSignatureBox?: boolean;
  qrSourceMode?: QrSourceMode;
  qrCustomLink?: string;
  customQrDataUrl?: string | null;
  qrUploadedDecodedUrl?: string;
  qrSize?: number;
  qrShowCaption?: boolean;
  showStamp: boolean;
  stampMode?: StampMode;
  customStampDataUrl?: string | null;
  stampScale?: number;
  stampTextTop: string;
  stampTextCenter: string;
  stampColor: string;
  ccList: string[];
  paperSize: PaperSize;
  fontFamily: LetterFont;
  fontSizePt: 10 | 11 | 12;
  marginPreset: MarginPreset;
  updatedAt: string;
}

export interface LetterTemplate {
  id: string;
  name: string;
  category: LetterCategory;
  formatStyle: LetterFormatStyle;
  letterKind?: LetterKind;
  description: string;
  defaultLetterheadId: string;
  buildDocument: (letterhead: LetterheadConfig) => LetterDocument;
}
