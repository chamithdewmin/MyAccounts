import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";

// ─── MASTERCARD ───────────────────────────────────────────────────────────────
const MastercardIcon = () => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EB001B", marginRight: -10, zIndex: 1 }} />
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F79E1B" }} />
  </div>
);

// ─── UPWARD TRENDING GRAPH ICON ───────────────────────────────────────────────
const UpwardTrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 14L7 10L10 13L17 6"
      stroke="#22c55e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 6L13 6L13 10"
      stroke="#22c55e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── CARD ICON ────────────────────────────────────────────────────────────────
const CardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10H22" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="16" y="14" width="4" height="3" rx="0.5" fill="#fff"/>
  </svg>
);

// ─── CASH ICON ────────────────────────────────────────────────────────────────
const CashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="7" width="20" height="12" rx="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 9H7M17 9H18M6 17H7M17 17H18" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#1e2433", border: "1px solid #2a3347", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: 12, margin: "2px 0" }}>
            {currency} {p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconBg, label, value, badge, badgeColor }) => {
  const isPositive = badgeColor === "green";
  const badgeBg = isPositive 
    ? "rgba(34,197,94,0.2)" 
    : "rgba(239,68,68,0.2)";
  const badgeTextColor = isPositive ? "#22c55e" : "#ef4444";
  const badgeGlow = isPositive
    ? "0 0 8px rgba(34,197,94,0.4), 0 0 4px rgba(34,197,94,0.2)"
    : "0 0 8px rgba(239,68,68,0.4), 0 0 4px rgba(239,68,68,0.2)";

  return (
    <div style={{
      background: "#13161e",
      borderRadius: 16,
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      flex: 1,
      border: "1px solid #1e2433",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ color: "#8b9ab0", fontSize: 12, margin: 0, fontWeight: 500 }}>{label}</p>
          {badge && (
            <span style={{
              background: badgeBg,
              color: badgeTextColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              boxShadow: badgeGlow,
              fontFamily: "'Inter', sans-serif",
            }}>{badge}</span>
          )}
        </div>
        <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.03em" }}>{value}</p>
      </div>
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const { incomes, expenses, totals, settings } = useFinance();
  const { user } = useAuth();
  const [activeBar, setActiveBar] = useState(null);

  // Get current year for display
  const currentYear = new Date().getFullYear();

  // Calculate monthly analytics for last 8 months
  const analyticsData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      let monthIncome = 0;
      let monthExpense = 0;
      
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        if (incomeDate.getFullYear() === date.getFullYear() && incomeDate.getMonth() === date.getMonth()) {
          monthIncome += income.amount || 0;
        }
      });
      
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getFullYear() === date.getFullYear() && expenseDate.getMonth() === date.getMonth()) {
          monthExpense += expense.amount || 0;
        }
      });
      
      months.push({
        month: monthLabel,
        income: monthIncome,
        outcome: monthExpense,
      });
    }
    
    return months;
  }, [incomes, expenses]);

  // Calculate weekly activity (current week)
  const activityData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const weekData = [];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      let earning = 0;
      let spent = 0;
      
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        incomeDate.setHours(0, 0, 0, 0);
        if (incomeDate >= dayStart && incomeDate <= dayEnd) {
          earning += income.amount || 0;
        }
      });
      
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0);
        if (expenseDate >= dayStart && expenseDate <= dayEnd) {
          spent += expense.amount || 0;
        }
      });
      
      weekData.push({
        day: days[i],
        earning,
        spent,
      });
    }
    
    return weekData;
  }, [incomes, expenses]);

  // Calculate expense categories for payments with percentage changes
  const payments = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    
    const categoryMap = {};
    const colors = ["#3b82f6", "#22d3ee", "#60a5fa", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
    
    // Helper function to determine if payment method is card/bank
    const isCardPayment = (paymentMethod) => {
      if (!paymentMethod) return false;
      const method = String(paymentMethod).toLowerCase().replace(/\s+/g, '_');
      return ['bank', 'card', 'online', 'online_transfer', 'online_payment'].includes(method);
    };
    
    // Calculate this month's spending by category and determine payment method
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const category = expense.category || 'Other';
      
      if (expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear) {
        if (!categoryMap[category]) {
          categoryMap[category] = { spent: 0, lastMonthSpent: 0, total: 0, cardAmount: 0, cashAmount: 0 };
        }
        categoryMap[category].spent += expense.amount || 0;
        if (isCardPayment(expense.paymentMethod)) {
          categoryMap[category].cardAmount += expense.amount || 0;
        } else {
          categoryMap[category].cashAmount += expense.amount || 0;
        }
      }
      
      // Calculate last month's spending for comparison
      if (expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear) {
        if (!categoryMap[category]) {
          categoryMap[category] = { spent: 0, lastMonthSpent: 0, total: 0, cardAmount: 0, cashAmount: 0 };
        }
        categoryMap[category].lastMonthSpent += expense.amount || 0;
      }
    });
    
    // Calculate percentage changes and totals
    return Object.entries(categoryMap)
      .map(([category, data]) => {
        const change = data.lastMonthSpent > 0
          ? (((data.spent - data.lastMonthSpent) / data.lastMonthSpent) * 100)
          : (data.spent > 0 ? 100 : 0);
        
        // Estimate total as 150% of spent for visualization
        const total = data.spent * 1.5;
        
        // Determine icon based on which payment method is more common
        const useCardIcon = data.cardAmount >= data.cashAmount;
        
        return {
          icon: useCardIcon ? <CardIcon /> : <CashIcon />,
          label: category,
          spent: data.spent,
          total: total,
          color: colors[Object.keys(categoryMap).indexOf(category) % colors.length],
          percentageChange: change,
        };
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 4); // Top 4 categories
  }, [expenses]);

  // Calculate activity percentages for gauge
  const activityPercentages = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const monthlyIncome = incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const monthlyExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const total = monthlyIncome + monthlyExpenses;
    if (total === 0) return { dailyPayment: 0, hobby: 0, total: 0 };
    
    const dailyPaymentPercent = total > 0 ? Math.round((monthlyIncome / total) * 100) : 0;
    const hobbyPercent = total > 0 ? Math.round((monthlyExpenses / total) * 100) : 0;
    
    return {
      dailyPayment: dailyPaymentPercent,
      hobby: hobbyPercent,
      total: dailyPaymentPercent + hobbyPercent,
    };
  }, [incomes, expenses]);

  // Format currency
  const formatCurrency = (amount) => {
    return `${settings.currency || ''} ${(amount || 0).toLocaleString()}`;
  };

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name || "there";
  const totalIncome = totals.yearlyIncome || 0;
  const totalOutcome = totals.yearlyExpenses || 0;
  const bankBalance = totals.bankBalance || 0;
  const cashBalance = totals.cashInHand || 0;
  const cardBalance = bankBalance + cashBalance;
  const pendingPayments = totals.pendingPayments || 0;

  // Calculate monthly profit (this month)
  const monthlyProfit = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const monthlyIncome = incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const monthlyExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return monthlyIncome - monthlyExpenses;
  }, [incomes, expenses]);

  // Calculate percentage changes (comparing this month to last month)
  const monthlyChange = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    
    const thisMonthIncome = incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const lastMonthIncome = incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const thisMonthExpense = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const lastMonthExpense = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const incomeChange = lastMonthIncome > 0 
      ? (((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(2)
      : "0.00";
    
    const expenseChange = lastMonthExpense > 0
      ? (((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100).toFixed(2)
      : "0.00";
    
    const profitChange = (thisMonthIncome - thisMonthExpense) - (lastMonthIncome - lastMonthExpense);
    const lastProfit = lastMonthIncome - lastMonthExpense;
    const profitChangePercent = lastProfit !== 0
      ? ((profitChange / Math.abs(lastProfit)) * 100).toFixed(2)
      : "0.00";
    
    return {
      income: incomeChange,
      expense: expenseChange,
      profit: profitChangePercent,
    };
  }, [incomes, expenses]);

  // Calculate percentage for pending payments (as percentage of total income)
  const pendingPaymentsPercentage = useMemo(() => {
    if (totalIncome === 0) return "0.00";
    return ((pendingPayments / totalIncome) * 100).toFixed(2);
  }, [pendingPayments, totalIncome]);

  const s = {
    page: {
      minHeight: "100vh",
      background: "#0c0e14",
      padding: 24,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: "#fff",
    },
    card: {
      background: "#13161e",
      borderRadius: 20,
      border: "1px solid #1e2433",
      padding: 20,
    },
    label: { color: "#8b9ab0", fontSize: 12, fontWeight: 500, margin: 0 },
    val: { color: "#fff", fontSize: 26, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.03em" },
  };

  return (
    <>
      <style>{`
        .dashboard-container,
        .dashboard-container * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .dashboard-container *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div className="dashboard-container" style={s.page}>
      {/* HEADER */}
      <div style={{ marginBottom: 6 }}>
        <p style={{ color: "#8b9ab0", fontSize: 13, margin: 0 }}>{getGreeting()}, {userName} 👋</p>
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "2px 0 20px", letterSpacing: "-0.02em" }}>
          Here's what's happening with your finances today.
        </h1>
      </div>

      {/* TOP STAT CARDS */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard 
          icon="↙" 
          iconBg="rgba(59,130,246,0.2)" 
          label="Total Income" 
          value={formatCurrency(totalIncome)} 
          badge={monthlyChange.income !== "0.00" ? `${parseFloat(monthlyChange.income) > 0 ? '+' : ''}${monthlyChange.income}%` : null}
          badgeColor={parseFloat(monthlyChange.income) >= 0 ? "green" : "red"} 
        />
        <StatCard 
          icon="↗" 
          iconBg="rgba(239,68,68,0.15)" 
          label="Total Outcome" 
          value={formatCurrency(totalOutcome)} 
          badge={monthlyChange.expense !== "0.00" ? `${parseFloat(monthlyChange.expense) > 0 ? '+' : ''}${monthlyChange.expense}%` : null}
          badgeColor={parseFloat(monthlyChange.expense) <= 0 ? "green" : "red"} 
        />
        <StatCard 
          icon={<UpwardTrendIcon />} 
          iconBg="rgba(34,197,94,0.15)" 
          label="Net Profit (This Month)" 
          value={formatCurrency(monthlyProfit)} 
          badge={monthlyChange.profit !== "0.00" ? `${parseFloat(monthlyChange.profit) > 0 ? '+' : ''}${monthlyChange.profit}%` : null}
          badgeColor={parseFloat(monthlyChange.profit) >= 0 ? "green" : "red"} 
        />
        <StatCard 
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="#eab308"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          iconBg="rgba(234,179,8,0.2)" 
          label="Pending Payments" 
          value={formatCurrency(pendingPayments)} 
          badge={pendingPaymentsPercentage !== "0.00" ? `${pendingPaymentsPercentage}%` : null}
          badgeColor="red"
        />
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ANALYTICS */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Analytics</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Income</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Outcome</span>
                </div>
                <div style={{ background: "#1e2433", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#8b9ab0" }}>{currentYear} ▾</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData} barGap={4} barCategoryGap={20}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip currency={settings.currency || ''} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="income" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                <Bar dataKey="outcome" radius={[6, 6, 0, 0]} fill="#22d3ee" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* ACTIVITY */}
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Activity</h3>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6" }} />
                    <span style={{ color: "#8b9ab0", fontSize: 11 }}>Earning</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d3ee" }} />
                    <span style={{ color: "#8b9ab0", fontSize: 11 }}>Spent</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={activityData} barGap={2} barCategoryGap={14}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 10 }} tickFormatter={v => `${settings.currency || ''}${(v / 1000).toFixed(0)}k`} width={30} />
                  <Tooltip content={<CustomTooltip currency={settings.currency || ''} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="earning" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                  <Bar dataKey="spent" radius={[4, 4, 0, 0]} fill="#22d3ee" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PAYMENT */}
            <div style={s.card}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Payment</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {payments.length > 0 ? payments.map((p, i) => {
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e2433", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {p.icon}
                          </div>
                          <span style={{ color: "#d1d9e6", fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                        </div>
                        <span style={{ color: "#8b9ab0", fontSize: 11 }}>
                          <span style={{ color: "#fff", fontWeight: 600 }}>{formatCurrency(p.spent)}</span>/{formatCurrency(p.total)}
                        </span>
                      </div>
                      <div style={{ height: 3, background: "#1e2433", borderRadius: 99 }}>
                        <div style={{ height: 3, background: p.color, borderRadius: 99, width: `${Math.min((p.spent / p.total) * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p style={{ color: "#8b9ab0", fontSize: 12, textAlign: "center", margin: "20px 0" }}>No expense data available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* MY CARD */}
          <div style={s.card}>
            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>My Card</h2>
            <p style={{ color: "#8b9ab0", fontSize: 12, margin: "0 0 2px" }}>Card Balance</p>
            <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.02em" }}>{formatCurrency(cardBalance)}</p>

            {/* Credit Card */}
            <div style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #3b82f6 100%)",
              padding: "18px 20px",
              marginBottom: 12,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 12px 30px rgba(37,99,235,0.4)",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 100%)", borderRadius: "16px 16px 0 0" }} />
              <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.07)", top: -50, right: -40 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>Current Balance</p>
                  <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.02em" }}>{formatCurrency(bankBalance)}</p>
                </div>
                <MastercardIcon />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 22, position: "relative", zIndex: 1 }}>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", margin: 0 }}>
                  {settings.bankDetails?.accountNumber?.replace(/(.{4})/g, '$1 ').trim() || '**** **** **** ****'}
                </p>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: 0 }}>
                  {new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1e2433" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1e2433" }} />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ flex: 1, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Manage Cards
              </button>
              <button style={{ flex: 1, background: "transparent", color: "#fff", border: "1.5px solid #2a3347", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Transfer
              </button>
            </div>
          </div>

          {/* ACTIVITY GAUGE */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Activity</h3>
              <div style={{ background: "#1e2433", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#8b9ab0" }}>Month ▾</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PieChart width={200} height={120}>
                <Pie 
                  data={[{ value: activityPercentages.dailyPayment || 0 }, { value: activityPercentages.hobby || 0 }]} 
                  cx={100} 
                  cy={110} 
                  startAngle={180} 
                  endAngle={0} 
                  innerRadius={65} 
                  outerRadius={92} 
                  dataKey="value" 
                  strokeWidth={0}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#22d3ee" opacity={0.25} />
                </Pie>
              </PieChart>
            </div>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: 22, textAlign: "center", margin: "-20px 0 12px", letterSpacing: "-0.02em" }}>
              {activityPercentages.total || 0}%
            </p>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Income</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "4px 0 0" }}>{activityPercentages.dailyPayment || 0}%</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Expenses</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "4px 0 0" }}>{activityPercentages.hobby || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
