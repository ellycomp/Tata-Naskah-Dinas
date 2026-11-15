import type { DriveWorkspaceSnapshot } from './googleDriveSync';

type GoogleScriptRunner = {
  withSuccessHandler(callback: (value: unknown) => void): GoogleScriptRunner;
  withFailureHandler(callback: (error: { message?: string }) => void): GoogleScriptRunner;
  [functionName: string]: unknown;
};

declare global {
  interface Window {
    google?: { script?: { run: GoogleScriptRunner } };
  }
}

type GasBootstrap = {
  email: string;
  currentDoc: DriveWorkspaceSnapshot['currentDoc'] | null;
  profiles: DriveWorkspaceSnapshot['profiles'];
  drafts: DriveWorkspaceSnapshot['archive'];
  archive: DriveWorkspaceSnapshot['archive'];
  status: { initialized: boolean; appName: string };
};

function callGas<T>(functionName: string, ...args: unknown[]): Promise<T> {
  const runner = window.google?.script?.run;
  if (!runner) {
    return Promise.reject(new Error('Aplikasi belum dibuka dari alamat Google Apps Script. Buka URL Web App /exec.'));
  }
  return new Promise<T>((resolve, reject) => {
    const chain = runner
      .withSuccessHandler((value: unknown) => resolve(value as T))
      .withFailureHandler((error: { message?: string }) =>
        reject(new Error(error?.message || 'Google Apps Script gagal memproses permintaan.'))
      );
    const fn = chain[functionName];
    if (typeof fn !== 'function') {
      reject(new Error('Fungsi server tidak ditemukan: ' + functionName));
      return;
    }
    (fn as (...values: unknown[]) => void).apply(chain, args);
  });
}

export function isGoogleAppsScript(): boolean {
  return Boolean(window.google?.script?.run);
}

export function loadWorkspaceFromGoogle(): Promise<GasBootstrap> {
  return callGas<GasBootstrap>('getBootstrapData');
}

export function syncWorkspaceToGoogle(snapshot: DriveWorkspaceSnapshot): Promise<GasBootstrap> {
  return callGas<GasBootstrap>('syncWorkspace', snapshot);
}
