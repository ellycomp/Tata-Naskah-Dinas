import {
  DecreeData,
  ForwardingItem,
  GiverPartyInfo,
  LetterDocument,
  LetterKind,
  LetterTemplate,
  LetterheadConfig,
  RecipientPartyInfo,
} from '../types/letter';

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function formatIndonesianDate(date: Date = new Date()): string {
  const day = date.getDate();
  const month = MONTHS_ID[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export const LETTER_SUBJECT_CODES = [
  { code: 'UND', label: 'Undangan (UND)' },
  { code: 'PENG', label: 'Pengumuman (PENG)' },
  { code: 'SK', label: 'Surat Keputusan (SK)' },
  { code: 'ST', label: 'Surat Tugas (ST)' },
  { code: 'SUKET', label: 'Surat Keterangan (SUKET)' },
  { code: 'SPER', label: 'Surat Pernyataan (SPER)' },
  { code: 'SP', label: 'Surat Peringatan (SP)' },
  { code: 'SPMH', label: 'Surat Permohonan (SPMH)' },
  { code: 'SE', label: 'Surat Edaran (SE)' },
  { code: 'SPENG', label: 'Surat Pengantar (SPENG)' },
  { code: 'SKU', label: 'Surat Kuasa (SKU)' },
] as const;

export const INSTITUTION_CODES = [
  { code: 'SDITQ', label: 'SD IT Qudwah (SDITQ)' },
  { code: 'PAUD-KBITQ', label: 'KB IT Qudwah (PAUD-KBITQ)' },
  { code: 'YKKSR', label: 'Yayasan KKSR (YKKSR)' },
  { code: 'YSITQ', label: 'Yayasan SIT Qudwah (YSITQ)' },
] as const;

export function getInstitutionCodeFromKop(kop: LetterheadConfig): string {
  if (kop.id === 'kop-sdit-qudwah') return 'SDITQ';
  if (kop.id === 'kop-kbit-qudwah') return 'PAUD-KBITQ';
  if (kop.id === 'kop-yayasan-kksr') return 'YKKSR';
  if (kop.id === 'kop-yayasan-sit-qudwah') return 'YSITQ';
  const name = (kop.orgName || '').toUpperCase();
  if (name.includes('SD IT') || name.includes('SDIT')) return 'SDITQ';
  if (name.includes('KB IT') || name.includes('PAUD') || name.includes('KELOMPOK BERMAIN'))
    return 'PAUD-KBITQ';
  if (name.includes('KKSR')) return 'YKKSR';
  return 'YSITQ';
}

export function getRomanMonthAndYearFromDateString(dateStr?: string): {
  romanMonth: string;
  year: string;
} {
  const now = new Date();
  let monthIdx = now.getMonth();
  let year = String(now.getFullYear());

  if (dateStr) {
    const yearMatch = dateStr.match(/\b(20\d{2})\b/);
    if (yearMatch) year = yearMatch[1];
    const lower = dateStr.toLowerCase();
    const foundMonthIdx = MONTHS_ID.findIndex((m) => lower.includes(m.toLowerCase()));
    if (foundMonthIdx >= 0) monthIdx = foundMonthIdx;
  }

  return {
    romanMonth: ROMAN_MONTHS[monthIdx] || 'I',
    year,
  };
}

export interface OfficialLetterNumberParts {
  seq: string;
  scope: 'A' | 'B';
  subjectCode: string;
  orgCode: string;
  romanMonth: string;
  year: string;
}

export function formatOfficialLetterNumber(parts: OfficialLetterNumberParts): string {
  const cleanSeq = parts.seq.trim();
  const seqSegment = cleanSeq.length > 0 ? cleanSeq : '\u00A0\u00A0\u00A0\u00A0';
  return `${seqSegment}.${parts.scope}/${parts.subjectCode}-${parts.orgCode}/${parts.romanMonth}/${parts.year}`;
}

export function parseOfficialLetterNumber(
  value: string,
  fallbackKop?: LetterheadConfig,
  fallbackDateStr?: string
): OfficialLetterNumberParts {
  const { romanMonth, year } = getRomanMonthAndYearFromDateString(fallbackDateStr);
  const defaultOrg = fallbackKop ? getInstitutionCodeFromKop(fallbackKop) : 'SDITQ';
  const normalized = value.replace(/\u00A0/g, ' ').trim();

  const match = normalized.match(
    /^([^./]*)\.(A|B)\/([A-Z]+)-([A-Z0-9-]+)\/([IVX]+)\/(\d{4})$/
  );
  if (match) {
    return {
      seq: match[1].trim(),
      scope: match[2] as 'A' | 'B',
      subjectCode: match[3],
      orgCode: match[4],
      romanMonth: match[5],
      year: match[6],
    };
  }

  return {
    seq: '',
    scope: 'A',
    subjectCode: 'UND',
    orgCode: defaultOrg,
    romanMonth,
    year,
  };
}

export function generateLetterNumber(
  subjectCode: string,
  orgCode: string,
  scope: 'A' | 'B' = 'A',
  seq = '',
  dateStr?: string
): string {
  const { romanMonth, year } = getRomanMonthAndYearFromDateString(dateStr);
  return formatOfficialLetterNumber({
    seq,
    scope,
    subjectCode,
    orgCode,
    romanMonth,
    year,
  });
}

export const LETTERHEAD_PRESETS: LetterheadConfig[] = [
  {
    id: 'kop-yayasan-kksr',
    profileName: 'KOP Surat Yayasan KKSR',
    category: 'Organisasi',
    parentOrg: '',
    orgName: 'YAYASAN KKSR',
    subUnit: 'Keluarga Besar / Sekretariat Yayasan KKSR',
    address:
      'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin\nProvinsi Sumatera Selatan',
    contactLine: 'Telp. / WhatsApp: 0812-0000-0000',
    websiteLine: 'Website: www.yayasankksr.or.id',
    websiteEmailLine: 'Email: sekretariat@yayasankksr.or.id',
    contactLastLineMode: 'email-last',
    layout: 'dual-center',
    dividerStyle: 'double-official',
    accentColor: '#1e3a5f',
    builtInLogo: 'organization',
    rightBuiltInLogo: 'shield',
    customLogoDataUrl: null,
    leftLogoSize: 68,
    showRightLogo: true,
    rightLogoDataUrl: null,
    rightLogoSize: 68,
  },
  {
    id: 'kop-yayasan-sit-qudwah',
    profileName: 'KOP Surat Yayasan SIT Qudwah Sungai Rengit',
    category: 'Pendidikan',
    parentOrg: 'YAYASAN PENDIDIKAN ISLAM',
    orgName: 'YAYASAN SIT QUDWAH SUNGAI RENGIT',
    subUnit: 'SEKOLAH ISLAM TERPADU (SIT) QUDWAH SUNGAI RENGIT',
    address:
      'Jl. Palembang – Jambi KM. 43, Desa Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin\nProvinsi Sumatera Selatan',
    contactLine: 'Telp. / WhatsApp: 0813-0000-0000',
    websiteLine: 'Website: www.sitqudwahsr.sch.id',
    websiteEmailLine: 'Email: yayasan@sitqudwahsr.sch.id',
    contactLastLineMode: 'email-last',
    layout: 'dual-center',
    dividerStyle: 'double-official',
    accentColor: '#14532d',
    builtInLogo: 'academic',
    rightBuiltInLogo: 'organization',
    customLogoDataUrl: null,
    leftLogoSize: 68,
    showRightLogo: true,
    rightLogoDataUrl: null,
    rightLogoSize: 68,
  },
  {
    id: 'kop-sdit-qudwah',
    profileName: 'KOP Surat SD IT Qudwah Sungai Rengit',
    category: 'Pendidikan',
    parentOrg: 'YAYASAN SIT QUDWAH SUNGAI RENGIT',
    orgName: 'SD ISLAM TERPADU (SD IT) QUDWAH SUNGAI RENGIT',
    subUnit: 'NPSN: - | Akreditasi: -',
    address:
      'Jl. Palembang – Jambi KM. 43, Desa Sungai Rengit, Kec. Talang Kelapa\nKab. Banyuasin, Sumsel',
    contactLine: 'Telp. / WhatsApp: 0813-1111-0000',
    websiteLine: 'Website: sdit.sitqudwahsr.sch.id',
    websiteEmailLine: 'Email: sdit@sitqudwahsr.sch.id',
    websiteOnLastLine: true,
    contactLastLineMode: 'website-last',
    layout: 'dual-center',
    dividerStyle: 'double-official',
    accentColor: '#14532d',
    builtInLogo: 'academic',
    rightBuiltInLogo: 'shield',
    customLogoDataUrl: null,
    leftLogoSize: 68,
    showRightLogo: true,
    rightLogoDataUrl: null,
    rightLogoSize: 68,
  },
  {
    id: 'kop-kbit-qudwah',
    profileName: 'KOP Surat KB IT Qudwah Sungai Rengit',
    category: 'Pendidikan',
    parentOrg: 'YAYASAN SIT QUDWAH SUNGAI RENGIT',
    orgName: 'KELOMPOK BERMAIN ISLAM TERPADU (KB IT) QUDWAH SUNGAI RENGIT',
    subUnit: 'NPSN: - | Akreditasi: -',
    address:
      'Jl. Palembang – Jambi KM. 43, Desa Sungai Rengit, Kec. Talang Kelapa\nKab. Banyuasin, Sumsel',
    contactLine: 'Telp. / WhatsApp: 0813-2222-0000',
    websiteLine: 'Website: kbit.sitqudwahsr.sch.id',
    websiteEmailLine: 'Email: kbit@sitqudwahsr.sch.id',
    websiteOnLastLine: true,
    contactLastLineMode: 'website-last',
    layout: 'dual-center',
    dividerStyle: 'double-official',
    accentColor: '#14532d',
    builtInLogo: 'academic',
    rightBuiltInLogo: 'organization',
    customLogoDataUrl: null,
    leftLogoSize: 68,
    showRightLogo: true,
    rightLogoDataUrl: null,
    rightLogoSize: 68,
  },
];

export const ORDINAL_CLAUSE_LABELS = [
  'KESATU',
  'KEDUA',
  'KETIGA',
  'KEEMPAT',
  'KELIMA',
  'KEENAM',
  'KETUJUH',
  'KEDELAPAN',
];

export function createDefaultSkData(kop?: LetterheadConfig, dateStr?: string): DecreeData {
  const orgName = kop?.orgName || 'SD IT Qudwah Sungai Rengit';
  return {
    about: 'PENGANGKATAN PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB) TAHUN PELAJARAN 2026/2027',
    considering: [
      `bahwa untuk kelancaran pelaksanaan Penerimaan Peserta Didik Baru (PPDB) pada ${orgName} Tahun Pelajaran 2026/2027, dipandang perlu membentuk susunan panitia pelaksana;`,
      'bahwa nama-nama yang tercantum dalam surat keputusan ini dipandang cakap, amanah, dan memenuhi syarat untuk melaksanakan tugas kepanitiaan dimaksud.',
    ],
    legalBasis: [
      'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
      'Anggaran Dasar dan Anggaran Rumah Tangga Yayasan SIT Qudwah Sungai Rengit;',
      `Hasil Rapat Dewan Guru dan Pengurus ${orgName} tanggal 10 November 2026.`,
    ],
    decisionWord: 'MEMUTUSKAN',
    enactLabel: 'Menetapkan',
    enactStatement: `KEPUTUSAN ${orgName.toUpperCase()} TENTANG PENGANGKATAN PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB) TAHUN PELAJARAN 2026/2027`,
    clauses: [
      {
        id: 'sk-1',
        label: 'KESATU',
        text: `Membentuk Panitia Penerimaan Peserta Didik Baru (PPDB) ${orgName} Tahun Pelajaran 2026/2027 dengan susunan keanggotaan sebagaimana tercantum dalam lampiran keputusan ini.`,
      },
      {
        id: 'sk-2',
        label: 'KEDUA',
        text: 'Menugaskan panitia tersebut untuk merencanakan, melaksanakan sosialisasi, menyeleksi administrasi, serta melaporkan hasil kegiatan kepada pimpinan lembaga.',
      },
      {
        id: 'sk-3',
        label: 'KETIGA',
        text: 'Segala biaya yang timbul akibat pelaksanaan keputusan ini dibebankan pada anggaran operasional lembaga yang relevan.',
      },
      {
        id: 'sk-4',
        label: 'KEEMPAT',
        text: 'Keputusan ini berlaku sejak tanggal ditetapkan dan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya.',
      },
    ],
    establishedIn: 'Sungai Rengit',
    establishedDate: dateStr || formatIndonesianDate(),
  };
}

export function createDefaultGiverParty(kop?: LetterheadConfig): GiverPartyInfo {
  const isSd = kop?.id === 'kop-sdit-qudwah';
  const isKb = kop?.id === 'kop-kbit-qudwah';
  return {
    name: isSd
      ? 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.'
      : isKb
        ? 'Siti Aminah, S.Pd.AUD.'
        : 'H. Ahmad Fauzi, S.Pd.I.',
    title: isSd
      ? 'Kepala SD IT Qudwah Sungai Rengit'
      : isKb
        ? 'Kepala KB IT Qudwah Sungai Rengit'
        : 'Ketua Yayasan',
    address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
  };
}

export function createDefaultRecipientParty(role: 'guru' | 'siswa' = 'guru'): RecipientPartyInfo {
  if (role === 'siswa') {
    return {
      roleType: 'siswa',
      name: 'Aulia Putri Maharani',
      birthPlaceDate: 'Banyuasin, 14 Mei 2016',
      studentNisn: '0154829104',
      teacherIdType: 'NIY',
      teacherIdNumber: '',
      position: 'Siswa Kelas IV (Empat)',
      address: 'Dusun II Desa Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
    };
  }
  return {
    roleType: 'guru',
    name: 'Rizky Pratama, S.Pd.',
    birthPlaceDate: 'Palembang, 21 Mei 1995',
    studentNisn: '',
    teacherIdType: 'NIY',
    teacherIdNumber: '20210715 014',
    position: 'Guru Kelas & Koordinator Kurikulum',
    address: 'Perumahan Griya Sungai Rengit Blok B-04, Kec. Talang Kelapa, Kab. Banyuasin',
  };
}

export function createDefaultForwardingItems(): ForwardingItem[] {
  return [
    {
      id: 'fwd-1',
      description: 'Laporan Pertanggungjawaban Kegiatan & Berkas Administrasi Lembaga',
      quantity: '1 (satu) berkas',
      notes: 'Disampaikan untuk diketahui dan ditindaklanjuti sebagaimana mestinya.',
    },
  ];
}

export function getDefaultSubjectCodeForTemplate(templateId: string): string {
  const prefixMap: Record<string, string> = {
    'undangan-rapat': 'UND',
    'surat-keputusan': 'SK',
    'surat-tugas': 'ST',
    'surat-edaran': 'SE',
    'surat-keterangan-instansi': 'SUKET',
    'keterangan-aktif-sekolah': 'SUKET',
    'surat-kuasa': 'SKU',
    'surat-pengantar': 'SPENG',
    'penawaran-kerjasama': 'SPMH',
    'keterangan-kerja': 'SUKET',
    'surat-peringatan': 'SP',
    'permohonan-izin-kegiatan': 'SPMH',
    'permohonan-rekomendasi': 'SPMH',
  };
  return prefixMap[templateId] || 'UND';
}

export function resolveLetterKind(doc: LetterDocument): LetterKind {
  if (doc.letterKind) return doc.letterKind;
  if (doc.templateId === 'surat-keputusan') return 'sk';
  if (doc.templateId === 'surat-tugas') return 'surat-tugas';
  if (
    doc.templateId === 'surat-keterangan-instansi' ||
    doc.templateId === 'keterangan-aktif-sekolah' ||
    doc.templateId === 'keterangan-kerja'
  ) {
    return 'surat-keterangan';
  }
  if (doc.templateId === 'surat-kuasa') return 'surat-kuasa';
  if (doc.templateId === 'surat-pengantar') return 'surat-pengantar';
  return 'standard';
}

function baseDoc(
  templateId: string,
  templateName: string,
  category: LetterDocument['category'],
  formatStyle: LetterDocument['formatStyle'],
  letterhead: LetterheadConfig,
  overrides: Partial<LetterDocument>
): LetterDocument {
  const today = formatIndonesianDate();
  return {
    id: `doc-${Date.now()}`,
    templateId,
    templateName,
    category,
    formatStyle,
    letterKind: 'standard',
    decreeTitle: '',
    letterhead: { ...letterhead },
    letterNumber: generateLetterNumber('UND', getInstitutionCodeFromKop(letterhead), 'A', '', today),
    attachment: '-',
    urgency: 'Penting',
    subject: '',
    city: 'Sungai Rengit',
    dateString: today,
    recipientLines: [],
    salutation: 'Dengan hormat,',
    openingParagraph: '',
    detailRows: [],
    bodyParagraphs: [],
    closingParagraph: '',
    signerDepartment: '',
    signerTitle: 'Ketua Yayasan',
    signerName: 'H. Ahmad Fauzi, S.Pd.I.',
    signerIdLabel: 'NIY',
    signerIdValue: '19820514 201001 1 002',
    signatureDataUrl: null,
    signatureScale: 100,
    showStamp: true,
    stampMode: 'auto-svg',
    customStampDataUrl: null,
    stampScale: 100,
    stampTextTop: letterhead.orgName,
    stampTextCenter: 'SUNGAI RENGIT',
    stampColor: '#1e3a8a',
    ccList: [],
    paperSize: 'A4',
    fontFamily: 'times',
    fontSizePt: 11,
    marginPreset: 'standard',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'undangan-rapat',
    name: 'Surat Undangan Rapat Resmi',
    category: 'Organisasi',
    formatStyle: 'correspondence',
    description: 'Undangan rapat pengurus, guru, atau wali murid lengkap dengan waktu dan agenda.',
    defaultLetterheadId: 'kop-yayasan-kksr',
    buildDocument: (kop) =>
      baseDoc('undangan-rapat', 'Surat Undangan Rapat Resmi', 'Organisasi', 'correspondence', kop, {
        letterNumber: generateLetterNumber('UND', getInstitutionCodeFromKop(kop), 'A', ''),
        attachment: '1 (satu) berkas',
        urgency: 'Penting',
        subject: 'Undangan Rapat Koordinasi Program Kerja dan Evaluasi Triwulan IV',
        city: 'Sungai Rengit',
        recipientLines: [
          'Yth. Bapak/Ibu Pengurus dan Kepala Unit',
          'di Lingkungan Yayasan',
          'Tempat',
        ],
        salutation: 'Assalamu’alaikum Warahmatullahi Wabarakatuh,',
        openingParagraph:
          'Dengan memohon rahmat dan ridho Allah SWT, semoga Bapak/Ibu senantiasa dalam keadaan sehat wal’afiat dan sukses menjalankan aktivitas sehari-hari. Bersama ini kami mengundang Bapak/Ibu untuk menghadiri rapat koordinasi yang akan diselenggarakan pada:',
        detailRows: [
          { id: 'd1', label: 'Hari / Tanggal', value: 'Selasa, 17 November 2026' },
          { id: 'd2', label: 'Waktu', value: 'Pukul 09.00 WIB s.d. selesai' },
          { id: 'd3', label: 'Tempat', value: 'Ruang Rapat Utama Sekretariat Yayasan' },
          { id: 'd4', label: 'Agenda', value: '1. Evaluasi program berjalan; 2. Persiapan agenda akhir semester' },
        ],
        bodyParagraphs: [
          'Mengingat pentingnya agenda pembahasan tersebut, dimohon agar Bapak/Ibu hadir tepat pada waktunya serta membawa laporan perkembangan masing-masing unit.',
        ],
        closingParagraph:
          'Demikian undangan ini kami sampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih. Wassalamu’alaikum Warahmatullahi Wabarakatuh.',
        signerDepartment: 'Ketua Umum,',
        signerTitle: '',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: '20180101 001',
        ccList: ['Dewan Pembina Yayasan;', 'Arsip Sekretariat.'],
      }),
  },
  {
    id: 'surat-keputusan',
    name: 'Surat Keputusan (SK)',
    category: 'Organisasi',
    formatStyle: 'decree',
    letterKind: 'sk',
    description: 'Format SK resmi lengkap dengan Tentang, Menimbang, Mengingat, Memutuskan, dan Diktum.',
    defaultLetterheadId: 'kop-sdit-qudwah',
    buildDocument: (kop) => {
      const today = formatIndonesianDate();
      const orgName = kop.orgName || 'SD IT Qudwah Sungai Rengit';
      return baseDoc('surat-keputusan', 'Surat Keputusan (SK)', 'Organisasi', 'decree', kop, {
        letterKind: 'sk',
        decreeTitle: 'SURAT KEPUTUSAN',
        letterNumber: generateLetterNumber('SK', getInstitutionCodeFromKop(kop), 'A', '', today),
        city: 'Sungai Rengit',
        dateString: today,
        salutation: '',
        openingParagraph: `Kepala ${orgName},`,
        skData: createDefaultSkData(kop, today),
        signerDepartment: `Kepala ${orgName},`,
        signerTitle: '',
        signerName: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170701 003',
        ccList: ['Ketua Yayasan SIT Qudwah Sungai Rengit;', 'Yang bersangkutan untuk dilaksanakan;', 'Arsip.'],
      });
    },
  },
  {
    id: 'surat-tugas',
    name: 'Surat Perintah Tugas',
    category: 'Pendidikan',
    formatStyle: 'decree',
    letterKind: 'surat-tugas',
    description: 'Penugasan resmi guru/siswa lengkap dengan data pemberi tugas dan yang diberi tugas.',
    defaultLetterheadId: 'kop-sdit-qudwah',
    buildDocument: (kop) =>
      baseDoc('surat-tugas', 'Surat Perintah Tugas', 'Pendidikan', 'decree', kop, {
        letterKind: 'surat-tugas',
        decreeTitle: 'SURAT TUGAS',
        letterNumber: generateLetterNumber('ST', getInstitutionCodeFromKop(kop), 'A', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph: 'Dengan ini memberikan tugas kepada:',
        giverParty: {
          name: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
          title: 'Kepala SD IT Qudwah Sungai Rengit',
          address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        recipientParty: createDefaultRecipientParty('guru'),
        detailRows: [
          { id: 'd1', label: 'Hari / Tanggal', value: 'Rabu–Jumat, 18–20 November 2026' },
          { id: 'd2', label: 'Tempat Tujuan', value: 'Aula Dinas Pendidikan Kabupaten Banyuasin' },
        ],
        bodyParagraphs: [
          'Untuk mengikuti kegiatan Bimbingan Teknis Implementasi Kurikulum Merdeka dan Penguatan Literasi Sekolah Dasar Tingkat Kabupaten Banyuasin.',
          'Setelah melaksanakan tugas dimaksud, yang bersangkutan agar menyampaikan laporan hasil kegiatan kepada pemberi tugas.',
        ],
        closingParagraph:
          'Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.',
        signerDepartment: 'Kepala SD IT Qudwah Sungai Rengit,',
        signerTitle: '',
        signerName: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170701 003',
        ccList: ['Ketua Yayasan SIT Qudwah Sungai Rengit;', 'Yang bersangkutan untuk dilaksanakan.'],
      }),
  },
  {
    id: 'surat-edaran',
    name: 'Surat Edaran Resmi',
    category: 'Pendidikan',
    formatStyle: 'decree',
    description: 'Edaran kebijakan, jadwal kegiatan sekolah, atau pemberitahuan resmi wali murid.',
    defaultLetterheadId: 'kop-kbit-qudwah',
    buildDocument: (kop) =>
      baseDoc('surat-edaran', 'Surat Edaran Resmi', 'Pendidikan', 'decree', kop, {
        decreeTitle: 'SURAT EDARAN',
        letterNumber: generateLetterNumber('SE', getInstitutionCodeFromKop(kop), 'B', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph:
          'Kepada Yth. Bapak/Ibu Orang Tua/Wali Peserta Didik KB IT Qudwah Sungai Rengit. Dalam rangka menyambut kegiatan Pekan Kreativitas Anak dan Peringatan Hari Guru Nasional Tahun 2026, bersama ini kami sampaikan ketentuan sebagai berikut:',
        detailRows: [
          { id: 'd1', label: '1. Jadwal Kegiatan', value: 'Dilaksanakan pada hari Rabu–Kamis, 25–26 November 2026.' },
          { id: 'd2', label: '2. Pakaian Peserta', value: 'Memakai seragam olahraga sekolah lengkap dan membawa bekal sehat.' },
          { id: 'd3', label: '3. Waktu Penjemputan', value: 'Pukul 10.30 WIB di area halaman utama KB IT Qudwah.' },
        ],
        bodyParagraphs: [
          'Kami memohon kerja sama Bapak/Ibu wali murid untuk mendampingi dan mempersiapkan putra-putrinya agar kegiatan dapat berjalan dengan lancar dan menyenangkan.',
        ],
        closingParagraph:
          'Demikian Surat Edaran ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.',
        signerDepartment: 'Kepala KB IT Qudwah Sungai Rengit,',
        signerTitle: '',
        signerName: 'Siti Aminah, S.Pd.AUD.',
        signerIdLabel: 'NIY',
        signerIdValue: '20190812 007',
        ccList: ['Ketua Yayasan SIT Qudwah Sungai Rengit;', 'Arsip Sekolah.'],
      }),
  },
  {
    id: 'surat-keterangan-instansi',
    name: 'Surat Keterangan Resmi',
    category: 'Pendidikan',
    formatStyle: 'decree',
    letterKind: 'surat-keterangan',
    description: 'Surat keterangan resmi guru/pegawai lengkap dengan formulir yang menerangkan dan yang diterangkan.',
    defaultLetterheadId: 'kop-yayasan-sit-qudwah',
    buildDocument: (kop) =>
      baseDoc('surat-keterangan-instansi', 'Surat Keterangan Resmi', 'Pendidikan', 'decree', kop, {
        letterKind: 'surat-keterangan',
        decreeTitle: 'SURAT KETERANGAN',
        letterNumber: generateLetterNumber('SUKET', getInstitutionCodeFromKop(kop), 'A', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph: 'Dengan ini menerangkan dengan sesungguhnya bahwa:',
        giverParty: {
          name: 'H. Ahmad Fauzi, S.Pd.I.',
          title: 'Ketua Yayasan SIT Qudwah Sungai Rengit',
          address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        recipientParty: {
          roleType: 'guru',
          name: 'Nadia Kusuma Wardani, S.Pd.',
          birthPlaceDate: 'Palembang, 21 Mei 1995',
          studentNisn: '',
          teacherIdType: 'NIY',
          teacherIdNumber: '20200311 012',
          position: 'Guru Tetap Yayasan – SD IT Qudwah Sungai Rengit',
          address: 'Desa Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        bodyParagraphs: [
          'Adalah benar pendidik aktif yang bertugas di lingkungan Yayasan SIT Qudwah Sungai Rengit terhitung sejak 1 Juli 2020 hingga saat surat keterangan ini diterbitkan, serta berkelakuan baik dan berdedikasi tinggi dalam menjalankan tugas.',
          'Surat keterangan ini diterbitkan untuk dipergunakan sebagai kelengkapan persyaratan administrasi.',
        ],
        closingParagraph:
          'Demikian Surat Keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.',
        signerDepartment: 'Ketua Yayasan SIT Qudwah Sungai Rengit,',
        signerTitle: '',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170101 001',
        ccList: [],
      }),
  },
  {
    id: 'keterangan-aktif-sekolah',
    name: 'Surat Keterangan Aktif Siswa',
    category: 'Pendidikan',
    formatStyle: 'decree',
    letterKind: 'surat-keterangan',
    description: 'Keterangan status peserta didik aktif lengkap dengan NISN dan tanggal lahir siswa.',
    defaultLetterheadId: 'kop-sdit-qudwah',
    buildDocument: (kop) =>
      baseDoc('keterangan-aktif-sekolah', 'Surat Keterangan Aktif Siswa', 'Pendidikan', 'decree', kop, {
        letterKind: 'surat-keterangan',
        decreeTitle: 'SURAT KETERANGAN AKTIF SISWA',
        letterNumber: generateLetterNumber('SUKET', getInstitutionCodeFromKop(kop), 'B', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph: 'Dengan ini menerangkan dengan sesungguhnya bahwa:',
        giverParty: {
          name: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
          title: 'Kepala SD IT Qudwah Sungai Rengit',
          address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        recipientParty: createDefaultRecipientParty('siswa'),
        detailRows: [
          { id: 'd1', label: 'Tahun Pelajaran', value: '2026 / 2027' },
          { id: 'd2', label: 'Nama Orang Tua / Wali', value: 'Bapak Hendra Saputra' },
        ],
        bodyParagraphs: [
          'Adalah benar tercatat sebagai peserta didik aktif pada SD IT Qudwah Sungai Rengit pada Tahun Pelajaran 2026/2027 dan berkelakuan baik.',
          'Surat keterangan ini diterbitkan untuk keperluan kelengkapan administrasi pengajuan Program Indonesia Pintar (PIP) / Beasiswa.',
        ],
        closingParagraph:
          'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.',
        signerDepartment: 'Kepala SD IT Qudwah Sungai Rengit,',
        signerTitle: '',
        signerName: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170701 003',
        ccList: [],
      }),
  },
  {
    id: 'surat-kuasa',
    name: 'Surat Kuasa Resmi',
    category: 'Organisasi',
    formatStyle: 'decree',
    letterKind: 'surat-kuasa',
    description: 'Surat pelimpahan kuasa resmi antara pemberi kuasa dan penerima kuasa.',
    defaultLetterheadId: 'kop-yayasan-kksr',
    buildDocument: (kop) =>
      baseDoc('surat-kuasa', 'Surat Kuasa Resmi', 'Organisasi', 'decree', kop, {
        letterKind: 'surat-kuasa',
        decreeTitle: 'SURAT KUASA',
        letterNumber: generateLetterNumber('SKU', getInstitutionCodeFromKop(kop), 'B', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph: 'Dengan ini memberikan kuasa penuh kepada:',
        giverParty: {
          name: 'H. Ahmad Fauzi, S.Pd.I.',
          title: 'Ketua Yayasan KKSR',
          address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        recipientParty: {
          roleType: 'guru',
          name: 'Dimas Aditya Nugroho, S.E.',
          birthPlaceDate: 'Palembang, 12 Agustus 1993',
          studentNisn: '',
          teacherIdType: 'NIY',
          teacherIdNumber: 'KKSR-2021-045',
          position: 'Staf Administrasi & Keuangan Yayasan',
          address: 'Desa Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        bodyParagraphs: [
          'Untuk bertindak atas nama Pemberi Kuasa dalam pengurusan administrasi, pengambilan dokumen resmi, serta penandatanganan tanda terima berkas kelembagaan di instansi terkait.',
          'Penerima Kuasa bertanggung jawab penuh melaporkan seluruh hasil pelaksanaan kuasa ini kepada Pemberi Kuasa.',
        ],
        closingParagraph:
          'Demikian Surat Kuasa ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.',
        signerDepartment: 'Pemberi Kuasa,',
        signerTitle: 'Ketua Yayasan KKSR',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: 'KKSR-001-2018',
        ccList: ['Arsip Sekretariat.'],
      }),
  },
  {
    id: 'surat-pengantar',
    name: 'Surat Pengantar Resmi',
    category: 'Pendidikan',
    formatStyle: 'correspondence',
    letterKind: 'surat-pengantar',
    description: 'Surat pengantar resmi pengiriman berkas/personel dengan formulir pemberi & penerima pengantar.',
    defaultLetterheadId: 'kop-sdit-qudwah',
    buildDocument: (kop) =>
      baseDoc('surat-pengantar', 'Surat Pengantar Resmi', 'Pendidikan', 'correspondence', kop, {
        letterKind: 'surat-pengantar',
        decreeTitle: 'SURAT PENGANTAR',
        letterNumber: generateLetterNumber('SPENG', getInstitutionCodeFromKop(kop), 'B', ''),
        subject: 'Pengantar Penyerahan Berkas Administrasi & Laporan Lembaga',
        city: 'Sungai Rengit',
        recipientLines: [
          'Yth. Kepala Dinas Pendidikan Kabupaten Banyuasin',
          'Cq. Bidang Pembinaan Sekolah Dasar',
          'di Pangkalan Balai',
        ],
        salutation: '',
        openingParagraph: 'Dengan ini memberikan surat pengantar kepada:',
        giverParty: {
          name: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
          title: 'Kepala SD IT Qudwah Sungai Rengit',
          address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        recipientParty: createDefaultRecipientParty('guru'),
        forwardingItems: createDefaultForwardingItems(),
        bodyParagraphs: [
          'Yang bersangkutan diberi pengantar untuk menyampaikan berkas administrasi sekolah sebagaimana tercantum pada daftar di atas.',
        ],
        closingParagraph:
          'Demikian surat pengantar ini kami buat untuk dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.',
        signerDepartment: 'Kepala SD IT Qudwah Sungai Rengit,',
        signerTitle: '',
        signerName: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170701 003',
        ccList: ['Ketua Yayasan SIT Qudwah Sungai Rengit;', 'Arsip Sekolah.'],
      }),
  },
  {
    id: 'permohonan-izin-kegiatan',
    name: 'Surat Permohonan Izin Kegiatan / Tempat',
    category: 'Pendidikan',
    formatStyle: 'correspondence',
    description: 'Permohonan resmi izin kegiatan, kunjungan edukasi, atau peminjaman aula/tempat.',
    defaultLetterheadId: 'kop-sdit-qudwah',
    buildDocument: (kop) =>
      baseDoc('permohonan-izin-kegiatan', 'Surat Permohonan Izin Kegiatan / Tempat', 'Pendidikan', 'correspondence', kop, {
        letterNumber: generateLetterNumber('SPMH', getInstitutionCodeFromKop(kop), 'B', ''),
        attachment: '1 (satu) berkas Rundown Kegiatan',
        urgency: 'Penting',
        subject: 'Permohonan Izin Kunjungan Edukasi (Outing Class) Peserta Didik',
        city: 'Sungai Rengit',
        recipientLines: [
          'Yth. Pimpinan / Kepala Pengelola',
          'Taman Edukasi Agrowisata Kabupaten Banyuasin',
          'di Tempat',
        ],
        salutation: 'Assalamu’alaikum Warahmatullahi Wabarakatuh,',
        openingParagraph:
          'Dalam rangka mendukung pembelajaran kontekstual peserta didik kelas III dan IV, SD IT Qudwah Sungai Rengit bermaksud mengajukan permohonan izin kunjungan edukasi (Outing Class) yang insya Allah akan dilaksanakan pada:',
        detailRows: [
          { id: 'd1', label: 'Hari / Tanggal', value: 'Sabtu, 28 November 2026' },
          { id: 'd2', label: 'Waktu Kunjungan', value: 'Pukul 08.30 WIB s.d. 13.00 WIB' },
          { id: 'd3', label: 'Jumlah Peserta', value: '65 Siswa dan 8 Guru Pendamping' },
          { id: 'd4', label: 'Fokus Materi', value: 'Pengenalan budidaya tanaman pangan dan pengelolaan lingkungan' },
        ],
        bodyParagraphs: [
          'Kami berkomitmen penuh untuk menjaga ketertiban, kebersihan, serta keamanan selama kegiatan berlangsung di lokasi.',
        ],
        closingParagraph:
          'Demikian surat permohonan ini kami sampaikan. Atas perhatian dan izin yang diberikan, kami ucapkan terima kasih.',
        signerDepartment: 'Kepala SD IT Qudwah Sungai Rengit,',
        signerTitle: '',
        signerName: 'Ustadz M. Yusuf Al-Hakim, S.Pd., M.Pd.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170701 003',
        ccList: ['Ketua Yayasan SIT Qudwah Sungai Rengit;', 'Arsip Sekolah.'],
      }),
  },
  {
    id: 'permohonan-rekomendasi',
    name: 'Surat Permohonan Rekomendasi / Bantuan',
    category: 'Organisasi',
    formatStyle: 'correspondence',
    description: 'Permohonan dukungan resmi, narasumber, atau bantuan program sosial yayasan.',
    defaultLetterheadId: 'kop-yayasan-kksr',
    buildDocument: (kop) =>
      baseDoc('permohonan-rekomendasi', 'Surat Permohonan Rekomendasi / Bantuan', 'Organisasi', 'correspondence', kop, {
        letterNumber: generateLetterNumber('SPMH', getInstitutionCodeFromKop(kop), 'B', ''),
        attachment: '1 (satu) berkas Proposal & RAB Kegiatan',
        urgency: 'Penting',
        subject: 'Permohonan Dukungan Program Bakti Sosial dan Santunan Pendidikan',
        city: 'Sungai Rengit',
        recipientLines: [
          'Yth. Bapak/Ibu Pimpinan Instansi / Donatur',
          'di Wilayah Kec. Talang Kelapa',
          'Tempat',
        ],
        salutation: 'Dengan hormat,',
        openingParagraph:
          'Teriring doa semoga Bapak/Ibu beserta seluruh jajaran senantiasa berada dalam lindungan Tuhan Yang Maha Esa. Dalam rangka kepedulian sosial terhadap masyarakat sekitar dan anak yatim dhuafa, Yayasan KKSR akan menyelenggarakan kegiatan Bakti Sosial dan Santunan Pendidikan pada:',
        detailRows: [
          { id: 'd1', label: 'Nama Kegiatan', value: 'Bakti Sosial & Santunan Pendidikan Yayasan KKSR 2026' },
          { id: 'd2', label: 'Waktu Pelaksanaan', value: 'Minggu, 6 Desember 2026, Pukul 08.00 WIB – selesai' },
          { id: 'd3', label: 'Lokasi Kegiatan', value: 'Halaman Sekretariat Yayasan KKSR, Sungai Rengit' },
          { id: 'd4', label: 'Target Penerima', value: '120 Paket Sembako & Perlengkapan Sekolah' },
        ],
        bodyParagraphs: [
          'Melalui surat ini, kami mengetuk hati Bapak/Ibu kiranya berkenan memberikan dukungan baik berupa rekomendasi, donasi dana, maupun paket kebutuhan pokok demi kelancaran acara dimaksud.',
        ],
        closingParagraph:
          'Demikian permohonan ini kami sampaikan. Atas partisipasi dan dukungan yang diberikan, kami ucapkan terima kasih.',
        signerDepartment: 'Pengurus Yayasan KKSR',
        signerTitle: 'Ketua Umum,',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: 'KKSR-001-2018',
        ccList: ['Dewan Pembina Yayasan KKSR;', 'Arsip Sekretariat.'],
      }),
  },
  {
    id: 'penawaran-kerjasama',
    name: 'Surat Kerjasama / MoU Lembaga',
    category: 'Perusahaan',
    formatStyle: 'correspondence',
    description: 'Surat pengajuan kemitraan atau kerjasama program antar lembaga maupun mitra usaha.',
    defaultLetterheadId: 'kop-yayasan-sit-qudwah',
    buildDocument: (kop) =>
      baseDoc('penawaran-kerjasama', 'Surat Kerjasama / MoU Lembaga', 'Perusahaan', 'correspondence', kop, {
        letterNumber: generateLetterNumber('SPMH', getInstitutionCodeFromKop(kop), 'B', ''),
        attachment: '1 (satu) bundel Profil Lembaga',
        urgency: 'Penting',
        subject: 'Penawaran Kerjasama Program Kemitraan Pendidikan dan Pengembangan SDM',
        city: 'Sungai Rengit',
        recipientLines: [
          'Kepada Yth.',
          'Pimpinan Mitra / Instansi Tujuan',
          'di Tempat',
        ],
        salutation: 'Dengan hormat,',
        openingParagraph:
          'Perkenalkan kami dari Yayasan SIT Qudwah Sungai Rengit yang menaungi unit pendidikan KB IT dan SD IT Qudwah. Dalam rangka peningkatan mutu layanan pendidikan dan sinergi kelembagaan, kami mengajukan penawaran kerjasama dengan rincian sebagai berikut:',
        detailRows: [
          { id: 'd1', label: 'Lingkup Kerjasama', value: 'Pelatihan Guru, Pengadaan Sarana Belajar & Program Beasiswa' },
          { id: 'd2', label: 'Jangka Waktu', value: '1 (satu) Tahun Pelajaran (2026/2027) dan dapat diperpanjang' },
          { id: 'd3', label: 'Narahubung', value: 'Sekretariat Yayasan SIT Qudwah (0813-0000-0000)' },
        ],
        bodyParagraphs: [
          'Besar harapan kami agar terjalin pertemuan lanjutan guna membahas teknis pelaksanaan kerjasama yang saling memberi manfaat.',
        ],
        closingParagraph:
          'Demikian surat penawaran kerjasama ini kami sampaikan. Atas perhatian dan kesempatan yang baik, kami ucapkan terima kasih.',
        signerDepartment: 'Yayasan SIT Qudwah Sungai Rengit',
        signerTitle: 'Ketua Yayasan,',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170101 001',
        ccList: ['Arsip Yayasan.'],
      }),
  },
  {
    id: 'keterangan-kerja',
    name: 'Surat Keterangan Pengalaman Kerja',
    category: 'Perusahaan',
    formatStyle: 'decree',
    letterKind: 'surat-keterangan',
    description: 'Surat referensi pengalaman kerja guru/staf aktif atau purna tugas dari yayasan.',
    defaultLetterheadId: 'kop-yayasan-kksr',
    buildDocument: (kop) =>
      baseDoc('keterangan-kerja', 'Surat Keterangan Pengalaman Kerja', 'Perusahaan', 'decree', kop, {
        letterKind: 'surat-keterangan',
        decreeTitle: 'SURAT KETERANGAN PENGALAMAN KERJA',
        letterNumber: generateLetterNumber('SUKET', getInstitutionCodeFromKop(kop), 'A', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph: 'Dengan ini menerangkan bahwa:',
        giverParty: {
          name: 'H. Ahmad Fauzi, S.Pd.I.',
          title: 'Ketua Umum Yayasan KKSR',
          address: 'Jl. Palembang – Jambi KM. 43, Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        recipientParty: {
          roleType: 'guru',
          name: 'Dimas Aditya Nugroho, S.E.',
          birthPlaceDate: 'Palembang, 12 Agustus 1993',
          studentNisn: '',
          teacherIdType: 'NIY',
          teacherIdNumber: 'KKSR-2021-045',
          position: 'Staf Administrasi & Keuangan',
          address: 'Desa Sungai Rengit, Kec. Talang Kelapa, Kab. Banyuasin',
        },
        detailRows: [
          { id: 'd4', label: 'Masa Pengabdian', value: '1 Februari 2021 s.d. 31 Oktober 2026' },
        ],
        bodyParagraphs: [
          'Yang bersangkutan telah bekerja di lingkungan Yayasan KKSR dengan penuh dedikasi, amanah, dan kinerja yang sangat baik.',
        ],
        closingParagraph:
          'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
        signerDepartment: 'Yayasan KKSR',
        signerTitle: 'Ketua Umum,',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: 'KKSR-001-2018',
        ccList: [],
      }),
  },
  {
    id: 'surat-peringatan',
    name: 'Surat Peringatan Pertama (SP 1)',
    category: 'Perusahaan',
    formatStyle: 'decree',
    description: 'Surat pembinaan kedisiplinan internal staf/karyawan sesuai tata tertib lembaga.',
    defaultLetterheadId: 'kop-yayasan-sit-qudwah',
    buildDocument: (kop) =>
      baseDoc('surat-peringatan', 'Surat Peringatan Pertama (SP 1)', 'Perusahaan', 'decree', kop, {
        decreeTitle: 'SURAT PERINGATAN PERTAMA (SP-1)',
        letterNumber: generateLetterNumber('SP', getInstitutionCodeFromKop(kop), 'A', ''),
        city: 'Sungai Rengit',
        salutation: '',
        openingParagraph:
          'Pengurus Yayasan SIT Qudwah Sungai Rengit dengan ini memberikan Surat Peringatan Pertama (SP-1) kepada:',
        detailRows: [
          { id: 'd1', label: 'Nama', value: 'Fajar Kurniawan' },
          { id: 'd2', label: 'NIY', value: '20240819 022' },
          { id: 'd3', label: 'Jabatan', value: 'Staf Operasional & Sarpras' },
          { id: 'd4', label: 'Unit Kerja', value: 'Yayasan SIT Qudwah Sungai Rengit' },
        ],
        bodyParagraphs: [
          'Surat Peringatan ini diterbitkan sehubungan dengan ketidakhadiran tanpa keterangan sah serta keterlambatan berulang yang melanggar ketentuan Tata Tertib Kepegawaian Yayasan.',
          'Surat Peringatan Pertama ini berlaku selama 6 (enam) bulan sejak tanggal ditetapkan sebagai bahan evaluasi dan pembinaan kedisiplinan.',
        ],
        closingParagraph:
          'Demikian surat peringatan ini disampaikan agar menjadi perhatian dan perbaikan kinerja ke depan.',
        signerDepartment: 'Yayasan SIT Qudwah Sungai Rengit',
        signerTitle: 'Ketua Yayasan,',
        signerName: 'H. Ahmad Fauzi, S.Pd.I.',
        signerIdLabel: 'NIY',
        signerIdValue: '20170101 001',
        ccList: ['Kepala Unit Terkait;', 'Arsip Kepegawaian.'],
      }),
  },
];
