import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Reports = () => {
  const [salesByDay, setSalesByDay] = useState([]);
  const [expenseByCategory, setExpenseByCategory] = useState([]);
  const { toast } = useToast();
  const { incomes, expenses, totals, settings } = useFinance();

  useEffect(() => {
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

    setSalesByDay(Array.from(map.values()));

    const byCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const expenseData = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
    }));
    setExpenseByCategory(expenseData);
  }, [incomes, expenses]);

  const COLORS = ['#ff6a00', '#ff8533', '#ffa366', '#ffc199', '#ffd9cc'];

  const handleExport = () => {
    toast({
      title: 'Export coming soon',
      description: 'You can already export expenses as CSV from the Expenses page.',
    });
  };

  const profitTrend = useMemo(
    () =>
      salesByDay.map((d) => ({
        ...d,
        profit: d.income - d.expenses,
      })),
    [salesByDay],
  );

  return (
    <>
      <Helmet>
        <title>Reports & Analytics - MyAccounts</title>
        <meta name="description" content="Analyze income, expenses, profit, and cash flow" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Deep dive into income, expenses, profit, and tax.
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cash flow over time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Cash Flow (Income vs Expenses)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                <XAxis dataKey="date" stroke="#bfc9d1" />
                <YAxis stroke="#bfc9d1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111316',
                    border: '1px solid #1f2933',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Expense breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Expense Breakdown by Category</h2>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111316',
                      border: '1px solid #1f2933',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-secondary p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly Profit</p>
            <p className="text-xl font-bold">
              {settings.currency} {totals.monthlyProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Yearly Profit</p>
            <p className="text-xl font-bold">
              {settings.currency} {totals.yearlyProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Tax (Year)</p>
            <p className="text-xl font-bold">
              {settings.currency} {totals.estimatedTaxYearly.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports;