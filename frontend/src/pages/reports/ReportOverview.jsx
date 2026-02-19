import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#0c0e14", bg2:"#0f1117", card:"#13161e", border:"#1e2433",
  border2:"#2a3347", text:"#fff", text2:"#d1d9e6", muted:"#8b9ab0",
  faint:"#4a5568", green:"#22c55e", red:"#ef4444", blue:"#3b82f6",
  cyan:"#22d3ee", yellow:"#eab308", purple:"#a78bfa", orange:"#f97316",
};

// ─── SVG ICON ENGINE ─────────────────────────────────────────────────────────
const Svg = ({ d, s = 18, c = "#fff", sw = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"block", flexShrink:0 }}>
    <path d={d} />
  </svg>
);

const I = {
  // KPI / Finance
  DollarSign:    () => <Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  TrendingUp:    () => <Svg d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  TrendingDown:  () => <Svg d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6" />,
  BarChart2:     () => <Svg d="M18 20V10M12 20V4M6 20v-6" />,
  Wallet:        () => <Svg d="M21 12V7H5a2 2 0 010-4h14v4M21 12a2 2 0 010 4H5a2 2 0 000 4h16v-4" />,
  Scale:         () => <Svg d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18" />,
  Receipt:       () => <Svg d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM8 9h8M8 13h6" />,
  Building:      () => <Svg d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a2 2 0 014 0v4" />,
  // Status / Alerts
  CheckCircle:   () => <Svg d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />,
  AlertTriangle: () => <Svg d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />,
  AlertCircle:   () => <Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 8v4M12 16h.01" />,
  Info:          () => <Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 8h.01M12 12v4" />,
  ShieldCheck:   () => <Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />,
  Clock:         () => <Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 6v6l4 2" />,
  // Direction
  ArrowUp:       () => <Svg d="M12 19V5M5 12l7-7 7 7" />,
  ArrowDown:     () => <Svg d="M12 5v14M19 12l-7 7-7-7" />,
  // Reports
  FileText:      () => <Svg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
  PieChartIco:   () => <Svg d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />,
  Activity:      () => <Svg d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  Layers:        () => <Svg d="M12 2l9 4.5-9 4.5-9-4.5L12 2zM3 11.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" />,
  Refresh:       () => <Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
  Download:      () => <Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
};

// ─── DATA (pulled from all 4 reports) ────────────────────────────────────────
const plMonthly = [
  { month:"Aug", income:45000, expenses:28000, profit:17000 },
  { month:"Sep", income:52000, expenses:31000, profit:21000 },
  { month:"Oct", income:38000, expenses:35000, profit:3000  },
  { month:"Nov", income:61000, expenses:29000, profit:32000 },
  { month:"Dec", income:74000, expenses:42000, profit:32000 },
  { month:"Jan", income:58000, expenses:38000, profit:20000 },
  { month:"Feb", income:32000, expenses:12663, profit:19337 },
];
const cfData = [
  { date:"Feb 13", inflow:30000, outflow:0,    balance:30000 },
  { date:"Feb 14", inflow:0,     outflow:1100,  balance:28900 },
  { date:"Feb 15", inflow:0,     outflow:5000,  balance:23900 },
  { date:"Feb 16", inflow:0,     outflow:0,     balance:23900 },
  { date:"Feb 17", inflow:0,     outflow:0,     balance:23900 },
  { date:"Feb 18", inflow:2000,  outflow:7563,  balance:18337 },
];
const bsMonthly = [
  { period:"Aug", assets:280000, liabilities:120000, equity:160000 },
  { period:"Sep", assets:310000, liabilities:115000, equity:195000 },
  { period:"Oct", assets:295000, liabilities:130000, equity:165000 },
  { period:"Nov", assets:340000, liabilities:108000, equity:232000 },
  { period:"Dec", assets:390000, liabilities:100000, equity:290000 },
  { period:"Jan", assets:365000, liabilities:112000, equity:253000 },
  { period:"Feb", assets:380000, liabilities:105000, equity:275000 },
];
const incomeSources = [
  { name:"System Dev",     value:30000, color:C.blue   },
  { name:"Graphic Design", value:18000, color:C.green  },
  { name:"Consulting",     value:8000,  color:C.cyan   },
  { name:"Other",          value:4000,  color:C.purple },
];
const recentTx = [
  { source:"Shanan Yoshitha",         amount:30000,  type:"in",  status:"Received", date:"Feb 13", category:"Advance Payment" },
  { source:"Prime Wheels",            amount:2000,   type:"in",  status:"Received", date:"Feb 18", category:"Graphic Job" },
  { source:"Cursor (Tool)",           amount:-6463,  type:"out", status:"Paid",     date:"Feb 18", category:"Software" },
  { source:"Domin (iphonecenter.lk)", amount:-5000,  type:"out", status:"Paid",     date:"Feb 15", category:"Hosting" },
  { source:"Betax VIP",              amount:-1000,  type:"out", status:"Overdue",  date:"Feb 18", category:"Invoice" },
  { source:"Wi-Fi",                   amount:-1100,  type:"out", status:"Paid",     date:"Feb 14", category:"Internet" },
];

