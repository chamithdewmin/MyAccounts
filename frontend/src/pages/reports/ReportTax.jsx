import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import ReportPreviewModal from '@/components/ReportPreviewModal';
import ReportToolbar from '@/components/ReportToolbar';
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

const ReportTax = () => {
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

  const taxData = useMemo(() => {
    if (!range || !settings.taxEnabled) return null;

    const filteredIncomes = filterByRange(incomes, range);
    const filteredExpenses = filterByRange(expenses, range);
    const taxRate = (Number(settings.taxRate) || 0) / 100;

    // Income Tax by Service / Category
    const incomeByCategory = filteredIncomes.reduce((acc, i) => {
      const name = i.serviceType?.trim() || 'Other';
      acc[name] = (acc[name] || 0) + i.amount;
      return acc;
    }, {});

    const incomeItems = Object.entries(incomeByCategory)
      .map(([name, amount]) => ({
        name,
        amount,
        tax: amount * taxRate,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expense Tax by Category
    const expenseByCategory = filteredExpenses.reduce((acc, e) => {
      const name = e.category || 'Other';
      acc[name] = (acc[name] || 0) + e.amount;
      return acc;
    }, {});

    const expenseItems = Object.entries(expenseByCategory)
      .map(([name, amount]) => ({
        name,
        amount,
        tax: amount * taxRate,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenseItems.reduce((s, e) => s + e.amount, 0);
    const taxCollected = incomeItems.reduce((s, i) => s + i.tax, 0);
    const taxOnExpenses = expenseItems.reduce((s, e) => s + e.tax, 0);
    const netTaxPayable = taxCollected - taxOnExpenses;

    return {
      incomeItems,
      expenseItems,
      totalIncome,
      totalExpenses,
      taxCollected,
      taxOnExpenses,
      netTaxPayable,
    };
  }, [incomes, expenses, range, settings.taxEnabled, settings.taxRate]);

  const formatAmount = (n) => `${settings.currency} ${(n ?? 0).toLocaleString()}`;

  const periodLabel = range
    ? `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Select period';

  const handleExportCSV = () => {
    if (!range || !taxData) return;
    const rows = [
      ['Tax Report', periodLabel],
      ['Tax Rate', `${settings.taxRate}%`],
      [],
      ['INCOME SUMMARY', 'Amount', 'Tax'],
      ...taxData.incomeItems.map((i) => [i.name, i.amount, i.tax]),
      ['Total Income Tax Collected', '', taxData.taxCollected],
      [],
      ['EXPENSE SUMMARY', 'Amount', 'Tax'],
      ...taxData.expenseItems.map((e) => [e.name, e.amount, e.tax]),
      ['Total Expense Tax', '', taxData.taxOnExpenses],
      [],
      ['NET TAX PAYABLE', taxData.netTaxPayable],
    ];
    const csvContent = rows.map((r) => (Array.isArray(r) ? r.join(',') : r)).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${range.start.toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Tax report exported to CSV' });
  };

  const handleDownloadPDF = () => {
    if (!range || !taxData) return;
    let incomeRows = taxData.incomeItems
      .map((i) => `<tr><td style="padding:8px; border:1px solid #ccc;">${i.name}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(i.amount)}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(i.tax)}</td></tr>`)
      .join('');
    let expenseRows = taxData.expenseItems
      .map((e) => `<tr><td style="padding:8px; border:1px solid #ccc;">${e.name}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(e.amount)}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(e.tax)}</td></tr>`)
      .join('');

    if (taxData.incomeItems.length === 0) incomeRows = '<tr><td colspan="3" style="padding:8px; border:1px solid #ccc; color:#888;">No income in this period</td></tr>';
    if (taxData.expenseItems.length === 0) expenseRows = '<tr><td colspan="3" style="padding:8px; border:1px solid #ccc; color:#888;">No expenses in this period</td></tr>';

    const netColor = taxData.netTaxPayable >= 0 ? '#dc2626' : '#16a34a';
    const innerContent = `
      <h1>Tax Report</h1>
      <p><strong>Period: ${periodLabel}</strong></p>
      <p>Tax Rate: ${settings.taxRate}%</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
        <tr><td colspan="3" style="padding:8px; border:1px solid #ccc; background:#e8f5e9;"><strong>INCOME SUMMARY</strong></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Category</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">Amount</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">Tax</td></tr>
        ${incomeRows}
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Income Tax Collected</strong></td><td colspan="2" style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(taxData.taxCollected)}</strong></td></tr>
        <tr><td colspan="3" style="padding:12px;"></td></tr>
        <tr><td colspan="3" style="padding:8px; border:1px solid #ccc; background:#ffebee;"><strong>EXPENSE SUMMARY</strong></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Category</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">Amount</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">Tax</td></tr>
        ${expenseRows}
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Expense Tax</strong></td><td colspan="2" style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(taxData.taxOnExpenses)}</strong></td></tr>
        <tr><td colspan="3" style="padding:12px;"></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc; background:#e3f2fd;"><strong>NET TAX PAYABLE</strong></td><td colspan="2" style="padding:8px; border:1px solid #ccc; text-align:right; background:#e3f2fd; color:${netColor};"><strong>${formatAmount(taxData.netTaxPayable)}</strong></td></tr>
      </table>
    `;
    const fullHtml = getPrintHtml(innerContent, { logo: settings?.logo, businessName: settings?.businessName });
    setReportPreview({ open: true, html: fullHtml, filename: `tax-report-${range.start.toISOString().slice(0, 10)}.pdf`, title: 'Tax Report' });
  };

  return (
    <>
      <Helmet>
        <title>Tax Report - MyAccounts</title>
        <meta name="description" content="Tax collected, tax paid, and net tax payable for a period" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tax Report</h1>
            <p className="text-muted-foreground">
              Tax collected, tax paid, and net tax payable for a period
            </p>
          </div>
          <ReportToolbar
            onRefresh={() => { loadData(); toast({ title: 'Refreshed', description: 'Data refreshed' }); }}
            onExportCSV={handleExportCSV}
            onDownloadPDF={handleDownloadPDF}
            disabled={!range}
          />
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

        {!settings.taxEnabled && (
          <div className="p-4 rounded-lg bg-muted border border-secondary text-muted-foreground">
            Tax estimation is disabled. Enable it in Settings to view tax reports.
          </div>
        )}

        {/* Tax Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-lg p-6 border border-secondary"
        >
          <h2 className="text-xl font-bold mb-2">
            Tax Report – {periodLabel}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Tax Rate: {settings.taxRate}% • Paid transactions only
          </p>

          {!taxData ? (
            <p className="text-muted-foreground">Select a period and ensure tax is enabled in Settings.</p>
          ) : (
            <div className="space-y-8">
              {/* Income Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 border-b border-secondary pb-2">
                  Income Summary (Tax Collected)
                </h3>
                <div className="space-y-2">
                  {taxData.incomeItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No income in this period</p>
                  ) : (
                    taxData.incomeItems.map((i) => (
                      <div key={i.name} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{i.name}</span>
                        <div className="flex gap-6">
                          <span>{formatAmount(i.amount)}</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Tax: {formatAmount(i.tax)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-secondary font-semibold text-green-600 dark:text-green-400">
                  <span>Total Income Tax Collected</span>
                  <span>{formatAmount(taxData.taxCollected)}</span>
                </div>
              </div>

              {/* Expense Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 border-b border-secondary pb-2">
                  Expense Summary (Tax Deductible)
                </h3>
                <div className="space-y-2">
                  {taxData.expenseItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses in this period</p>
                  ) : (
                    taxData.expenseItems.map((e) => (
                      <div key={e.name} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{e.name}</span>
                        <div className="flex gap-6">
                          <span>{formatAmount(e.amount)}</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Tax: {formatAmount(e.tax)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-secondary font-semibold text-red-600 dark:text-red-400">
                  <span>Total Expense Tax</span>
                  <span>{formatAmount(taxData.taxOnExpenses)}</span>
                </div>
              </div>

              {/* Net Tax Payable */}
              <div
                className={`flex justify-between items-center p-4 rounded-lg font-bold text-lg ${
                  taxData.netTaxPayable >= 0
                    ? 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                    : 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400'
                }`}
              >
                <span>NET TAX PAYABLE</span>
                <span>{formatAmount(taxData.netTaxPayable)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Tax Collected − Tax on Expenses = Net Tax Payable
              </p>
            </div>
          )}
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

export default ReportTax;
