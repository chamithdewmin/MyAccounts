import defaultLogo from '@/assets/logo.png';

/**
 * Wraps report/print content with logo (top-left) and "Generated from MyAccounts" footer.
 * @param {string} innerContent - The main HTML content
 * @param {{ logo?: string | null, businessName?: string }} options
 * @returns {string} Full HTML for print/PDF
 */
export function getPrintHtml(innerContent, options = {}) {
  const { logo } = options;
  const logoSrc = logo || defaultLogo;
  const logoHtml = `<div style="margin-bottom:20px; padding-bottom:16px; border-bottom:2px solid #000;">
    <img src="${logoSrc}" alt="Logo" style="height:48px; width:auto; object-fit:contain;" onerror="this.style.display='none'" />
  </div>`;
  const footer = '<p style="font-size:10px; color:#666; margin-top:32px; padding-top:16px; border-top:1px solid #ddd;">This document was generated from MyAccounts</p>';
  return `<div style="padding:20px; font-family:sans-serif; color:#000; background:#fff; font-size:14px; line-height:1.4;">${logoHtml}${innerContent}${footer}</div>`;
}

/**
 * Full HTML document for report print/PDF - ensures correct styling and A4 layout.
 */
function getReportDocumentHtml(html, filename) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename.replace('.pdf', '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #000; }
    @page { size: A4; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Downloads report as PDF. Opens print dialog with report content - user selects
 * "Save as PDF" or "Print to PDF" to get the file. This reliably shows the same
 * report design as on screen.
 * @param {string} html - Full HTML content (from getPrintHtml)
 * @param {string} filename - e.g. 'balance-sheet-20260206.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportPdf(html, filename) {
  const fullDoc = getReportDocumentHtml(html, filename);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow pop-ups to download the report. You can also use Ctrl+P to print this page.');
  }

  printWindow.document.write(fullDoc);
  printWindow.document.close();

  await new Promise((resolve) => {
    if (printWindow.document.readyState === 'complete') {
      resolve();
    } else {
      printWindow.onload = () => resolve();
      setTimeout(resolve, 600);
    }
  });

  const doc = printWindow.document;
  const imgs = doc.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 2500);
    });
  }));

  await new Promise((r) => setTimeout(r, 400));
  printWindow.focus();
  printWindow.print();

  printWindow.onafterprint = () => printWindow.close();
  setTimeout(() => {
    if (!printWindow.closed) printWindow.close();
  }, 2000);
}
