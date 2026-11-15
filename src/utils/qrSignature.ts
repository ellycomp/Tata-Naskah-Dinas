import LZString from 'lz-string';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { LetterDocument, LetterheadConfig } from '../types/letter';
import { LETTERHEAD_PRESETS } from '../data/presets';

/**
 * Strips heavy base64 image payloads before encoding the letter snapshot into a URL
 * so the resulting QR-Code stays clean, compact, and reliably scannable.
 */
export function buildCompactSharePayload(doc: LetterDocument): string {
  const compactDoc: LetterDocument = {
    ...doc,
    letterhead: {
      ...doc.letterhead,
      customLogoDataUrl: null,
      rightLogoDataUrl: null,
    },
    signatureDataUrl: null,
    customStampDataUrl: null,
    customQrDataUrl: null,
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(compactDoc));
}

export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://tatanaskah.app';
  const pathname = window.location.pathname === '/' ? '' : window.location.pathname;
  return `${window.location.origin}${pathname}`;
}

export function buildLetterShareUrl(doc: LetterDocument): string {
  if (doc.qrCustomLink && doc.qrCustomLink.trim().length > 0) {
    return doc.qrCustomLink.trim();
  }
  const token = buildCompactSharePayload(doc);
  return `${getAppBaseUrl()}/?surat=${token}`;
}

export function extractSuratTokenFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes('surat=')) {
      const url = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://placeholder.local');
      return url.searchParams.get('surat');
    }
  } catch {
    const match = trimmed.match(/[?&]surat=([^&#]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export function decodeLetterFromShareToken(
  token: string,
  savedProfiles: LetterheadConfig[] = LETTERHEAD_PRESETS
): LetterDocument | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(token);
    if (!json) return null;
    const parsed = JSON.parse(json) as LetterDocument;
    if (!parsed || !parsed.letterhead) return null;

    const matchedProfile =
      savedProfiles.find((p) => p.id === parsed.letterhead.id) ||
      LETTERHEAD_PRESETS.find((p) => p.id === parsed.letterhead.id);

    return {
      ...parsed,
      letterhead: {
        ...parsed.letterhead,
        customLogoDataUrl: matchedProfile?.customLogoDataUrl ?? null,
        rightLogoDataUrl: matchedProfile?.rightLogoDataUrl ?? null,
      },
    };
  } catch {
    return null;
  }
}

export async function generateQrCodeDataUrl(
  targetText: string,
  width = 240,
  darkColor = '#0f172a'
): Promise<string> {
  const safeText = targetText.trim() || getAppBaseUrl();
  return QRCode.toDataURL(safeText, {
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: darkColor,
      light: '#ffffff',
    },
  });
}

export function decodeQrFromImageDataUrl(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        resolve(result?.data || null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function decodeQrFromVideoElement(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement
): string | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }
  const width = Math.min(640, video.videoWidth);
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  scratchCanvas.width = width;
  scratchCanvas.height = height;
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: 'dontInvert',
  });
  return result?.data || null;
}
