import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { downloadDocumentPdfFromElement } from '@/utils/pdfPrint';
import defaultLogo from '@/assets/Text black logo without background.png';

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

function fmtDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EstimateTemplate({ estimate, autoAction = null, onAutoActionDone }) {
  const { settings } = useFinance();
  const printAreaRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const currency = settings?.currency || 'LKR';
  const items = Array.isArray(estimate?.items) ? estimate.items : [];
  const themeColor = (settings?.invoiceThemeColor || '#F97316').toString();

  const downloadPdf = useCallback(async () => {
    if (downloading || !printAreaRef.current) return;
    setDownloading(true);
    try {
      const element = printAreaRef.current;
      const name = `Estimate-${(estimate?.estimateNumber || estimate?.id || 'draft').toString().replace('#', '')}.pdf`;
      await downloadDocumentPdfFromElement(element, name);
    } finally {
      setDownloading(false);
    }
  }, [downloading, estimate?.estimateNumber, estimate?.id]);

  const printDoc = useCallback(() => {
    window.print();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (autoAction === 'download') await downloadPdf();
      if (autoAction === 'print') printDoc();
      onAutoActionDone?.();
    };
    if (autoAction) run();
  }, [autoAction, downloadPdf, printDoc, onAutoActionDone]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .est-print-area, .est-print-area * { visibility: visible !important; }
          .est-print-area { position: fixed !important; left: 0; top: 0; width: 180mm !important; max-width: 180mm !important; min-height: 297mm !important; background: #fff !important; box-shadow: none !important; margin: 0 auto !important; }
          .est-no-print { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>
      <div style={{ background: '#d1d5db', minHeight: '100vh', padding: '24px 12px' }}>
        <div className="est-no-print" style={{ maxWidth: 680, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={downloadPdf} style={{ border: 'none', background: '#0a0a0a', color: '#fff', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <DownloadIcon /> {downloading ? 'Generating...' : 'Download PDF (A4)'}
          </button>
          <button onClick={printDoc} style={{ border: 'none', background: '#0a0a0a', color: '#fff', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <PrintIcon /> Print
          </button>
        </div>

        <div ref={printAreaRef} className="est-print-area" style={{ width: 680, margin: '0 auto', background: '#fff', boxShadow: '0 4px 40px rgba(0,0,0,0.16)', padding: '48px 40px', color: '#111', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <img src={settings?.logo || defaultLogo} alt="" style={{ width: 180, maxHeight: 64, objectFit: 'contain' }} />
              <div style={{ fontWeight: 700, marginTop: 8 }}>{settings?.businessName || 'My Business'}</div>
              {settings?.address && <div style={{ fontSize: 13 }}>{settings.address}</div>}
              {settings?.email && <div style={{ fontSize: 13 }}>{settings.email}</div>}
              {settings?.phone && <div style={{ fontSize: 13 }}>{settings.phone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 42, letterSpacing: 3, fontWeight: 700, color: themeColor }}>ESTIMATE</div>
              <div style={{ marginTop: 4 }}># {estimate?.estimateNumber || estimate?.id || 'Draft'}</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>Date: {fmtDate(estimate?.createdAt)}</div>
              <div style={{ marginTop: 2, fontSize: 13 }}>Valid Until: {fmtDate(estimate?.validUntil)}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Prepared For</div>
            <div style={{ fontWeight: 700 }}>{estimate?.clientName || 'Client'}</div>
            {estimate?.clientEmail && <div style={{ fontSize: 13 }}>{estimate.clientEmail}</div>}
            {estimate?.clientPhone && <div style={{ fontSize: 13 }}>{estimate.clientPhone}</div>}
            {estimate?.clientAddress && <div style={{ fontSize: 13 }}>{estimate.clientAddress}</div>}
          </div>

          {estimate?.projectTitle && <div style={{ marginBottom: 10, fontWeight: 600 }}>Project: {estimate.projectTitle}</div>}
          {estimate?.projectScope && <div style={{ marginBottom: 16, fontSize: 13, color: '#222' }}>{estimate.projectScope}</div>}

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 10, color: '#fff', background: themeColor, border: '1px solid #1e1e1e' }}>#</th>
                <th style={{ textAlign: 'left', padding: 10, color: '#fff', background: themeColor, border: '1px solid #1e1e1e' }}>Description</th>
                <th style={{ textAlign: 'right', padding: 10, color: '#fff', background: themeColor, border: '1px solid #1e1e1e' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: 10, color: '#fff', background: themeColor, border: '1px solid #1e1e1e' }}>Rate</th>
                <th style={{ textAlign: 'right', padding: 10, color: '#fff', background: themeColor, border: '1px solid #1e1e1e' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty = Number(item.quantity || item.qty || 1);
                const price = Number(item.price || 0);
                const amount = Number(item.total || (qty * price));
                return (
                  <tr key={`item-${idx}`}>
                    <td style={{ padding: 10, border: '1px solid #1e1e1e', background: '#fff', color: '#0a0a0a' }}>{idx + 1}</td>
                    <td style={{ padding: 10, border: '1px solid #1e1e1e', background: '#fff', color: '#0a0a0a' }}>{item.description || item.name || 'Item'}</td>
                    <td style={{ padding: 10, border: '1px solid #1e1e1e', background: '#fff', color: '#0a0a0a', textAlign: 'right' }}>{qty}</td>
                    <td style={{ padding: 10, border: '1px solid #1e1e1e', background: '#fff', color: '#0a0a0a', textAlign: 'right' }}>{price.toLocaleString()}</td>
                    <td style={{ padding: 10, border: '1px solid #1e1e1e', background: '#fff', color: '#0a0a0a', textAlign: 'right' }}>{amount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <div style={{ width: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>Subtotal</span><span>{currency} {(Number(estimate?.subtotal) || 0).toLocaleString()}</span>
              </div>
              {Number(estimate?.discountPercentage || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Discount ({Number(estimate.discountPercentage)}%)</span>
                  <span>- {currency} {((Number(estimate?.subtotal) || 0) * Number(estimate.discountPercentage) / 100).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>Tax</span><span>{currency} {(Number(estimate?.taxAmount) || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4, borderTop: `2px solid ${themeColor}`, fontWeight: 700, color: themeColor }}>
                <span>Total</span><span>{currency} {(Number(estimate?.total) || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {estimate?.assumptions && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Assumptions</div>
              <div style={{ fontSize: 13 }}>{estimate.assumptions}</div>
            </div>
          )}
          {estimate?.exclusions && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Exclusions</div>
              <div style={{ fontSize: 13 }}>{estimate.exclusions}</div>
            </div>
          )}
          {estimate?.notes && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13 }}>{estimate.notes}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
