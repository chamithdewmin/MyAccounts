import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import { useToast } from "@/components/ui/use-toast";
import MonthYearFilter, { filterDataByMonth, getMonthName } from "@/components/MonthYearFilter";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

// ── THEME-AWARE COLORS ────────────────────────────────────────────────────────
const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    bg: isDark ? "#000000" : "#f8fafc",
    bg2: isDark ? "#000000" : "#f8fafc",
    card: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#171717" : "#e2e8f0",
    border2: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    text2: isDark ? "#d1d9e6" : "#334155",
    muted: isDark ? "#8b9ab0" : "#64748b",
    faint: isDark ? "#4a5568" : "#94a3b8",
    green: "#22c55e",
    red: "#ef4444",
    blue: "#0e5cff",
    cyan: "#22d3ee",
    yellow: "#eab308",
    purple: "#a78bfa",
  };
};

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
const Tip = ({active,payload,label,C})=>{
  const c = C || getColors();
  if(!active||!payload?.length)return null;
  return <div style={{background:c.card,border:`1px solid ${c.border2}`,borderRadius:12,padding:"12px 16px",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
    <p style={{color:c.muted,fontSize:11,margin:"0 0 8px",fontWeight:600}}>{label}</p>
    {payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:p.color}}/><span style={{color:c.text2,fontSize:12}}>{p.name}:</span><span style={{color:c.text,fontWeight:700,fontSize:12}}>LKR {Number(p.value).toLocaleString()}</span>
    </div>)}
  </div>;
};
const Stat = ({label,value,color,Icon,sub,subColor,C})=>{
  const c = C || getColors();
  return (
  <div style={{background:c.card,borderRadius:14,border:`1px solid ${c.border}`,padding:"16px 18px",position:"relative",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.1)",minWidth:0}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:6}}>
      <p style={{color:c.muted,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",margin:0,flex:1,minWidth:0,lineHeight:1.35}}>{label}</p>
      <div style={{width:40,height:40,borderRadius:10,background:`${color||c.blue}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:0.92}} aria-hidden>
        <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:22,height:22,lineHeight:0}}><Icon/></span>
      </div>
    </div>
    <p style={{color:color||c.text,fontSize:22,fontWeight:900,margin:0,letterSpacing:"-0.02em",lineHeight:1.2,fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",fontVariantNumeric:"tabular-nums",wordBreak:"break-word"}}>{value}</p>
    {sub&&<p style={{color:subColor||c.muted,fontSize:12,margin:"6px 0 0",fontWeight:600,lineHeight:1.35}}>{sub}</p>}
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color||c.blue}55,transparent)`}}/>
  </div>
);};
const Card = ({title,subtitle,children,right,C})=>{
  const c = C || getColors();
  return (
  <div style={{background:c.card,borderRadius:16,border:`1px solid ${c.border}`,padding:"22px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
      <div><h3 style={{color:c.text,fontSize:15,fontWeight:800,margin:0}}>{title}</h3>{subtitle&&<p style={{color:c.muted,fontSize:12,margin:"4px 0 0"}}>{subtitle}</p>}</div>
      {right}
    </div>
    {children}
  </div>
);};
const Legend2 = ({items,C})=>{
  const c = C || getColors();
  return (
  <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:10}}>
    {items.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/><span style={{color:c.text2,fontSize:12}}>{e.name}</span></div>
      <span style={{color:c.text,fontSize:12,fontWeight:700}}>LKR {e.value.toLocaleString()}</span>
    </div>)}
  </div>
);};

export default function ProfitLoss(){
  const { incomes, expenses, totals, settings } = useFinance();
  const { toast } = useToast();
  const [reportPreview, setReportPreview] = useState({ open: false, html: "", filename: "" });
  const [colors, setColors] = useState(getColors);
  const isMobileLayout = useIsMobileLayout();
  
  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);

  const C = colors;
  
  // Month/Year filter state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Filter data by selected month/year
  const filteredIncomes = useMemo(() => filterDataByMonth(incomes, selectedMonth, selectedYear), [incomes, selectedMonth, selectedYear]);
  const filteredExpenses = useMemo(() => filterDataByMonth(expenses, selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear]);

  // Calculate monthly data (last 7 months for chart)
  const monthly = useMemo(() => {
    const months = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - i, 1);
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
      months.push({ month: monthLabel, fullDate: date, income: monthIncome, expenses: monthExpense, profit: monthIncome - monthExpense });
    }
    return months;
  }, [incomes, expenses, selectedMonth, selectedYear]);

  // Expense categories (filtered)
  const expCats = useMemo(() => {
    const catMap = {};
    const colors = [C.blue, C.purple, C.cyan, C.yellow, C.orange, C.red];
    filteredExpenses.forEach(expense => {
      const cat = expense.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, value: 0, color: colors[Object.keys(catMap).length % colors.length] };
      }
      catMap[cat].value += expense.amount || 0;
    });
    return Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filteredExpenses]);

  // Income sources (filtered)
  const incSrc = useMemo(() => {
    const sourceMap = {};
    const colors = [C.green, C.blue, C.cyan, C.purple, C.orange, C.yellow];
    filteredIncomes.forEach(income => {
      const source = income.serviceType || 'Other';
      if (!sourceMap[source]) {
        sourceMap[source] = { name: source, value: 0, color: colors[Object.keys(sourceMap).length % colors.length] };
      }
      sourceMap[source].value += income.amount || 0;
    });
    return Object.values(sourceMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filteredIncomes]);

  // Use filtered data for totals
  const totalIncome = useMemo(() => filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0), [filteredIncomes]);
  const totalExp = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);
  const netProfit = useMemo(() => totalIncome - totalExp, [totalIncome, totalExp]);
  const margin = useMemo(() => totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0', [netProfit, totalIncome]);
  const best = useMemo(() => monthly.reduce((a, b) => a.profit > b.profit ? a : b, monthly[0] || { month: 'N/A', income: 0, profit: 0 }), [monthly]);

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    const monthName = getMonthName(selectedMonth);
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Profit &amp; Loss Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${monthName} ${selectedYear} · Monthly Report</p>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Revenue</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalIncome.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Expenses</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalExp.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Net Profit</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${netProfit.toLocaleString()} (${margin}% margin)</td></tr></table>`;
    
    // Income details
    if (filteredIncomes.length > 0) {
      body += `<h3 style="margin:20px 0 12px; font-size:14px;">Income Details</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Date</th><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Client</th><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Service</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Amount</th></tr>`;
      filteredIncomes.forEach((inc) => {
        body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${new Date(inc.date).toLocaleDateString()}</td><td style="padding:8px 12px; border:1px solid #ddd;">${inc.clientName || '-'}</td><td style="padding:8px 12px; border:1px solid #ddd;">${inc.serviceType || '-'}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${(inc.amount || 0).toLocaleString()}</td></tr>`;
      });
      body += `</table>`;
    }
    
    // Expense details
    if (filteredExpenses.length > 0) {
      body += `<h3 style="margin:20px 0 12px; font-size:14px;">Expense Details</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Date</th><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Category</th><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Description</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Amount</th></tr>`;
      filteredExpenses.forEach((exp) => {
        body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${new Date(exp.date).toLocaleDateString()}</td><td style="padding:8px 12px; border:1px solid #ddd;">${exp.category || '-'}</td><td style="padding:8px 12px; border:1px solid #ddd;">${exp.description || '-'}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${(exp.amount || 0).toLocaleString()}</td></tr>`;
      });
      body += `</table>`;
    }
    
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `profit-loss-report-${monthName}-${selectedYear}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  return(
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{minHeight:"100vh",fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",color:C.text}}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px;}@keyframes fi{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}.row:hover{background:${C.card}!important;}`}</style>
      <div style={{padding: isMobileLayout ? "20px 14px" : "24px 18px",display:"flex",flexDirection:"column",gap: 18,animation:"fi .3s ease"}}>

        {/* FILTER & TOOLBAR */}
        <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 20px"}}>
          <MonthYearFilter
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onDownload={openReportPreview}
            autoDownload={true}
          />
        </div>

        {/* STATS */}
        <div style={{display:"grid",gridTemplateColumns: isMobileLayout ? "repeat(2, minmax(0,1fr))" : "repeat(4,1fr)",gap:14}}>
          <Stat label="Total Revenue"  value={`LKR ${totalIncome.toLocaleString()}`}         color={C.green}  Icon={I.Revenue}  sub={`${getMonthName(selectedMonth)} ${selectedYear}`} subColor={C.green}/>
          <Stat label="Total Expenses" value={`LKR ${totalExp.toLocaleString()}`}            color={C.red}    Icon={I.Expense}  sub={`${getMonthName(selectedMonth)} ${selectedYear}`}/>
          <Stat label="Net Profit"     value={`LKR ${netProfit.toLocaleString()}`}           color={netProfit>=0?C.green:C.red} Icon={I.Profit} sub={`${margin}% profit margin`} subColor={C.cyan}/>
          <Stat label="Best Month"     value={`LKR ${best.income.toLocaleString()}`}         color={C.yellow} Icon={I.Award}    sub={`${best.month} — LKR ${best.profit.toLocaleString()} profit`}/>
        </div>

        {/* MAIN CHART + DONUT */}
        <div style={{display:"grid",gridTemplateColumns: isMobileLayout ? "1fr" : "2.2fr 1fr",gap:16}}>
          <Card title="Income vs Expenses vs Net Profit" subtitle="Monthly breakdown — LKR">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} barCategoryGap={24} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip content={<Tip/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
                <Legend wrapperStyle={{color:C.muted,fontSize:12,paddingTop:12}}/>
                <Bar dataKey="income"   name="Income"   radius={[5,5,0,0]} fill={C.green}/>
                <Bar dataKey="expenses" name="Expenses" radius={[5,5,0,0]} fill={C.red}/>
                <Bar dataKey="profit"   name="Profit"   radius={[5,5,0,0]} fill={C.blue}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Expense Breakdown" subtitle="By category">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={expCats} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" strokeWidth={0}>
                {expCats.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:10}}/></PieChart>
            </ResponsiveContainer>
            <Legend2 items={expCats}/>
          </Card>
        </div>

        {/* TREND + INCOME SOURCES */}
        <div style={{display:"grid",gridTemplateColumns: isMobileLayout ? "1fr" : "1.5fr 1fr",gap:16}}>
          <Card title="Net Profit Trend" subtitle="Running profit across months">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip content={<Tip/>}/>
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke={C.green} strokeWidth={2.5} dot={{fill:C.green,r:4,strokeWidth:0}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Income Sources" subtitle="Revenue by service type">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={incSrc} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" strokeWidth={0}>
                {incSrc.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:10}}/></PieChart>
            </ResponsiveContainer>
            <Legend2 items={incSrc}/>
          </Card>
        </div>

        {/* TABLE */}
        <Card title="Monthly P&L Summary" subtitle="Detailed breakdown per month">
          <div className="report-table-scroll">
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border2}`}}>
              {["Month","Income","Expenses","Gross Profit","Margin","vs Prev Month"].map(h=><th key={h} style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",padding:"10px 14px",textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {monthly.map((m,i)=>{
                const prev=monthly[i-1];const diff=prev?m.profit-prev.profit:null;const mg=((m.profit/m.income)*100).toFixed(1);
                return <tr key={i} className="row" style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.012)",transition:"background .15s"}}>
                  <td style={{color:C.text2,fontSize:13,padding:"13px 14px",fontWeight:600}}>{m.month} {m.fullDate?.getFullYear() || selectedYear}</td>
                  <td style={{color:C.green,fontSize:13,padding:"13px 14px",fontWeight:600}}>LKR {m.income.toLocaleString()}</td>
                  <td style={{color:C.red,fontSize:13,padding:"13px 14px"}}>LKR {m.expenses.toLocaleString()}</td>
                  <td style={{color:m.profit>=0?C.green:C.red,fontSize:13,padding:"13px 14px",fontWeight:700}}>LKR {m.profit.toLocaleString()}</td>
                  <td style={{padding:"13px 14px"}}><span style={{background:parseFloat(mg)>30?"rgba(34,197,94,0.15)":parseFloat(mg)>10?"rgba(234,179,8,0.15)":"rgba(239,68,68,0.15)",color:parseFloat(mg)>30?C.green:parseFloat(mg)>10?C.yellow:C.red,borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:700}}>{mg}%</span></td>
                  <td style={{padding:"13px 14px"}}>
                    {diff!==null?<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:diff>=0?C.green:C.red}}>{diff>=0?<I.ArrowUp/>:<I.ArrowDown/>}</span><span style={{color:diff>=0?C.green:C.red,fontSize:12,fontWeight:700}}>LKR {Math.abs(diff).toLocaleString()}</span></div>:<span style={{color:C.faint}}>—</span>}
                  </td>
                </tr>;
              })}
            </tbody>
            <tfoot><tr style={{borderTop:`2px solid ${C.border2}`,background:"rgba(255,255,255,0.02)"}}>
              <td style={{color:C.text,fontSize:13,padding:"14px 14px",fontWeight:800}}>TOTAL</td>
              <td style={{color:C.green,fontSize:13,padding:"14px 14px",fontWeight:800}}>LKR {totalIncome.toLocaleString()}</td>
              <td style={{color:C.red,fontSize:13,padding:"14px 14px",fontWeight:800}}>LKR {totalExp.toLocaleString()}</td>
              <td style={{color:netProfit>=0?C.green:C.red,fontSize:13,padding:"14px 14px",fontWeight:800}}>LKR {netProfit.toLocaleString()}</td>
              <td style={{padding:"14px 14px"}}><span style={{color:C.cyan,fontSize:13,fontWeight:800}}>{margin}%</span></td>
              <td/>
            </tr></tfoot>
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
