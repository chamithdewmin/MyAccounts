import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, TrendingUp, Home, Code, Utensils, CreditCard as CreditCardIcon } from 'lucide-react';
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

  // Calculate percentage change (mock for now - can be enhanced with previous period comparison)
  const incomeChange = 3.23;
  const outcomeChange = -0.68;
  const profitChange = 12.5;

  // Monthly data for Analytics chart
  const analyticsData = useMemo(() => {
    const map = new Map();
    const addToMap = (dateIso, field, amount) => {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const existing = map.get(key) || { month: label, income: 0, outcome: 0 };
      existing[field] += amount;
      map.set(key, existing);
    };

    incomes.forEach((i) => addToMap(i.date, 'income', i.amount));
    expenses.forEach((e) => addToMap(e.date, 'outcome', e.amount));

    return Array.from(map.values())
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      })
      .slice(-8); // Last 8 months
  }, [incomes, expenses]);

  // Daily activity data (last 7 days)
  const activityData = useMemo(() => {
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
        day: days[6 - i],
        earning: earning,
        spent: spent,
      });
    }
    return data;
  }, [incomes, expenses]);

  // Payment categories with progress
  const payments = useMemo(() => {
    const categories = [
      { icon: '💳', label: 'Account', total: 10000, color: '#F97316' },
      { icon: '💻', label: 'Software', total: 250, color: '#FB923C' },
      { icon: '🏠', label: 'Rent House', total: 52000, color: '#FDBA74' },
      { icon: '🍔', label: 'Food', total: 1000, color: '#F97316' },
    ];

    return categories.map((cat) => {
      const spent = expenses
        .filter((e) => e.category?.toLowerCase().includes(cat.label.toLowerCase()))
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        ...cat,
        spent: spent,
      };
    });
  }, [expenses]);

  // Activity breakdown for pie chart
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
    const totalPercent = Math.min(dailyPercent + hobbyPercent, 100);
    
    return {
      dailyPercent: Math.min(dailyPercent, 75),
      hobbyPercent: Math.min(hobbyPercent, 25),
      totalPercent,
    };
  }, [expenses, totals.monthlyExpenses]);

  const cardBalance = (totals.cashInHand ?? 0) + (totals.bankBalance ?? 0);
  const currentBalance = totals.bankBalance ?? 0;

  // Format card number from bank details or use default
  const cardNumber = settings?.bankDetails?.accountNumber 
    ? settings.bankDetails.accountNumber.replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
    : '5282 3456 7890 1289';
  
  const cardHolder = user?.name?.toUpperCase() || 'CARD HOLDER';
  const cardExpiry = '09/25';
  const currentBalanceFormatted = `${settings.currency} ${currentBalance.toLocaleString()}`;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#1e2433', border: '1px solid #2a3347', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label} 2024</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, fontSize: 12, margin: '2px 0' }}>
              {settings.currency} {p.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Stat Card Component
  const StatCard = ({ icon, iconBg, label, value, badge, badgeColor }) => (
    <div style={{
      background: '#13161e',
      borderRadius: 16,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flex: 1,
      border: '1px solid #1e2433',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ color: '#8b9ab0', fontSize: 12, margin: 0, fontWeight: 500 }}>{label}</p>
          <span style={{
            background: badgeColor === 'green' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: badgeColor === 'green' ? '#22c55e' : '#ef4444',
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
          }}>{badge}</span>
        </div>
        <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.03em' }}>{value}</p>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Dashboard - MyAccounts</title>
        <meta name="description" content="Quick overview of your business income, expenses, profit, and pending payments" />
      </Helmet>

      <div style={{
        minHeight: '100vh',
        background: '#0c0e14',
        padding: 24,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#fff',
      }}>
        {/* HEADER */}
        <div style={{ marginBottom: 6 }}>
          <p style={{ color: '#8b9ab0', fontSize: 13, margin: 0 }}>Good morning, {user?.name?.split(' ')[0] || 'User'} 👋</p>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '2px 0 20px', letterSpacing: '-0.02em' }}>
            Here's what's happening with your finances today.
          </h1>
        </div>

        {/* TOP STAT CARDS */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <StatCard 
            icon="↙" 
            iconBg="rgba(249,115,22,0.2)" 
            label="Total Income" 
            value={`${settings.currency} ${totals.monthlyIncome.toLocaleString()}`} 
            badge={`+${incomeChange}%`} 
            badgeColor="green" 
          />
          <StatCard 
            icon="↗" 
            iconBg="rgba(239,68,68,0.15)" 
            label="Total Outcome" 
            value={`${settings.currency} ${totals.monthlyExpenses.toLocaleString()}`} 
            badge={`${outcomeChange}%`} 
            badgeColor="red" 
          />
          <StatCard 
            icon="📈" 
            iconBg="rgba(34,197,94,0.15)" 
            label="Net Profit" 
            value={`${settings.currency} ${totals.monthlyProfit.toLocaleString()}`} 
            badge={`+${profitChange}%`} 
            badgeColor="green" 
          />
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ANALYTICS */}
            <div style={{
              background: '#13161e',
              borderRadius: 20,
              border: '1px solid #1e2433',
              padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Analytics</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
                    <span style={{ color: '#8b9ab0', fontSize: 12 }}>Income</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FB923C' }} />
                    <span style={{ color: '#8b9ab0', fontSize: 12 }}>Outcome</span>
                  </div>
                  <div style={{ background: '#1e2433', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#8b9ab0' }}>2024 ▾</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analyticsData} barGap={4} barCategoryGap={20}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b9ab0', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b9ab0', fontSize: 11 }} tickFormatter={v => `${v / 1000}K`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="income" radius={[6, 6, 0, 0]} fill="#F97316" />
                  <Bar dataKey="outcome" radius={[6, 6, 0, 0]} fill="#FB923C" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* ACTIVITY */}
              <div style={{
                background: '#13161e',
                borderRadius: 20,
                border: '1px solid #1e2433',
                padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Activity</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F97316' }} />
                      <span style={{ color: '#8b9ab0', fontSize: 11 }}>Earning</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FB923C' }} />
                      <span style={{ color: '#8b9ab0', fontSize: 11 }}>Spent</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={activityData} barGap={2} barCategoryGap={14}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8b9ab0', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b9ab0', fontSize: 10 }} tickFormatter={v => `${settings.currency}${v / 1000}k`} width={30} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="earning" radius={[4, 4, 0, 0]} fill="#F97316" />
                    <Bar dataKey="spent" radius={[4, 4, 0, 0]} fill="#FB923C" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* PAYMENT */}
              <div style={{
                background: '#13161e',
                borderRadius: 20,
                border: '1px solid #1e2433',
                padding: 20,
              }}>
                <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Payment</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {payments.map((p, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e2433', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{p.icon}</div>
                          <span style={{ color: '#d1d9e6', fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                        </div>
                        <span style={{ color: '#8b9ab0', fontSize: 11 }}>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{settings.currency}{p.spent.toLocaleString()}</span>/{p.total.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ height: 3, background: '#1e2433', borderRadius: 99 }}>
                        <div style={{ height: 3, background: p.color, borderRadius: 99, width: `${(p.spent / p.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* MY CARD */}
            <div style={{
              background: '#13161e',
              borderRadius: 20,
              border: '1px solid #1e2433',
              padding: 20,
            }}>
              <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>My Card</h2>
              <p style={{ color: '#8b9ab0', fontSize: 12, margin: '0 0 2px' }}>Card Balance</p>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
                {settings.currency} {cardBalance.toLocaleString()}
              </p>

              {/* Credit Card */}
              <div className="mb-3">
                <CreditCard
                  type="orange"
                  company={settings.businessName || 'My Business'}
                  cardNumber={cardNumber}
                  cardHolder={cardHolder}
                  cardExpiration={cardExpiry}
                  width={280}
                  currentBalance={currentBalanceFormatted}
                />
              </div>

              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e2433' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e2433' }} />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => {
                    setTransferType('cash-to-bank');
                    setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
                    setTransferOpen(true);
                  }}
                  style={{ flex: 1, background: '#F97316', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Manage Cards
                </button>
                <button 
                  onClick={() => {
                    setTransferType('cash-to-bank');
                    setTransferForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
                    setTransferOpen(true);
                  }}
                  style={{ flex: 1, background: 'transparent', color: '#fff', border: '1.5px solid #2a3347', borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* ACTIVITY GAUGE */}
            <div style={{
              background: '#13161e',
              borderRadius: 20,
              border: '1px solid #1e2433',
              padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Activity</h3>
                <div style={{ background: '#1e2433', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#8b9ab0' }}>Month ▾</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={200} height={120}>
                  <Pie 
                    data={[{ value: activityBreakdown.dailyPercent }, { value: activityBreakdown.hobbyPercent }]} 
                    cx={100} 
                    cy={110} 
                    startAngle={180} 
                    endAngle={0} 
                    innerRadius={65} 
                    outerRadius={92} 
                    dataKey="value" 
                    strokeWidth={0}
                  >
                    <Cell fill="#F97316" />
                    <Cell fill="#FB923C" opacity={0.25} />
                  </Pie>
                </PieChart>
              </div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, textAlign: 'center', margin: '-20px 0 12px', letterSpacing: '-0.02em' }}>
                {activityBreakdown.totalPercent}%
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
                    <span style={{ color: '#8b9ab0', fontSize: 12 }}>Daily payment</span>
                  </div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '4px 0 0' }}>{activityBreakdown.dailyPercent}%</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FB923C' }} />
                    <span style={{ color: '#8b9ab0', fontSize: 12 }}>Hobby</span>
                  </div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '4px 0 0' }}>{activityBreakdown.hobbyPercent}%</p>
                </div>
              </div>
            </div>
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
