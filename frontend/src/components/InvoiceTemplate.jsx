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
    clone.style.cssText = 'position:fixed;left:0;top:0;width:100%;max-width:210mm;background:white;color:#000;z-index:999999;overflow:visible;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `
      @page { 
        size: A4 portrait; 
        margin: 15mm 15mm 15mm 15mm; 
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
        }
        body > *:not(#invoice-print-clone) {
          display: none !important;
        }
        #invoice-print-clone {
          position: static !important;
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          background: white !important;
          color: black !important;
        }
        #invoice-print-clone table {
          table-layout: fixed !important;
          width: 100% !important;
        }
        #invoice-print-clone td,
        #invoice-print-clone th {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .page-break {
          page-break-before: always;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
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
      margin: [15, 15, 15, 15],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        allowTaint: true, 
        logging: false,
        windowHeight: element.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
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
        await handleDownloadPdf();
      } else if (autoAction === 'print') {
        runPrint();
      }
      onAutoActionDone?.();
    };
    
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [autoAction, invoice?.id, invoice?.invoiceNumber]);

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
      
      <div 
        ref={printAreaRef} 
        className="print-area bg-white text-black font-sans"
        style={{ 
          maxWidth: '210mm', 
          margin: '0 auto',
          padding: '20mm 15mm',
          boxSizing: 'border-box',
          minHeight: '297mm'
        }}
      >
        {/* Header - Company name left, date right */}
        <div className="border-b-2 border-gray-300 pb-4 mb-6 flex items-start justify-between gap-4 avoid-break">
          <div>
            <img
              src={settings.logo || defaultLogo}
              alt="Logo"
              className="h-16 w-auto object-contain mb-3"
              style={{ maxWidth: '150px' }}
            />
            <p className="text-lg font-semibold text-gray-700">INVOICE</p>
          </div>
          <div className="text-right text-sm text-gray-600 shrink-0">
            <p className="font-medium">{formatDate(invoice.createdAt || invoice.dueDate)}</p>
          </div>
        </div>

        {/* Invoice To and Invoice Details - two columns */}
        <div className="grid grid-cols-2 gap-8 mb-6 avoid-break">
          <div>
            <h2 className="font-bold text-sm mb-3 text-gray-700 uppercase tracking-wide">Invoice To:</h2>
            <p className="text-base font-semibold text-black mb-1">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-sm text-gray-600 mb-0.5">{invoice.clientEmail}</p>
            )}
            {invoice.clientPhone && (
              <p className="text-sm text-gray-600">{invoice.clientPhone}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="font-bold text-sm mb-3 text-gray-700 uppercase tracking-wide">Invoice Details:</h2>
            <p className="text-sm text-black mb-1">
              <span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate || invoice.createdAt)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Payment:</span> {invoice.paymentMethod?.toUpperCase() || 'N/A'}
            </p>
          </div>
        </div>

        {/* Items table */}
        <div className="mb-6">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '45%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-gray-400 bg-gray-50">
                <th className="text-left py-3 px-2 font-bold text-sm text-gray-800 uppercase tracking-wide">
                  Service / Item
                </th>
                <th className="text-center py-3 px-2 font-bold text-sm text-gray-800 uppercase tracking-wide">
                  Qty
                </th>
                <th className="text-right py-3 px-2 font-bold text-sm text-gray-800 uppercase tracking-wide">
                  Price
                </th>
                <th className="text-right py-3 px-2 font-bold text-sm text-gray-800 uppercase tracking-wide">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {totalItems.map((item, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-200 avoid-break"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <td className="py-3 px-2 text-black">
                    <div className="font-semibold text-sm break-words">{item.description}</div>
                    {item.serviceType && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.serviceType}</div>
                    )}
                  </td>
                  <td className="text-center py-3 px-2 text-sm text-black">
                    {item.quantity ?? 1}
                  </td>
                  <td className="text-right py-3 px-2 text-sm text-black">
                    {currency} {(item.price || 0).toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2 text-sm font-semibold text-black">
                    {currency} {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary - right aligned */}
        <div className="flex justify-end mb-6 avoid-break">
          <div className="space-y-2" style={{ width: '220px' }}>
            <div className="flex justify-between text-sm text-black py-1">
              <span>Subtotal:</span>
              <span className="font-medium">{currency} {(invoice.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-black py-1">
              <span>Tax ({invoice.taxRate ?? 0}%):</span>
              <span className="font-medium">{currency} {(invoice.taxAmount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-gray-400 text-black">
              <span>Total:</span>
              <span>{currency} {(invoice.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Bank details for Bank Transfer */}
        {invoice.bankDetails && (invoice.paymentMethod === 'bank' || invoice.paymentMethod === 'Bank Transfer') && (
          <div className="border-t border-gray-300 pt-4 mb-6 avoid-break">
            <h3 className="font-bold text-sm mb-3 text-gray-800 uppercase tracking-wide">
              Bank Transfer Details
            </h3>
            <div className="text-sm text-black space-y-1 bg-gray-50 p-3 rounded">
              <p><span className="font-semibold">Account Number:</span> {invoice.bankDetails.accountNumber}</p>
              <p><span className="font-semibold">Account Name:</span> {invoice.bankDetails.accountName}</p>
              <p><span className="font-semibold">Bank:</span> {invoice.bankDetails.bankName}</p>
              {invoice.bankDetails.branch && (
                <p><span className="font-semibold">Branch:</span> {invoice.bankDetails.branch}</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600 space-y-1 mt-auto">
          <p className="font-medium">Thank you for your business!</p>
          <p>Please make payment before the due date.</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;