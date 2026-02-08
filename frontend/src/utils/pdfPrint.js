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
    <span style="font-size:18px; font-weight:bold;">${businessName || 'Report'}</span>
  </div>`;
  const footer = '<p style="font-size:10px; color:#666; margin-top:32px; padding-top:16px; border-top:1px solid #ddd;">This document was generated from MyAccounts</p>';
  return `<div style="padding:20px; font-family:sans-serif; color:#000; background:white;">${logoHtml}${innerContent}${footer}</div>`;
}

/**
 * Downloads report HTML as a PDF file directly (no print dialog).
 * Element must be in viewport for html2canvas to capture correctly.
 * @param {string} html - Full HTML content
 * @param {string} filename - e.g. 'balance-sheet-20260206.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportPdf(html, filename) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:210mm;min-height:297mm;background:white;color:#000;z-index:999999;overflow:auto;padding:20px;box-sizing:border-box;';
  container.innerHTML = html;
  document.body.appendChild(container);
  container.scrollIntoView({ block: 'start' });

  // Wait for images to load (html2canvas needs element in viewport with loaded assets)
  const imgs = container.querySelectorAll('img');
  const loadPromises = Array.from(imgs).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 2000); // Fallback timeout
    });
  });
  await Promise.all(loadPromises);
  await new Promise((r) => setTimeout(r, 100)); // Brief extra for paint

  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  try {
    const blob = await html2pdf().set(opt).from(container).outputPdf('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    document.body.removeChild(container);
  }
}
