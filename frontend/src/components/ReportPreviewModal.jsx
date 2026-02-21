import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

/**
 * Modal that shows report preview with Download PDF button (like invoice popup).
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} props.html - Full report HTML (from getPrintHtml)
 * @param {string} props.filename - e.g. 'profit-loss-2026-02-15.pdf'
 * @param {string} props.reportTitle - e.g. 'Profit & Loss Report'
 */
const ReportPreviewModal = ({ open, onOpenChange, html, filename, reportTitle = 'Report' }) => {
  const contentRef = useRef(null);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!html || !filename) return;
    setDownloading(true);
    try {
      // Render same HTML in a temporary container (like pdfPrint.downloadReportAsPdf)
      // so html2canvas captures correctly; capturing inside the dialog often yields blank PDF
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:0;top:0;width:190mm;max-width:190mm;background:#fff;font-size:14px;color:#111;opacity:0.01;pointer-events:none;z-index:-1;overflow:visible;box-sizing:border-box;';
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

      await new Promise((r) => setTimeout(r, 300));

      const opt = {
        margin: [10, 10, 14, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'table'] },
      };
      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);
    } catch (err) {
      console.error('Report PDF download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={handleDownloadPdf} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
          <div
            ref={contentRef}
            key={filename || 'preview'}
            className="report-preview-content bg-white text-black rounded-lg border border-secondary p-6 min-h-[200px]"
            style={{ fontFamily: 'sans-serif', fontSize: '14px' }}
            dangerouslySetInnerHTML={{ __html: html || '<p class="text-gray-500">No content to display.</p>' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewModal;
