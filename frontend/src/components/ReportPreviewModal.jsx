import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { downloadReportPdf } from '@/utils/pdfPrint';

/**
 * Report preview popup (like invoice preview) with Download PDF and Print buttons.
 */
const ReportPreviewModal = ({ open, onOpenChange, html, filename, reportTitle = 'Report' }) => {
  const contentRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleDownloadOrPrint = async () => {
    if (!html || !filename) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      await downloadReportPdf(html, filename);
    } catch (err) {
      console.error('Report PDF/Print failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto w-[95vw]"
        aria-describedby={undefined}
        onInteractOutside={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="default"
              variant="outline"
              onClick={handleDownloadOrPrint}
              disabled={loading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Opening…' : 'Download PDF'}
            </Button>
            <Button
              size="default"
              variant="outline"
              onClick={handleDownloadOrPrint}
              disabled={loading}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          <div
            ref={contentRef}
            key={filename || 'preview'}
            className="report-preview-content bg-white text-black rounded-lg border border-secondary p-6 min-h-[200px] shadow-sm"
            style={{ fontFamily: 'sans-serif', fontSize: '14px' }}
            dangerouslySetInnerHTML={{ __html: html || '<p class="text-gray-500">No content to display.</p>' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewModal;
