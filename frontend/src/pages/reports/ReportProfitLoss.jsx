import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import { useToast } from "@/components/ui/use-toast";

// ── COLORS ────────────────────────────────────────────────────────────────────
const C = { bg:"#0c0e14",bg2:"#0f1117",card:"#13161e",border:"#1e2433",border2:"#2a3347",text:"#fff",text2:"#d1d9e6",muted:"#8b9ab0",faint:"#4a5568",green:"#22c55e",red:"#ef4444",blue:"#3b82f6",cyan:"#22d3ee",yellow:"#eab308",purple:"#a78bfa" };

// ── SVG ICONS ─────────────────────────────────────────────────────────────────
const Svg = ({ d, s=18, c="#fff", sw=2 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d={d}/></svg>;
const I = {
  Revenue:    ()=><Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>,
  Expense:    ()=><Svg d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6"/>,
  Profit:     ()=><Svg d="M18 20V10M12 20V4M6 20v-6"/>,
  Award:      ()=><Svg d="M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>,
  Download:   ()=><Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
  ArrowUp:    ()=><Svg d="M12 19V5M5 12l7-7 7 7"/>,
  ArrowDown:  ()=><Svg d="M12 5v14M19 12l-7 7-7-7"/>,
  Calendar:   ()=><Svg d="M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18"/>,
  Refresh:    ()=><Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
};

// ── DATA ──────────────────────────────────────────────────────────────────────

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
const Tip = ({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return <div style={{background:"#1a1d27",border:`1px solid ${C.border2}`,borderRadius:12,padding:"12px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
    <p style={{color:C.muted,fontSize:11,margin:"0 0 8px",fontWeight:600}}>{label}</p>
    {payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:p.color}}/><span style={{color:C.text2,fontSize:12}}>{p.name}:</span><span style={{color:C.text,fontWeight:700,fontSize:12}}>LKR {Number(p.value).toLocaleString()}</span>
    </div>)}
  </div>;
};
const Stat = ({label,value,color,Icon,sub,subColor})=>(
  <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"20px 22px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",right:14,top:14,width:36,height:36,borderRadius:10,background:`${color||C.blue}18`,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.8}}><Icon/></div>
    <p style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:0}}>{label}</p>
    <p style={{color:color||C.text,fontSize:22,fontWeight:900,margin:"8px 0 0",letterSpacing:"-0.02em",fontFamily:"monospace"}}>{value}</p>
    {sub&&<p style={{color:subColor||C.muted,fontSize:12,margin:"5px 0 0",fontWeight:600}}>{sub}</p>}
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color||C.blue}55,transparent)`}}/>
  </div>
);
const Card = ({title,subtitle,children,right})=>(
  <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"22px 24px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
      <div><h3 style={{color:C.text,fontSize:15,fontWeight:800,margin:0}}>{title}</h3>{subtitle&&<p style={{color:C.muted,fontSize:12,margin:"4px 0 0"}}>{subtitle}</p>}</div>
      {right}
    </div>
    {children}
  </div>
);
const Legend2 = ({items})=>(
  <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:10}}>
    {items.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/><span style={{color:C.text2,fontSize:12}}>{e.name}</span></div>
      <span style={{color:C.text,fontSize:12,fontWeight:700}}>LKR {e.value.toLocaleString()}</span>
    </div>)}
  </div>
);

export default function ProfitLoss(){
  const { incomes, expenses, totals, settings } = useFinance();
  const { toast } = useToast();
  const [period,setPeriod]=useState("7M");
  const [reportPreview, setReportPreview] = useState({ open: false, html: "", filename: "" });

  // Calculate monthly data (last 7 months)
  const monthly = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      let monthIncome = 0;
      let monthExpense = 0;
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        if (incomeDate.getFullYear() === date.getFullYear() && incomeDate.getMonth() === date.getMonth()) {
          monthIncome += income.amount || 0;
        }
      });
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getFullYear() === date.getFullYear() && expenseDate.getMonth() === date.getMonth()) {
          monthExpense += expense.amount || 0;
        }
      });
      months.push({ month: monthLabel, income: monthIncome, expenses: monthExpense, profit: monthIncome - monthExpense });
    }
    return months;
  }, [incomes, expenses]);

  // Expense categories
  const expCats = useMemo(() => {
    const catMap = {};
    const colors = [C.blue, C.purple, C.cyan, C.yellow, C.orange, C.red];
    expenses.forEach(expense => {
      const cat = expense.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, value: 0, color: colors[Object.keys(catMap).length % colors.length] };
      }
      catMap[cat].value += expense.amount || 0;
    });
    return Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [expenses]);

  // Income sources
  const incSrc = useMemo(() => {
    const sourceMap = {};
    const colors = [C.green, C.blue, C.cyan, C.purple, C.orange, C.yellow];
    incomes.forEach(income => {
      const source = income.serviceType || 'Other';
      if (!sourceMap[source]) {
        sourceMap[source] = { name: source, value: 0, color: colors[Object.keys(sourceMap).length % colors.length] };
      }
      sourceMap[source].value += income.amount || 0;
    });
    return Object.values(sourceMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [incomes]);

  const totalIncome = useMemo(() => monthly.reduce((s, m) => s + m.income, 0), [monthly]);
  const totalExp = useMemo(() => monthly.reduce((s, m) => s + m.expenses, 0), [monthly]);
  const netProfit = useMemo(() => totalIncome - totalExp, [totalIncome, totalExp]);
  const margin = useMemo(() => totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0', [netProfit, totalIncome]);
  const best = useMemo(() => monthly.reduce((a, b) => a.profit > b.profit ? a : b, monthly[0] || { month: 'N/A', income: 0, profit: 0 }), [monthly]);

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Profit &amp; Loss Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · 7-month period</p>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Revenue</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalIncome.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Expenses</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalExp.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Net Profit</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${netProfit.toLocaleString()} (${margin}% margin)</td></tr></table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Monthly Summary</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Month</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Income</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Expenses</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Profit</th></tr>`;
    monthly.forEach((m) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${m.month}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${m.income.toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${m.expenses.toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${m.profit.toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `profit-loss-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  const cur = settings?.currency || "LKR";

  return (
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{ minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px;}@keyframes fi{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}.row:hover{background:#1a1d27!important;}@media(max-width:900px){.report-two-col{grid-template-columns:1fr!important;}}`}</style>
      <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: 24, animation: "fi .3s ease" }}>

        {/* PAGE HEADER — same as reference: Profit & Loss + subtitle */}
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Profit & Loss</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: "6px 0 0" }}>Income statement analysis — FY 2024</p>
        </div>

        {/* TOOLBAR — keep existing three buttons; Download PDF opens existing popup */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" onClick={() => window.location.reload()} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1c1e24", border: "1px solid #303338", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><I.Refresh /><span>Refresh</span></button>
            <button type="button" onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1c1e24", border: "1px solid #303338", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><I.Download /><span>Export CSV</span></button>
            <button type="button" onClick={openReportPreview} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1c1e24", border: "1px solid #303338", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}><I.Download /><span>Download PDF</span></button>
          </div>
        </div>

        {/* STATS — reference-style: Total Revenue, Cost of Goods (Expenses), Gross Profit (Net Profit), Net Margin */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Stat label="Total Revenue" value={`${cur} ${totalIncome.toLocaleString()}`} color={C.green} Icon={I.Revenue} sub="vs last period" subColor={C.muted} />
          <Stat label="Cost of Goods" value={`${cur} ${totalExp.toLocaleString()}`} color={C.red} Icon={I.Expense} sub="vs last period" subColor={C.muted} />
          <Stat label="Gross Profit" value={`${cur} ${netProfit.toLocaleString()}`} color={netProfit >= 0 ? C.green : C.red} Icon={I.Profit} sub="vs last period" subColor={C.muted} />
          <Stat label="Net Margin" value={`${margin}%`} color={C.cyan} Icon={I.Award} sub="vs last period" subColor={C.muted} />
        </div>

        {/* Monthly Net Income — reference section title + chart */}
        <Card title="Monthly Net Income" subtitle="Profit trend over the year">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `${v / 1000}K`} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="profit" name="Net Income" stroke={C.green} strokeWidth={2.5} dot={{ fill: C.green, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Two columns: Revenue Breakdown + Operating Expenses (reference layout) */}
        <div className="report-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 20 }}>
          <Card title="Revenue Breakdown" subtitle="Revenue, COGS, and Operating Expenses">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} barCategoryGap={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `${v / 1000}K`} />
                <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="income" name="Revenue" radius={[5, 5, 0, 0]} fill={C.green} />
                <Bar dataKey="expenses" name="Expenses" radius={[5, 5, 0, 0]} fill={C.red} />
                <Bar dataKey="profit" name="Net Profit" radius={[5, 5, 0, 0]} fill={C.blue} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Operating Expenses" subtitle="Breakdown by category">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expCats} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" strokeWidth={0}>
                  {expCats.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => `${cur} ${Number(v).toLocaleString()}`} contentStyle={{ background: "#1a1d27", border: `1px solid ${C.border2}`, borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <Legend2 items={expCats} />
          </Card>
        </div>

        {/* Income Statement Summary — reference table: Line Item | FY 2024 | FY 2023 | Change */}
        <Card title="Income Statement Summary" subtitle="Key line items for the period">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border2}` }}>
                  <th style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "12px 14px", textAlign: "left" }}>Line Item</th>
                  <th style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "12px 14px", textAlign: "right" }}>Current</th>
                  <th style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "12px 14px", textAlign: "right" }}>Previous</th>
                  <th style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "12px 14px", textAlign: "right" }}>Change</th>
                </tr>
              </thead>
              <tbody>
                <tr className="row" style={{ borderBottom: `1px solid ${C.border}`, background: "transparent" }}>
                  <td style={{ color: C.text2, fontSize: 13, padding: "12px 14px", fontWeight: 600 }}>Revenue</td>
                  <td style={{ color: C.green, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>{cur} {totalIncome.toLocaleString()}</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>—</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right" }}>—</td>
                </tr>
                <tr className="row" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ color: C.text2, fontSize: 13, padding: "12px 14px" }}>Cost of Goods Sold</td>
                  <td style={{ color: C.red, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>({cur} {totalExp.toLocaleString()})</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>—</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right" }}>—</td>
                </tr>
                <tr className="row" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ color: C.text2, fontSize: 13, padding: "12px 14px", fontWeight: 600 }}>Gross Profit</td>
                  <td style={{ color: netProfit >= 0 ? C.green : C.red, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>{cur} {netProfit.toLocaleString()}</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>—</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right" }}>—</td>
                </tr>
                <tr className="row" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ color: C.text2, fontSize: 13, padding: "12px 14px", fontWeight: 700 }}>Net Income</td>
                  <td style={{ color: netProfit >= 0 ? C.green : C.red, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{cur} {netProfit.toLocaleString()}</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>—</td>
                  <td style={{ color: C.muted, fontSize: 13, padding: "12px 14px", textAlign: "right" }}>{margin}% margin</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ReportPreviewModal
        open={reportPreview.open}
        onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))}
        html={reportPreview.html}
        filename={reportPreview.filename}
        reportTitle="Profit & Loss Report"
      />
    </div>
  );
}
