/**
 * TATA NASKAH DINAS SIT QUDWAH
 * Backend Google Apps Script: Google Drive + Google Spreadsheet.
 *
 * Jalankan setupWorkspace() satu kali dari editor Apps Script sebagai pemilik.
 * Deploy sebagai Web App setelah daftar pengguna dan izin akses ditetapkan.
 */

const TN = {
  ROOT_FOLDER: 'TATA NASKAH DINAS - SIT QUDWAH',
  SHEETS: {
    Users: ['email', 'nama', 'jabatan', 'role', 'aktif', 'dibuat'],
    Settings: ['key', 'value', 'updatedAt'],
    Letterheads: ['id', 'nama', 'dataJson', 'updatedAt'],
    Drafts: ['id', 'judul', 'nomorSurat', 'dataJson', 'driveFileId', 'updatedAt', 'updatedBy'],
    Archives: ['id', 'judul', 'nomorSurat', 'tanggal', 'jenisSurat', 'pdfFileId', 'jsonFileId', 'driveUrl', 'createdAt', 'createdBy'],
    Counters: ['key', 'lastNumber', 'updatedAt'],
    AuditLog: ['timestamp', 'email', 'action', 'recordId', 'detail']
  },
  FOLDERS: ['01 IDENTITAS SEKOLAH', '02 TEMPLATE SURAT', '03 ARSIP SURAT', '04 DOKUMEN PENDUKUNG', '05 CADANGAN DATA']
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Tata Naskah Dinas - SIT Qudwah')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Jalankan satu kali. Membuat folder pusat, spreadsheet, tab, dan akun admin.
 * Email pemilik yang menjalankan fungsi ini didaftarkan sebagai admin.
 */
function setupWorkspace() {
  const props = PropertiesService.getScriptProperties();
  let root = findOrCreateFolder_(DriveApp.getRootFolder(), TN.ROOT_FOLDER);
  props.setProperty('TN_ROOT_FOLDER_ID', root.getId());

  const folders = {};
  TN.FOLDERS.forEach(name => {
    folders[name] = findOrCreateFolder_(root, name).getId();
  });
  props.setProperty('TN_FOLDERS', JSON.stringify(folders));

  let ss;
  const savedId = props.getProperty('TN_SPREADSHEET_ID');
  if (savedId) {
    try { ss = SpreadsheetApp.openById(savedId); } catch (e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create('DATABASE TATA NASKAH DINAS - SIT QUDWAH');
    DriveApp.getFileById(ss.getId()).moveTo(root);
    props.setProperty('TN_SPREADSHEET_ID', ss.getId());
  }

  Object.keys(TN.SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = TN.SHEETS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
  });
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }

  const ownerEmail = Session.getEffectiveUser().getEmail().toLowerCase();
  if (!ownerEmail) throw new Error('Email pemilik Google tidak dapat dibaca. Jalankan setup menggunakan akun Google sekolah.');
  const users = ss.getSheetByName('Users');
  const existing = users.getDataRange().getValues().slice(1)
    .some(row => String(row[0]).toLowerCase() === ownerEmail);
  if (!existing) users.appendRow([ownerEmail, 'Administrator', 'Admin Sistem', 'admin', true, new Date()]);

  setSetting_('rootFolderId', root.getId());
  setSetting_('spreadsheetId', ss.getId());
  setSetting_('initializedAt', new Date().toISOString());
  return {
    success: true,
    rootFolderUrl: root.getUrl(),
    spreadsheetUrl: ss.getUrl(),
    folders: folders
  };
}

function getAppStatus() {
  const props = PropertiesService.getScriptProperties();
  const rootId = props.getProperty('TN_ROOT_FOLDER_ID');
  const ssId = props.getProperty('TN_SPREADSHEET_ID');
  // Public status endpoint intentionally reveals no Drive/Spreadsheet URLs or IDs.
  return {
    initialized: Boolean(rootId && ssId),
    appName: 'Tata Naskah Dinas - SIT Qudwah'
  };
}

