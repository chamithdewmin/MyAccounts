import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { getPrintHtml, downloadReportPdf } from '@/utils/pdfPrint';
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

const filterBefore = (items, beforeDate, dateKey = 'date') => {
  return items.filter((i) => new Date(i[dateKey]) < beforeDate);
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
  if (option === 'custom' && fromDate && toDate) {
    return {
      start: new Date(fromDate + 'T00:00:00'),
      end: new Date(toDate + 'T23:59:59'),
    };
  }
  return null;
};

const ReportCashFlow = () => {
  const { incomes, expenses, settings } = useFinance();
  const { toast } = useToast();

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

  const cashFlowData = useMemo(() => {
    if (!range) return null;

    const incomeInPeriod = filterByRange(incomes, range);
    const expensesInPeriod = filterByRange(expenses, range);

    const incomeBeforePeriod = filterBefore(incomes, range.start);
    const expensesBeforePeriod = filterBefore(expenses, range.start);

    const openingCash =
      incomeBeforePeriod.reduce((s, i) => s + i.amount, 0) -
      expensesBeforePeriod.reduce((s, e) => s + e.amount, 0);

    const cashInBySource = incomeInPeriod.reduce((acc, i) => {
      const name = i.clientName?.trim() || i.serviceType?.trim() || 'Other';
      acc[name] = (acc[name] || 0) + i.amount;
      return acc;
    }, {});

    const cashOutByCategory = expensesInPeriod.reduce((acc, e) => {
      const name = e.category || 'Other';
      acc[name] = (acc[name] || 0) + e.amount;
      return acc;
    }, {});

    const cashInItems = Object.entries(cashInBySource)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const cashOutItems = Object.entries(cashOutByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const totalCashIn = cashInItems.reduce((s, i) => s + i.amount, 0);
    const totalCashOut = cashOutItems.reduce((s, e) => s + e.amount, 0);
    const netCashFlow = totalCashIn - totalCashOut;
    const closingCash = openingCash + netCashFlow;

    return {
      openingCash,
      cashInItems,
      cashOutItems,
      totalCashIn,
      totalCashOut,
      netCashFlow,
      closingCash,
    };
  }, [incomes, expenses, range]);

  const formatAmount = (n) => `${settings.currency} ${(n ?? 0).toLocaleString()}`;

  const periodLabel = range
    ? `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Select period';

  const handleExportCSV = () => {
    if (!range || !cashFlowData) return;
    const rows = [
      ['Cash Flow Report', periodLabel],
      [],
      ['OPENING CASH', cashFlowData.openingCash],
      [],
      ['CASH IN', ''],
      ...cashFlowData.cashInItems.map((i) => [i.name, i.amount]),
      ['Total Cash In', cashFlowData.totalCashIn],
      [],
      ['CASH OUT', ''],
      ...cashFlowData.cashOutItems.map((e) => [e.name, e.amount]),
      ['Total Cash Out', cashFlowData.totalCashOut],
      [],
      ['NET CASH FLOW', cashFlowData.netCashFlow],
      ['CLOSING CASH', cashFlowData.closingCash],
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${range.start.toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Cash Flow report exported to CSV' });
  };

  const handleDownloadPDF = async () => {
    if (!range || !cashFlowData) return;
    let cashInRows = cashFlowData.cashInItems
      .map((i) => `<tr><td style="padding:8px; border:1px solid #ccc;">${i.name}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(i.amount)}</td></tr>`)
      .join('');
    let cashOutRows = cashFlowData.cashOutItems
      .map((e) => `<tr><td style="padding:8px; border:1px solid #ccc;">${e.name}</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(e.amount)}</td></tr>`)
      .join('');

    if (cashFlowData.cashInItems.length === 0) cashInRows = '<tr><td colspan="2" style="padding:8px; border:1px solid #ccc; color:#888;">No cash in this period</td></tr>';
    if (cashFlowData.cashOutItems.length === 0) cashOutRows = '<tr><td colspan="2" style="padding:8px; border:1px solid #ccc; color:#888;">No cash out in this period</td></tr>';

    const innerContent = `
      <h1>Cash Flow Report</h1>
      <p><strong>Period: ${periodLabel}</strong></p>
      <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>OPENING CASH</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(cashFlowData.openingCash)}</td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#e8f5e9;"><strong>CASH IN</strong></td></tr>
        ${cashInRows}
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Cash In</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(cashFlowData.totalCashIn)}</strong></td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#ffebee;"><strong>CASH OUT</strong></td></tr>
        ${cashOutRows}
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Cash Out</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(cashFlowData.totalCashOut)}</strong></td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>NET CASH FLOW</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(cashFlowData.netCashFlow)}</strong></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc; background:#e3f2fd;"><strong>CLOSING CASH</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right; background:#e3f2fd;"><strong>${formatAmount(cashFlowData.closingCash)}</strong></td></tr>
      </table>
    `;
    const fullHtml = getPrintHtml(innerContent, { logo: settings?.logo, businessName: settings?.businessName });
    await downloadReportPdf(fullHtml, `cash-flow-${range.start.toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'PDF downloaded', description: 'Cash Flow report saved to your device' });
  };

  return (
    <>
      <Helmet>
        <title>Cash Flow Report - MyAccounts</title>
        <meta name="description" content="Cash in, cash out, and net cash flow for a period" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Cash Flow Report</h1>
            <p className="text-muted-foreground">
              Actual cash received and paid – real money movements
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast({ title: 'Refreshed', description: 'Data refreshed' })}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={!range}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleDownloadPDF} disabled={!range}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
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

        {/* Cash Flow Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-lg p-6 border border-secondary"
        >
          <h2 className="text-xl font-bold mb-6">
            Cash Flow Report – {periodLabel}
          </h2>

          {!cashFlowData ? (
            <p className="text-muted-foreground">Select a period to view the report.</p>
          ) : (
            <div className="space-y-8">
              {/* Opening Cash */}
              <div className="flex justify-between items-center py-3 border-b border-secondary">
                <span className="font-semibold">OPENING CASH</span>
                <span className="text-lg font-bold">{formatAmount(cashFlowData.openingCash)}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CASH IN */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 border-b border-secondary pb-2">
                    CASH IN
                  </h3>
                  <div className="space-y-2">
                    {cashFlowData.cashInItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No cash in this period</p>
                    ) : (
                      cashFlowData.cashInItems.map((i) => (
                        <div key={i.name} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{i.name}</span>
                          <span>{formatAmount(i.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                    <span>Total Cash In</span>
                    <span>{formatAmount(cashFlowData.totalCashIn)}</span>
                  </div>
                </div>

                {/* CASH OUT */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 border-b border-secondary pb-2">
                    CASH OUT
                  </h3>
                  <div className="space-y-2">
                    {cashFlowData.cashOutItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No cash out in this period</p>
                    ) : (
                      cashFlowData.cashOutItems.map((e) => (
                        <div key={e.name} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{e.name}</span>
                          <span>{formatAmount(e.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                    <span>Total Cash Out</span>
                    <span>{formatAmount(cashFlowData.totalCashOut)}</span>
                  </div>
                </div>
              </div>

              {/* Net Cash Flow & Closing Cash */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-secondary">
                <div className="flex justify-between items-center p-4 rounded-lg bg-secondary/50">
                  <span className="font-semibold">NET CASH FLOW</span>
                  <span
                    className={`text-lg font-bold ${
                      cashFlowData.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {cashFlowData.netCashFlow >= 0 ? '+' : ''}{formatAmount(cashFlowData.netCashFlow)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <span className="font-semibold">CLOSING CASH</span>
                  <span className="text-lg font-bold">{formatAmount(cashFlowData.closingCash)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Opening Cash + Cash In – Cash Out = Closing Cash
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default ReportCashFlow;
