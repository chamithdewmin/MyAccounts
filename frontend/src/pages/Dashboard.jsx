import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from "recharts";

// ─── DATA ────────────────────────────────────────────────────────────────────
const analyticsData = [
  { month: "Jan", income: 32000, outcome: 18000 },
  { month: "Feb", income: 29000, outcome: 15000 },
  { month: "Mar", income: 27000, outcome: 22000 },
  { month: "Apr", income: 35000, outcome: 20000 },
  { month: "May", income: 41000, outcome: 28000 },
  { month: "Jun", income: 33000, outcome: 19000 },
  { month: "Jul", income: 56456, outcome: 24000 },
  { month: "Aug", income: 28000, outcome: 17000 },
];

const activityData = [
  { day: "Mo", earning: 2800, spent: 1200 },
  { day: "Tu", earning: 1900, spent: 800 },
  { day: "We", earning: 2400, spent: 1800 },
  { day: "Th", earning: 3000, spent: 1400 },
  { day: "Fr", earning: 2200, spent: 900 },
  { day: "Sa", earning: 1500, spent: 600 },
  { day: "Su", earning: 1800, spent: 750 },
];

const payments = [
  { icon: "💳", label: "Account", spent: 3241, total: 10000, color: "#3b82f6" },
  { icon: "💻", label: "Software", spent: 241, total: 1250, color: "#22d3ee" },
  { icon: "🏠", label: "Rent House", spent: 1541, total: 52000, color: "#60a5fa" },
  { icon: "🍔", label: "Food", spent: 141, total: 1000, color: "#3b82f6" },
];

const totalIncome = 632000;
const totalOutcome = 280000;
const netProfit = totalIncome - totalOutcome;

// ─── MASTERCARD ───────────────────────────────────────────────────────────────
const MastercardIcon = () => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EB001B", marginRight: -10, zIndex: 1 }} />
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F79E1B" }} />
  </div>
);

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#1e2433", border: "1px solid #2a3347", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label} 2024</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: 12, margin: "2px 0" }}>
            ${p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconBg, label, value, badge, badgeColor }) => (
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
        <span style={{
          background: badgeColor === "green" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color: badgeColor === "green" ? "#22c55e" : "#ef4444",
          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
        }}>{badge}</span>
      </div>
      <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.03em" }}>{value}</p>
    </div>
  </div>
);

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const [activeBar, setActiveBar] = useState(null);

  const s = {
    page: {
      minHeight: "100vh",
      background: "#0c0e14",
      padding: 24,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
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
    <div style={s.page}>
      {/* HEADER */}
      <div style={{ marginBottom: 6 }}>
        <p style={{ color: "#8b9ab0", fontSize: 13, margin: 0 }}>Good morning, Alex 👋</p>
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "2px 0 20px", letterSpacing: "-0.02em" }}>
          Here's what's happening with your finances today.
        </h1>
      </div>

      {/* TOP STAT CARDS */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard icon="↙" iconBg="rgba(59,130,246,0.2)" label="Total Income" value="$632,000" badge="+3.23%" badgeColor="green" />
        <StatCard icon="↗" iconBg="rgba(239,68,68,0.15)" label="Total Outcome" value="$280,000" badge="-0.68%" badgeColor="red" />
        <StatCard icon="📈" iconBg="rgba(34,197,94,0.15)" label="Net Profit" value={`$${netProfit.toLocaleString()}`} badge="+12.5%" badgeColor="green" />
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
                <div style={{ background: "#1e2433", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#8b9ab0" }}>2024 ▾</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData} barGap={4} barCategoryGap={20}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 11 }} tickFormatter={v => `${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 10 }} tickFormatter={v => `$${v / 1000}k`} width={30} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="earning" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                  <Bar dataKey="spent" radius={[4, 4, 0, 0]} fill="#22d3ee" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PAYMENT */}
            <div style={s.card}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Payment</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {payments.map((p, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e2433", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{p.icon}</div>
                        <span style={{ color: "#d1d9e6", fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                      </div>
                      <span style={{ color: "#8b9ab0", fontSize: 11 }}>
                        <span style={{ color: "#fff", fontWeight: 600 }}>${p.spent.toLocaleString()}</span>/${p.total.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 3, background: "#1e2433", borderRadius: 99 }}>
                      <div style={{ height: 3, background: p.color, borderRadius: 99, width: `${(p.spent / p.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
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
            <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.02em" }}>$15,595.015</p>

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
                  <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.02em" }}>$5,750,20</p>
                </div>
                <MastercardIcon />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 22, position: "relative", zIndex: 1 }}>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", margin: 0 }}>5282 3456 7890 1289</p>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: 0 }}>09/25</p>
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
                <Pie data={[{ value: 75 }, { value: 25 }]} cx={100} cy={110} startAngle={180} endAngle={0} innerRadius={65} outerRadius={92} dataKey="value" strokeWidth={0}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#22d3ee" opacity={0.25} />
                </Pie>
              </PieChart>
            </div>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: 22, textAlign: "center", margin: "-20px 0 12px", letterSpacing: "-0.02em" }}>75%</p>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Daily payment</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "4px 0 0" }}>55%</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Hobby</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "4px 0 0" }}>20%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
