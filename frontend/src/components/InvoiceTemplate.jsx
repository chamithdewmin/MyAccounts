import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import html2pdf from 'html2pdf.js';

const PhoneIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
  </svg>
);
const EmailIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const AddressIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const PersonIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const BankIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', flexShrink: 0 }}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M3 8l9-5 9 5" />
    <line x1="12" y1="8" x2="12" y2="20" />
    <line x1="7" y1="12" x2="7" y2="16" />
    <line x1="17" y1="12" x2="17" y2="16" />
  </svg>
);
const WebsiteIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const LogoMark = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="6" fill="#dc2626" />
    <polygon points="10,32 20,8 30,32" fill="white" opacity="0.95" />
    <polygon points="10,32 20,18 30,32" fill="#991b1b" opacity="0.75" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'invoiceSpin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function normalise(raw = {}, currency = 'LKR', settings = {}) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const subtotal = raw.subtotal ?? items.reduce((s, i) => s + (parseFloat(i.price || 0) * parseFloat(i.quantity ?? i.qty ?? 1)), 0);
  const taxAmount = raw.taxAmount ?? raw.tax ?? 0;
  const total = raw.total ?? (raw.subtotal ?? subtotal) + taxAmount;
  const payment = raw.bankDetails || settings?.bankDetails || {};

  const paymentMadeNum = parseFloat(raw.paymentMade ?? raw.paymentMadeAmount ?? 0) || 0;
  const totalNum = total;
  const balanceDueNum = Math.max(0, totalNum - paymentMadeNum);

  return {
    invoiceNumber: raw.invoiceNumber || raw.id || '—',
    invoiceDate: formatDate(raw.createdAt || raw.date || raw.invoiceDate),
    dueDate: formatDate(raw.dueDate || raw.createdAt || raw.date || raw.invoiceDate),
    termsLabel: raw.terms || 'Due on Receipt',
    currency: currency || settings?.currency || 'LKR',

    companyName: settings?.businessName || 'COMPANY',
    companyTagline: settings?.businessName ? '' : 'COMPANY TAGLINE HERE',
    companyAddress: settings?.address || '',
    companyPhone: settings?.phone || '0741525537',
    companyEmail: settings?.email || 'hello@logozodev.com',
    companyWebsite: settings?.website || 'www.logozodev.com',

    clientName: raw.clientName || raw.customerName || '—',
    clientPhone: raw.clientPhone || '',
    clientEmail: raw.clientEmail || '',

    items: items.map((it, i) => {
      const qty = parseFloat(it.quantity ?? it.qty ?? 1);
      const price = parseFloat(it.price || 0);
      const lineTotal = it.total ?? (price * qty);
      return {
        id: i + 1,
        no: String(i + 1).padStart(2, '0'),
        description: it.description || it.name || 'Item',
        descSub: it.sku || it.note || '',
        price,
        quantity: qty,
        total: lineTotal,
        rateFormatted: price.toLocaleString(),
        amountFormatted: lineTotal.toLocaleString(),
        qtyStr: `${qty.toFixed(2)} pcs`,
      };
    }),

    subtotal,
    subTotalFormatted: (subtotal ?? 0).toLocaleString(),
    taxRate: raw.taxRate ?? settings?.taxRate ?? 0,
    tax: taxAmount,
    total,
    totalFormatted: `${currency || settings?.currency || 'LKR'} ${(total ?? 0).toLocaleString()}`,
    paymentMade: paymentMadeNum,
    paymentMadeFormatted: paymentMadeNum ? `(-) ${paymentMadeNum.toLocaleString()}` : null,
    balanceDue: balanceDueNum,
    balanceDueFormatted: `${currency || settings?.currency || 'LKR'} ${balanceDueNum.toLocaleString()}`,

    paymentMethod: (raw.paymentMethod || 'bank').toString().toLowerCase(),
    payment,
    showSignatureArea: Boolean(raw.showSignatureArea),

    dearClient: raw.notes || 'Thank you for your business. Please contact us if you have any questions.',
    notes: raw.notes || 'Thanks for your business.',
    terms: 'Payment due on receipt. Thank you for your business.',
    termsConditions: Array.isArray(raw.termsConditions) ? raw.termsConditions : (raw.terms ? [raw.terms] : ['Payment due on receipt. Thank you for your business.']),
  };
}

