import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import html2pdf from 'html2pdf.js';

// SVG Icons (inline for html2canvas compatibility - same as InvoiceRed)
const LogoIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <rect width="38" height="38" rx="5" fill="#dc2626"/>
    <polygon points="9,30 19,8 29,30" fill="white" opacity="0.95"/>
    <polygon points="9,30 19,17 29,30" fill="#991b1b" opacity="0.75"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
  </svg>
);
const EmailIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const AddressIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const TitleIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const BankIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}>
    <rect x="3" y="8" width="18" height="12" rx="2"/>
    <path d="M3 8l9-5 9 5"/>
    <line x1="12" y1="8" x2="12" y2="20"/>
    <line x1="7" y1="12" x2="7" y2="16"/>
    <line x1="17" y1="12" x2="17" y2="16"/>
  </svg>
);
const WebsiteIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
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
    clone.style.cssText = 'position:fixed;left:0;top:0;width:750px;max-width:750px;background:#fff;color:#000;z-index:999999;padding:0;overflow:visible;box-sizing:border-box;font-family:\'Poppins\',sans-serif';
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
    const filename = `Invoice-${(invoice.invoiceNumber || 'invoice').toString().replace(/^#/, '')}.pdf`;
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

  // Reusable inline styles (same as InvoiceRed)
  const s = {
    page: { width: 750, background: '#fff', fontFamily: "'Poppins', sans-serif", boxSizing: 'border-box' },
    row: { display: 'flex', alignItems: 'stretch' },
    col: { flex: 1, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' },
    blackSide: { background: '#111', color: '#fff', padding: '20px 28px 20px 44px', minWidth: 270, clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    strip: { height: 5, background: '#dc2626' },
    toFrom: { display: 'flex', padding: '20px 28px', gap: 24 },
    label: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
    divider: { width: 1, background: '#e5e7eb' },
    contactRow: { fontSize: 11, color: '#4b5563', lineHeight: 1.9 },
    thStyle: (center) => ({ padding: '10px 12px', textAlign: center ? 'center' : 'left', fontWeight: 600, color: '#fff', fontSize: 11 }),
    tdStyle: (center, bold) => ({ padding: '11px 12px', textAlign: center ? 'center' : 'left', fontWeight: bold ? 600 : 400, color: bold ? '#1f2937' : '#374151', fontSize: 11 }),
    totalRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, color: '#4b5563', borderBottom: '1px solid #f3f4f6' },
    totalBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dc2626', color: '#fff', padding: '10px 12px', marginTop: 4, borderRadius: 2 },
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; }
        @media print { body { background: white !important; margin: 0; } .no-print { display: none !important; } }
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

      <div style={{ minHeight: '100vh', background: '#d1d5db', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px' }}>
        <div ref={printAreaRef} style={s.page}>

          {/* HEADER */}
          <div style={s.row}>
            <div style={s.col}>
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo" style={{ height: 38, width: 'auto', maxWidth: 140, objectFit: 'contain' }} />
              ) : (
                <LogoIcon />
              )}
            </div>
            <div style={s.blackSide}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 6, color: '#fff' }}>INVOICE</div>
              <div style={{ fontSize: 11, marginTop: 8, color: '#9ca3af', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#6b7280', width: 110 }}>Invoice Number:</span>
                  <span style={{ color: '#fff' }}>{invoice.invoiceNumber || '—'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#6b7280', width: 110 }}>Invoice Date:</span>
                  <span style={{ color: '#fff' }}>{formatDate(invoice.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RED STRIP */}
          <div style={s.strip} />

          {/* TO / FROM */}
          <div style={s.toFrom}>
            <div style={{ flex: 1 }}>
              <div style={s.label}>Invoice To</div>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#111827', display: 'block', marginBottom: 4 }}>{invoice.clientName || '—'}</span>
              <div style={s.contactRow}>
                {invoice.clientEmail && <div><EmailIcon />{invoice.clientEmail}</div>}
                {invoice.clientPhone && <div><PhoneIcon />{invoice.clientPhone}</div>}
              </div>
            </div>
            <div style={s.divider} />
            <div style={{ flex: 1 }}>
              <div style={s.label}>Invoice From</div>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#111827', display: 'block', marginBottom: 4 }}>{companyName}</span>
              <div style={s.contactRow}>
                {settings?.phone && <div><PhoneIcon />{settings.phone}</div>}
                {settings?.email && <div><EmailIcon />{settings.email}</div>}
                {settings?.website && <div><WebsiteIcon />{settings.website}</div>}
                {settings?.address && <div><AddressIcon />{settings.address}</div>}
              </div>
            </div>
          </div>

          {/* TABLE - same colors as InvoiceRed */}
          <div style={{ padding: '0 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#dc2626' }}>
                  <th style={{ ...s.thStyle(false), width: 40 }}>No.</th>
                  <th style={s.thStyle(false)}>Product Description</th>
                  <th style={{ ...s.thStyle(true), width: 70 }}>Price</th>
                  <th style={{ ...s.thStyle(true), width: 70 }}>Quantity</th>
                  <th style={{ ...s.thStyle(true), width: 90 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const qty = item.quantity ?? 1;
                  const price = item.price || 0;
                  const total = price * qty;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...s.tdStyle(false, false), color: '#9ca3af', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={s.tdStyle(false, false)}>
                        <span style={{ fontWeight: 600, color: '#1f2937', display: 'block' }}>{item.description || '—'}</span>
                        {item.sku && <span style={{ color: '#9ca3af', fontSize: 10, display: 'block' }}>{item.sku}</span>}
                      </td>
                      <td style={s.tdStyle(true, false)}>{(price).toLocaleString()}</td>
                      <td style={s.tdStyle(true, false)}>{qty}</td>
                      <td style={s.tdStyle(true, true)}>{(total).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div style={{ padding: '8px 28px 0', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 256 }}>
              <div style={s.totalRow}>
                <span style={{ fontWeight: 600 }}>Subtotal:</span>
                <span>{(invoice.subtotal ?? 0).toLocaleString()}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div style={s.totalRow}>
                  <span style={{ fontWeight: 600 }}>Tax ({invoice.taxRate}%):</span>
                  <span>{(invoice.taxAmount ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div style={s.totalBar}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Total:</span>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{currency} {(invoice.total ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* DEAR CLIENT */}
          {(invoice.notes || invoice.dearClient) && (
            <div style={{ padding: '24px 28px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Dear Client,</div>
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>{invoice.notes || invoice.dearClient}</div>
            </div>
          )}

          {/* TERMS + PAYMENT */}
          <div style={{ display: 'flex', padding: '20px 28px 0', gap: 32 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Terms & Conditions</div>
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>Payment due on receipt. Thank you for your business.</div>
            </div>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Payment Method</div>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 2 }}>
                {payment.accountName && <div><BankIcon /><span style={{ color: '#6b7280' }}>Account Name: </span><span style={{ fontWeight: 500 }}>{payment.accountName}</span></div>}
                {payment.accountNumber && <div><BankIcon /><span style={{ color: '#6b7280' }}>Account No: </span><span style={{ fontWeight: 500 }}>{payment.accountNumber}</span></div>}
                {payment.bankName && <div><BankIcon /><span style={{ color: '#6b7280' }}>Bank: </span><span style={{ fontWeight: 500 }}>{payment.bankName}</span></div>}
                {(payment.branch || payment.branchName) && <div><BankIcon /><span style={{ color: '#6b7280' }}>Branch: </span><span style={{ fontWeight: 500 }}>{payment.branch || payment.branchName}</span></div>}
                {!payment.accountNumber && !payment.accountName && !payment.bankName && <div style={{ color: '#9ca3af' }}>—</div>}
              </div>
            </div>
          </div>

          {/* FOOTER - Signature area: LogozoDev authorized only */}
          <div style={{ marginTop: 32, position: 'relative', height: 52, background: '#111', display: 'flex', alignItems: 'center', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', right: 0, top: 0, width: 0, height: 0, borderLeft: '52px solid transparent', borderTop: '52px solid #dc2626' }} />
            <span style={{ color: '#fff', fontSize: 12, fontStyle: 'italic', fontWeight: 600 }}>LogozoDev authorized</span>
          </div>

        </div>
      </div>
    </>
  );
};

export default InvoiceTemplate;
