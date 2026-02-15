import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Plus, Trash2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { getPrintHtml, downloadReportPdf } from '@/utils/pdfPrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const filterByDate = (items, asAtDate, dateKey = 'date') => {
  if (!asAtDate) return items;
  const end = new Date(asAtDate);
  end.setHours(23, 59, 59, 999);
  return items.filter((i) => new Date(i[dateKey]) <= end);
};

const BalanceSheet = () => {
  const { incomes, expenses, invoices, assets, loans, settings, addAsset, deleteAsset, addLoan, deleteLoan, loadData } =
    useFinance();
  const { toast } = useToast();

  const [asAtDate, setAsAtDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', amount: '' });
  const [newLoan, setNewLoan] = useState({ name: '', amount: '' });

  const asAt = useMemo(() => new Date(asAtDate + 'T23:59:59'), [asAtDate]);

  const balanceData = useMemo(() => {
    // Date rule: include ONLY transactions on or before selected date
    const filteredIncomes = filterByDate(incomes, asAt);
    const filteredExpenses = filterByDate(expenses, asAt);
    const filteredAssets = filterByDate(assets, asAt, 'date');
    const filteredLoans = filterByDate(loans, asAt, 'date');

    const openingCash = Number(settings.openingCash) || 0;
    const paidIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
    const paidExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    // 1. ASSETS
    // Cash & Bank = Opening Cash + Paid Income − Paid Expenses
    const cashAndBank = openingCash + paidIncome - paidExpenses;

    // Receivables = Total Unpaid Invoices
    const receivables = invoices
      .filter((inv) => inv.status !== 'paid' && new Date(inv.createdAt) <= asAt)
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    // Equipment = Total Asset Purchase Value
    const equipment = filteredAssets.reduce((s, a) => s + a.amount, 0);

    const totalAssets = cashAndBank + receivables + equipment;

    // 2. LIABILITIES
    // Payables = Total Unpaid Bills (from settings until bills feature exists)
    const payables = Number(settings.payables) || 0;

    // Loans = Outstanding Loan Balance
    const loansTotal = filteredLoans.reduce((s, l) => s + l.amount, 0);

    // Taxes = Unpaid Tax Amount (estimated)
    const totalProfit = paidIncome - paidExpenses;
    const taxes = settings.taxEnabled && totalProfit > 0 ? (totalProfit * settings.taxRate) / 100 : 0;

    const totalLiabilities = payables + loansTotal + taxes;

    // 3. OWNER'S EQUITY (AUTO): Total Assets − Total Liabilities
    const ownersEquity = totalAssets - totalLiabilities;

    // Optional breakdown: Owner Capital + Retained Profit
    const ownerCapital = Number(settings.ownerCapital) || 0;
    const retainedProfit = ownersEquity - ownerCapital;

    // 4. BALANCE VALIDATION: Assets must equal Liabilities + Owner's Equity
    const sumLiabilitiesAndEquity = totalLiabilities + ownersEquity;
    const isBalanced = Math.abs(totalAssets - sumLiabilitiesAndEquity) < 0.01;

    return {
      assets: {
        openingCash,
        cashAndBank,
        receivables,
        equipment,
        total: totalAssets,
      },
      liabilities: {
        payables,
        loans: loansTotal,
        taxes,
        total: totalLiabilities,
      },
      ownersEquity,
      ownerCapital,
      retainedProfit,
      totalProfit,
      isBalanced,
    };
  }, [incomes, expenses, invoices, assets, loans, asAt, settings.taxEnabled, settings.taxRate, settings.openingCash, settings.ownerCapital, settings.payables]);

  const formatAmount = (n) => `${settings.currency} ${(n ?? 0).toLocaleString()}`;

  const handleAddAsset = () => {
    if (!newAsset.amount || Number(newAsset.amount) <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount.' });
      return;
    }
    addAsset({ name: newAsset.name || 'Equipment', amount: newAsset.amount });
    setNewAsset({ name: '', amount: '' });
    setAssetDialogOpen(false);
    toast({ title: 'Asset added', description: 'Asset has been added to the balance sheet.' });
  };

  const handleAddLoan = () => {
    if (!newLoan.amount || Number(newLoan.amount) <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount.' });
      return;
    }
    addLoan({ name: newLoan.name || 'Loan', amount: newLoan.amount });
    setNewLoan({ name: '', amount: '' });
    setLoanDialogOpen(false);
    toast({ title: 'Loan added', description: 'Loan has been added to the balance sheet.' });
  };

  const handleExportCSV = () => {
    const dateStr = asAtDate.replace(/-/g, '');
    const rows = [
      ['Balance Sheet', `As at ${new Date(asAtDate).toLocaleDateString()}`],
      ['Balanced', balanceData.isBalanced ? 'Yes' : 'No'],
      [],
      ['ASSETS', ''],
      ['Cash & Bank', balanceData.assets.cashAndBank],
      ['Receivables', balanceData.assets.receivables],
      ['Equipment', balanceData.assets.equipment],
      ['Total Assets', balanceData.assets.total],
      [],
      ['LIABILITIES', ''],
      ['Payables', balanceData.liabilities.payables],
      ['Loans', balanceData.liabilities.loans],
      ['Taxes', balanceData.liabilities.taxes],
      ['Total Liabilities', balanceData.liabilities.total],
      [],
      ['OWNER\'S EQUITY', ''],
      ['Owner Capital', balanceData.ownerCapital],
      ['Retained Profit', balanceData.retainedProfit],
      ['Total Owner\'s Equity', balanceData.ownersEquity],
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${dateStr}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Balance sheet exported to CSV' });
  };

  const handleDownloadPDF = async () => {
    const dateLabel = new Date(asAtDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const innerContent = `
      <h1>Balance Sheet</h1>
      <p><strong>As at ${dateLabel}</strong></p>
      <p>${balanceData.isBalanced ? '✓ Balanced' : '⚠ NOT BALANCED'}</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#f5f5f5;"><strong>ASSETS</strong></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Cash & Bank</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.assets.cashAndBank)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Receivables</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.assets.receivables)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Equipment</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.assets.equipment)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Assets</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(balanceData.assets.total)}</strong></td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#f5f5f5;"><strong>LIABILITIES</strong></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Payables</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.liabilities.payables)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Loans</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.liabilities.loans)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Taxes</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.liabilities.taxes)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Liabilities</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(balanceData.liabilities.total)}</strong></td></tr>
        <tr><td colspan="2" style="padding:12px;"></td></tr>
        <tr><td colspan="2" style="padding:8px; border:1px solid #ccc; background:#f5f5f5;"><strong>OWNER'S EQUITY</strong></td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Owner Capital</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.ownerCapital)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;">Retained Profit</td><td style="padding:8px; border:1px solid #ccc; text-align:right;">${formatAmount(balanceData.retainedProfit)}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ccc;"><strong>Total Owner's Equity</strong></td><td style="padding:8px; border:1px solid #ccc; text-align:right;"><strong>${formatAmount(balanceData.ownersEquity)}</strong></td></tr>
      </table>
    `;
    const fullHtml = getPrintHtml(innerContent, { logo: settings?.logo, businessName: settings?.businessName });
    const dateStr = asAtDate.replace(/-/g, '');
    await downloadReportPdf(fullHtml, `balance-sheet-${dateStr}.pdf`);
    toast({ title: 'PDF downloaded', description: 'Balance sheet saved to your device' });
  };

  const dateLabel = new Date(asAtDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>Balance Sheet - MyAccounts</title>
        <meta name="description" content="View your business assets, liabilities, and owner's equity" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Balance Sheet</h1>
            <p className="text-muted-foreground">
              Snapshot of what your business owns, owes, and your equity
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="as-at-date" className="text-sm whitespace-nowrap">
                As at
              </Label>
              <Input
                id="as-at-date"
                type="date"
                value={asAtDate}
                onChange={(e) => setAsAtDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button variant="outline" onClick={() => { loadData(); toast({ title: 'Refreshed', description: 'Data refreshed' }); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border border-secondary"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Balance Sheet – As at {dateLabel}
          </h2>

          {/* Balance validation */}
          {!balanceData.isBalanced && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive mb-6">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">NOT BALANCED: Assets ≠ Liabilities + Owner's Equity</span>
            </div>
          )}
          {balanceData.isBalanced && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 mb-6">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Balanced: Assets = Liabilities + Owner's Equity</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ASSETS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b border-secondary pb-2">ASSETS</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash & Bank</span>
                  <span className="font-medium">{formatAmount(balanceData.assets.cashAndBank)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receivables</span>
                  <span className="font-medium">{formatAmount(balanceData.assets.receivables)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Equipment</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatAmount(balanceData.assets.equipment)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setAssetDialogOpen(true)}
                      title="Add asset"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                <span>Total Assets</span>
                <span>{formatAmount(balanceData.assets.total)}</span>
              </div>
            </div>

            {/* LIABILITIES */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b border-secondary pb-2">LIABILITIES</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payables</span>
                  <span className="font-medium">{formatAmount(balanceData.liabilities.payables)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Loans</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatAmount(balanceData.liabilities.loans)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setLoanDialogOpen(true)}
                      title="Add loan"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="font-medium">{formatAmount(balanceData.liabilities.taxes)}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                <span>Total Liabilities</span>
                <span>{formatAmount(balanceData.liabilities.total)}</span>
              </div>
            </div>

            {/* OWNER'S EQUITY (AUTO) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b border-secondary pb-2">
                OWNER'S EQUITY
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Capital</span>
                  <span className="font-medium">{formatAmount(balanceData.ownerCapital)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retained Profit</span>
                  <span className="font-medium">{formatAmount(balanceData.retainedProfit)}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-secondary font-semibold">
                <span>Total Owner's Equity</span>
                <span>{formatAmount(balanceData.ownersEquity)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Auto: Total Assets − Total Liabilities
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Assets = Liabilities + Owner's Equity. Calculated only — no manual edits. Set Opening Cash, Owner Capital & Payables in Settings.
          </p>
        </motion.div>

        {/* Optional: List of assets and loans for management */}
        {(assets.length > 0 || loans.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {assets.length > 0 && (
              <div className="bg-card rounded-lg p-4 border border-secondary">
                <h3 className="font-semibold mb-3">Your Assets</h3>
                <ul className="space-y-2">
                  {assets.map((a) => (
                    <li key={a.id} className="flex justify-between items-center text-sm">
                      <span>{a.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatAmount(a.amount)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            deleteAsset(a.id);
                            toast({ title: 'Asset removed', description: 'Asset has been removed.' });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {loans.length > 0 && (
              <div className="bg-card rounded-lg p-4 border border-secondary">
                <h3 className="font-semibold mb-3">Your Loans</h3>
                <ul className="space-y-2">
                  {loans.map((l) => (
                    <li key={l.id} className="flex justify-between items-center text-sm">
                      <span>{l.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatAmount(l.amount)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            deleteLoan(l.id);
                            toast({ title: 'Loan removed', description: 'Loan has been removed.' });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Add Asset Dialog */}
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name (e.g. Laptop, Equipment)</Label>
              <Input
                placeholder="Equipment"
                value={newAsset.name}
                onChange={(e) => setNewAsset((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0"
                value={newAsset.amount}
                onChange={(e) => setNewAsset((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAsset}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Loan Dialog */}
      <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name (e.g. Bank Loan)</Label>
              <Input
                placeholder="Loan"
                value={newLoan.name}
                onChange={(e) => setNewLoan((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0"
                value={newLoan.amount}
                onChange={(e) => setNewLoan((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLoan}>Add Loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BalanceSheet;