function getBootstrapData() {
  const email = requireAuthorizedUser_();
  const ss = getDatabase_();
  const profiles = readJsonRows_(ss.getSheetByName('Letterheads'), 2);
  const drafts = readJsonRows_(ss.getSheetByName('Drafts'), 3);
  const archive = ss.getSheetByName('Archives').getDataRange().getValues().slice(1)
    .filter(r => r[0])
    .map(r => ({
      id: r[0], title: r[1], letterNumber: r[2], date: r[3],
      kind: r[4], pdfFileId: r[5], jsonFileId: r[6], driveUrl: r[7],
      createdAt: r[8], createdBy: r[9]
    }));
  return { email: email, profiles: profiles, drafts: drafts, archive: archive, status: getAppStatus() };
}

function saveDraft(letter) {
  const email = requireAuthorizedUser_();
  validateObject_(letter, 'Data surat');
  if (!letter.id) letter.id = Utilities.getUuid();
  const ss = getDatabase_();
  const folder = getFolder_('05 CADANGAN DATA');
  const fileName = 'DRAFT-' + safeName_(letter.letterNumber || letter.id) + '.json';
  const json = JSON.stringify(letter);
  const file = upsertJsonFile_(folder, fileName, json);
  upsertRowById_(ss.getSheetByName('Drafts'), letter.id, [
    letter.id, letter.templateName || letter.decreeTitle || 'Draf Surat',
    letter.letterNumber || '', json, file.getId(), new Date(), email
  ]);
  logAction_(email, 'SAVE_DRAFT', letter.id, fileName);
  return { success: true, id: letter.id, driveFileId: file.getId(), updatedAt: new Date().toISOString() };
}

function saveLetterhead(profile) {
  const email = requireAuthorizedUser_();
  validateObject_(profile, 'Profil kop surat');
  if (!profile.id) throw new Error('ID profil kop surat wajib diisi.');
  const ss = getDatabase_();
  const json = JSON.stringify(profile);
  upsertRowById_(ss.getSheetByName('Letterheads'), profile.id, [
    profile.id, profile.profileName || profile.orgName || 'Profil kop', json, new Date()
  ]);
  logAction_(email, 'SAVE_LETTERHEAD', profile.id, profile.profileName || '');
  return { success: true, id: profile.id };
}

/**
 * Simpan PDF hasil ekspor aplikasi dan arsip data surat.
 * pdfBase64 harus berupa base64 murni (tanpa awalan data:application/pdf;base64,).
 */
function archiveLetter(payload) {
  const email = requireAuthorizedUser_();
  validateObject_(payload, 'Data arsip');
  if (!payload.letter || !payload.pdfBase64) throw new Error('Data surat dan PDF wajib disertakan.');

  const letter = payload.letter;
  const archiveId = letter.id || Utilities.getUuid();
  const year = String((letter.dateString || new Date().getFullYear()).match(/20\d{2}/)?.[0] || new Date().getFullYear());
  const archiveRoot = getFolder_('03 ARSIP SURAT');
  const yearFolder = findOrCreateFolder_(archiveRoot, year);
  const pdfName = safeName_((letter.templateName || letter.decreeTitle || 'Surat') + '_' + (letter.letterNumber || archiveId)) + '.pdf';
  const bytes = Utilities.base64Decode(payload.pdfBase64);
  const pdfBlob = Utilities.newBlob(bytes, MimeType.PDF, pdfName);
  const pdfFile = yearFolder.createFile(pdfBlob);

  const jsonName = safeName_('DATA-' + archiveId) + '.json';
  const jsonFile = upsertJsonFile_(yearFolder, jsonName, JSON.stringify(letter));
  const ss = getDatabase_();
  const row = [
    archiveId, letter.templateName || letter.decreeTitle || 'Surat',
    letter.letterNumber || '', letter.dateString || '', letter.category || '',
    pdfFile.getId(), jsonFile.getId(), pdfFile.getUrl(), new Date(), email
  ];
  upsertRowById_(ss.getSheetByName('Archives'), archiveId, row);
  logAction_(email, 'ARCHIVE_LETTER', archiveId, pdfName);
  return { success: true, id: archiveId, pdfUrl: pdfFile.getUrl(), jsonFileId: jsonFile.getId() };
}

