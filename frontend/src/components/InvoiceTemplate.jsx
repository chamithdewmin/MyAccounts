import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import html2pdf from 'html2pdf.js';

// SVG Icons (same as InvoiceRed)
const LogoIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <rect width="36" height="36" rx="4" fill="#e53e3e"/>
    <polygon points="8,28 18,8 28,28" fill="white" opacity="0.9"/>
    <polygon points="8,28 18,16 28,28" fill="#c53030"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const AddressIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const TitleIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BankIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a202c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
    <rect x="3" y="8" width="18" height="12" rx="2"/>
    <path d="M3 8l9-5 9 5"/>
    <line x1="12" y1="8" x2="12" y2="20"/>
    <line x1="7" y1="12" x2="7" y2="16"/>
    <line x1="17" y1="12" x2="17" y2="16"/>
  </svg>
);

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
    if (!date) return '';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  };

  const runPrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }
    const clone = el.cloneNode(true);
    clone.style.cssText = 'position:fixed;left:0;top:0;width:750px;max-width:750px;background:white;color:#000;z-index:999999;padding:0;overflow:visible;box-sizing:border-box;';
    clone.id = 'invoice-print-clone';
    document.body.appendChild(clone);
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `@page { size: A4 portrait; margin: 12mm; }
      @media print {
        body>*:not(#invoice-print-clone){display:none!important}
        .no-print{display:none!important}
        #invoice-print-clone{position:static!important;padding:0!important;display:block!important;width:750px!important;max-width:750px!important;margin:0 auto!important;box-shadow:none!important}
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
  const payment = invoice.bankDetails || settings?.bankDetails || {};
  const companyName = settings?.businessName || 'COMPANY';
  const tagline = settings?.businessName ? '' : 'COMPANY TAGLINE HERE';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .invoice-red * { font-family: 'Poppins', sans-serif; box-sizing: border-box; }
        @media print {
          body { background: white !important; margin: 0; }
          .no-print { display: none !important; }
          .invoice-page { box-shadow: none !important; margin: 0 auto !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex justify-end gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button size="sm" variant="outline" onClick={runPrint}>
          Print
        </Button>
      </div>

      <div ref={printAreaRef} className="invoice-red invoice-page bg-white w-full max-w-[750px] shadow-2xl relative mx-auto">

        {/* Header */}
        <div className="flex items-stretch">
          {/* Left: Logo */}
          <div className="bg-white px-7 py-6 flex items-center gap-3 flex-1">
            {settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="h-9 w-auto object-contain" style={{ maxWidth: '140px' }} />
            ) : (
              <LogoIcon />
            )}
            <div>
              <span className="font-black text-xl text-red-600 tracking-widest block">{companyName}</span>
              {tagline && <span className="text-gray-400 text-xs tracking-widest block">{tagline}</span>}
            </div>
          </div>

          {/* Right: Invoice */}
          <div className="bg-black text-white px-7 py-5 flex flex-col justify-center min-w-[260px] relative" style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)' }}>
            <div className="pl-6">
              <div className="text-3xl font-black tracking-widest text-white">INVOICE</div>
              <div className="text-xs mt-2 text-gray-300 space-y-0.5">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28">Invoice Number:</span>
                  <span className="text-white">{invoice.invoiceNumber || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28">Invoice Date:</span>
                  <span className="text-white">{formatDate(invoice.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Red divider */}
        <div className="h-1.5 bg-red-600 w-full" />

        {/* INVOICE TO / FROM */}
        <div className="flex px-7 py-5 gap-6">
          <div className="flex-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Invoice To</div>
            <span className="font-bold text-lg text-gray-900 block mb-1">{invoice.clientName || '—'}</span>
            <div className="text-xs text-gray-600 space-y-0.5">
              {invoice.clientEmail && <div><EmailIcon /><span>{invoice.clientEmail}</span></div>}
              {invoice.clientPhone && <div><PhoneIcon /><span>{invoice.clientPhone}</span></div>}
            </div>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="flex-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Invoice From</div>
            <span className="font-bold text-lg text-gray-900 block mb-1">{companyName}</span>
            <div className="text-xs text-gray-600 space-y-0.5">
              {settings?.address && <div><AddressIcon /><span>{settings.address}</span></div>}
              {settings?.phone && <div><PhoneIcon /><span>{settings.phone}</span></div>}
              {settings?.email && <div><EmailIcon /><span>{settings.email}</span></div>}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-7">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="py-2.5 px-3 text-left font-semibold w-10">No.</th>
                <th className="py-2.5 px-3 text-left font-semibold">Product Description</th>
                <th className="py-2.5 px-3 text-center font-semibold w-16">Price</th>
                <th className="py-2.5 px-3 text-center font-semibold w-16">Quantity</th>
                <th className="py-2.5 px-3 text-center font-semibold w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const qty = item.quantity ?? 1;
                const price = item.price || 0;
                const total = price * qty;
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td className="py-3 px-3 font-semibold text-gray-500">{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-gray-800 block">{item.description || '—'}</span>
                      {item.sku && <span className="text-gray-400 text-xs">{item.sku}</span>}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-700">{(price).toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-gray-700">{qty}</td>
                    <td className="py-3 px-3 text-center font-semibold text-gray-800">{(total).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Subtotal / Tax / Total */}
        <div className="px-7 mt-2">
          <div className="ml-auto w-64">
            <div className="flex justify-between py-1.5 text-xs text-gray-600 border-b border-gray-100">
              <span className="font-semibold">Subtotal:</span>
              <span className="text-gray-700">{(invoice.subtotal ?? 0).toLocaleString()}</span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between py-1.5 text-xs text-gray-600 border-b border-gray-100">
                <span className="font-semibold">Tax ({invoice.taxRate}%):</span>
                <span className="text-gray-700">{(invoice.taxAmount ?? 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5 px-3 text-sm font-bold bg-red-600 text-white mt-1 rounded-sm">
              <span>Total:</span>
              <span className="font-bold">{currency} {(invoice.total ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        {(payment?.accountNumber || payment?.accountName || payment?.bankName) && (
          <div className="px-7 mt-5">
            <div className="text-sm font-bold text-gray-800 mb-2">Payment Method</div>
            <div className="text-xs text-gray-600 space-y-1">
              {payment.accountName && <div><BankIcon /><span className="text-gray-500">Account Name: </span><span className="font-medium">{payment.accountName}</span></div>}
              {payment.accountNumber && <div><BankIcon /><span className="text-gray-500">Account No: </span><span className="font-medium">{payment.accountNumber}</span></div>}
              {payment.bankName && <div><BankIcon /><span className="text-gray-500">Bank: </span><span className="font-medium">{payment.bankName}</span></div>}
              {(payment.branch || payment.branchName) && <div><BankIcon /><span className="text-gray-500">Branch: </span><span className="font-medium">{payment.branch || payment.branchName}</span></div>}
            </div>
          </div>
        )}

        {/* Footer with signature area */}
        <div className="mt-8">
          <div className="relative h-12 bg-black flex items-center px-7">
            <div className="absolute right-0 top-0 w-0 h-0" style={{ borderLeft: '48px solid transparent', borderTop: '48px solid #e53e3e' }} />
            {invoice.showSignatureArea ? (
              <span className="text-white text-xs font-semibold italic">Prepared By / Customer Signature</span>
            ) : (
              <span className="text-white text-xs font-semibold italic">Thank you for your business</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceTemplate;
