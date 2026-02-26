import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import { ReportPageLayout, Stat, Card, ChartTooltip, LegendList, C, I } from "@/components/reports/ReportUI";

export default function ProfitLoss(){
  const { incomes, expenses, settings } = useFinance();
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
    <>
      <ReportPageLayout title="Profit & Loss" subtitle="Income statement analysis — FY 2024" onDownloadPdf={openReportPreview}>
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
              <Tooltip content={(props) => <ChartTooltip {...props} currency={cur} />} />
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
                <Tooltip content={(props) => <ChartTooltip {...props} currency={cur} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
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
            <LegendList items={expCats} currency={cur} />
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
      </ReportPageLayout>
      <ReportPreviewModal
        open={reportPreview.open}
        onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))}
        html={reportPreview.html}
        filename={reportPreview.filename}
        reportTitle="Profit & Loss Report"
      />
    </>
  );
}