function deleteArchive(archiveId) {
  const email = requireAuthorizedUser_();
  if (!archiveId) throw new Error('ID arsip wajib diisi.');
  const sh = getDatabase_().getSheetByName('Archives');
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(archiveId)) {
      [values[i][5], values[i][6]].forEach(id => {
        if (id) {
          try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
        }
      });
      sh.deleteRow(i + 1);
      logAction_(email, 'DELETE_ARCHIVE', archiveId, '');
      return { success: true };
    }
  }
  throw new Error('Arsip tidak ditemukan.');
}

function getNextLetterNumber(counterKey) {
  requireAuthorizedUser_();
  if (!counterKey || !/^[A-Za-z0-9_\-]{1,80}$/.test(counterKey)) throw new Error('Kunci penomoran tidak valid.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getDatabase_().getSheetByName('Counters');
    const values = sh.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === counterKey) {
        const next = Number(values[i][1] || 0) + 1;
        sh.getRange(i + 1, 2, 1, 2).setValues([[next, new Date()]]);
        return next;
      }
    }
    sh.appendRow([counterKey, 1, new Date()]);
    return 1;
  } finally {
    lock.releaseLock();
  }
}

function requireAuthorizedUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Identitas email pengguna tidak tersedia. Atur akses Web App menggunakan akun Google yang dapat diidentifikasi atau gunakan akun Google Workspace sekolah.');
  }
  const sh = getDatabase_().getSheetByName('Users');
  const rows = sh.getDataRange().getValues().slice(1);
  const user = rows.find(r => String(r[0]).trim().toLowerCase() === email && (r[4] === true || String(r[4]).toLowerCase() === 'true'));
  if (!user) throw new Error('Akun ' + email + ' belum terdaftar atau dinonaktifkan. Hubungi administrator SIT Qudwah.');
  return email;
}

function getDatabase_() {
  const id = PropertiesService.getScriptProperties().getProperty('TN_SPREADSHEET_ID');
  if (!id) throw new Error('Database belum dibuat. Jalankan setupWorkspace() terlebih dahulu.');
  return SpreadsheetApp.openById(id);
}

function getFolder_(key) {
  const raw = PropertiesService.getScriptProperties().getProperty('TN_FOLDERS') || '{}';
  const folders = JSON.parse(raw);
  if (!folders[key]) throw new Error('Folder Drive belum disiapkan: ' + key);
  return DriveApp.getFolderById(folders[key]);
}

function findOrCreateFolder_(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function upsertJsonFile_(folder, name, content) {
  const files = folder.getFilesByName(name);
  const blob = Utilities.newBlob(content, 'application/json', name);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(content);
    return file;
  }
  return folder.createFile(blob);
}

function upsertRowById_(sheet, id, row) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function readJsonRows_(sheet, jsonColumn) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, jsonColumn + 1, sheet.getLastRow() - 1, 1).getValues()
    .map(r => { try { return JSON.parse(r[0]); } catch (e) { return null; } })
    .filter(Boolean);
}

function setSetting_(key, value) {
  const sh = getDatabase_().getSheetByName('Settings');
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      sh.getRange(i + 1, 2, 1, 2).setValues([[value, new Date()]]);
      return;
    }
  }
  sh.appendRow([key, value, new Date()]);
}

function logAction_(email, action, id, detail) {
  getDatabase_().getSheetByName('AuditLog').appendRow([new Date(), email, action, id, detail]);
}

function validateObject_(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ' tidak valid.');
  const size = JSON.stringify(value).length;
  if (size > 900000) throw new Error(label + ' terlalu besar untuk satu penyimpanan (maksimum 900 KB).');
}

function safeName_(value) {
  return String(value || 'Dokumen').replace(/[\\/:*?"<>|#%{}~&]/g, '-').replace(/\s+/g, '_').slice(0, 120);
}
