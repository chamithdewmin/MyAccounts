import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import html2pdf from 'html2pdf.js';

const InvoiceTemplate = ({
  invoice: invoiceProp,
  order,
  currency = 'LKR',
  autoAction = null,
  onAutoActionDone,
}) => {
  const rawInvoice = invoiceProp || order;
  const invoice = rawInvoice ? {
    ...rawInvoice,
    invoiceNumber: rawInvoice.invoiceNumber || rawInvoice.id,
    clientName: rawInvoice.clientName || rawInvoice.customerName,
    subtotal: rawInvoice.subtotal ?? rawInvoice.items?.reduce((s, i) => s + (i.price || 0) * (i.quantity ?? 1), 0),
    taxAmount: rawInvoice.taxAmount ?? rawInvoice.tax ?? 0,
    taxRate: rawInvoice.taxRate ?? (rawInvoice.tax ? 10 : 0),
    total: rawInvoice.total ?? (rawInvoice.subtotal || 0) + (rawInvoice.taxAmount ?? rawInvoice.tax ?? 0),
    status: (rawInvoice.status || '').toString().toLowerCase() === 'paid' ? 'paid' : rawInvoice.status,
    createdAt: rawInvoice.createdAt || new Date().toISOString(),
    dueDate: rawInvoice.dueDate || rawInvoice.createdAt,
  } : {};
  const printAreaRef = useRef(null);
  const { settings } = useFinance();

  const formatDate = (date) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatDueDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
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
    await html2pdf()
      .set({
        margin: [12, 14, 12, 14],
        filename,
        image: { type: 'png', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
      })
      .from(element)
      .save();
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
  const themeColor = (settings?.invoiceThemeColor || '#F97316').trim() || '#F97316';

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
        {/* Header: Logo (upload area) + Company info left | INVOICE + Balance right */}
        <div className="invoice-header px-10 pt-8 pb-6 flex justify-between items-start gap-8">
          <div className="flex flex-col gap-3">
            {/* Logo only - from Settings > Invoice Logo upload (no default text logo) */}
            {settings?.logo && (
              <div className="invoice-logo-area h-14 flex items-center" style={{ minWidth: '200px' }}>
                <img
                  src={settings.logo}
                  alt="Logo"
                  className="h-14 w-auto object-contain"
                  style={{ maxWidth: '240px', minWidth: '180px' }}
                />
              </div>
            )}
            <div className="text-sm text-black space-y-0.5">
              <p className="font-medium">LogozoDev</p>
              <p><a href="mailto:hello@logozodev.com" className="text-black no-underline">hello@logozodev.com</a></p>
              <p>074 1525 537</p>
              {settings?.address && <p>{settings.address}</p>}
              {settings?.address && <p>{settings.address}</p>}
              {settings?.phone && <p>{settings.phone}</p>}
              {settings?.email && <p>{settings.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-black mb-1">INVOICE</div>
            <div className="text-sm text-black">{invoice.invoiceNumber}</div>
          </div>
        </div>

        {/* Invoice Date, Terms, Due Date | Bill To */}
        <div className="px-10 py-4 grid grid-cols-2 gap-8 border-b border-gray-100">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bill To</div>
            <p className="text-base font-bold text-gray-800">{invoice.clientName || '—'}</p>
            {invoice.clientEmail && <p className="text-sm text-gray-600">E. {invoice.clientEmail}</p>}
            {invoice.clientPhone && <p className="text-sm text-gray-600">{invoice.clientPhone}</p>}
          </div>
          <div className="space-y-2 text-right text-sm">
            <div className="flex justify-end gap-2">
              <span className="text-gray-500">Invoice Date:</span>
              <span className="text-gray-800">{formatDate(invoice.createdAt)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-500">Terms:</span>
              <span className="text-gray-800">Due on Receipt</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-500">Due Date:</span>
              <span className="text-gray-800">{formatDate(invoice.dueDate || invoice.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Items as normal text */}
        <div className="px-10 py-6 space-y-3">
          {items.map((item, i) => {
            const qty = item.quantity ?? 1;
            const rate = item.price || 0;
            const amount = (rate * qty);
            return (
              <div key={i} className="text-sm text-black">
                <span className="font-medium">{i + 1}. {item.description}</span>
                {item.sku && <span className="text-gray-600"> (SKU: {item.sku})</span>}
                <span className="text-gray-600"> — Qty {qty} × {(rate).toLocaleString()} = {(amount).toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {/* Summary: Sub Total, Total, Payment Made, Balance Due - black text */}
        <div className="px-10 pb-6 avoid-break">
          <div className="flex justify-end pl-4">
            <div className="w-80 space-y-2 text-sm text-black">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span className="font-medium">{invoice.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{currency} {invoice.total?.toLocaleString()}</span>
              </div>
              {invoice.status === 'paid' && (
                <div className="flex justify-between">
                  <span>Payment Made</span>
                  <span>(-) {invoice.total?.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signature lines - only when "Add signature area" was used */}
        {invoice.showSignatureArea && (
          <div className="px-10 pt-16 pb-8 flex justify-between gap-16 avoid-break">
            <div className="flex-1">
              <div className="border-b border-dashed border-gray-400 pb-1 mb-2" />
              <div className="text-xs text-gray-500">Prepared By</div>
            </div>
            <div className="flex-1">
              <div className="border-b border-dashed border-gray-400 pb-1 mb-2" />
              <div className="text-xs text-gray-500">Customer Signature</div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .invoice-a4 {
          width: 182mm;
          max-width: 182mm;
          margin: auto;
          box-sizing: border-box;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .invoice-a4 { box-shadow: none !important; width: 182mm !important; max-width: 182mm !important; }
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
