import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { downloadReportPdf } from '@/utils/pdfPrint';

/**
 * Modal that shows report preview with Print and Download PDF buttons (like invoice popup).
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} props.html - Full report HTML (from getPrintHtml)
 * @param {string} props.filename - e.g. 'profit-loss-2026-02-15.pdf'
 * @param {string} props.reportTitle - e.g. 'Profit & Loss Report'
 */
const ReportPreviewModal = ({ open, onOpenChange, html, filename, reportTitle = 'Report' }) => {
  const contentRef = useRef(null);

  const handlePrint = () => {
    const el = contentRef.current;
    if (!el) {
      window.print();
      return;
    }
    const clone = el.cloneNode(true);
    clone.style.cssText = 'position:fixed;left:0;top:0;width:210mm;min-height:297mm;background:#fff;color:#000;z-index:999999;padding:18mm;overflow:visible;box-sizing:border-box;';
    clone.id = 'report-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'report-print-style';
    style.textContent = `
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#report-print-clone){display:none!important}
        #report-print-clone{position:static!important;padding:18mm!important;display:block!important;width:100%!important;max-width:186mm!important;box-sizing:border-box!important}
      }
    `;
    document.head.appendChild(style);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => {
        document.getElementById('report-print-clone')?.remove();
        document.getElementById('report-print-style')?.remove();
      }, 500);
    });
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadReportPdf(html, filename);
    } catch (err) {
      console.error('Report PDF download failed:', err);
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
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button size="sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
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
