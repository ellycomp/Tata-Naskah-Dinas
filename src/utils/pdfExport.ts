import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { LetterDocument } from '../types/letter';
import { PAPER_DIMENSIONS } from '../components/LetterPreview';

function sanitizeFileName(raw: string): string {
  return raw
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

export async function exportLetterToPdf(doc: LetterDocument): Promise<string> {
  const sourceElement = document.getElementById('printable-letter-sheet');
  if (!sourceElement) {
    throw new Error('Elemen pratinjau surat tidak ditemukan.');
  }

  const { widthMm, heightMm } = PAPER_DIMENSIONS[doc.paperSize];

  // Clone element off-screen at 100% scale (zoom = 1) so PDF capture is unaffected by current preview zoom
  const offscreenHost = document.createElement('div');
  offscreenHost.style.position = 'fixed';
  offscreenHost.style.left = '-10000px';
  offscreenHost.style.top = '0';
  offscreenHost.style.width = `${widthMm}mm`;
  offscreenHost.style.backgroundColor = '#ffffff';
  offscreenHost.style.zIndex = '-1';

  const clonedSheet = sourceElement.cloneNode(true) as HTMLElement;
  clonedSheet.style.transform = 'none';
  clonedSheet.style.boxShadow = 'none';
  clonedSheet.style.margin = '0';

  // Remove visual page-break guide from exported PDF
  clonedSheet.querySelectorAll('.page-break-guide').forEach((node) => node.remove());

  offscreenHost.appendChild(clonedSheet);
  document.body.appendChild(offscreenHost);

  try {
    // Allow layout and fonts to settle
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const canvas = await html2canvas(clonedSheet, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm],
      compress: true,
    });

    const imgWidthMm = widthMm;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    const imgData = canvas.toDataURL('image/png', 1.0);

    let heightLeft = imgHeightMm;
    let positionY = 0;

    pdf.addImage(imgData, 'PNG', 0, positionY, imgWidthMm, imgHeightMm, undefined, 'FAST');
    heightLeft -= heightMm;

    // Support automatic multi-page pagination if the letter is longer than 1 page
    while (heightLeft > 2) {
      positionY = heightLeft - imgHeightMm;
      pdf.addPage([widthMm, heightMm], 'portrait');
      pdf.addImage(imgData, 'PNG', 0, positionY, imgWidthMm, imgHeightMm, undefined, 'FAST');
      heightLeft -= heightMm;
    }

    const titlePart = doc.formatStyle === 'decree' ? doc.decreeTitle : doc.templateName;
    const numberPart = doc.letterNumber || 'Draft';
    const fileName = `${sanitizeFileName(titlePart)}_${sanitizeFileName(numberPart)}.pdf`;

    pdf.save(fileName);
    return fileName;
  } finally {
    document.body.removeChild(offscreenHost);
  }
}
