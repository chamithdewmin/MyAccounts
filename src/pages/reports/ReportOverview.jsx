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

const filterByRange = (items, range, dateKey = 'date') => {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(i[dateKey]);
    return d >= range.start && d <= range.end;
  });
};

const ReportOverview = () => {
  const { incomes, expenses, totals, settings } = useFinance();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = React.useState(false);

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

    const printContent = `
      <h1>Overview Report</h1>
      <p>Period: ${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Income</strong></td><td style="padding:8px; border:1px solid #ccc;">${settings.currency} ${totalIncome.toLocaleString()}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Expenses</strong></td><td style="padding:8px; border:1px solid #ccc;">${settings.currency} ${totalExpenses.toLocaleString()}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Profit</strong></td><td style="padding:8px; border:1px solid #ccc;">${settings.currency} ${profit.toLocaleString()}</td></tr>
      </table>
    `;
    const win = window.open('', '_blank');
    win.document.write(`<html><body>${printContent}</body></html>`);
    win.document.close();
    win.print();
    win.close();
    toast({ title: 'PDF ready', description: 'Use Print dialog to save as PDF' });
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
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => toast({ title: 'Refreshed', description: 'Data refreshed' })}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
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
    </>
  );
};

export default ReportOverview;