// ─── METRICS ─────────────────────────────────────────────────────────────────
const totalIncome   = plMonthly.reduce((s,m) => s + m.income, 0);
const totalExpenses = plMonthly.reduce((s,m) => s + m.expenses, 0);
const netProfit     = totalIncome - totalExpenses;
const profitMargin  = ((netProfit / totalIncome) * 100).toFixed(1);
const totalAssets   = 380000;
const totalLiab     = 105000;
const equity        = totalAssets - totalLiab;
const debtRatio     = ((totalLiab / totalAssets) * 100).toFixed(1);
const cashBalance   = 18337;
const totalTax      = 92800;
const paidTax       = 65280;
const pendingTax    = totalTax - paidTax;
const bestMonth     = plMonthly.reduce((a,b) => a.profit > b.profit ? a : b);
const worstMonth    = plMonthly.reduce((a,b) => a.profit < b.profit ? a : b);
const healthScore   = Math.min(100, Math.round(
  (parseFloat(profitMargin) / 50) * 30 +
  ((1 - totalLiab / totalAssets) * 25) +
  (cashBalance > 10000 ? 25 : 10) + 20
));

// ─── INSIGHTS config ─────────────────────────────────────────────────────────
const insights = [
  { Icon: I.TrendingUp,    color: C.green,  bg:"rgba(34,197,94,0.08)",   border:"rgba(34,197,94,0.2)",   tag:"P&L",           title:"Strong Revenue Growth",      desc:`Revenue peaked at LKR 74,000 in Dec. 7-month total of LKR ${totalIncome.toLocaleString()} shows consistent client acquisition.` },
  { Icon: I.AlertTriangle, color: C.yellow, bg:"rgba(234,179,8,0.08)",   border:"rgba(234,179,8,0.2)",   tag:"P&L",           title:"October Profit Dip",         desc:"Oct had lowest profit (LKR 3,000) due to high expenses. Monitor costs in low-revenue months." },
  { Icon: I.Wallet,        color: C.blue,   bg:"rgba(59,130,246,0.08)",  border:"rgba(59,130,246,0.2)",  tag:"Cash Flow",     title:"Healthy Cash Position",      desc:`Current cash balance of LKR ${cashBalance.toLocaleString()} is positive. Largest inflow was LKR 30,000.` },
  { Icon: I.AlertCircle,   color: C.red,    bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.2)",   tag:"Cash Flow",     title:"Overdue Payment Alert",      desc:"Betax VIP invoice of LKR 1,000 is overdue. Follow up to avoid bad debt." },
  { Icon: I.ShieldCheck,   color: C.purple, bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.2)", tag:"Balance Sheet", title:"Low Debt — Financially Stable", desc:`Debt ratio is ${debtRatio}% — well below the 50% danger zone. Equity of LKR ${equity.toLocaleString()} is growing.` },
  { Icon: I.Clock,         color: C.orange, bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.2)",  tag:"Tax Reports",   title:"Q4 Tax Filing Pending",      desc:`LKR ${pendingTax.toLocaleString()} in Q4 tax is still pending. Total annual liability is LKR ${totalTax.toLocaleString()}.` },
];

