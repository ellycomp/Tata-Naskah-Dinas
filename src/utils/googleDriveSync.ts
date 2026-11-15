import type { LetterDocument, LetterheadConfig } from '../types/letter';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
    };
  }
}

export interface DriveWorkspaceSnapshot {
  schemaVersion: 1;
  updatedAt: string;
  ownerEmail: string;
  currentDoc: LetterDocument;
  profiles: LetterheadConfig[];
  archive: LetterDocument[];
  profileUpdatedAt?: Record<string, string>;
  deletedArchiveIds?: string[];
  deletedProfileIds?: string[];
}

const BACKUP_FILE_NAME = 'TataNaskah-Backup.json';
const DRIVE_SCOPE = 'openid email https://www.googleapis.com/auth/drive.file';
let scriptPromise: Promise<void> | null = null;
let accessToken: string | null = null;
let tokenExpiresAt = 0;
let tokenAccountEmail = '';

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    const script = existing || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Layanan login Google gagal dimuat. Periksa koneksi internet.'));
    };
    if (!existing) document.head.appendChild(script);
  });
  return scriptPromise;
}

async function requestDriveToken(clientId: string, expectedEmail: string): Promise<string> {
  if (accessToken && tokenAccountEmail.toLowerCase() === expectedEmail.toLowerCase() && Date.now() < tokenExpiresAt - 60_000) return accessToken;
  accessToken = null;
  tokenExpiresAt = 0;
  tokenAccountEmail = '';
  await loadGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) {
      reject(new Error('Layanan OAuth Google tidak tersedia pada browser ini.'));
      return;
    }
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Izin Google Drive tidak diberikan.'));
          return;
        }
        accessToken = response.access_token;
        tokenExpiresAt = Date.now() + 55 * 60 * 1000;
        resolve(response.access_token);
      },
      error_callback: (error) => reject(new Error(error.message || 'Jendela izin Google ditutup atau gagal dibuka.')),
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

async function driveFetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) {
      accessToken = null;
      tokenExpiresAt = 0;
      tokenAccountEmail = '';
    }
    throw new Error(`Google Drive: ${response.status} ${response.statusText}${detail ? ` — ${detail.slice(0, 240)}` : ''}`);
  }
  return response;
}

async function getDriveFile(token: string): Promise<{ id: string } | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=10&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`,
    token
  );
  const data = (await response.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0] || null;
}

async function uploadJson(
  token: string,
  fileId: string | null,
  snapshot: DriveWorkspaceSnapshot
): Promise<void> {
  const boundary = 'tatanaskah_drive_boundary_2026';
  const metadata = fileId
    ? {}
    : { name: BACKUP_FILE_NAME, mimeType: 'application/json' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(snapshot) +
    `\r\n--${boundary}--`;

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  await driveFetch(url, token, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

async function downloadJson(token: string, fileId: string): Promise<DriveWorkspaceSnapshot> {
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    token
  );
  const value = (await response.json()) as Partial<DriveWorkspaceSnapshot>;
  if (value.schemaVersion !== 1 || !Array.isArray(value.profiles) || !Array.isArray(value.archive)) {
    throw new Error('Berkas cadangan Google Drive tidak dikenali atau formatnya rusak.');
  }
  return value as DriveWorkspaceSnapshot;
}

function mergeById<T extends { id: string }>(local: T[], cloud: T[], timestamps: Record<string, string> = {}): T[] {
  const merged = new Map<string, T>();
  for (const item of cloud) merged.set(item.id, item);
  for (const item of local) {
    const previous = merged.get(item.id);
    const itemUpdatedAt = (item as T & { updatedAt?: string }).updatedAt || timestamps[item.id] || '';
    const previousUpdatedAt = (previous as (T & { updatedAt?: string }) | undefined)?.updatedAt || timestamps[item.id] || '';
    if (!previous || itemUpdatedAt >= previousUpdatedAt) {
      merged.set(item.id, item);
    }
  }
  return [...merged.values()];
}

export async function syncWorkspaceWithGoogleDrive(
  clientId: string,
  snapshot: DriveWorkspaceSnapshot
): Promise<DriveWorkspaceSnapshot> {
  if (!clientId) throw new Error('Google Drive Client ID belum diatur pada konfigurasi aplikasi.');
  const tombstones = readTombstones();
  snapshot = {
    ...snapshot,
    deletedArchiveIds: [...new Set([...(snapshot.deletedArchiveIds || []), ...tombstones.archive])],
    deletedProfileIds: [...new Set([...(snapshot.deletedProfileIds || []), ...tombstones.profiles])],
  };
  const token = await requestDriveToken(clientId, snapshot.ownerEmail);

  // Ensure the OAuth account is the same Google account used by the TataNaskah workspace.
  const identityResponse = await driveFetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    token
  );
  const identity = (await identityResponse.json()) as { email?: string };
  if (
    snapshot.ownerEmail &&
    identity.email &&
    identity.email.toLowerCase() !== snapshot.ownerEmail.toLowerCase()
  ) {
    throw new Error(`Akun Drive (${identity.email}) berbeda dari akun TataNaskah (${snapshot.ownerEmail}). Pilih akun Google yang sama.`);
  }

  const file = await getDriveFile(token);
  if (!file) {
    await uploadJson(token, null, snapshot);
    return snapshot;
  }

  const cloud = await downloadJson(token, file.id);
  const mergedProfileUpdatedAt = { ...(cloud.profileUpdatedAt || {}), ...(snapshot.profileUpdatedAt || {}) };
  const mergedDeletedArchiveIds = [...new Set([...(cloud.deletedArchiveIds || []), ...(snapshot.deletedArchiveIds || [])])];
  const mergedDeletedProfileIds = [...new Set([...(cloud.deletedProfileIds || []), ...(snapshot.deletedProfileIds || [])])];
  const deletedArchive = new Set(mergedDeletedArchiveIds);
  const deletedProfiles = new Set(mergedDeletedProfileIds);
  const mergedProfiles = mergeById(snapshot.profiles, cloud.profiles, mergedProfileUpdatedAt).filter((item) => !deletedProfiles.has(item.id));
  const mergedArchive = mergeById(snapshot.archive, cloud.archive).filter((item) => !deletedArchive.has(item.id));
  const mergedDoc =
    (snapshot.currentDoc.updatedAt || '') >= (cloud.currentDoc?.updatedAt || '')
      ? snapshot.currentDoc
      : cloud.currentDoc || snapshot.currentDoc;

  const merged: DriveWorkspaceSnapshot = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    ownerEmail: snapshot.ownerEmail,
    currentDoc: mergedDoc,
    profiles: mergedProfiles,
    archive: mergedArchive,
    profileUpdatedAt: mergedProfileUpdatedAt,
    deletedArchiveIds: mergedDeletedArchiveIds,
    deletedProfileIds: mergedDeletedProfileIds,
  };
  await uploadJson(token, file.id, merged);
  return merged;
}

const TOMBSTONE_KEY = 'tatanaskah-drive-tombstones-v1';

function readTombstones(): { archive: string[]; profiles: string[] } {
  try {
    const value = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}') as { archive?: unknown; profiles?: unknown };
    return {
      archive: Array.isArray(value.archive) ? value.archive.filter((id): id is string => typeof id === 'string') : [],
      profiles: Array.isArray(value.profiles) ? value.profiles.filter((id): id is string => typeof id === 'string') : [],
    };
  } catch {
    return { archive: [], profiles: [] };
  }
}

function recordTombstone(kind: 'archive' | 'profiles', id: string): void {
  const current = readTombstones();
  if (!current[kind].includes(id)) current[kind].push(id);
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(current));
}

export function recordDeletedArchive(id: string): void { recordTombstone('archive', id); }
export function recordDeletedProfile(id: string): void { recordTombstone('profiles', id); }

export function disconnectGoogleDrive(): void {
  accessToken = null;
  tokenExpiresAt = 0;
  tokenAccountEmail = '';
}
