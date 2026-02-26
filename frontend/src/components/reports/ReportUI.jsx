/**
 * biz-insight-hub style report UI — same layout and components across all report pages
 */
import React from "react";
import { C, buttonStyle } from "./reportTheme";
import { I } from "./reportIcons";

const globalStyles = (border2) => `
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${border2}; border-radius: 99px; }
  @keyframes fi { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .report-row:hover { background: #1a1d27 !important; }
  @media (max-width: 900px) { .report-two-col { grid-template-columns: 1fr !important; } }
`;

/** Chart tooltip — dark card with label + payload list */
export function ChartTooltip({ active, payload, label, currency = "LKR" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1d27", border: `1px solid ${C.border2}`, borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <p style={{ color: C.muted, fontSize: 11, margin: "0 0 8px", fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          <span style={{ color: C.text2, fontSize: 12 }}>{p.name}:</span>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 12 }}>{currency} {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/** KPI / Stat card — label, value, optional icon and subtitle */
export function Stat({ label, value, color, Icon, sub, subColor }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
      {Icon && (
        <div style={{ position: "absolute", right: 14, top: 14, width: 36, height: 36, borderRadius: 10, background: `${color || C.blue}18`, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.8 }}>
          <Icon />
        </div>
      )}
      <p style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>{label}</p>
      <p style={{ color: color || C.text, fontSize: 22, fontWeight: 900, margin: "8px 0 0", letterSpacing: "-0.02em", fontFamily: "monospace" }}>{value}</p>
      {sub && <p style={{ color: subColor || C.muted, fontSize: 12, margin: "5px 0 0", fontWeight: 600 }}>{sub}</p>}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color || C.blue}55,transparent)` }} />
    </div>
  );
}

/** Section card — title, optional subtitle, children */
export function Card({ title, subtitle, children, right }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "22px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h3 style={{ color: C.text, fontSize: 15, fontWeight: 800, margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ color: C.muted, fontSize: 12, margin: "4px 0 0" }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Legend list for pie/donut — items with color dot, name, value */
export function LegendList({ items, currency = "LKR" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
      {items.map((e, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color }} />
            <span style={{ color: C.text2, fontSize: 12 }}>{e.name}</span>
          </div>
          <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{currency} {e.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/** Report action buttons — Refresh, Export CSV, Download PDF */
export function ReportActionButtons({ onRefresh, onExportCsv, onDownloadPdf }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button type="button" onClick={onRefresh || (() => window.location.reload())} style={buttonStyle}>
        <I.Refresh /><span>Refresh</span>
      </button>
      <button type="button" onClick={onExportCsv || (() => {})} style={buttonStyle}>
        <I.Download /><span>Export CSV</span>
      </button>
      <button type="button" onClick={onDownloadPdf} style={buttonStyle}>
        <I.Download /><span>Download PDF</span>
      </button>
    </div>
  );
}

/** Full report page layout — biz-insight-hub style: header row (title + subtitle left, actions right) + children */
export function ReportPageLayout({ title, subtitle, onRefresh, onExportCsv, onDownloadPdf, children }) {
  return (
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{ minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>
      <style>{globalStyles(C.border2)}</style>
      <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: 24, animation: "fi .3s ease" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: "6px 0 0" }}>{subtitle}</p>
          </div>
          <ReportActionButtons onRefresh={onRefresh} onExportCsv={onExportCsv} onDownloadPdf={onDownloadPdf} />
        </div>
        {children}
      </div>
    </div>
  );
}

export { C, I };
export default ReportPageLayout;