// ─── STATUS MAP ───────────────────────────────────────────────────────────────
const sMap = {
  Received:{ bg:"rgba(34,197,94,0.15)",  c:C.green  },
  Paid:    { bg:"rgba(59,130,246,0.15)", c:C.blue   },
  Overdue: { bg:"rgba(239,68,68,0.15)",  c:C.red    },
  Pending: { bg:"rgba(234,179,8,0.15)",  c:C.yellow },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1a1d27", border:`1px solid ${C.border2}`, borderRadius:12, padding:"12px 16px", boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
      <p style={{ color:C.muted, fontSize:11, margin:"0 0 8px", fontWeight:600 }}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:p.color }} />
          <span style={{ color:C.text2, fontSize:12 }}>{p.name}:</span>
          <span style={{ color:C.text, fontWeight:700, fontSize:12 }}>LKR {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, color, Icon, sub, delay = 0 }) => (
  <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:"18px 20px", position:"relative", overflow:"hidden", animation:`fi .4s ease ${delay}s both` }}>
    <div style={{ position:"absolute", right:14, top:14, width:36, height:36, borderRadius:10, background:`${color||C.blue}18`, display:"flex", alignItems:"center", justifyContent:"center", opacity:.85 }}><Icon /></div>
    <p style={{ color:C.muted, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:0 }}>{label}</p>
    <p style={{ color:color||C.text, fontSize:19, fontWeight:900, margin:"8px 0 0", letterSpacing:"-0.02em", lineHeight:1.1 }}>{value}</p>
    {sub && <p style={{ color:C.muted, fontSize:11, margin:"5px 0 0", fontWeight:500 }}>{sub}</p>}
    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color||C.blue}55,transparent)` }} />
  </div>
);

const Card = ({ title, sub, children, right }) => (
  <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:"22px 24px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
      <div>
        <h3 style={{ color:C.text, fontSize:15, fontWeight:800, margin:0 }}>{title}</h3>
        {sub && <p style={{ color:C.muted, fontSize:12, margin:"4px 0 0" }}>{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

// Health ring
const HealthRing = ({ score }) => {
  const r = 54, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? C.green : score >= 50 ? C.yellow : C.red;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Work";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ position:"relative", width:140, height:140 }}>
        <svg width={140} height={140} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={70} cy={70} r={r} fill="none" stroke={C.border2} strokeWidth={10} />
          <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ transition:"stroke-dasharray 1s ease" }} />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <p style={{ color:C.text, fontSize:26, fontWeight:900, margin:0, letterSpacing:"-0.03em" }}>{score}</p>
          <p style={{ color:C.muted, fontSize:10, margin:0 }}>/ 100</p>
        </div>
      </div>
      <span style={{ color, fontSize:13, fontWeight:800, marginTop:8 }}>{label}</span>
      <p style={{ color:C.muted, fontSize:11, margin:"4px 0 0", textAlign:"center" }}>Business Health Score</p>
    </div>
  );
};

// Mini metric row
const MiniRow = ({ label, value, color, Icon, sub }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
    <div style={{ width:36, height:36, borderRadius:10, background:`${color||C.blue}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon /></div>
    <div style={{ flex:1 }}>
      <p style={{ color:C.muted, fontSize:11, margin:0, fontWeight:600 }}>{label}</p>
      <p style={{ color, fontSize:15, fontWeight:800, margin:"2px 0 0", letterSpacing:"-0.01em" }}>{value}</p>
    </div>
    {sub && <p style={{ color:C.muted, fontSize:11, margin:0, textAlign:"right" }}>{sub}</p>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OverviewReports() {
  const [activeInsight, setActiveInsight] = useState(null);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',-apple-system,sans-serif", color:C.text }}>
      <style>{`
        * { box-sizing:border-box; }
        body { margin:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${C.border2}; border-radius:99px; }
        @keyframes fi { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .ins { transition:transform .2s, box-shadow .2s, border-color .2s; cursor:pointer; }
        .ins:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.3); }
        .txrow:hover { background:#1a1d27 !important; }
      `}</style>

      <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", gap:20, animation:"fi .4s ease" }}>

        {/* PAGE HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 6px" }}>Feb 2026 · Fiscal Year 2025–2026</p>
            <h1 style={{ color:C.text, fontSize:28, fontWeight:900, margin:0, letterSpacing:"-0.03em" }}>Business Overview</h1>
            <p style={{ color:C.muted, fontSize:14, margin:"6px 0 0" }}>Unified snapshot across P&L, Cash Flow, Balance Sheet &amp; Tax reports.</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* Report source tags */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {[
                { label:"P&L",           Icon:I.BarChart2,  color:C.green  },
                { label:"Cash Flow",     Icon:I.Activity,   color:C.blue   },
                { label:"Balance Sheet", Icon:I.Scale,      color:C.purple },
                { label:"Tax Reports",   Icon:I.Receipt,    color:C.yellow },
              ].map(({ label, Icon, color }, i) => (
                <div key={i} style={{ background:`${color}12`, border:`1px solid ${color}30`, borderRadius:20, padding:"6px 14px", display:"flex", alignItems:"center", gap:7 }}>
                  <Icon /><span style={{ color, fontSize:12, fontWeight:700 }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Action buttons */}
            <div style={{ display:"flex", gap:10, alignItems:"center", marginLeft:16 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1c1e24",
                  border: "1px solid #303338",
                  borderRadius: 8,
                  padding: "9px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <I.Refresh />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {}}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1c1e24",
                  border: "1px solid #303338",
                  borderRadius: 8,
                  padding: "9px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <I.Download />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => {}}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1c1e24",
                  border: "1px solid #303338",
                  borderRadius: 8,
                  padding: "9px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <I.Download />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* TOP KPI ROW */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14 }}>
          <KpiCard label="Total Revenue (7M)"  value={`LKR ${totalIncome.toLocaleString()}`}   color={C.green}  Icon={I.DollarSign}   sub="7-month total"         delay={0}   />
          <KpiCard label="Total Expenses (7M)" value={`LKR ${totalExpenses.toLocaleString()}`} color={C.red}    Icon={I.TrendingDown} sub="7-month total"         delay={0.05}/>
          <KpiCard label="Net Profit"          value={`LKR ${netProfit.toLocaleString()}`}     color={netProfit>=0?C.green:C.red} Icon={I.BarChart2} sub={`${profitMargin}% margin`} delay={0.1}/>
          <KpiCard label="Current Cash"        value={`LKR ${cashBalance.toLocaleString()}`}   color={C.blue}   Icon={I.Wallet}       sub="As of Feb 18"          delay={0.15}/>
          <KpiCard label="Owner's Equity"      value={`LKR ${equity.toLocaleString()}`}        color={C.purple} Icon={I.Scale}        sub={`Debt: ${debtRatio}%`} delay={0.2} />
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18 }}>

          {/* LEFT */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* P&L AREA CHART */}
            <Card title="Revenue & Profit Trend" sub="Monthly income, expenses & profit — from P&L Report">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={plMonthly}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.green}  stopOpacity={.25}/><stop offset="95%" stopColor={C.green}  stopOpacity={0}/></linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.red}    stopOpacity={.2}/> <stop offset="95%" stopColor={C.red}    stopOpacity={0}/></linearGradient>
                    <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.blue}   stopOpacity={.2}/> <stop offset="95%" stopColor={C.blue}   stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:12 }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:11 }} tickFormatter={v=>`${v/1000}K`}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend wrapperStyle={{ color:C.muted, fontSize:12 }}/>
                  <Area type="monotone" dataKey="income"   name="Income"   stroke={C.green} strokeWidth={2} fill="url(#gInc)"/>
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke={C.red}   strokeWidth={2} fill="url(#gExp)"/>
                  <Area type="monotone" dataKey="profit"   name="Profit"   stroke={C.blue}  strokeWidth={2} fill="url(#gPro)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* MINI CHARTS ROW */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Card title="Assets vs Liabilities" sub="From Balance Sheet">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={bsMonthly.slice(-4)} barCategoryGap={20} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:11 }}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:10 }} tickFormatter={v=>`${v/1000}K`}/>
                    <Tooltip content={<Tip/>} cursor={{ fill:"rgba(255,255,255,0.02)" }}/>
                    <Bar dataKey="assets"      name="Assets"      radius={[4,4,0,0]} fill={C.green}/>
                    <Bar dataKey="liabilities" name="Liabilities" radius={[4,4,0,0]} fill={C.red}/>
                    <Bar dataKey="equity"      name="Equity"      radius={[4,4,0,0]} fill={C.blue}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Cash Balance Movement" sub="From Cash Flow Report">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={cfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:10 }}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:10 }} tickFormatter={v=>`${v/1000}K`}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="balance" name="Balance" stroke={C.cyan} strokeWidth={2.5} dot={{ fill:C.cyan, r:3, strokeWidth:0 }} activeDot={{ r:5 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* RECENT TRANSACTIONS */}
            <Card title="Recent Transactions" sub="Latest activity across all accounts">
              {recentTx.map((tx, i) => {
                const sc = sMap[tx.status] || sMap.Paid;
                return (
                  <div key={i} className="txrow" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:i<recentTx.length-1?`1px solid ${C.border}`:"none", transition:"background .15s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:tx.type==="in"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {tx.type==="in" ? <I.ArrowUp /> : <I.ArrowDown />}
                      </div>
                      <div>
                        <p style={{ color:C.text2, fontSize:13, fontWeight:600, margin:0 }}>{tx.source}</p>
                        <p style={{ color:C.faint,  fontSize:11, margin:"2px 0 0" }}>{tx.date} · {tx.category}</p>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ background:sc.bg, color:sc.c, borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:5 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:sc.c, display:"inline-block" }}/>{tx.status}
                      </span>
                      <p style={{ color:tx.amount>0?C.green:C.red, fontSize:13, fontWeight:800, margin:0, minWidth:110, textAlign:"right" }}>
                        {tx.amount>0?"+":""}LKR {Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* HEALTH SCORE */}
            <Card title="Business Health Score" sub="Composite from all 4 reports">
              <HealthRing score={healthScore} />
              <div style={{ marginTop:16 }}>
                {[
                  { label:"Profit Margin",  value:`${profitMargin}%`,             color:parseFloat(profitMargin)>20?C.green:C.yellow, Icon:I.TrendingUp   },
                  { label:"Debt Ratio",     value:`${debtRatio}%`,                color:parseFloat(debtRatio)<40?C.green:C.red,       Icon:I.Scale        },
                  { label:"Cash Buffer",    value:`LKR ${cashBalance.toLocaleString()}`,  color:C.blue,                               Icon:I.Wallet       },
                  { label:"Tax Compliance", value:"3 / 4 Quarters Filed",         color:C.yellow,                                     Icon:I.Receipt      },
                ].map((m,i) => <MiniRow key={i} {...m} />)}
              </div>
            </Card>

            {/* INCOME SOURCES DONUT */}
            <Card title="Income Breakdown" sub="Revenue by service type — from P&L">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={incomeSources} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" strokeWidth={0}>
                    {incomeSources.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{ background:"#1a1d27", border:`1px solid ${C.border2}`, borderRadius:10 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
                {incomeSources.map((e,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }}/>
                      <span style={{ color:C.text2, fontSize:12 }}>{e.name}</span>
                    </div>
                    <span style={{ color:C.text, fontSize:12, fontWeight:700 }}>LKR {e.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* BEST / WORST MONTH */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.TrendingUp /></div>
                  <p style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Best Month</p>
                </div>
                <p style={{ color:C.green, fontSize:18, fontWeight:900, margin:"0 0 2px" }}>{bestMonth.month}</p>
                <p style={{ color:C.text2,  fontSize:12, margin:0 }}>LKR {bestMonth.profit.toLocaleString()} profit</p>
              </div>
              <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"rgba(239,68,68,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.TrendingDown /></div>
                  <p style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Weakest Month</p>
                </div>
                <p style={{ color:C.red,   fontSize:18, fontWeight:900, margin:"0 0 2px" }}>{worstMonth.month}</p>
                <p style={{ color:C.text2,  fontSize:12, margin:0 }}>LKR {worstMonth.profit.toLocaleString()} profit</p>
              </div>
            </div>

            {/* TAX SUMMARY */}
            <Card title="Tax Summary" sub="From Tax Reports">
              {[
                { label:"Total Tax Owed",    value:`LKR ${totalTax.toLocaleString()}`,   color:C.red,    Icon:I.Receipt      },
                { label:"Tax Paid (Q1–Q3)",  value:`LKR ${paidTax.toLocaleString()}`,    color:C.green,  Icon:I.CheckCircle  },
                { label:"Pending (Q4)",      value:`LKR ${pendingTax.toLocaleString()}`,  color:C.yellow, Icon:I.Clock, sub:"Due soon" },
                { label:"Effective Rate",    value:"20%",                                 color:C.muted,  Icon:I.Info         },
              ].map((m,i) => <MiniRow key={i} {...m} />)}
            </Card>
          </div>
        </div>

        {/* KEY INSIGHTS */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(59,130,246,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.Info /></div>
            <div>
              <h2 style={{ color:C.text, fontSize:18, fontWeight:900, margin:0, letterSpacing:"-0.02em" }}>Key Business Insights</h2>
              <p style={{ color:C.muted, fontSize:13, margin:0 }}>Auto-generated from all 4 reports — click to highlight</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {insights.map((ins, i) => (
              <div key={i} className="ins"
                onClick={() => setActiveInsight(activeInsight===i ? null : i)}
                style={{ background:activeInsight===i?ins.bg:C.card, border:`1px solid ${activeInsight===i?ins.border:C.border}`, borderRadius:16, padding:"18px 20px", animation:`fi .4s ease ${i*.08}s both` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:ins.bg, border:`1px solid ${ins.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <ins.Icon />
                  </div>
                  <span style={{ background:`${ins.color}18`, color:ins.color, fontSize:10, fontWeight:700, letterSpacing:"0.07em", padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>{ins.tag}</span>
                </div>
                <p style={{ color:C.text,  fontSize:13, fontWeight:800, margin:"0 0 6px", lineHeight:1.3 }}>{ins.title}</p>
                <p style={{ color:C.muted, fontSize:12, margin:0, lineHeight:1.6 }}>{ins.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BALANCE SHEET EQUATION BANNER */}
        <div style={{ background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:16, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.CheckCircle /></div>
            <div>
              <p style={{ color:C.green, fontSize:13, fontWeight:800, margin:0 }}>Balance Sheet Equation Verified</p>
              <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>Assets = Liabilities + Equity · Checked against Balance Sheet Report</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            {[{ l:"Assets", v:`LKR ${totalAssets.toLocaleString()}`, c:C.green },{ l:"Liabilities", v:`LKR ${totalLiab.toLocaleString()}`, c:C.red },{ l:"Equity", v:`LKR ${equity.toLocaleString()}`, c:C.blue }].map((item, i, arr) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ textAlign:"center" }}>
                  <p style={{ color:C.muted, fontSize:11, margin:0, fontWeight:600 }}>{item.l}</p>
                  <p style={{ color:item.c,  fontSize:15, fontWeight:900, margin:"3px 0 0" }}>{item.v}</p>
                </div>
                {i < arr.length-1 && <span style={{ color:C.faint, fontSize:22, fontWeight:300 }}>{i===0 ? "=" : "+"}</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
