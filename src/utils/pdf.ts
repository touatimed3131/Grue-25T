import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Renders any DOM element (including Arabic RTL text, Cairo/Plus Jakarta Sans fonts,
 * and overlaid transparent PNG Stamp & Signature) into a crisp A4 PDF download.
 */
async function buildPdfDoc(element: HTMLElement): Promise<jsPDF> {
  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: 2,
    backgroundColor: '#FFFFFF',
    cacheBust: true,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to render document image'));
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgRatio = img.width / img.height;
  const renderWidth = pageWidth;
  const renderHeight = renderWidth / imgRatio;

  if (renderHeight <= pageHeight) {
    pdf.addImage(dataUrl, 'PNG', 0, 0, renderWidth, renderHeight);
  } else {
    let heightLeft = renderHeight;
    let position = 0;
    pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - renderHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight);
      heightLeft -= pageHeight;
    }
  }

  return pdf;
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const pdf = await buildPdfDoc(element);
  pdf.save(filename);
}

export async function shareElementPdf(
  element: HTMLElement,
  filename: string,
  title: string
): Promise<void> {
  const pdf = await buildPdfDoc(element);
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({ files: [file], title });
    return;
  }

  pdf.save(filename);
}
