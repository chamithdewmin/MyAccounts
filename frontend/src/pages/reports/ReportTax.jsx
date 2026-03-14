import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import MonthYearFilter, { filterDataByMonth, getMonthName } from "@/components/MonthYearFilter";

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
    orange: "#f97316",
  };
};

const Svg=({d,s=18,c="#fff",sw=2})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d={d}/></svg>;
const I={
  Receipt:      ()=><Svg d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM8 9h8M8 13h6"/>,
  FileText:     ()=><Svg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>,
  Scissors:     ()=><Svg d="M6 9a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100 6 3 3 0 000-6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>,
  CheckCircle:  ()=><Svg d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>,
  AlertTriangle:()=><Svg d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>,
  Target:       ()=><Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 18a6 6 0 110-12 6 6 0 010 12zM12 14a2 2 0 110-4 2 2 0 010 4z"/>,
  Download:     ()=><Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
  Clock:        ()=><Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 6v6l4 2"/>,
  PieChart:     ()=><Svg d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z"/>,
  Refresh:      ()=><Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
};


const Tip=({active,payload,label,C})=>{
  const c = C || getColors();
  if(!active||!payload?.length)return null;
  return <div style={{background:c.card,border:`1px solid ${c.border2}`,borderRadius:12,padding:"12px 16px",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
    <p style={{color:c.muted,fontSize:11,margin:"0 0 8px",fontWeight:600}}>{label}</p>
    {payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:p.color}}/><span style={{color:c.text2,fontSize:12}}>{p.name}:</span><span style={{color:c.text,fontWeight:700,fontSize:12}}>LKR {Number(p.value).toLocaleString()}</span>
    </div>)}
  </div>;
};
const Stat=({label,value,color,Icon,sub,subColor,C})=>{
  const c = C || getColors();
  return (
  <div style={{background:c.card,borderRadius:14,border:`1px solid ${c.border}`,padding:"20px 22px",position:"relative",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
    <div style={{position:"absolute",right:14,top:14,width:36,height:36,borderRadius:10,background:`${color||c.blue}18`,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.8}}><Icon/></div>
    <p style={{color:c.muted,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:0}}>{label}</p>
    <p style={{color:color||c.text,fontSize:22,fontWeight:900,margin:"8px 0 0",letterSpacing:"-0.02em",fontFamily:"monospace"}}>{value}</p>
    {sub&&<p style={{color:subColor||c.muted,fontSize:12,margin:"5px 0 0",fontWeight:600}}>{sub}</p>}
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color||c.blue}55,transparent)`}}/>
  </div>
);};
const Card=({title,subtitle,children,C})=>{
  const c = C || getColors();
  return (
  <div style={{background:c.card,borderRadius:16,border:`1px solid ${c.border}`,padding:"22px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
    <div style={{marginBottom:18}}><h3 style={{color:c.text,fontSize:15,fontWeight:800,margin:0}}>{title}</h3>{subtitle&&<p style={{color:c.muted,fontSize:12,margin:"4px 0 0"}}>{subtitle}</p>}</div>
    {children}
  </div>
);};
const StatusBadge=({paid,status})=>{
  const c = getColors();
  const s=paid?{bg:"rgba(34,197,94,0.15)",c:c.green}:{bg:"rgba(234,179,8,0.15)",c:c.yellow};
  return <span style={{background:s.bg,color:s.c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:s.c,display:"inline-block"}}/>{status}</span>;
};

export default function TaxReports(){
  const { incomes, expenses, settings, totals } = useFinance();
  const [activeQ,setActiveQ]=useState(null);
  const [reportPreview, setReportPreview] = useState({ open: false, html: "", filename: "" });
  const [colors, setColors] = useState(getColors);

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

  // Calculate quarterly data
  const quarterly = useMemo(() => {
    if (!settings.taxEnabled) return [];
    const currentYear = selectedYear;
    const quarters = [];
    for (let q = 1; q <= 4; q++) {
      const quarterStart = new Date(currentYear, (q - 1) * 3, 1);
      const quarterEnd = new Date(currentYear, q * 3, 0, 23, 59, 59, 999);
      let gross = 0;
      let totalExpenses = 0;
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        if (incomeDate >= quarterStart && incomeDate <= quarterEnd) {
          gross += income.amount || 0;
        }
      });
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= quarterStart && expenseDate <= quarterEnd) {
          totalExpenses += expense.amount || 0;
        }
      });
      const deductions = totalExpenses;
      const taxable = Math.max(0, gross - deductions);
      const taxOwed = taxable * ((settings.taxRate || 0) / 100);
      const isCurrentQ = q === Math.ceil((now.getMonth() + 1) / 3);
      quarters.push({
        quarter: `Q${q} ${currentYear}`,
        gross,
        taxable,
        deductions,
        taxOwed,
        status: isCurrentQ ? "Pending" : "Filed",
        paid: !isCurrentQ
      });
    }
    return quarters;
  }, [incomes, expenses, settings]);

  // Income split (for selected month)
  const incSplit = useMemo(() => {
    const totalIncome = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const taxable = Math.max(0, totalIncome - totalExp);
    const nonTaxable = 0;
    return [
      { name: "Taxable Income", value: taxable, color: C.red },
      { name: "Non-Taxable", value: nonTaxable, color: C.green },
      { name: "Deductions", value: totalExp, color: C.blue },
    ];
  }, [filteredIncomes, filteredExpenses]);

  // Income categories (for selected month)
  const categories = useMemo(() => {
    const catMap = {};
    const colors = [C.orange, C.yellow, C.blue, C.green, C.purple, C.cyan];
    filteredIncomes.forEach(income => {
      const cat = income.serviceType || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, taxable: true, value: 0, color: colors[Object.keys(catMap).length % colors.length] };
      }
      catMap[cat].value += income.amount || 0;
    });
    return Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filteredIncomes]);
  
  // Monthly totals
  const monthlyIncome = useMemo(() => filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0), [filteredIncomes]);
  const monthlyExpense = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);
  const monthlyTaxable = useMemo(() => Math.max(0, monthlyIncome - monthlyExpense), [monthlyIncome, monthlyExpense]);
  const monthlyTax = useMemo(() => monthlyTaxable * ((settings.taxRate || 0) / 100), [monthlyTaxable, settings.taxRate]);

  const totalGross = useMemo(() => quarterly.reduce((s, q) => s + q.gross, 0), [quarterly]);
  const totalTax = useMemo(() => quarterly.reduce((s, q) => s + q.taxOwed, 0), [quarterly]);
  const totalDed = useMemo(() => quarterly.reduce((s, q) => s + q.deductions, 0), [quarterly]);
  const paidTax = useMemo(() => quarterly.filter(q => q.paid).reduce((s, q) => s + q.taxOwed, 0), [quarterly]);
  const pendingTax = useMemo(() => totalTax - paidTax, [totalTax, paidTax]);
  const rate = useMemo(() => totalGross > 0 ? ((totalTax / totalGross) * 100).toFixed(1) : '0.0', [totalTax, totalGross]);

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    const monthName = getMonthName(selectedMonth);
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Tax Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${monthName} ${selectedYear}</p>`;
    
    // Monthly Summary
    body += `<h3 style="margin:20px 0 12px; font-size:14px;">Monthly Summary - ${monthName} ${selectedYear}</h3>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Gross Income</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${monthlyIncome.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Deductions</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${monthlyExpense.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Taxable Income</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${monthlyTaxable.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Estimated Tax (${settings.taxRate || 0}%)</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${monthlyTax.toLocaleString()}</td></tr></table>`;
    
    // Income details
    if (filteredIncomes.length > 0) {
      body += `<h3 style="margin:20px 0 12px; font-size:14px;">Income Details</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="border:1px solid #ddd; padding:8px;">Date</th><th style="border:1px solid #ddd; padding:8px;">Client</th><th style="border:1px solid #ddd; padding:8px;">Service</th><th style="border:1px solid #ddd; padding:8px; text-align:right;">Amount</th></tr>`;
      filteredIncomes.forEach((inc) => {
        body += `<tr><td style="border:1px solid #ddd; padding:8px;">${new Date(inc.date).toLocaleDateString()}</td><td style="border:1px solid #ddd; padding:8px;">${inc.clientName || '-'}</td><td style="border:1px solid #ddd; padding:8px;">${inc.serviceType || '-'}</td><td style="border:1px solid #ddd; padding:8px; text-align:right;">${cur} ${(inc.amount || 0).toLocaleString()}</td></tr>`;
      });
      body += `</table>`;
    }
    
    // Year Summary
    body += `<h3 style="margin:20px 0 12px; font-size:14px;">Year ${selectedYear} Quarterly Summary</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Quarter</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Gross</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Tax Owed</th><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Status</th></tr>`;
    quarterly.forEach((q) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${q.quarter}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${q.gross.toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${q.taxOwed.toLocaleString()}</td><td style="padding:8px 12px; border:1px solid #ddd;">${q.paid ? "Paid" : "Pending"}</td></tr>`;
    });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `tax-report-${monthName}-${selectedYear}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  return(
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{minHeight:"100vh",fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",color:C.text}}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px;}@keyframes fi{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}.qrow:hover td{background:rgba(255,255,255,0.018)!important;}`}</style>

      <div style={{padding:"24px 18px",display:"flex",flexDirection:"column",gap:18,animation:"fi .3s ease"}}>

        {/* FILTER */}
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

        {/* STATS - Monthly */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          <Stat label="Monthly Income" value={`LKR ${monthlyIncome.toLocaleString()}`} Icon={I.FileText}      color={C.text2} sub={`${getMonthName(selectedMonth)} ${selectedYear}`}/>
          <Stat label="Monthly Tax"     value={`LKR ${monthlyTax.toLocaleString()}`}   Icon={I.Receipt}       color={C.red}   sub={`${settings.taxRate || 0}% rate`}/>
          <Stat label="Monthly Deductions"   value={`LKR ${monthlyExpense.toLocaleString()}`}   Icon={I.Scissors}      color={C.green} sub="Tax savings" subColor={C.green}/>
          <Stat label="Taxable Income"   value={`LKR ${monthlyTaxable.toLocaleString()}`}    Icon={I.Target}   color={C.yellow}  sub="After deductions"/>
        </div>

        {/* QUARTERLY BAR + DONUT */}
        <div style={{display:"grid",gridTemplateColumns:"2.2fr 1fr",gap:16}}>
          <Card title="Quarterly Tax Breakdown" subtitle="Gross income, taxable income & tax owed">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={quarterly} barCategoryGap={30} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip content={<Tip/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
                <Legend wrapperStyle={{color:C.muted,fontSize:12,paddingTop:12}}/>
                <Bar dataKey="gross"   name="Gross Income"   radius={[5,5,0,0]} fill={C.blue}   opacity={.5}/>
                <Bar dataKey="taxable" name="Taxable Income" radius={[5,5,0,0]} fill={C.yellow}/>
                <Bar dataKey="taxOwed" name="Tax Owed"       radius={[5,5,0,0]} fill={C.red}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Income Split" subtitle="Taxable vs Non-Taxable vs Deductions">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart><Pie data={incSplit} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                {incSplit.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:10}}/></PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:8}}>
              {incSplit.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/><span style={{color:C.text2,fontSize:12}}>{e.name}</span></div>
                <span style={{color:C.text,fontSize:12,fontWeight:700}}>LKR {e.value.toLocaleString()}</span>
              </div>)}
            </div>
          </Card>
              </div>

        {/* CATEGORY TABLE */}
        <Card title="Income Category Analysis" subtitle="Tax liability per income source">
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border2}`}}>
              {["Category","Amount","Taxable","Tax Rate","Tax Liability","Status"].map(h=><th key={h} style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",padding:"10px 14px",textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {categories.map((cat,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.012)"}}>
                <td style={{padding:"13px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:cat.color}}/><span style={{color:C.text2,fontSize:13,fontWeight:600}}>{cat.name}</span></div></td>
                <td style={{color:C.text,fontSize:13,padding:"13px 14px"}}>LKR {cat.value.toLocaleString()}</td>
                <td style={{padding:"13px 14px"}}><span style={{color:cat.taxable?C.red:C.green,fontSize:12,fontWeight:700}}>{cat.taxable?"Yes":"No"}</span></td>
                <td style={{color:C.muted,fontSize:13,padding:"13px 14px"}}>20%</td>
                <td style={{color:cat.taxable?C.red:C.green,fontSize:13,fontWeight:700,padding:"13px 14px"}}>{cat.taxable?`LKR ${(cat.value*.2).toLocaleString()}`:"—"}</td>
                <td style={{padding:"13px 14px"}}>
                  <span style={{background:cat.taxable?"rgba(239,68,68,0.12)":"rgba(34,197,94,0.12)",color:cat.taxable?C.red:C.green,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:cat.taxable?C.red:C.green,display:"inline-block"}}/>{cat.taxable?"Taxable":"Exempt"}
                          </span>
                </td>
              </tr>)}
            </tbody>
          </table>
        </Card>

        {/* QUARTERLY SUMMARY TABLE */}
        <Card title="Quarterly Tax Summary" subtitle="Filing status and payment tracking — click row to highlight">
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border2}`}}>
              {["Quarter","Gross Income","Deductions","Taxable Income","Tax Rate","Tax Owed","Filing","Payment"].map(h=><th key={h} style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",padding:"10px 12px",textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {quarterly.map((q,i)=><tr key={i} className="qrow" onClick={()=>setActiveQ(activeQ===i?null:i)} style={{borderBottom:`1px solid ${C.border}`,background:activeQ===i?"rgba(59,130,246,0.05)":i%2===0?"transparent":"rgba(255,255,255,0.012)",cursor:"pointer",transition:"background .15s"}}>
                <td style={{color:C.text2,fontSize:13,padding:"13px 12px",fontWeight:700}}>{q.quarter}</td>
                <td style={{color:C.text,fontSize:13,padding:"13px 12px"}}>LKR {q.gross.toLocaleString()}</td>
                <td style={{color:C.green,fontSize:13,padding:"13px 12px"}}>LKR {q.deductions.toLocaleString()}</td>
                <td style={{color:C.yellow,fontSize:13,padding:"13px 12px"}}>LKR {q.taxable.toLocaleString()}</td>
                <td style={{color:C.muted,fontSize:13,padding:"13px 12px"}}>20%</td>
                <td style={{color:C.red,fontSize:13,padding:"13px 12px",fontWeight:800}}>LKR {q.taxOwed.toLocaleString()}</td>
                <td style={{padding:"13px 12px"}}><StatusBadge paid={q.paid} status={q.status}/></td>
                <td style={{padding:"13px 12px"}}>
                  <span style={{background:q.paid?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",color:q.paid?C.green:C.red,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}>
                    {q.paid?<I.CheckCircle/>:<I.Clock/>}<span style={{marginLeft:2}}>{q.paid?"Paid":"Pending"}</span>
                  </span>
                </td>
              </tr>)}
            </tbody>
            <tfoot><tr style={{borderTop:`2px solid ${C.border2}`,background:"rgba(255,255,255,0.02)"}}>
              <td style={{color:C.text,fontSize:13,padding:"14px 12px",fontWeight:800}}>TOTAL</td>
              <td style={{color:C.text,fontSize:13,padding:"14px 12px",fontWeight:800}}>LKR {totalGross.toLocaleString()}</td>
              <td style={{color:C.green,fontSize:13,padding:"14px 12px",fontWeight:800}}>LKR {totalDed.toLocaleString()}</td>
              <td colSpan={2}/>
              <td style={{color:C.red,fontSize:13,padding:"14px 12px",fontWeight:800}}>LKR {totalTax.toLocaleString()}</td>
              <td colSpan={2}/>
            </tr></tfoot>
          </table>
        </Card>
      </div>
      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open)=>setReportPreview(p=>({...p,open}))} html={reportPreview.html} filename={reportPreview.filename} reportTitle="Tax Report" />
    </div>
  );
}
