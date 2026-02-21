import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadReportPdf } from '@/utils/pdfPrint';

/**
 * Modal that shows report preview with Download PDF button.
 * Uses print window (Save as PDF) so the PDF is never empty.
 */
const ReportPreviewModal = ({ open, onOpenChange, html, filename, reportTitle = 'Report' }) => {
  const contentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!html || !filename) return;
    setDownloading(true);
    try {
      await downloadReportPdf(html, filename);
    } catch (err) {
      console.error('Report PDF failed:', err);
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
