import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ExportReportDialog from '@/components/ExportReportDialog';
import ReportPreviewModal from '@/components/ReportPreviewModal';
import { getPrintHtml } from '@/utils/pdfPrint';

const filterByRange = (items, range, dateKey = 'date') => {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(i[dateKey]);
    return d >= range.start && d <= range.end;
  });
};

const ReportOverview = () => {
  const { incomes, expenses, totals, settings, loadData } = useFinance();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = React.useState(false);
  const [reportPreview, setReportPreview] = React.useState({ open: false, html: '', filename: '', title: '' });

  const chartData = useMemo(() => {
    const map = new Map();
    const addToMap = (dateIso, field, amount) => {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = map.get(key) || { date: label, income: 0, expenses: 0 };
      existing[field] += amount;
      map.set(key, existing);
    };
    incomes.forEach((i) => addToMap(i.date, 'income', i.amount));
    expenses.forEach((e) => addToMap(e.date, 'expenses', e.amount));
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, profit: d.income - d.expenses }));
  }, [incomes, expenses]);

  const handleExport = (range) => {
    const filteredIncomes = filterByRange(incomes, range);
    const filteredExpenses = filterByRange(expenses, range);
    const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const profit = totalIncome - totalExpenses;

    const headers = ['Report', 'Overview'];
    const rows = [
      ['Period', `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`],
      ['Total Income', totalIncome],
      ['Total Expenses', totalExpenses],
      ['Profit', profit],
    ];
    const csvContent = [headers.join(','), '', ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overview-report-${range.start.toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Overview report exported to CSV' });
  };

  const handlePDF = (range) => {
    const filteredIncomes = filterByRange(incomes, range);
    const filteredExpenses = filterByRange(expenses, range);
    const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const profit = totalIncome - totalExpenses;
    const taxRate = settings.taxEnabled ? (Number(settings.taxRate) || 0) : 0;
    const estimatedTax = profit > 0 ? (profit * taxRate) / 100 : 0;

    const periodData = chartData.filter((d) => {
      const parts = d.date.split(' ');
      const monthDate = new Date(`${parts[0]} 1, ${parts[1]}`);
      return monthDate >= range.start && monthDate <= range.end;
    });

    let monthlyRows = periodData
      .map((r) => `<tr><td style="padding:8px; border:1px solid #ccc;">${r.date}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${settings.currency} ${r.income.toLocaleString()}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${settings.currency} ${r.expenses.toLocaleString()}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${settings.currency} ${r.profit.toLocaleString()}</td></tr>`)
      .join('');
    if (!monthlyRows) monthlyRows = '<tr><td colspan="4" style="padding:8px; border:1px solid #ccc; color:#888;">No monthly data in this period</td></tr>';

    const innerContent = `
      <h1>Overview Report</h1>
      <p><strong>Period: ${range.start.toLocaleDateString()} – ${range.end.toLocaleDateString()}</strong></p>
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px; margin:20px 0;">
        <div style="border:1px solid #ccc; padding:16px; border-radius:8px; background:#f9fafb;">
          <p style="font-size:11px; color:#666; margin:0; text-transform:uppercase;">Total Income</p>
          <p style="font-size:18px; font-weight:bold; margin:8px 0 0;">${settings.currency} ${totalIncome.toLocaleString()}</p>
        </div>
        <div style="border:1px solid #ccc; padding:16px; border-radius:8px; background:#f9fafb;">
          <p style="font-size:11px; color:#666; margin:0; text-transform:uppercase;">Total Expenses</p>
          <p style="font-size:18px; font-weight:bold; margin:8px 0 0;">${settings.currency} ${totalExpenses.toLocaleString()}</p>
        </div>
        <div style="border:1px solid #ccc; padding:16px; border-radius:8px; background:#f9fafb;">
          <p style="font-size:11px; color:#666; margin:0; text-transform:uppercase;">Profit</p>
          <p style="font-size:18px; font-weight:bold; margin:8px 0 0; color:${profit >= 0 ? '#16a34a' : '#dc2626'};">${settings.currency} ${profit.toLocaleString()}</p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px;">
        <div style="border:1px solid #ccc; padding:16px; border-radius:8px;">
          <p style="font-size:11px; color:#666; margin:0; text-transform:uppercase;">Estimated Tax (${taxRate}%)</p>
          <p style="font-size:16px; font-weight:bold; margin:8px 0 0;">${settings.currency} ${estimatedTax.toLocaleString()}</p>
        </div>
      </div>
      <h3 style="margin:24px 0 12px;">Monthly Summary</h3>
      <table style="width:100%; border-collapse: collapse;">
        <tr style="background:#f5f5f5;">
          <th style="padding:8px; border:1px solid #ccc; text-align:left;">Month</th>
          <th style="padding:8px; border:1px solid #ccc; text-align:right;">Income</th>
          <th style="padding:8px; border:1px solid #ccc; text-align:right;">Expenses</th>
          <th style="padding:8px; border:1px solid #ccc; text-align:right;">Profit</th>
        </tr>
        ${monthlyRows}
        <tr style="background:#f5f5f5;">
          <td style="padding:8px; border:1px solid #ccc;"><strong>Total</strong></td>
          <td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${settings.currency} ${totalIncome.toLocaleString()}</strong></td>
          <td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${settings.currency} ${totalExpenses.toLocaleString()}</strong></td>
          <td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${settings.currency} ${profit.toLocaleString()}</strong></td>
        </tr>
      </table>
    `;
    const fullHtml = getPrintHtml(innerContent, { logo: settings?.logo, businessName: settings?.businessName });
    setReportPreview({ open: true, html: fullHtml, filename: `overview-report-${range.start.toISOString().slice(0, 10)}.pdf`, title: 'Overview Report' });
  };

  return (
    <>
      <Helmet>
        <title>Overview Reports - MyAccounts</title>
        <meta name="description" content="Monthly Summary, Profit & Loss, Cash Flow" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Overview Reports</h1>
            <p className="text-muted-foreground">
              Monthly Summary, Profit & Loss, Cash Flow
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => { loadData(); toast({ title: 'Refreshed', description: 'Data refreshed' }); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1c1e24",
                border: "1px solid #303338",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setExportOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1c1e24",
                border: "1px solid #303338",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setExportOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1c1e24",
                border: "1px solid #303338",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Summary cards at top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Monthly Profit</p>
            <p className="text-xl font-bold mt-1">{settings.currency} {totals.monthlyProfit.toLocaleString()}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-lg border border-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Yearly Profit</p>
            <p className="text-xl font-bold mt-1">{settings.currency} {totals.yearlyProfit.toLocaleString()}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border border-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Estimated Tax (Year)</p>
            <p className="text-xl font-bold mt-1">{settings.currency} {totals.estimatedTaxYearly.toLocaleString()}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Monthly Summary</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Profit & Loss</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-6 border border-secondary lg:col-span-2"
          >
            <h2 className="text-xl font-bold mb-4">Cash Flow</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Inflow" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Outflow" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        onExportCSV={handleExport}
        onDownloadPDF={handlePDF}
        reportTitle="Overview"
      />
      <ReportPreviewModal
        open={reportPreview.open}
        onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))}
        html={reportPreview.html}
        filename={reportPreview.filename}
        reportTitle={reportPreview.title}
      />
    </>
  );
};

export default ReportOverview;
