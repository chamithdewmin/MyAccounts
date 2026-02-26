import { useState, useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import { ReportPageLayout, Stat, Card, ChartTooltip, C, I } from "@/components/reports/ReportUI";

const StatusBadge=({paid,status})=>{
  const s=paid?{bg:"rgba(34,197,94,0.15)",c:C.green}:{bg:"rgba(234,179,8,0.15)",c:C.yellow};
  return <span style={{background:s.bg,color:s.c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:s.c,display:"inline-block"}}/>{status}</span>;
};

export default function TaxReports(){
  const { incomes, expenses, settings, totals } = useFinance();
  const [activeQ,setActiveQ]=useState(null);
  const [reportPreview, setReportPreview] = useState({ open: false, html: "", filename: "" });

  // Calculate quarterly data
  const quarterly = useMemo(() => {
    if (!settings.taxEnabled) return [];
    const now = new Date();
    const currentYear = now.getFullYear();
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

  // Income split
  const incSplit = useMemo(() => {
    const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const taxable = Math.max(0, totalIncome - totalExp);
    const nonTaxable = 0; // Assuming all income is taxable unless specified
    return [
      { name: "Taxable Income", value: taxable, color: C.red },
      { name: "Non-Taxable", value: nonTaxable, color: C.green },
      { name: "Deductions", value: totalExp, color: C.blue },
    ];
  }, [incomes, expenses]);

  // Income categories
  const categories = useMemo(() => {
    const catMap = {};
    const colors = [C.orange, C.yellow, C.blue, C.green, C.purple, C.cyan];
    incomes.forEach(income => {
      const cat = income.serviceType || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, taxable: true, value: 0, color: colors[Object.keys(catMap).length % colors.length] };
      }
      catMap[cat].value += income.amount || 0;
    });
    return Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [incomes]);

  const totalGross = useMemo(() => quarterly.reduce((s, q) => s + q.gross, 0), [quarterly]);
  const totalTax = useMemo(() => quarterly.reduce((s, q) => s + q.taxOwed, 0), [quarterly]);
  const totalDed = useMemo(() => quarterly.reduce((s, q) => s + q.deductions, 0), [quarterly]);
  const paidTax = useMemo(() => quarterly.filter(q => q.paid).reduce((s, q) => s + q.taxOwed, 0), [quarterly]);
  const pendingTax = useMemo(() => totalTax - paidTax, [totalTax, paidTax]);
  const rate = useMemo(() => totalGross > 0 ? ((totalTax / totalGross) * 100).toFixed(1) : '0.0', [totalTax, totalGross]);

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Tax Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · Year ${new Date().getFullYear()}</p>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Gross Income</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalGross.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Deductions</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalDed.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Tax Owed (${rate}%)</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalTax.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Tax Paid</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${paidTax.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Pending</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${pendingTax.toLocaleString()}</td></tr></table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Quarterly Summary</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Quarter</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Gross</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Tax Owed</th><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Status</th></tr>`;
    quarterly.forEach((q) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${q.quarter}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${q.gross.toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${q.taxOwed.toLocaleString()}</td><td style="padding:8px 12px; border:1px solid #ddd;">${q.paid ? "Paid" : "Pending"}</td></tr>`;
    });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `tax-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  const cur = settings?.currency || "LKR";

  return (
    <>
      <ReportPageLayout title="Tax Reports" subtitle="Tax obligations and compliance summary — FY 2024" onDownloadPdf={openReportPreview}>
        {/* STATS */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          <Stat label="Total Gross Income" value={`LKR ${totalGross.toLocaleString()}`} Icon={I.FileText}      color={C.text2}/>
          <Stat label="Total Tax Owed"     value={`LKR ${totalTax.toLocaleString()}`}   Icon={I.Receipt}       color={C.red}   sub={`${rate}% effective rate`}/>
          <Stat label="Total Deductions"   value={`LKR ${totalDed.toLocaleString()}`}   Icon={I.Scissors}      color={C.green} sub="Tax savings" subColor={C.green}/>
          <Stat label="Tax Paid (Q1–Q3)"   value={`LKR ${paidTax.toLocaleString()}`}    Icon={I.CheckCircle}   color={C.blue}  sub={`LKR ${pendingTax.toLocaleString()} pending`} subColor={C.yellow}/>
        </div>

        {/* QUARTERLY BAR + DONUT */}
        <div style={{display:"grid",gridTemplateColumns:"2.2fr 1fr",gap:16}}>
          <Card title="Quarterly Tax Breakdown" subtitle="Gross income, taxable income & tax owed">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={quarterly} barCategoryGap={30} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip content={(props) => <ChartTooltip {...props} currency={cur} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
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
              </Pie><Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{background:"#1a1d27",border:`1px solid ${C.border2}`,borderRadius:10}}/></PieChart>
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
      </ReportPageLayout>
      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open)=>setReportPreview(p=>({...p,open}))} html={reportPreview.html} filename={reportPreview.filename} reportTitle="Tax Report" />
    </>
  );
}
