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
    return `${day} / ${month} / ${year}`;
  };

  const runPrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }
    const clone = el.cloneNode(true);
    clone.style.cssText = 'position:fixed;left:0;top:0;width:182mm;max-width:182mm;background:white;color:#000;z-index:999999;padding:14mm 6mm;overflow:visible;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `@page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#invoice-print-clone){display:none!important}
        #invoice-print-clone{position:static!important;padding:14mm 6mm!important;display:block!important;width:182mm!important;max-width:182mm!important;box-sizing:border-box!important}
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

      <div ref={printAreaRef} className="invoice-a4 bg-white text-gray-900" data-invoice-theme={themeColor}>
        {/* Header: Logo left, INVOICE right (full-width accent) */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <img src={settings.logo || defaultLogo} alt="logo" className="h-12 w-auto object-contain" />
          </div>
          <div className="text-right">
            <div
              className="inline-flex items-center justify-center rounded px-6 py-3"
              style={{ backgroundColor: themeColor }}
            >
              <p className="text-3xl font-medium text-white tracking-wide">
                INVOICE
              </p>
            </div>
            <div className="mt-4 space-y-0.5">
              <p className="text-sm text-gray-600">Invoice # {invoice.invoiceNumber}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(invoice.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Bill To section */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-0.5 h-16 flex-shrink-0 rounded" style={{ backgroundColor: themeColor }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Bill To</p>
            <p className="text-base font-bold text-gray-900">{invoice.clientName || '—'}</p>
            {invoice.clientPhone && (
              <p className="text-sm text-gray-600">P. {invoice.clientPhone}</p>
            )}
            {invoice.clientEmail && (
              <p className="text-sm text-gray-600">E. {invoice.clientEmail}</p>
            )}
          </div>
        </div>

        {/* Items table - Qty, Product Description, Price, Total */}
        <div className="mt-6">
          <table className="w-full invoice-table">
            <thead>
              <tr style={{ backgroundColor: themeColor, color: 'white' }}>
                <th className="text-left py-3 px-4 font-semibold">PRODUCT DESCRIPTION</th>
                <th className="text-center py-3 px-4 font-semibold">QTY</th>
                <th className="text-right py-3 px-4 font-semibold">PRICE</th>
                <th className="text-right py-3 px-4 font-semibold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-[#F8F8F8]' : 'bg-white'}>
                  <td className="py-3 px-4 border-b border-gray-200">
                    <div className="font-medium text-gray-900">{item.description}</div>
                    {item.serviceType && (
                      <div className="text-sm text-gray-500">{item.serviceType}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 text-center">
                    {item.quantity ?? 1}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 text-right">
                    {currency} {(item.price || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 border-b border-gray-200 text-right font-semibold">
                    {currency} {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary: Subtotal, Tax, Total - right aligned */}
        <div className="flex justify-end mt-6 avoid-break">
          <div className="w-[260px] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{currency} {invoice.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax Rate</span>
              <span>{invoice.taxRate || 0}%</span>
            </div>
            <div
              className="flex justify-between items-center font-bold text-lg py-3 px-4 mt-2 text-white rounded"
              style={{ backgroundColor: themeColor }}
            >
              <span>TOTAL</span>
              <span>{currency} {invoice.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Bottom section: Payment Method + Terms */}
        <div className="mt-8 avoid-break">
          {invoice.bankDetails && (
            <div className="mb-4">
              <h3 className="font-bold text-sm text-gray-900 mb-2">Payment Method</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Account No:</span> {invoice.bankDetails.accountNumber}</p>
                <p><span className="font-medium">Name:</span> {invoice.bankDetails.accountName}</p>
                <p><span className="font-medium">Bank:</span> {invoice.bankDetails.bankName}</p>
                {invoice.bankDetails.branch && (
                  <p><span className="font-medium">Branch:</span> {invoice.bankDetails.branch}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 rounded-lg bg-gray-100">
            <h3 className="font-bold text-sm text-gray-900 mb-2">Terms & Conditions / Notes:</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {invoice.notes || 'Your terms and conditions text can be placed here. Add any payment terms, delivery conditions, or other notes for this invoice.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center avoid-break">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Thank you for your business
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-500">
            {settings.phone && (
              <span>P. {settings.phone}</span>
            )}
            <span>{settings.businessName || ''}</span>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .invoice-a4 {
          width: 182mm;
          max-width: 182mm;
          margin: auto;
          padding: 14mm 6mm;
          box-sizing: border-box;
        }
        .invoice-table {
          border-collapse: collapse;
        }
        .invoice-table th,
        .invoice-table td {
          border-bottom: 1px solid #e5e7eb;
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
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .invoice-a4 {
            margin: 0;
            box-shadow: none;
          }
          .invoice-a4 [style*="background"],
          .invoice-a4 [style*="background-color"] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;
