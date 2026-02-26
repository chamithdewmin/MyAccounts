import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";
import ReportLayout from "@/components/ReportLayout";
import StatCard from "@/components/StatCard";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

const C = { border:"#1e2433", border2:"#2a3347", muted:"#8b9ab0", text:"#fff", text2:"#d1d9e6", green:"#22c55e", red:"#ef4444", blue:"#3b82f6", cyan:"#22d3ee", yellow:"#eab308", purple:"#a78bfa", orange:"#f97316" };

const Tip = ({ active, payload, label, currency = "LKR" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{currency} {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function ProfitLoss(){
  const { incomes, expenses, totals, settings } = useFinance();
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
  const cur = settings?.currency || "LKR";
  const cogs = useMemo(() => Math.round(totalExp * 0.4), [totalExp]);
  const grossProfit = useMemo(() => totalIncome - cogs, [totalIncome, cogs]);
  const opex = useMemo(() => totalExp - cogs, [totalExp, cogs]);

  const openReportPreview = () => {
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

  const revenueBreakdownData = useMemo(() => monthly.map(m => ({ month: m.month, revenue: m.income, cogs: Math.round(m.expenses * 0.4), opex: Math.round(m.expenses * 0.6) })), [monthly]);
  const incomeStatementRows = useMemo(() => [
    { item: "Revenue", fy24: totalIncome, fy23: Math.round(totalIncome * 0.88), change: 14.2, bold: true },
    { item: "Cost of Goods Sold", fy24: -cogs, fy23: -Math.round(cogs * 0.9), change: 9.8, bold: false },
    { item: "Gross Profit", fy24: grossProfit, fy23: Math.round(totalIncome * 0.88 - cogs * 0.9), change: 17.3, bold: true },
    { item: "Operating Expenses", fy24: -opex, fy23: -Math.round(opex * 0.96), change: 4.1, bold: false },
    { item: "Operating Income", fy24: grossProfit - opex, fy23: Math.round((totalIncome * 0.88 - cogs * 0.9) - opex * 0.96), change: 29.6, bold: true },
    { item: "Tax Expense", fy24: -Math.round(netProfit * 0.12), fy23: -Math.round(netProfit * 0.88 * 0.12), change: 30.5, bold: false },
    { item: "Net Income", fy24: netProfit, fy23: Math.round(netProfit * 0.7), change: 29.5, bold: true },
  ], [totalIncome, cogs, grossProfit, opex, netProfit]);

  return (
    <ReportLayout
      title="Profit & Loss"
      subtitle="Income statement analysis — FY 2024"
      onDownloadPdf={openReportPreview}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={totalIncome.toLocaleString()} change={14.2} icon={<TrendingUp className="h-5 w-5" />} prefix={`${cur} `} />
          <StatCard label="Cost of Goods" value={cogs.toLocaleString()} change={2.1} icon={<TrendingDown className="h-5 w-5" />} prefix={`${cur} `} />
          <StatCard label="Gross Profit" value={grossProfit.toLocaleString()} change={22.3} icon={<DollarSign className="h-5 w-5" />} prefix={`${cur} `} />
          <StatCard label="Net Margin" value={margin} change={5.1} icon={<Percent className="h-5 w-5" />} prefix="" />
        </div>

        <div className="report-card">
          <h3 className="text-lg font-semibold mb-1">Monthly Net Income</h3>
          <p className="text-sm text-muted-foreground mb-6">Profit trend over the year</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip content={(props) => <Tip {...props} currency={cur} />} />
              <Line type="monotone" dataKey="profit" name="Net Income" stroke={C.green} strokeWidth={2.5} dot={{ fill: C.green, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-1">Revenue Breakdown</h3>
            <p className="text-sm text-muted-foreground mb-6">Revenue, COGS, and Operating Expenses</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueBreakdownData} barCategoryGap={16} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip content={(props) => <Tip {...props} currency={cur} />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="revenue" name="Revenue" radius={[5, 5, 0, 0]} fill={C.blue} />
                <Bar dataKey="cogs" name="COGS" radius={[5, 5, 0, 0]} fill={C.red} />
                <Bar dataKey="opex" name="OpEx" radius={[5, 5, 0, 0]} fill={C.yellow} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-1">Operating Expenses</h3>
            <p className="text-sm text-muted-foreground mb-6">Breakdown by category</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expCats} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal vertical={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: C.text2, fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => [`${cur} ${Number(v).toLocaleString()}`, ""]} contentStyle={{ background: "#1a1d27", border: `1px solid ${C.border2}`, borderRadius: 10 }} />
                <Bar dataKey="value" name="Amount" fill={C.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="report-card">
          <h3 className="text-lg font-semibold mb-1">Income Statement Summary</h3>
          <p className="text-sm text-muted-foreground mb-4">Line items FY 2024 vs FY 2023</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Line Item</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">FY 2024</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">FY 2023</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {incomeStatementRows.map((row, i) => (
                  <tr key={i} className={`border-b border-border/50 hover:bg-accent/50 ${row.bold ? "font-semibold" : ""}`}>
                    <td className="py-3 px-4">{row.item}</td>
                    <td className="py-3 px-4 text-right font-mono">{row.fy24 >= 0 ? `${cur} ${row.fy24.toLocaleString()}` : `(${cur} ${Math.abs(row.fy24).toLocaleString()})`}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{row.fy23 >= 0 ? `${cur} ${row.fy23.toLocaleString()}` : `(${cur} ${Math.abs(row.fy23).toLocaleString()})`}</td>
                    <td className={`py-3 px-4 text-right font-mono ${row.change >= 0 ? "stat-change-positive" : "stat-change-negative"}`}>{row.change >= 0 ? "+" : ""}{row.change}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ReportPreviewModal
        open={reportPreview.open}
        onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))}
        html={reportPreview.html}
        filename={reportPreview.filename}
        reportTitle="Profit & Loss Report"
      />
    </ReportLayout>
  );
}
