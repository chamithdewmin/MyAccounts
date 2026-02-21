/**
 * Wraps report/print content with logo (top-left), optional business name, and "Generated from MyAccounts" footer.
 * Uses the invoice/company logo uploaded in Settings.
 * @param {string} innerContent - The main HTML content
 * @param {{ logo?: string | null, businessName?: string }} options
 * @returns {string} Full HTML for print/PDF
 */
export function getPrintHtml(innerContent, options = {}) {
  const { logo, businessName } = options;
  const logoHtml = logo
    ? `<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #111;">
    <img src="${logo}" alt="Logo" style="height:48px; width:auto; max-width:200px; object-fit:contain;" onerror="this.style.display='none'" />
  </div>`
    : '';
  const titleHtml = businessName ? `<h1 style="font-size:18px; font-weight:700; margin:0 0 16px; color:#111;">${escapeHtml(businessName)}</h1>` : '';
  const footer = '<p style="font-size:10px; color:#666; margin-top:16px; padding-top:12px; border-top:1px solid #ddd;">Generated from MyAccounts</p>';
  return `<div style="padding:24px; font-family:'Inter',-apple-system,sans-serif; color:#111; background:#fff; font-size:14px; line-height:1.5; max-width:100%; min-height:200px;">${logoHtml}${titleHtml}${innerContent}${footer}</div>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

/**
 * Downloads report as PDF file directly (no print dialog). Uses html2pdf.
 * Includes invoice logo from Settings when provided in the HTML (via getPrintHtml).
 * @param {string} html - Full HTML content (from getPrintHtml)
 * @param {string} filename - e.g. 'overview-report-2026-02-19.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportAsPdf(html, filename) {
  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  // In-viewport, high z-index, nearly invisible – ensures html2canvas can capture (z-index:-1 often yields blank)
  container.style.cssText = 'position:fixed;left:0;top:0;width:190mm;max-width:190mm;min-height:297mm;background:#fff;font-size:14px;color:#111;opacity:0.02;pointer-events:none;z-index:2147483647;overflow:visible;box-sizing:border-box;';
  container.innerHTML = html;
  document.body.appendChild(container);

  const imgs = container.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 3000);
    });
  }));

  await new Promise((r) => setTimeout(r, 500));

  try {
    const opt = {
      margin: [10, 10, 14, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'table'] },
    };
    await html2pdf().set(opt).from(container).save();
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
}
