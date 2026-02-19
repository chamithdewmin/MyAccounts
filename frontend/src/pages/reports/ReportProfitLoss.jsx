import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import ReportPreviewModal from '@/components/ReportPreviewModal';
import { getPrintHtml } from '@/utils/pdfPrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const filterByRange = (items, range, dateKey = 'date') => {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(i[dateKey]);
    return d >= range.start && d <= range.end;
  });
};

const getDateRange = (option, fromDate, toDate) => {
  const now = new Date();
  if (option === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  if (option === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end };
  }
  if (option === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start, end };
  }
  if (option === 'custom' && fromDate && toDate) {
    return {
      start: new Date(fromDate + 'T00:00:00'),
      end: new Date(toDate + 'T23:59:59'),
    };
  }
  return null;
};

const ReportProfitLoss = () => {
  const { incomes, expenses, settings, loadData } = useFinance();
  const { toast } = useToast();
  const [reportPreview, setReportPreview] = useState({ open: false, html: '', filename: '', title: '' });

  const [periodOption, setPeriodOption] = useState('this_month');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const range = useMemo(
    () => getDateRange(periodOption, fromDate, toDate),
    [periodOption, fromDate, toDate]
  );

  const plData = useMemo(() => {
    const filteredIncomes = filterByRange(incomes, range);
    const filteredExpenses = filterByRange(expenses, range);

    const incomeByCategory = filteredIncomes.reduce((acc, i) => {
      const name = i.serviceType?.trim() || 'Other';
      acc[name] = (acc[name] || 0) + i.amount;
      return acc;
    }, {});

    const expenseByCategory = filteredExpenses.reduce((acc, e) => {
      const name = e.category || 'Other';
      acc[name] = (acc[name] || 0) + e.amount;
      return acc;
    }, {});

    const incomeItems = Object.entries(incomeByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const expenseItems = Object.entries(expenseByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenseItems.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      incomeItems,
      expenseItems,
      totalIncome,
      totalExpenses,
      netProfit,
    };
  }, [incomes, expenses, range]);

  const formatAmount = (n) => `${settings.currency} ${(n ?? 0).toLocaleString()}`;

  const periodLabel = range
    ? `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Select period';

  const handleExportCSV = () => {
    if (!range) return;
    const rows = [
      ['Profit & Loss Report', periodLabel],
      [],
      ['INCOME', ''],
      ...plData.incomeItems.map((i) => [i.name, i.amount]),
      ['Total Income', plData.totalIncome],
      [],
      ['EXPENSES', ''],
      ...plData.expenseItems.map((e) => [e.name, e.amount]),
      ['Total Expenses', plData.totalExpenses],
      [],
      ['NET PROFIT', plData.netProfit],
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${range.start.toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Profit & Loss report exported to CSV' });
  };

  const handleDownloadPDF = () => {
    if (!range) return;
    let incomeRows = plData.incomeItems
      .map((i) => `<tr><td style="padding:8px; border:1px solid #ccc;">${i.name}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(i.amount)}</td></tr>`)
      .join('');
    let expenseRows = plData.expenseItems
      .map((e) => `<tr><td style="padding:8px; border:1px solid #ccc;">${e.name}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(e.amount)}</td></tr>`)
      .join('');

    if (plData.incomeItems.length === 0) incomeRows = '<tr><td colspan="2" style="padding:8px; border:1px solid #ccc; color:#888;">No income in this period</td></tr>';
    if (plData.expenseItems.length === 0) expenseRows = '<tr><td colspan="2" style="padding:8px; border:1px solid #ccc; color:#888;">No expenses in this period</td></tr>';

    const innerContent = `
      <h1>Profit & Loss Report</h1>
      <p><strong>Period: ${periodLabel}</strong></p>
      <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#f5f5f5;"><strong>INCOME</strong></td></tr>
        ${incomeRows}
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Income</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(plData.totalIncome)}</strong></td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#f5f5f5;"><strong>EXPENSES</strong></td></tr>
        ${expenseRows}
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Expenses</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(plData.totalExpenses)}</strong></td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc; background:#e8f5e9;"><strong>NET PROFIT</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right; background:#e8f5e9;"><strong>${formatAmount(plData.netProfit)}</strong></td></tr>
      </table>
    `;
    const fullHtml = getPrintHtml(innerContent, { logo: settings?.logo, businessName: settings?.businessName });
    setReportPreview({ open: true, html: fullHtml, filename: `profit-loss-${range.start.toISOString().slice(0, 10)}.pdf`, title: 'Profit & Loss Report' });
  };

  return (
    <>
      <Helmet>
        <title>Profit & Loss - MyAccounts</title>
        <meta name="description" content="Income, expenses, and net profit for a period" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Profit & Loss</h1>
            <p className="text-muted-foreground">
              Income, expenses, and net profit for a period
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
              onClick={handleExportCSV}
              disabled={!range}
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
                cursor: !range ? "not-allowed" : "pointer",
                opacity: !range ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={!range}
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
                cursor: !range ? "not-allowed" : "pointer",
                opacity: !range ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Period selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-4 border border-secondary"
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select Period
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  checked={periodOption === 'this_month'}
                  onChange={() => setPeriodOption('this_month')}
                  className="text-primary"
                />
                <span>This Month</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  checked={periodOption === 'last_month'}
                  onChange={() => setPeriodOption('last_month')}
                  className="text-primary"
                />
                <span>Last Month</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  checked={periodOption === 'this_year'}
                  onChange={() => setPeriodOption('this_year')}
                  className="text-primary"
                />
                <span>This Year</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  checked={periodOption === 'custom'}
                  onChange={() => setPeriodOption('custom')}
                  className="text-primary"
                />
                <span>Custom</span>
              </label>
            </div>
            {periodOption === 'custom' && (
              <div className="flex gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* P&L Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-lg p-6 border border-secondary"
        >
          <h2 className="text-xl font-bold mb-6">
            Profit & Loss Report – {periodLabel}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* INCOME */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 border-b border-secondary pb-2">
                INCOME
              </h3>
              <div className="space-y-2">
                {plData.incomeItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No income in this period</p>
                ) : (
                  plData.incomeItems.map((i) => (
                    <div key={i.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{i.name}</span>
                      <span>{formatAmount(i.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                <span>Total Income</span>
                <span>{formatAmount(plData.totalIncome)}</span>
              </div>
            </div>

            {/* EXPENSES */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 border-b border-secondary pb-2">
                EXPENSES
              </h3>
              <div className="space-y-2">
                {plData.expenseItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses in this period</p>
                ) : (
                  plData.expenseItems.map((e) => (
                    <div key={e.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{e.name}</span>
                      <span>{formatAmount(e.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                <span>Total Expenses</span>
                <span>{formatAmount(plData.totalExpenses)}</span>
              </div>
            </div>

            {/* NET PROFIT */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b border-secondary pb-2">
                NET PROFIT
              </h3>
              <div className="pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Profit</span>
                  <span className={plData.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formatAmount(plData.netProfit)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total Income – Total Expenses
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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

export default ReportProfitLoss;