function fmt(amount, currency = 'LKR') {
  const num = parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.slice(0, 3), minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

// Classic (CameraLK-style) template styles
const classicStyles = {
  page: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    maxWidth: '100%',
    margin: 0,
    padding: '48px 40px',
    background: '#fff',
    color: '#1a1a1a',
    position: 'relative',
    minHeight: '1100px',
    boxSizing: 'border-box',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  logo: {
    background: '#cc0000',
    color: '#fff',
    fontFamily: "'Arial Black', 'Arial Bold', sans-serif",
    fontWeight: 900,
    fontSize: '28px',
    padding: '10px 22px',
    letterSpacing: '-1px',
    display: 'inline-block',
    borderRadius: '3px',
    marginBottom: '12px',
  },
  sellerInfo: { fontSize: '13px', lineHeight: '1.7', color: '#333' },
  sellerName: { fontWeight: 'bold', fontSize: '15px', marginBottom: '2px' },
  invoiceWord: {
    fontSize: '48px', fontWeight: 300, letterSpacing: '6px',
    color: '#1a1a1a', fontFamily: "'Georgia', serif", lineHeight: 1, textAlign: 'right',
  },
  invoiceNum: { fontSize: '14px', color: '#555', marginTop: '6px', textAlign: 'right' },
  balanceDueBox: { textAlign: 'right', marginTop: '14px' },
  balanceDueLabel: { fontSize: '13px', color: '#555' },
  balanceDueAmount: { fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a' },
  metaSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '28px 0 20px' },
  billToLabel: { color: '#555', fontSize: '13px', marginBottom: '4px' },
  billToName: { fontWeight: 'bold', fontSize: '15px' },
  metaRow: { display: 'flex', justifyContent: 'flex-end', gap: '24px', marginBottom: '4px', fontSize: '13px' },
  metaKey: { color: '#555' },
  metaVal: { color: '#1a1a1a', fontWeight: 500, minWidth: '120px', textAlign: 'right' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  th: {
    padding: '10px 14px', fontSize: '13px', fontWeight: 600,
    textAlign: 'left', letterSpacing: '0.5px', background: '#1a1a1a', color: '#fff',
  },
  td: { padding: '14px 14px', fontSize: '13px', verticalAlign: 'top', borderBottom: '1px solid #e8e8e8' },
  itemTitle: { fontWeight: 600, marginBottom: '2px' },
  itemSku: { color: '#777', fontSize: '12px', marginTop: '4px' },
  itemDesc: { color: '#555', fontSize: '12px', marginTop: '3px', lineHeight: 1.5 },
  totalsSection: { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' },
  totalsTable: { width: '300px', fontSize: '13px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' },
  totalRowBold: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold' },
  totalRowPayment: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#cc0000', borderBottom: '1px solid #f0f0f0' },
  totalRowFinal: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold', fontSize: '15px', borderTop: '2px solid #1a1a1a', marginTop: '4px' },
  notes: { marginTop: '48px', fontSize: '13px' },
  notesTitle: { fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' },
  terms: { marginTop: '28px', fontSize: '12.5px', color: '#444', lineHeight: 1.8 },
  termsTitle: { fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: '#1a1a1a' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '48px' },
  sigBlock: { textAlign: 'center', fontSize: '12px', color: '#555' },
  sigLine: { borderTop: '1px solid #aaa', width: '140px', margin: '32px auto 4px' },
  stamp: {
    width: '90px', height: '90px', border: '3px solid #cc0000', borderRadius: '50%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', fontWeight: 'bold', color: '#cc0000', textAlign: 'center',
    letterSpacing: '1px', margin: '0 auto',
  },
};

export default function InvoiceTemplate({
  invoice: invoiceProp,
  order,
  currency = 'LKR',
  autoAction = null,
  onAutoActionDone,
  variant = 'default',
}) {
  const { settings } = useFinance();
  const raw = invoiceProp || order || {};
  const inv = normalise(raw, currency, settings);

  const printAreaRef = useRef(null);
  const [dlStatus, setDlStatus] = useState('idle');
  const [prtStatus, setPrtStatus] = useState('idle');

  const handleDownloadPdf = useCallback(async () => {
    if (dlStatus === 'loading') return;
    const element = printAreaRef.current;
    if (!element) return;

    setDlStatus('loading');
    try {
      const filename = `Invoice-${String(inv.invoiceNumber).replace(/^#/, '')}.pdf`;
      await html2pdf()
        .set({
          margin: [12, 15, 12, 15],
          filename,
          image: { type: 'png', quality: 1 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
        })
        .from(element)
        .save();

      setDlStatus('done');
      setTimeout(() => setDlStatus('idle'), 2500);
    } catch (err) {
      console.error('PDF error:', err);
      setDlStatus('error');
      setTimeout(() => setDlStatus('idle'), 3000);
    }
  }, [dlStatus, inv.invoiceNumber]);

  const handlePrint = useCallback(() => {
    setPrtStatus('loading');
    setTimeout(() => {
      window.print();
      setPrtStatus('idle');
    }, 150);
  }, []);

  useEffect(() => {
    if (!autoAction) return;
    const run = async () => {
      if (autoAction === 'download') await handleDownloadPdf();
      else if (autoAction === 'print') handlePrint();
      onAutoActionDone?.();
    };
    run();
  }, [autoAction]);

  const showBankDetails = inv.paymentMethod !== 'cash' && (inv.payment?.accountNumber || inv.payment?.accountName || inv.payment?.bankName);
  const numItems = inv.items.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        .inv-root * { box-sizing: border-box; }
        .inv-root.inv-default * { font-family: 'Poppins', sans-serif !important; }
        .inv-root.inv-classic * { font-family: 'Georgia', 'Times New Roman', serif !important; }
        @keyframes invoiceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden !important; }
          .inv-print-area, .inv-print-area * { visibility: visible !important; }
          .inv-print-area { position: fixed !important; left: 0; top: 0; width: 180mm !important; max-width: 180mm !important; min-height: 297mm !important; background: #fff !important; box-shadow: none !important; margin: 0 auto !important; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>

      <div className={`inv-root ${variant === 'classic' ? 'inv-classic' : 'inv-default'}`} style={{ background: '#d1d5db', minHeight: '100vh', padding: '32px 16px' }}>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20, maxWidth: 680, margin: '0 auto 20px' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={dlStatus === 'loading'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: dlStatus === 'loading' ? '#7f1d1d' : dlStatus === 'done' ? '#166534' : dlStatus === 'error' ? '#7f1d1d' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '9px 18px', fontWeight: 600, fontSize: 13,
              cursor: dlStatus === 'loading' ? 'wait' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s', letterSpacing: 0.3,
              boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
            }}
          >
            {dlStatus === 'loading' ? <SpinIcon /> : <DownloadIcon />}
            {dlStatus === 'loading' ? 'Generating PDF…' : dlStatus === 'done' ? '✓ Downloaded!' : dlStatus === 'error' ? '✗ Failed – Retry' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            disabled={prtStatus === 'loading'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: '#1f2937', color: '#fff', border: 'none', borderRadius: 6,
              padding: '9px 18px', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s', letterSpacing: 0.3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <PrintIcon />
            Print
          </button>
        </div>

        <div
          ref={printAreaRef}
          className="inv-print-area"
          style={{
            width: 680,
            maxWidth: 680,
            minWidth: 680,
            margin: '0 auto',
            background: '#fff',
            boxShadow: '0 4px 40px rgba(0,0,0,0.18)',
            fontFamily: variant === 'classic' ? "'Georgia', 'Times New Roman', serif" : "'Poppins', sans-serif",
            boxSizing: 'border-box',
          }}
        >
          {variant === 'classic' ? (
            <div style={classicStyles.page}>
              <div style={classicStyles.header}>
                <div>
                  <div style={classicStyles.logo}>
                    {inv.companyName}<span style={{ color: '#ff9999', fontSize: '18px' }}>′</span>
                  </div>
                  <div style={classicStyles.sellerInfo}>
                    <div style={classicStyles.sellerName}>{inv.companyName}</div>
                    {inv.companyAddress && <div>{inv.companyAddress}</div>}
                    <div>{inv.companyPhone}</div>
                    <div>{inv.companyEmail}</div>
                    {inv.companyWebsite && <div>{inv.companyWebsite}</div>}
                  </div>
                </div>
                <div>
                  <div style={classicStyles.invoiceWord}>INVOICE</div>
                  <div style={classicStyles.invoiceNum}># {inv.invoiceNumber}</div>
                  <div style={classicStyles.balanceDueBox}>
                    <div style={classicStyles.balanceDueLabel}>Balance Due</div>
                    <div style={classicStyles.balanceDueAmount}>{inv.balanceDueFormatted}</div>
                  </div>
                </div>
              </div>

              <div style={classicStyles.metaSection}>
                <div>
                  <div style={classicStyles.billToLabel}>Bill To</div>
                  <div style={classicStyles.billToName}>{inv.clientName}</div>
                </div>
                <div>
                  <div style={classicStyles.metaRow}>
                    <span style={classicStyles.metaKey}>Invoice Date :</span>
                    <span style={classicStyles.metaVal}>{inv.invoiceDate}</span>
                  </div>
                  <div style={classicStyles.metaRow}>
                    <span style={classicStyles.metaKey}>Terms :</span>
                    <span style={classicStyles.metaVal}>{inv.termsLabel}</span>
                  </div>
                  <div style={classicStyles.metaRow}>
                    <span style={classicStyles.metaKey}>Due Date :</span>
                    <span style={classicStyles.metaVal}>{inv.dueDate}</span>
                  </div>
                </div>
              </div>

              <table style={classicStyles.table}>
                <thead>
                  <tr>
                    <th style={{ ...classicStyles.th, width: '40px' }}>#</th>
                    <th style={classicStyles.th}>Item &amp; Description</th>
                    <th style={{ ...classicStyles.th, textAlign: 'right', width: '80px' }}>Qty</th>
                    <th style={{ ...classicStyles.th, textAlign: 'right', width: '100px' }}>Rate</th>
                    <th style={{ ...classicStyles.th, textAlign: 'right', width: '110px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((item) => (
                    <tr key={item.id} className="avoid-break">
                      <td style={classicStyles.td}>{item.id}</td>
                      <td style={classicStyles.td}>
                        <div style={classicStyles.itemTitle}>{item.description}</div>
                        {item.descSub && <div style={classicStyles.itemSku}>SKU : {item.descSub}</div>}
                      </td>
                      <td style={{ ...classicStyles.td, textAlign: 'right' }}>{item.qtyStr}</td>
                      <td style={{ ...classicStyles.td, textAlign: 'right' }}>{item.rateFormatted}</td>
                      <td style={{ ...classicStyles.td, textAlign: 'right' }}>{item.amountFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={classicStyles.totalsSection}>
                <div style={classicStyles.totalsTable}>
                  <div style={classicStyles.totalRow}><span>Sub Total</span><span>{inv.subTotalFormatted}</span></div>
                  <div style={classicStyles.totalRowBold}><span>Total</span><span>{inv.totalFormatted}</span></div>
                  {inv.paymentMadeFormatted && (
                    <div style={classicStyles.totalRowPayment}><span>Payment Made</span><span>{inv.paymentMadeFormatted}</span></div>
                  )}
                  <div style={classicStyles.totalRowFinal}><span>Balance Due</span><span>{inv.balanceDueFormatted}</span></div>
                </div>
              </div>

              <div style={classicStyles.notes}>
                <div style={classicStyles.notesTitle}>Notes</div>
                <div>{inv.notes}</div>
              </div>

              <div style={classicStyles.terms}>
                <div style={classicStyles.termsTitle}>Terms &amp; Conditions</div>
                {inv.termsConditions.map((t, i) => (
                  <div key={i}>{i + 1}. {t}</div>
                ))}
              </div>

              <div style={classicStyles.footer}>
                <div style={classicStyles.sigBlock}>
                  <div style={classicStyles.sigLine} />
                  <div>Prepared By</div>
                </div>
                <div style={classicStyles.stamp}>
                  <div>{inv.companyName.replace(/\s+/g, ' ').toUpperCase()}</div>
                  <div style={{ fontSize: '14px', margin: '4px 0' }}>{inv.companyPhone}</div>
                  <div>NVA</div>
                </div>
                <div style={classicStyles.sigBlock}>
                  <div style={classicStyles.sigLine} />
                  <div>Customer Signature</div>
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ flex: 1, padding: '26px 30px', display: 'flex', alignItems: 'center', gap: 14, background: '#fff' }}>
              {settings?.logo ? (
                <img src={settings.logo} alt="" style={{ height: 40, width: 'auto', maxWidth: 160, objectFit: 'contain' }} />
              ) : (
                <LogoMark />
              )}
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', letterSpacing: 3, lineHeight: 1.1 }}>{inv.companyName}</div>
                {inv.companyTagline && <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 2, marginTop: 2 }}>{inv.companyTagline}</div>}
              </div>
            </div>
            <div style={{
              background: '#111', color: '#fff',
              padding: '22px 28px 22px 40px', minWidth: 260,
              clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              boxSizing: 'border-box',
            }}>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 7, color: '#fff', lineHeight: 1 }}>INVOICE</div>
              <div style={{ fontSize: 11, marginTop: 10, lineHeight: 1.9, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', flexShrink: 0 }}>Invoice Number:</span>
                  <span style={{ color: '#fff', fontWeight: 600, minWidth: 0 }}>{inv.invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', flexShrink: 0 }}>Invoice Date:</span>
                  <span style={{ color: '#fff', minWidth: 0 }}>{inv.invoiceDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 5, background: '#dc2626' }} />

          {/* TO / FROM */}
          <div style={{ display: 'flex', padding: '22px 30px', gap: 28, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 7 }}>Invoice To</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{inv.clientName}</div>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.9 }}>
                {inv.clientPhone && <div><PhoneIcon />{inv.clientPhone}</div>}
                {inv.clientEmail && <div><EmailIcon />{inv.clientEmail}</div>}
              </div>
            </div>
            <div style={{ width: 1, background: '#e5e7eb', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 7 }}>Invoice From</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{inv.companyName}</div>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.9 }}>
                <div><PhoneIcon />{inv.companyPhone || '—'}</div>
                <div><EmailIcon />{inv.companyEmail || '—'}</div>
                <div><WebsiteIcon />{inv.companyWebsite || '—'}</div>
                {inv.companyAddress ? <div><AddressIcon />{inv.companyAddress}</div> : null}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div style={{ padding: '0 30px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#dc2626', color: '#fff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: 42 }}>No.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Product Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: 80 }}>Price</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: 72 }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: 100 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No items</td>
                  </tr>
                ) : inv.items.map((item, i) => (
                  <tr
                    key={i}
                    className="avoid-break"
                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '11px 12px', color: '#9ca3af', fontWeight: 600, fontSize: 11 }}>{item.no}</td>
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 11 }}>{item.description}</div>
                      {item.descSub && <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 1 }}>{item.descSub}</div>}
                    </td>
                    <td style={{ padding: '11px 12px', textAlign: 'center', color: '#374151', fontSize: 11 }}>{(item.price).toLocaleString()}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'center', color: '#374151', fontSize: 11 }}>{item.quantity}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 600, color: '#1f2937', fontSize: 11 }}>{(item.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 30px 0' }}>
            <div style={{ width: 270 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 11, color: '#4b5563', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontWeight: 600 }}>Subtotal:</span>
                <span>{(inv.subtotal ?? 0).toLocaleString()}</span>
              </div>
              {Number(inv.taxRate) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 11, color: '#4b5563', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: 600 }}>Tax ({inv.taxRate}%):</span>
                  <span>{(inv.tax ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dc2626', color: '#fff', padding: '11px 14px', marginTop: 5, borderRadius: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Total:</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{inv.currency} {(inv.total ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* DEAR CLIENT (notes) */}
          <div style={{ padding: '26px 30px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Dear Client,</div>
            <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.75, margin: 0 }}>{inv.dearClient}</p>
          </div>

          {/* TERMS + PAYMENT (bank only when not cash) */}
          <div style={{ display: 'flex', gap: 32, padding: '22px 30px 0' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Terms &amp; Conditions</div>
              <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.75, margin: 0 }}>{inv.terms}</p>
            </div>
            {showBankDetails && (
              <div style={{ minWidth: 210 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Payment Method</div>
                <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 2.1 }}>
                  {inv.payment?.accountName && <div><BankIcon /><span style={{ color: '#6b7280' }}>Account Name: </span><strong style={{ color: '#1f2937' }}>{inv.payment.accountName}</strong></div>}
                  {inv.payment?.accountNumber && <div><BankIcon /><span style={{ color: '#6b7280' }}>Account No: </span><strong style={{ color: '#1f2937' }}>{inv.payment.accountNumber}</strong></div>}
                  {inv.payment?.bankName && <div><BankIcon /><span style={{ color: '#6b7280' }}>Bank: </span><strong style={{ color: '#1f2937' }}>{inv.payment.bankName}</strong></div>}
                  {(inv.payment?.branch || inv.payment?.branchName) && <div><BankIcon /><span style={{ color: '#6b7280' }}>Branch: </span><strong style={{ color: '#1f2937' }}>{inv.payment.branch || inv.payment.branchName}</strong></div>}
                </div>
              </div>
            )}
          </div>

          {/* SIGNATURE: line + LogozoDev authorized + Authorized Signature */}
          <div style={{ padding: '28px 30px 0', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: 220 }}>
              <div style={{ borderTop: '1.5px solid #111827', marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', letterSpacing: 0.5 }}>LogozoDev authorized</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Authorized Signature</div>
            </div>
          </div>

          {/* FOOTER: black bar at bottom of A4 sheet */}
          <div style={{ marginTop: 28, position: 'relative', height: 54, background: '#111', width: '100%', minHeight: 54, display: 'flex', alignItems: 'center', paddingLeft: 30 }}>
            <div style={{ position: 'absolute', right: 0, top: 0, width: 0, height: 0, borderLeft: '54px solid transparent', borderTop: '54px solid #dc2626' }} />
          </div>
          </>
          )}
        </div>

        <div className="no-print" style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          {numItems} line item{numItems !== 1 ? 's' : ''} · {inv.currency}
        </div>
      </div>
    </>
  );
}
