import defaultLogo from '@/assets/logo.png';
import html2pdf from 'html2pdf.js';

/**
 * Wraps report/print content with logo (top-left) and "Generated from MyAccounts" footer.
 * @param {string} innerContent - The main HTML content
 * @param {{ logo?: string | null, businessName?: string }} options
 * @returns {string} Full HTML for print/PDF
 */
export function getPrintHtml(innerContent, options = {}) {
  const { logo, businessName } = options;
  const logoSrc = logo || defaultLogo;
  const logoHtml = `<div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:2px solid #000;">
    <img src="${logoSrc}" alt="Logo" style="height:48px; width:auto; object-fit:contain;" onerror="this.style.display='none'" />
    <span style="font-size:18px; font-weight:bold; color:#000;">${businessName || 'Report'}</span>
  </div>`;
  const footer = '<p style="font-size:10px; color:#666; margin-top:32px; padding-top:16px; border-top:1px solid #ddd;">This document was generated from MyAccounts</p>';
  return `<div style="padding:20px; font-family:sans-serif; color:#000 !important; background:#fff !important; font-size:14px; line-height:1.4;">${logoHtml}${innerContent}${footer}</div>`;
}

/**
 * Downloads report HTML as a PDF file directly (no print dialog).
 * @param {string} html - Full HTML content
 * @param {string} filename - e.g. 'balance-sheet-20260206.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportPdf(html, filename) {
  const container = document.createElement('div');
  container.id = 'report-pdf-temp';
  container.style.cssText = 'position:fixed;top:0;left:0;width:794px;min-height:400px;background:#fff;color:#000;z-index:2147483647;padding:24px;box-sizing:border-box;font-family:sans-serif;font-size:14px;';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Force layout
  container.offsetHeight;

  // Wait for images
  const imgs = container.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 3000);
    });
  }));

  // Ensure paint before capture
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 500));

  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  try {
    const blob = await html2pdf().set(opt).from(container).outputPdf('blob');
    if (blob && blob.size > 500) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback: open print dialog with content
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>Report</title></head><body>${html}</body></html>`);
      w.document.close();
      w.print();
      w.close();
    }
  } finally {
    container.remove();
  }
}
