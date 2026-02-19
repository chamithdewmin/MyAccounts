import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Coins, DollarSign, Wallet, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import KpiCard from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useFinance } from '@/contexts/FinanceContext';

const Dashboard = () => {
  const { incomes, expenses, clients, invoices, totals, settings, addTransfer } = useFinance();
  const { toast } = useToast();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferType, setTransferType] = useState('cash-to-bank');
  const [transferForm, setTransferForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = Number(transferForm.amount) || 0;
    if (amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a positive amount.', variant: 'destructive' });
      return;
    }
    if (transferType === 'cash-to-bank' && amount > (totals.cashInHand ?? 0)) {
      toast({ title: 'Insufficient cash', description: `You have ${settings.currency} ${(totals.cashInHand ?? 0).toLocaleString()} in hand.`, variant: 'destructive' });
      return;
    }
    if (transferType === 'bank-to-cash' && amount > (totals.bankBalance ?? 0)) {
      toast({ title: 'Insufficient bank balance', description: `Bank balance: ${settings.currency} ${(totals.bankBalance ?? 0).toLocaleString()}`, variant: 'destructive' });
      return;
    }
    try {
      await addTransfer({
        fromAccount: transferType === 'cash-to-bank' ? 'cash' : 'bank',
        toAccount: transferType === 'cash-to-bank' ? 'bank' : 'cash',
        amount,
        date: transferForm.date,
        notes: transferForm.notes,
      });
      toast({ title: 'Transfer recorded', description: `${settings.currency} ${amount.toLocaleString()} ${transferType === 'cash-to-bank' ? 'deposited to bank' : 'withdrawn to cash'}.` });
      setTransferOpen(false);
      setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    } catch (err) {
      toast({ title: 'Transfer failed', description: err.message, variant: 'destructive' });
    }
  };

  const incomeVsExpenseData = useMemo(() => {
    const map = new Map();

    const addToMap = (dateIso, field, amount) => {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = map.get(key) || { name: label, income: 0, expenses: 0 };
      existing[field] += amount;
      map.set(key, existing);
    };

    incomes.forEach((i) => addToMap(i.date, 'income', i.amount));
    expenses.forEach((e) => addToMap(e.date, 'expenses', e.amount));

    return Array.from(map.values()).sort((a, b) => {
      const [am, ay] = a.name.split(' ');
      const [bm, by] = b.name.split(' ');
      const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return Number(ay) === Number(by)
        ? monthOrder.indexOf(am) - monthOrder.indexOf(bm)
        : Number(ay) - Number(by);
    });
  }, [incomes, expenses]);

  return (
    <>
      <Helmet>
        <title>Dashboard - MyAccounts</title>
        <meta name="description" content="Quick overview of your business income, expenses, profit, and pending payments" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">See your business health in a few seconds.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(255, 106, 0, 0.2)' }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-lg p-4 sm:p-6 border border-secondary min-w-0"
          >
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white stroke-2" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Cash in Hand / Bank Balance</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cash in Hand</span>
                <span className={`text-lg font-bold ${(totals.cashInHand ?? 0) >= 0 ? '' : 'text-red-500'}`}>
                  {settings.currency} {(totals.cashInHand ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-secondary pt-3">
                <span className="text-sm text-muted-foreground">Bank Balance</span>
                <span className={`text-lg font-bold ${(totals.bankBalance ?? 0) >= 0 ? '' : 'text-red-500'}`}>
                  {settings.currency} {(totals.bankBalance ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-secondary">
                <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => { setTransferType('cash-to-bank'); setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' }); setTransferOpen(true); }}>
                  <ArrowRightLeft className="w-4 h-4 mr-1 shrink-0" />
                  <span className="truncate">Deposit to Bank</span>
                </Button>
                <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => { setTransferType('bank-to-cash'); setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' }); setTransferOpen(true); }}>
                  <ArrowRightLeft className="w-4 h-4 mr-1 shrink-0" />
                  Withdraw
                </Button>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(255, 106, 0, 0.2)' }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-lg p-4 sm:p-6 border border-secondary min-w-0"
          >
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Income & Expenses (This Month)</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Income</span>
                <span className="text-lg font-bold text-green-500">
                  {settings.currency} {totals.monthlyIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-secondary pt-3">
                <span className="text-sm text-muted-foreground">Total Expenses</span>
                <span className="text-lg font-bold text-red-500">
                  {settings.currency} {totals.monthlyExpenses.toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
          <KpiCard
            title="Net Profit (This Month)"
            value={`${settings.currency} ${totals.monthlyProfit.toLocaleString()}`}
            icon={Coins}
            trend={0}
            trendUp={totals.monthlyProfit >= 0}
          />
          <KpiCard
            title="Pending Payments"
            value={`${settings.currency} ${totals.pendingPayments.toLocaleString()}`}
            icon={AlertTriangle}
            trend={0}
            trendUp={false}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Income vs Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-4 sm:p-6 border border-secondary min-w-0 overflow-hidden"
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Income vs Expenses</h2>
            <ResponsiveContainer width="100%" height={280} className="min-h-[280px]">
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={settings?.theme === 'light' ? 'hsl(214, 20%, 86%)' : '#1f2933'}
                />
                <XAxis
                  dataKey="name"
                  stroke={settings?.theme === 'light' ? 'hsl(215, 15%, 35%)' : '#bfc9d1'}
                />
                <YAxis
                  stroke={settings?.theme === 'light' ? 'hsl(215, 15%, 35%)' : '#bfc9d1'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: settings?.theme === 'light' ? 'hsl(0, 0%, 100%)' : '#111316',
                    border:
                      settings?.theme === 'light'
                        ? '1px solid hsl(214, 20%, 86%)'
                        : '1px solid #1f2933',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Tax Estimation & Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg p-4 sm:p-6 border border-secondary min-w-0"
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Tax & Cash Flow Snapshot</h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-secondary rounded-lg p-4 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly Profit</p>
                  <p className="text-xl font-bold">
                    {settings.currency} {totals.monthlyProfit.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Profit = Income – Expenses
                  </p>
                </div>
                <div className="bg-secondary rounded-lg p-4 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Tax (This Month)</p>
                  <p className="text-xl font-bold">
                    {settings.currency} {totals.estimatedTaxMonthly.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tax {settings.taxRate}% on positive profit
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-secondary rounded-lg p-4 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Yearly Profit</p>
                  <p className="text-xl font-bold">
                    {settings.currency} {totals.yearlyProfit.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary rounded-lg p-4 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Tax (Year)</p>
                  <p className="text-xl font-bold">
                    {settings.currency} {totals.estimatedTaxYearly.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transferType === 'cash-to-bank' ? 'Deposit Cash to Bank' : 'Withdraw from Bank'}
            </DialogTitle>
            <DialogDescription>
              {transferType === 'cash-to-bank' ? 'Record cash deposited from hand into your bank account.' : 'Record cash withdrawn from bank to hand.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <Label>Amount ({settings.currency})</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={(e) => setTransferForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={transferForm.notes}
                onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Daily deposit"
              />
            </div>
            <Button type="submit" className="w-full">
              {transferType === 'cash-to-bank' ? 'Deposit to Bank' : 'Withdraw to Cash'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;