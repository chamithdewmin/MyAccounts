import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Home, Code, Utensils, CreditCard as CreditCardIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard } from '@/components/shared-assets/credit-card/credit-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { incomes, expenses, clients, invoices, totals, settings, addTransfer } = useFinance();
  const { user } = useAuth();
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

  // Calculate percentage change (mock data for now - can be enhanced with previous period comparison)
  const incomeChange = 3.23;
  const outcomeChange = -0.68;

  // Monthly data for Analytics chart
  const monthlyData = useMemo(() => {
    const map = new Map();
    const addToMap = (dateIso, field, amount) => {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const existing = map.get(key) || { name: label, Income: 0, Outcome: 0 };
      existing[field] += amount;
      map.set(key, existing);
    };

    incomes.forEach((i) => addToMap(i.date, 'Income', i.amount));
    expenses.forEach((e) => addToMap(e.date, 'Outcome', e.amount));

    return Array.from(map.values())
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
      })
      .slice(-8); // Last 8 months
  }, [incomes, expenses]);

  // Daily activity data (last 7 days)
  const dailyActivityData = useMemo(() => {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().slice(0, 10);
      
      const earning = incomes
        .filter((inc) => inc.date.startsWith(dayKey))
        .reduce((sum, inc) => sum + inc.amount, 0);
      
      const spent = expenses
        .filter((exp) => exp.date.startsWith(dayKey))
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      data.push({
        name: days[6 - i],
        Earning: earning,
        Spent: spent,
      });
    }
    return data;
  }, [incomes, expenses]);

  // Payment categories with progress
  const paymentCategories = useMemo(() => {
    const categories = [
      { name: 'Account', icon: CreditCardIcon, target: 10000 },
      { name: 'Software', icon: Code, target: 250 },
      { name: 'Rent House', icon: Home, target: 52000 },
      { name: 'Food', icon: Utensils, target: 1000 },
    ];

    return categories.map((cat) => {
      const spent = expenses
        .filter((e) => e.category?.toLowerCase().includes(cat.name.toLowerCase()))
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        ...cat,
        current: spent,
        percentage: Math.min((spent / cat.target) * 100, 100),
      };
    });
  }, [expenses]);

  // Activity breakdown for donut chart
  const activityBreakdown = useMemo(() => {
    const dailyPayment = expenses
      .filter((e) => {
        const date = new Date(e.date);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    const total = totals.monthlyExpenses || 1;
    const dailyPercent = Math.round((dailyPayment / total) * 100);
    const hobbyPercent = 20; // Mock data
    
    return [
      { name: 'Daily payment', value: dailyPercent, color: '#3B82F6' },
      { name: 'Hobby', value: hobbyPercent, color: '#60A5FA' },
    ];
  }, [expenses, totals.monthlyExpenses]);

  const cardBalance = (totals.cashInHand ?? 0) + (totals.bankBalance ?? 0);
  const currentBalance = totals.bankBalance ?? 0;

  // Format card number from bank details or use default
  const cardNumber = settings?.bankDetails?.accountNumber 
    ? settings.bankDetails.accountNumber.replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
    : '5282 3456 7890 1289';
  
  const cardHolder = user?.name?.toUpperCase() || 'CARD HOLDER';
  const cardExpiry = '09/25'; // Can be made dynamic

  const COLORS = ['#3B82F6', '#60A5FA'];

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

        {/* Top Row - Total Income and Total Outcome */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Income Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Income</p>
                <p className="text-3xl font-bold">{settings.currency} {totals.monthlyIncome.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ArrowDown className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {incomeChange >= 0 ? '+' : ''}{incomeChange}%
              </span>
              <span className="text-sm text-muted-foreground">from last month</span>
            </div>
          </motion.div>

          {/* Total Outcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Outcome</p>
                <p className="text-3xl font-bold">{settings.currency} {totals.monthlyExpenses.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ArrowUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${outcomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {outcomeChange >= 0 ? '+' : ''}{outcomeChange}%
              </span>
              <span className="text-sm text-muted-foreground">from last month</span>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Analytics and Activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* Analytics Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-lg p-6 border border-secondary"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Analytics</h2>
                <select className="bg-secondary border border-secondary rounded-md px-3 py-1 text-sm">
                  <option>2024</option>
                </select>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                  <span className="text-sm text-muted-foreground">Outcome</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={settings?.theme === 'light' ? 'hsl(214, 20%, 86%)' : '#1f2933'} />
                  <XAxis dataKey="name" stroke={settings?.theme === 'light' ? 'hsl(215, 15%, 35%)' : '#bfc9d1'} />
                  <YAxis stroke={settings?.theme === 'light' ? 'hsl(215, 15%, 35%)' : '#bfc9d1'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: settings?.theme === 'light' ? 'hsl(0, 0%, 100%)' : '#111316',
                      border: settings?.theme === 'light' ? '1px solid hsl(214, 20%, 86%)' : '1px solid #1f2933',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="Income" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Outcome" fill="#60A5FA" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Activity Section (Left) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-lg p-6 border border-secondary"
            >
              <h2 className="text-lg font-bold mb-4">Activity</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">Earning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                  <span className="text-sm text-muted-foreground">Spent</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={settings?.theme === 'light' ? 'hsl(214, 20%, 86%)' : '#1f2933'} />
                  <XAxis dataKey="name" stroke={settings?.theme === 'light' ? 'hsl(215, 15%, 35%)' : '#bfc9d1'} />
                  <YAxis stroke={settings?.theme === 'light' ? 'hsl(215, 15%, 35%)' : '#bfc9d1'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: settings?.theme === 'light' ? 'hsl(0, 0%, 100%)' : '#111316',
                      border: settings?.theme === 'light' ? '1px solid hsl(214, 20%, 86%)' : '1px solid #1f2933',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="Earning" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Spent" fill="#60A5FA" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Payment Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-lg p-6 border border-secondary"
            >
              <h2 className="text-lg font-bold mb-4">Payment</h2>
              <div className="space-y-4">
                {paymentCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {settings.currency} {category.current.toLocaleString()}/{category.target.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right Column - My Card and Activity Chart */}
          <div className="space-y-4">
            {/* My Card Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-lg p-6 border border-secondary"
            >
              <h2 className="text-lg font-bold mb-4">My Card</h2>
              <p className="text-sm text-muted-foreground mb-2">Card Balance</p>
              <p className="text-xl font-bold mb-4">{settings.currency} {cardBalance.toLocaleString()}</p>
              
              <div className="mb-4">
                <CreditCard
                  type="gray-dark"
                  company={settings.businessName || 'My Business'}
                  cardNumber={cardNumber}
                  cardHolder={cardHolder}
                  cardExpiration={cardExpiry}
                  width={280}
                />
              </div>

              <p className="text-sm font-medium mb-4">Current Balance {settings.currency} {currentBalance.toLocaleString()}</p>
              
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => {
                    setTransferType('cash-to-bank');
                    setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
                    setTransferOpen(true);
                  }}
                >
                  Manage Cards
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setTransferType('cash-to-bank');
                    setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
                    setTransferOpen(true);
                  }}
                >
                  Transfer
                </Button>
              </div>
            </motion.div>

            {/* Activity Chart (Right) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-lg p-6 border border-secondary"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Activity</h2>
                <select className="bg-secondary border border-secondary rounded-md px-3 py-1 text-sm">
                  <option>Month</option>
                </select>
              </div>
              
              <div className="relative flex items-center justify-center mb-6" style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={activityBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {activityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold">{activityBreakdown.reduce((sum, item) => sum + item.value, 0)}%</p>
                </div>
              </div>

              <div className="space-y-2">
                {activityBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
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
