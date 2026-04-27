import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import MonthYearFilter, { filterDataByMonth, getMonthName } from "@/components/MonthYearFilter";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

// ── THEME-AWARE COLORS ────────────────────────────────────────────────────────
const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    bg: isDark ? "#000000" : "#f8fafc",
    bg2: isDark ? "#000000" : "#f8fafc",
    card: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#1e1e1e" : "#e1e1e1",
    border2: isDark ? "#1e1e1e" : "#e1e1e1",
    text: isDark ? "#fff" : "#0f172a",
    text2: isDark ? "#d1d9e6" : "#334155",
    muted: isDark ? "#8b9ab0" : "#64748b",
    faint: isDark ? "#4a5568" : "#94a3b8",
    green: "#22c55e",
    red: "#ef4444",
    blue: "#0e5cff",
    cyan: "#22d3ee",
    yellow: "#eab308",
  };
};

const Svg=({d,s=18,c="#fff",sw=2})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d={d}/></svg>;
const I={
  ArrowUp:     ()=><Svg d="M12 19V5M5 12l7-7 7 7"/>,
  ArrowDown:   ()=><Svg d="M12 5v14M19 12l-7 7-7-7"/>,
  Activity:    ()=><Svg d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  Wallet:      ()=><Svg d="M21 12V7H5a2 2 0 010-4h14v4M21 12a2 2 0 010 4H5a2 2 0 000 4h16v-4"/>,
  BarChart:    ()=><Svg d="M18 20V10M12 20V4M6 20v-6"/>,
  PlusCircle:  ()=><Svg d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 8v8M8 12h8"/>,
  MinusCircle: ()=><Svg d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM8 12h8"/>,
  Download:    ()=><Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
  Search:      ()=><Svg d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"/>,
  Filter:      ()=><Svg d="M22 3H2l8 9.46V19l4 2v-8.54L22 3"/>,
  Trash:       ()=><Svg d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>,
  X:           ()=><Svg d="M18 6L6 18M6 6l12 12"/>,
  ChevronDown: ()=><Svg d="M6 9l6 6 6-6"/>,
  Refresh:    ()=><Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
};

