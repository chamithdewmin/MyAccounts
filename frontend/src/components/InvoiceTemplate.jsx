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
    clone.style.cssText = 'position:fixed;left:0;top:0;width:210mm;min-height:297mm;background:white;color:#000;z-index:999999;padding:18mm;overflow:visible;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#invoice-print-clone){display:none!important}
        #invoice-print-clone{position:static!important;padding:18mm!important;display:block!important;width:100%!important;max-width:186mm!important;box-sizing:border-box!important}
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
      margin: [12, 12, 12, 12],
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
      <div ref={printAreaRef} className="invoice-a4 bg-white text-black">

        {/* HEADER */}
        <div className="header flex justify-between items-start border-b pb-4">
          <div>
            <img
              src={settings.logo || defaultLogo}
              alt="logo"
              className="h-12 mb-2"
            />
            <p className="text-gray-600 text-sm">Invoice</p>
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(invoice.createdAt)}
          </p>
        </div>

        {/* CLIENT + DETAILS */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <h2 className="font-bold mb-2">Invoice To:</h2>
            <p>{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-sm text-gray-600">{invoice.clientEmail}</p>
            )}
            {invoice.clientPhone && (
              <p className="text-sm text-gray-600">{invoice.clientPhone}</p>
            )}
          </div>

          <div className="text-right">
            <h2 className="font-bold mb-2">Details</h2>
            <p>Invoice #: {invoice.invoiceNumber}</p>
            <p className="text-gray-600 text-sm">
              Due: {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mt-6">
          <table className="w-full invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div className="font-semibold">{item.description}</div>
                    {item.serviceType && (
                      <div className="text-sm text-gray-500">
                        {item.serviceType}
                      </div>
                    )}
                  </td>
                  <td className="text-center">{item.quantity ?? 1}</td>
                  <td className="text-right">
                    {currency} {(item.price || 0).toLocaleString()}
                  </td>
                  <td className="text-right font-semibold">
                    {currency}{' '}
                    {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="flex justify-end mt-6 avoid-break">
          <div className="w-[220px] space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{currency} {invoice.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({invoice.taxRate || 0}%)</span>
              <span>{currency} {invoice.taxAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>{currency} {invoice.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* BANK DETAILS */}
        {invoice.bankDetails && (
          <div className="mt-6 pt-4 border-t avoid-break">
            <h3 className="font-bold text-sm mb-2">Bank Transfer</h3>
            <p>Account: {invoice.bankDetails.accountNumber}</p>
            <p>Name: {invoice.bankDetails.accountName}</p>
            <p>Bank: {invoice.bankDetails.bankName}</p>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-6 pt-4 border-t text-center text-sm text-gray-600 avoid-break">
          Thank you for your business!
        </div>
      </div>

      {/* ================= PRINT CSS ================= */}
      <style jsx global>{`
        .invoice-a4 {
          width: 210mm;
          min-height: 297mm;
          margin: auto;
          padding: 18mm;
          box-sizing: border-box;
        }

        .invoice-table {
          border-collapse: collapse;
        }

        .invoice-table th,
        .invoice-table td {
          border-bottom: 1px solid #ddd;
          padding: 8px;
        }

        .invoice-table th {
          text-align: left;
          font-weight: bold;
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
