import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Coins, DollarSign, Wallet, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import KpiCard from '@/components/KpiCard';
import { useFinance } from '@/contexts/FinanceContext';

const Dashboard = () => {
  const { incomes, expenses, clients, invoices, totals, settings } = useFinance();

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

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">See your business health in a few seconds.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(255, 106, 0, 0.2)' }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Cash in Hand / Bank Balance</span>
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
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(255, 106, 0, 0.2)' }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Income & Expenses (This Month)</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Income vs Expenses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                <XAxis dataKey="name" stroke="#bfc9d1" />
                <YAxis stroke="#bfc9d1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111316',
                    border: '1px solid #1f2933',
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
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Tax & Cash Flow Snapshot</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </>
  );
};

export default Dashboard;