const sMap={Received:{bg:"rgba(34,197,94,0.15)",c:"#22c55e"},Paid:{bg:"rgba(59,130,246,0.15)",c:"#0e5cff"},Overdue:{bg:"rgba(239,68,68,0.15)",c:"#ef4444"},Pending:{bg:"rgba(234,179,8,0.15)",c:"#eab308"}};

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
const Stat=({label,value,color,Icon,sub,C})=>{
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
    {sub&&<p style={{color:c.muted,fontSize:12,margin:"6px 0 0",fontWeight:600,lineHeight:1.35}}>{sub}</p>}
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color||c.blue}55,transparent)`}}/>
  </div>
);};
const Card=({title,subtitle,children,right,C,isMobile})=>{
  const c = C || getColors();
  const mobile = Boolean(isMobile);
  return (
  <div style={{background:c.card,borderRadius:16,border:`1px solid ${c.border}`,padding: mobile ? "16px 14px" : "22px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.1)",minWidth:0}}>
    <div style={{
      display:"flex",
      flexDirection: mobile ? "column" : "row",
      justifyContent:"space-between",
      alignItems: mobile ? "stretch" : "flex-start",
      gap: mobile ? 12 : 0,
      marginBottom:18,
    }}>
      <div style={{ minWidth: 0 }}>
        <h3 style={{color:c.text,fontSize: mobile ? 14 : 15,fontWeight:800,margin:0,lineHeight:1.3}}>{title}</h3>
        {subtitle&&<p style={{color:c.muted,fontSize:12,margin:"6px 0 0",lineHeight:1.45}}>{subtitle}</p>}
      </div>
      {right ? <div style={{ width: mobile ? "100%" : "auto", minWidth: 0 }}>{right}</div> : null}
    </div>{children}
  </div>
);};

export default function CashFlowReport(){
  const { incomes, expenses, invoices, totals, loadData, settings } = useFinance();
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("all");
  const [fStatus,setFStatus]=useState("all");
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({source:"",category:"",amount:"",status:"Received"});
  const [delId,setDelId]=useState(null);
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

  // Calculate cash flow data (last 14 days)
  const cfData = useMemo(() => {
    const now = new Date();
    const data = [];
    let runningBalance = totals.cashInHand || 0;
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      let inflow = 0;
      let outflow = 0;
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        if (incomeDate >= date && incomeDate <= dateEnd) inflow += income.amount || 0;
      });
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= date && expenseDate <= dateEnd) outflow += expense.amount || 0;
      });
      runningBalance = runningBalance - outflow + inflow;
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inflow,
        outflow,
        balance: runningBalance
      });
    }
    return data;
  }, [incomes, expenses, totals.cashInHand]);

  // Build transactions list from filtered database
  const tx = useMemo(() => {
    const allTx = [];
    filteredIncomes.forEach(income => {
      const date = new Date(income.date);
      allTx.push({
        id: income.id,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        source: income.clientName || 'Unknown',
        category: income.serviceType || 'Income',
        amount: income.amount || 0,
        type: 'in',
        status: 'Received',
        sortDate: date
      });
    });
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      allTx.push({
        id: expense.id,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        source: expense.category || 'Expense',
        category: expense.category || 'Expense',
        amount: -(expense.amount || 0),
        type: 'out',
        status: 'Paid',
        sortDate: date
      });
    });
    // Filter invoices by month/year
    invoices.filter(inv => {
      const invDate = new Date(inv.dueDate || inv.createdAt);
      return invDate.getMonth() === selectedMonth && invDate.getFullYear() === selectedYear && inv.status !== 'paid';
    }).forEach(invoice => {
      const date = new Date(invoice.dueDate || invoice.createdAt);
      allTx.push({
        id: invoice.id || invoice.invoiceNumber,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        source: invoice.clientName || 'Unknown',
        category: 'Invoice',
        amount: -(invoice.total || 0),
        type: 'out',
        status: 'Overdue',
        sortDate: date
      });
    });
    return allTx.sort((a, b) => b.sortDate - a.sortDate);
  }, [filteredIncomes, filteredExpenses, invoices, selectedMonth, selectedYear]);

  const totalIn = useMemo(() => tx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0), [tx]);
  const totalOut = useMemo(() => Math.abs(tx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0)), [tx]);
  const net = useMemo(() => totalIn - totalOut, [totalIn, totalOut]);

  const filtered=useMemo(()=>{
    let l=[...tx];
    if(search)l=l.filter(t=>[t.source,t.category].join(" ").toLowerCase().includes(search.toLowerCase()));
    if(fType!=="all")l=l.filter(t=>t.type===fType);
    if(fStatus!=="all")l=l.filter(t=>t.status===fStatus);
    return l;
  },[tx,search,fType,fStatus]);

  const handleDel=(id)=>{
    setDelId(id);
    setTimeout(()=>{
      loadData();
      setDelId(null);
    },350);
  };
  const handleAdd=()=>{
    if(!form.source||!form.amount)return;
    loadData();
    setForm({source:"",category:"",amount:"",status:"Received"});
    setModal(null);
  };

  const selSty={background:C.card,border:`1px solid ${C.border2}`,borderRadius:9,padding:"8px 12px",color:C.text2,fontSize:13,outline:"none",cursor:"pointer"};

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    const monthName = getMonthName(selectedMonth);
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #e1e1e1; padding-bottom:8px;">Cash Flow Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${monthName} ${selectedYear}</p>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #e1e1e1;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #e1e1e1;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #e1e1e1;">Total Money In</td><td style="text-align:right; padding:10px 12px; border:1px solid #e1e1e1;">${cur} ${totalIn.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #e1e1e1;">Total Money Out</td><td style="text-align:right; padding:10px 12px; border:1px solid #e1e1e1;">${cur} ${totalOut.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #e1e1e1;">Net Cash Flow</td><td style="text-align:right; padding:10px 12px; border:1px solid #e1e1e1;">${cur} ${net.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #e1e1e1;">Current Balance</td><td style="text-align:right; padding:10px 12px; border:1px solid #e1e1e1;">${cur} ${(totals.cashInHand || 0).toLocaleString()}</td></tr></table>`;
    
    // Income details
    if (filteredIncomes.length > 0) {
      body += `<h3 style="margin:20px 0 12px; font-size:14px;">Money In - ${monthName} ${selectedYear}</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="border:1px solid #e1e1e1; padding:8px;">Date</th><th style="border:1px solid #e1e1e1; padding:8px;">Source</th><th style="border:1px solid #e1e1e1; padding:8px;">Category</th><th style="border:1px solid #e1e1e1; padding:8px; text-align:right;">Amount</th></tr>`;
      filteredIncomes.forEach((inc) => {
        body += `<tr><td style="border:1px solid #e1e1e1; padding:8px;">${new Date(inc.date).toLocaleDateString()}</td><td style="border:1px solid #e1e1e1; padding:8px;">${inc.clientName || '-'}</td><td style="border:1px solid #e1e1e1; padding:8px;">${inc.serviceType || '-'}</td><td style="border:1px solid #e1e1e1; padding:8px; text-align:right;">${cur} ${(inc.amount || 0).toLocaleString()}</td></tr>`;
      });
      body += `</table>`;
    }
    
    // Expense details
    if (filteredExpenses.length > 0) {
      body += `<h3 style="margin:20px 0 12px; font-size:14px;">Money Out - ${monthName} ${selectedYear}</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="border:1px solid #e1e1e1; padding:8px;">Date</th><th style="border:1px solid #e1e1e1; padding:8px;">Category</th><th style="border:1px solid #e1e1e1; padding:8px;">Description</th><th style="border:1px solid #e1e1e1; padding:8px; text-align:right;">Amount</th></tr>`;
      filteredExpenses.forEach((exp) => {
        body += `<tr><td style="border:1px solid #e1e1e1; padding:8px;">${new Date(exp.date).toLocaleDateString()}</td><td style="border:1px solid #e1e1e1; padding:8px;">${exp.category || '-'}</td><td style="border:1px solid #e1e1e1; padding:8px;">${exp.description || '-'}</td><td style="border:1px solid #e1e1e1; padding:8px; text-align:right;">${cur} ${(exp.amount || 0).toLocaleString()}</td></tr>`;
      });
      body += `</table>`;
    }
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Recent Transactions</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #e1e1e1;">Date</th><th style="text-align:left; padding:8px 12px; border:1px solid #e1e1e1;">Source</th><th style="text-align:right; padding:8px 12px; border:1px solid #e1e1e1;">Amount</th><th style="text-align:left; padding:8px 12px; border:1px solid #e1e1e1;">Status</th></tr>`;
    filtered.slice(0, 20).forEach((t) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #e1e1e1;">${t.date}</td><td style="padding:8px 12px; border:1px solid #e1e1e1;">${t.source}</td><td style="text-align:right; padding:8px 12px; border:1px solid #e1e1e1;">${cur} ${Math.abs(t.amount).toLocaleString()}</td><td style="padding:8px 12px; border:1px solid #e1e1e1;">${t.status}</td></tr>`;
    });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `cash-flow-report-${monthName}-${selectedYear}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  return(
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{minHeight:"100vh",fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",color:C.text}}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px;}@keyframes fi{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}@keyframes so{from{opacity:1;transform:translateX(0);}to{opacity:0;transform:translateX(40px);}}.row:hover{background:${C.card}!important;}`}</style>

      <div style={{padding: isMobileLayout ? "20px 14px" : "24px 18px",display:"flex",flexDirection:"column",gap: 18,animation:"fi .3s ease"}}>

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

        {/* STATS */}
        <div style={{display:"grid",gridTemplateColumns: isMobileLayout ? "1fr" : "repeat(4, 1fr)",gap:14}}>
          <Stat label="Total Money In"  value={`LKR ${totalIn.toLocaleString()}`}  color={C.green} Icon={I.ArrowUp}   sub={`${getMonthName(selectedMonth)} ${selectedYear}`}/>
          <Stat label="Total Money Out" value={`LKR ${totalOut.toLocaleString()}`} color={C.red}   Icon={I.ArrowDown} sub={`${tx.filter(t=>t.type==="out").length} transactions`}/>
          <Stat label="Net Cash Flow"   value={`LKR ${net.toLocaleString()}`}      color={net>=0?C.green:C.red} Icon={I.BarChart}/>
          <Stat label="Current Balance" value={`LKR ${(totals.cashInHand || 0).toLocaleString()}`}      color={C.blue}  Icon={I.Wallet}    sub={`As of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}/>
        </div>

        {/* AREA + LINE */}
        <div style={{display:"grid",gridTemplateColumns: isMobileLayout ? "1fr" : "3fr 2fr",gap:16}}>
          <Card title="Inflow vs Outflow" subtitle="Daily cash movement — LKR" C={C} isMobile={isMobileLayout}>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={cfData}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={.3}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red}   stopOpacity={.3}/><stop offset="95%" stopColor={C.red}   stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip content={<Tip/>}/><Legend wrapperStyle={{color:C.muted,fontSize:12}}/>
                <Area type="monotone" dataKey="inflow"  name="Inflow"  stroke={C.green} strokeWidth={2} fill="url(#gI)"/>
                <Area type="monotone" dataKey="outflow" name="Outflow" stroke={C.red}   strokeWidth={2} fill="url(#gO)"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Running Balance" subtitle="Cumulative cash position" C={C} isMobile={isMobileLayout}>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={cfData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip content={<Tip/>}/>
                <Line type="monotone" dataKey="balance" name="Balance" stroke={C.cyan} strokeWidth={2.5} dot={{fill:C.cyan,r:4,strokeWidth:0}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* BAR CHART */}
        <Card title="Daily Cash Movement" subtitle="Inflow vs Outflow per day" C={C} isMobile={isMobileLayout}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cfData} barCategoryGap={28} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
              <Tooltip content={<Tip/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
              <Legend wrapperStyle={{color:C.muted,fontSize:12}}/>
              <Bar dataKey="inflow"  name="Inflow"  radius={[5,5,0,0]} fill={C.green}/>
              <Bar dataKey="outflow" name="Outflow" radius={[5,5,0,0]} fill={C.red}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* TRANSACTION TABLE */}
        <Card title="Transactions" subtitle={`${filtered.length} records`} C={C} isMobile={isMobileLayout}
          right={<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",justifyContent:"flex-end"}}>
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",opacity:0.5}}><I.Search/></div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{background:C.bg2,border:`1px solid ${C.border2}`,borderRadius:9,padding:"7px 12px 7px 34px",color:C.text,fontSize:13,outline:"none",width: isMobileLayout ? 140 : 180}}/>
            </div>
            <select value={fType}   onChange={e=>setFType(e.target.value)}   style={selSty}><option value="all">All</option><option value="in">Inflow</option><option value="out">Outflow</option></select>
            <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={selSty}><option value="all">All Status</option><option value="Received">Received</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option></select>
          </div>}
        >
          <div className="report-table-scroll">
          <div style={{ minWidth: isMobileLayout ? 720 : 640 }}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 120px 110px 60px",padding:"10px 14px",borderBottom:`1px solid ${C.border2}`,background:C.bg2,borderRadius:"8px 8px 0 0",marginTop:-4}}>
            {["Date","Source","Category","Amount","Status",""].map((h,i)=><p key={i} style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",margin:0,textAlign:i===3?"right":"left"}}>{h}</p>)}
          </div>
          {filtered.length===0&&<p style={{color:C.muted,textAlign:"center",padding:"32px 0"}}>No transactions found</p>}
          {filtered.map((t,i)=>{
            const sc=sMap[t.status]||sMap.Paid;
            return <div key={t.id} className="row" style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 120px 110px 60px",padding:"13px 14px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",background:i%2===0?C.card:"#111419",alignItems:"center",transition:"background .15s",animation:delId===t.id?"so .35s forwards":`fi .3s ease ${i*.03}s both`}}>
              <p style={{color:C.muted,fontSize:12,margin:0}}>{t.date}</p>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:t.type==="in"?C.green:C.red,flexShrink:0}}/>
                <p style={{color:C.text2,fontSize:13,fontWeight:600,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.source}</p>
              </div>
              <p style={{color:C.muted,fontSize:12,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.category}</p>
              <p style={{color:t.amount>0?C.green:C.red,fontSize:13,fontWeight:700,margin:0,textAlign:"right"}}>{t.amount>0?"+":""}LKR {Math.abs(t.amount).toLocaleString()}</p>
              <div style={{display:"flex",justifyContent:"center"}}><span style={{background:sc.bg,color:sc.c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:sc.c,display:"inline-block"}}/>{t.status}</span></div>
              <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={()=>handleDel(t.id)} style={{background:"rgba(239,68,68,0.1)",border:"none",color:C.red,width:28,height:28,borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><I.Trash/></button></div>
            </div>;
          })}
          {/* Footer */}
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 120px 110px 60px",padding:"13px 14px",background:C.bg2,borderTop:`1px solid ${C.border2}`,borderRadius:"0 0 8px 8px",marginBottom:-4}}>
            <p style={{color:C.muted,fontSize:11,fontWeight:700,margin:0,gridColumn:"1/4"}}>SUMMARY ({filtered.length} rows)</p>
            <p style={{color:C.green,fontSize:13,fontWeight:800,margin:0,textAlign:"right"}}>+LKR {filtered.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0).toLocaleString()}</p>
          </div>
          </div>
          </div>
        </Card>
      </div>

      {/* MODAL */}
      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:16,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{background:C.card,borderRadius:20,padding:"clamp(16px,4vw,28px)",width:"min(400px,calc(100vw - 32px))",maxWidth:"100%",maxHeight:"min(90dvh,calc(100svh - 32px))",overflowY:"auto",border:`1px solid ${C.border2}`,animation:"fi .2s ease",boxSizing:"border-box"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:modal==="in"?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {modal==="in"?<I.PlusCircle/>:<I.MinusCircle/>}
              </div>
              <h3 style={{color:C.text,fontWeight:800,fontSize:18,margin:0}}>{modal==="in"?"Add Inflow":"Add Outflow"}</h3>
            </div>
            <button onClick={()=>setModal(null)} style={{background:C.bg2,border:"none",color:C.muted,width:32,height:32,borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><I.X/></button>
          </div>
          {[{label:"Source / Recipient",key:"source",ph:modal==="in"?"Client name...":"Vendor name..."},{label:"Category",key:"category",ph:"e.g. Graphic Job"},{label:"Amount (LKR)",key:"amount",ph:"0.00",type:"number"}].map(f=>(
            <div key={f.key} style={{marginBottom:14}}>
              <label style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",display:"block",marginBottom:6}}>{f.label}</label>
              <input type={f.type||"text"} placeholder={f.ph} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{width:"100%",background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,outline:"none"}}/>
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:20}}>
            <button type="button" onClick={()=>setModal(null)} style={{width:"100%",background:C.bg2,color:C.muted,border:"none",borderRadius:12,padding:"12px 0",fontSize:14,fontWeight:700,cursor:"pointer"}}>Cancel</button>
            <button type="button" onClick={handleAdd} style={{width:"100%",background:modal==="in"?"linear-gradient(135deg,#16a34a,#15803d)":"linear-gradient(135deg,#ef4444,#dc2626)",color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {modal==="in"?"Confirm Inflow":"Confirm Outflow"}
            </button>
          </div>
        </div>
      </div>}
      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open)=>setReportPreview(p=>({...p,open}))} html={reportPreview.html} filename={reportPreview.filename} reportTitle="Cash Flow Report" />
    </div>
  );
}
