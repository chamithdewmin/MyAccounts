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

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // ================= PRINT =================
  const runPrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }
    const clone = el.cloneNode(true);
    clone.style.cssText = 'position:fixed;left:0;top:0;width:182mm;max-width:182mm;min-height:297mm;background:white;color:#000;z-index:999999;padding:14mm 16mm;overflow:visible;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#invoice-print-clone){display:none!important}
        #invoice-print-clone{position:static!important;padding:14mm 16mm!important;display:block!important;width:182mm!important;max-width:182mm!important;box-sizing:border-box!important}
      }
    `;
    document.head.appendChild(style);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => {
        document.getElementById('invoice-print-clone')?.remove();
        document.getElementById('invoice-print-style')?.remove();
      }, 500);
    });
  };

  // ================= PDF =================
  const handleDownloadPdf = async () => {
    const element = printAreaRef.current;
    if (!element) return;

    const filename = `Invoice-${invoice.invoiceNumber || 'invoice'}.pdf`;

    const opt = {
      margin: [12, 14, 12, 14],
      filename,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    await html2pdf().set(opt).from(element).save();
  };

  // AUTO ACTION
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
      {/* ACTIONS */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button size="sm" variant="outline" onClick={runPrint}>
          Print
        </Button>
      </div>

      {/* ================= A4 CONTENT ================= */}
      <div ref={printAreaRef} className="invoice-a4 bg-white text-black" data-invoice-theme={themeColor}>

        {/* HEADER: Logo left, Total Due + INVOICE right */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-200">
          <div>
            <img
              src={settings.logo || defaultLogo}
              alt="logo"
              className="h-12 mb-2"
            />
            <p className="text-sm text-gray-500">{settings.businessName || 'Company Slogan'}</p>
            <p className="text-sm text-gray-600 mt-1">Invoice # {invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-600">Date: {formatDate(invoice.createdAt)}</p>
            <p className="font-bold text-lg mt-2" style={{ color: themeColor }}>TOTAL DUE {currency} {invoice.total?.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white px-4 py-2 rounded text-center" style={{ backgroundColor: themeColor }}>INVOICE</h1>
            <h2 className="font-bold mb-2 mt-4 text-sm text-gray-700">Invoice to:</h2>
            <p className="font-semibold">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-sm text-gray-600">{invoice.clientEmail}</p>
            )}
            {invoice.clientPhone && (
              <p className="text-sm text-gray-600">{invoice.clientPhone}</p>
            )}
          </div>
        </div>

        {/* ITEMS TABLE - header uses theme color */}
        <div className="mt-6">
          <table className="w-full invoice-table">
            <thead>
              <tr style={{ backgroundColor: themeColor, color: 'white' }}>
                <th className="text-left py-3 px-3">Item Description</th>
                <th className="text-right py-3 px-3">Unit Price</th>
                <th className="text-center py-3 px-3">Qty</th>
                <th className="text-right py-3 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-3 border-b border-gray-200 text-left">
                    <div className="font-semibold">{item.description}</div>
                    {item.serviceType && (
                      <div className="text-sm text-gray-500">
                        {item.serviceType}
                      </div>
                    )}
                  </td>
                  <td className="text-right py-3 px-3 border-b border-gray-200">
                    {currency} {(item.price || 0).toLocaleString()}
                  </td>
                  <td className="text-center py-3 px-3 border-b border-gray-200">
                    {item.quantity ?? 1}
                  </td>
                  <td className="text-right py-3 px-3 border-b border-gray-200 font-semibold">
                    {currency}{' '}
                    {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY: Subtotal, Tax, Grand Total with theme band */}
        <div className="flex justify-end mt-6 avoid-break">
          <div className="w-[240px] space-y-2">
            <div className="flex justify-between py-1">
              <span>Sub Total</span>
              <span>{currency} {invoice.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Tax ({invoice.taxRate || 0}%)</span>
              <span>{currency} {invoice.taxAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg py-3 px-3 rounded text-white mt-2" style={{ backgroundColor: themeColor }}>
              <span>Grand Total</span>
              <span>{currency} {invoice.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* BANK DETAILS */}
        {invoice.bankDetails && (
          <div className="mt-6 pt-4 border-t border-gray-200 avoid-break">
            <h3 className="font-bold text-sm mb-2">Bank Transfer</h3>
            <p>Account: {invoice.bankDetails.accountNumber}</p>
            <p>Name: {invoice.bankDetails.accountName}</p>
            <p>Bank: {invoice.bankDetails.bankName}</p>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600 avoid-break">
          Thank you for your business!
        </div>
      </div>

      {/* ================= PRINT CSS ================= */}
      <style jsx global>{`
        .invoice-a4 {
          width: 182mm;
          max-width: 182mm;
          min-height: 297mm;
          margin: auto;
          padding: 14mm 16mm;
          box-sizing: border-box;
        }

        .invoice-table {
          border-collapse: collapse;
        }

        .invoice-table th,
        .invoice-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 12px;
        }

        .invoice-table th {
          font-weight: bold;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* AVOID BAD PAGE BREAKS */
        tr {
          page-break-inside: avoid;
        }

        .avoid-break {
          page-break-inside: avoid;
        }

        /* PRINT SETTINGS */
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
