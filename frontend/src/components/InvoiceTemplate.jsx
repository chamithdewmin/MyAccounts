import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import defaultLogo from '@/assets/logo.png';
import html2pdf from 'html2pdf.js';

const InvoiceTemplate = ({ invoice, currency = 'LKR', autoAction = null, onAutoActionDone }) => {
  const printAreaRef = useRef(null);
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const runPrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }
    const clone = el.cloneNode(true);
    clone.style.cssText = 'position:fixed;left:0;top:0;width:100%;max-width:210mm;background:white;color:#000;z-index:999999;padding:12mm;overflow:visible;min-height:100%;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#invoice-print-clone){display:none!important}
        #invoice-print-clone{position:static!important;padding:0!important;display:block!important;min-height:auto!important;max-width:186mm!important;width:100%!important;box-sizing:border-box!important}
        #invoice-print-clone table{table-layout:fixed!important;width:100%!important}
        #invoice-print-clone td,#invoice-print-clone th{word-wrap:break-word;overflow-wrap:break-word}
      }
    `;
    document.head.appendChild(style);
    requestAnimationFrame(() => {
      window.print();
      document.getElementById('invoice-print-clone')?.remove();
      document.getElementById('invoice-print-style')?.remove();
    });
  };

  const handlePrint = () => runPrint();

  const handleDownloadPdf = async () => {
    const element = printAreaRef.current;
    if (!element) return;
    const filename = `Invoice-${invoice.invoiceNumber || invoice.id || 'invoice'}.pdf`;
    const opt = {
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    try {
      const blob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      const orig = document.title;
      document.title = filename.replace('.pdf', '');
      window.print();
      document.title = orig;
    }
  };

  useEffect(() => {
    if (!autoAction || !invoice) return;
    const run = async () => {
      if (autoAction === 'download') {
        const element = printAreaRef.current;
        if (element) {
          const filename = `Invoice-${invoice.invoiceNumber || invoice.id || 'invoice'}.pdf`;
          const opt = {
            margin: 10,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          };
          try {
            const blob = await html2pdf().set(opt).from(element).outputPdf('blob');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (err) {
            document.title = filename.replace('.pdf', '');
            window.print();
          }
        }
      } else if (autoAction === 'print') {
        runPrint();
      }
      onAutoActionDone?.();
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [autoAction, invoice?.id, invoice?.invoiceNumber, onAutoActionDone]);

  const totalItems = invoice.items || [];
  const { settings } = useFinance();

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          Print
        </Button>
      </div>
      <div ref={printAreaRef} className="print-area bg-white text-black px-8 py-8 space-y-6 font-sans" style={{ maxWidth: '210mm', boxSizing: 'border-box' }}>
        {/* Header - Company name left, date right */}
        <div className="border-b border-gray-300 pb-4 flex items-start justify-between gap-4">
          <div>
            <img
              src={settings.logo || defaultLogo}
              alt="Logo"
              className="h-12 w-auto object-contain mb-2"
            />
            <p className="text-sm text-gray-600">Invoice</p>
          </div>
          <div className="text-right text-sm text-gray-600 shrink-0">
            <p>{formatDate(invoice.createdAt || invoice.dueDate)}</p>
          </div>
        </div>

        {/* Invoice To and Invoice Details - two columns */}
        <div className="grid grid-cols-2 gap-6 pt-2">
          <div>
            <h2 className="font-bold text-base mb-2 text-black">Invoice To:</h2>
            <p className="text-black">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-sm text-gray-600 mt-0.5">{invoice.clientEmail}</p>
            )}
            {invoice.clientPhone && (
              <p className="text-sm text-gray-600">{invoice.clientPhone}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="font-bold text-base mb-2 text-black">Invoice Details:</h2>
            <p className="text-sm text-black">Invoice #: {invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-600 mt-0.5">Due: {formatDate(invoice.dueDate || invoice.createdAt)}</p>
            <p className="text-sm text-gray-600">Payment: {invoice.paymentMethod?.toUpperCase() || 'N/A'}</p>
          </div>
        </div>

        {/* Items table */}
        <div className="border-t border-gray-300 pt-4 overflow-hidden">
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '45%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '23%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 font-bold text-black">Service / Item</th>
              <th className="text-center py-2 font-bold text-black">Qty</th>
              <th className="text-right py-2 font-bold text-black">Price</th>
              <th className="text-right py-2 font-bold text-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {totalItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-300">
                <td className="py-3 text-black break-words">
                  <div className="font-semibold break-words">{item.description}</div>
                  {item.serviceType && (
                    <div className="text-sm text-gray-600">{item.serviceType}</div>
                  )}
                </td>
                <td className="text-center py-3 text-black">
                  {item.quantity ?? 1}
                </td>
                <td className="text-right py-3 text-black">
                  {currency} {(item.price || 0).toLocaleString()}
                </td>
                <td className="text-right py-3 text-black font-semibold">
                  {currency}{' '}
                  {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Summary - right aligned */}
        <div className="flex justify-end pt-2">
          <div className="min-w-0 max-w-full space-y-2" style={{ width: '180px' }}>
            <div className="flex justify-between text-black">
              <span>Subtotal:</span>
              <span>{currency} {(invoice.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-black">
              <span>Tax ({invoice.taxRate ?? 0}%):</span>
              <span>{currency} {(invoice.taxAmount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 text-black">
              <span>Total:</span>
              <span>{currency} {(invoice.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Bank details for Bank Transfer */}
        {invoice.bankDetails && (invoice.paymentMethod === 'bank' || invoice.paymentMethod === 'Bank Transfer') && (
          <div className="border-t border-gray-300 pt-4">
            <h3 className="font-bold text-sm mb-2 text-black">Bank Transfer Details</h3>
            <div className="text-sm text-black space-y-1">
              <p>Account Number: {invoice.bankDetails.accountNumber}</p>
              <p>Account Name: {invoice.bankDetails.accountName}</p>
              <p>Bank: {invoice.bankDetails.bankName}</p>
              {invoice.bankDetails.branch && (
                <p>Branch: {invoice.bankDetails.branch}</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600 space-y-1">
          <p>Thank you for your business!</p>
          <p>Please make payment before the due date.</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;