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
    const el = contentRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const opt = {
        margin: [12, 12, 12, 12],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(el).save();
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
            className="report-preview-content bg-white text-black rounded-lg border border-secondary p-6"
            style={{ fontFamily: 'sans-serif', fontSize: '14px' }}
            dangerouslySetInnerHTML={{ __html: html || '' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewModal;
