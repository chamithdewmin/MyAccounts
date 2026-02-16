import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import defaultLogo from '@/assets/logo.png';
import html2pdf from 'html2pdf.js';

const InvoiceTemplate = ({
  invoice,
  currency = 'LKR',
  autoAction = null,
  onAutoActionDone,
}) => {
  const printAreaRef = useRef(null);
  const { settings } = useFinance();

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const runPrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }
    const clone = el.cloneNode(true);
    clone.style.cssText = 'position:fixed;left:0;top:0;width:182mm;max-width:182mm;background:white;color:#000;z-index:999999;padding:0;overflow:visible;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `@page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#invoice-print-clone){display:none!important}
        #invoice-print-clone{position:static!important;padding:0!important;display:block!important;width:182mm!important;max-width:182mm!important;box-sizing:border-box!important}
      }`;
    document.head.appendChild(style);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => {
        document.getElementById('invoice-print-clone')?.remove();
        document.getElementById('invoice-print-style')?.remove();
      }, 500);
    });
  };

  const handleDownloadPdf = async () => {
    const element = printAreaRef.current;
    if (!element) return;

    const filename = `Invoice-${invoice.invoiceNumber || 'invoice'}.pdf`;

    const opt = {
      margin: [12, 14, 12, 14],
      filename,
      image: { type: 'png', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'table'] },
    };

    await html2pdf().set(opt).from(element).save();
  };

  useEffect(() => {
    if (!autoAction) return;
    const t = setTimeout(async () => {
      if (autoAction === 'download') await handleDownloadPdf();
      if (autoAction === 'print') runPrint();
      onAutoActionDone?.();
    }, 300);
    return () => clearTimeout(t);
  }, [autoAction]);

  const items = invoice.items || [];
  const themeColor = (settings.invoiceThemeColor || '#F97316').trim() || '#F97316';
  const themeColorLight = themeColor + '15';

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button size="sm" variant="outline" onClick={runPrint}>
          Print
        </Button>
      </div>

      <div ref={printAreaRef} className="invoice-a4 bg-white shadow-2xl overflow-hidden" data-invoice-theme={themeColor}>
        {/* Header */}
        <div className="invoice-header px-10 pt-8 pb-6">
          <div className="flex justify-between items-start">
            <img src={settings.logo || defaultLogo} alt="logo" className="h-12 w-auto object-contain" />
            <div
              className="invoice-badge text-white px-8 py-4 -mr-10 shadow-lg"
              style={{
                backgroundColor: themeColor,
                clipPath: 'polygon(10% 0%, 100% 0%, 100% 100%, 0% 100%)',
              }}
            >
              <div className="text-2xl font-bold mb-1">INVOICE</div>
              <div className="text-sm opacity-90">{invoice.invoiceNumber}</div>
            </div>
          </div>
        </div>

        {/* Date and Bill To */}
        <div
          className="invoice-date-billto px-10 py-6 grid grid-cols-2 gap-8"
          style={{ background: `linear-gradient(to right, ${themeColorLight}, transparent)` }}
        >
          <div className="space-y-4">
            <div className="flex gap-8">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date of Issue</div>
                <div className="text-sm font-semibold text-gray-800">{formatDate(invoice.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date of Due</div>
                <div className="text-sm font-semibold text-gray-800">{formatDate(invoice.dueDate || invoice.createdAt)}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bill To</div>
            <p className="text-base font-bold text-gray-800 mb-1">{invoice.clientName || '—'}</p>
            {invoice.clientEmail && <p className="text-sm text-gray-600 mb-0.5">E. {invoice.clientEmail}</p>}
            {invoice.clientPhone && <p className="text-sm text-gray-600">P. {invoice.clientPhone}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="px-10 py-8">
          <table className="w-full invoice-table">
            <thead>
              <tr style={{ backgroundColor: themeColor, color: 'white', borderBottom: `2px solid ${themeColor}` }}>
                <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">No.</th>
                <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider">Item Description</th>
                <th className="text-center py-3 px-3 text-xs font-bold uppercase tracking-wider">Qty</th>
                <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wider">Price</th>
                <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-200"
                  style={{ background: i % 2 === 0 ? 'transparent' : themeColorLight }}
                >
                  <td className="py-4 px-3 text-sm text-gray-600">{i + 1}</td>
                  <td className="py-4 px-3">
                    <div className="text-sm font-medium text-gray-800">{item.description}</div>
                    {item.serviceType && <div className="text-xs text-gray-500">{item.serviceType}</div>}
                  </td>
                  <td className="py-4 px-3 text-sm text-gray-800 text-center">{item.quantity ?? 1}</td>
                  <td className="py-4 px-3 text-sm text-gray-800 text-right">
                    {currency} {(item.price || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-3 text-sm font-semibold text-gray-800 text-right">
                    {currency} {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-10 pb-8 avoid-break">
          <div className="flex justify-end">
            <div
              className="w-80 rounded-lg p-6 shadow-xl text-white"
              style={{ backgroundColor: themeColor }}
            >
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="opacity-90">Subtotal</span>
                  <span className="font-semibold">{currency} {invoice.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-90">Tax ({invoice.taxRate || 0}%)</span>
                  <span className="font-semibold">{currency} {invoice.taxAmount?.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/30 pt-3 flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold">{currency} {invoice.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Terms */}
        <div className="px-10 py-6 bg-gray-50 grid grid-cols-2 gap-8 avoid-break">
          {invoice.bankDetails && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: themeColor }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Payment Method</h3>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="text-gray-500">Bank Name:</span> <span className="font-medium text-gray-800">{invoice.bankDetails.bankName}</span></p>
                <p><span className="text-gray-500">Account Name:</span> <span className="font-medium text-gray-800">{invoice.bankDetails.accountName}</span></p>
                <p><span className="text-gray-500">Account Number:</span> <span className="font-medium text-gray-800">{invoice.bankDetails.accountNumber}</span></p>
                {invoice.bankDetails.branch && (
                  <p><span className="text-gray-500">Branch:</span> <span className="font-medium text-gray-800">{invoice.bankDetails.branch}</span></p>
                )}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColor }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Terms & Conditions</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {invoice.notes || 'Please make payment within the agreed terms. Thank you for your business.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="invoice-footer px-10 py-6 text-white avoid-break" style={{ backgroundColor: '#000' }}>
          <div className="flex justify-between items-center text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>{settings.website || 'logozodev.com'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{settings.email || 'hello@logozodev.com'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{settings.phone || '074 042 9827'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Invoice generated by</div>
              <div className="text-lg font-bold" style={{ color: themeColor }}>{settings.businessName || 'LogozoDev'}</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .invoice-a4 {
          width: 100%;
          max-width: 56rem;
          margin: auto;
          box-sizing: border-box;
        }
        .invoice-table {
          border-collapse: collapse;
        }
        .invoice-table th {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        tr {
          page-break-inside: avoid;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
        .invoice-badge {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .invoice-footer [style] {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .invoice-a4 { box-shadow: none !important; max-width: 182mm; }
          .invoice-a4 [style*="background"],
          .invoice-a4 [style*="background-color"],
          .invoice-a4 *[style] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;
