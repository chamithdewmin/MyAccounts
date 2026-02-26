import React from "react";

const Svg = ({ d, s = 18, c = "#fff", sw = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

export const I = {
  Revenue: () => <Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  Expense: () => <Svg d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6" />,
  Profit: () => <Svg d="M18 20V10M12 20V4M6 20v-6" />,
  Award: () => <Svg d="M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12" />,
  Download: () => <Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  ArrowUp: () => <Svg d="M12 19V5M5 12l7-7 7 7" />,
  ArrowDown: () => <Svg d="M12 5v14M19 12l-7 7-7-7" />,
  Refresh: () => <Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
  DollarSign: () => <Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  TrendingUp: () => <Svg d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  TrendingDown: () => <Svg d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6" />,
  BarChart2: () => <Svg d="M18 20V10M12 20V4M6 20v-6" />,
  Wallet: () => <Svg d="M21 12V7H5a2 2 0 010-4h14v4M21 12a2 2 0 010 4H5a2 2 0 000 4h16v-4" />,
  Scale: () => <Svg d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18" />,
  Building: () => <Svg d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a2 2 0 014 0v4" />,
  Gauge: () => <Svg d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v2M6 12H4M20 12h-2M7.76 7.76l-1.41-1.42M17.66 7.76l1.41-1.41M12 18a6 6 0 010-12" />,
  Receipt: () => <Svg d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM8 9h8M8 13h6" />,
  FileText: () => <Svg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
  Scissors: () => <Svg d="M6 9a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100 6 3 3 0 000-6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />,
  CheckCircle: () => <Svg d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />,
  PieChartIco: () => <Svg d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />,
  Activity: () => <Svg d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  Layers: () => <Svg d="M12 2l9 4.5-9 4.5-9-4.5L12 2zM3 11.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" />,
  BarChart: () => <Svg d="M18 20V10M12 20V4M6 20v-6" />,
  PlusCircle: () => <Svg d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 8v8M8 12h8" />,
  MinusCircle: () => <Svg d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM8 12h8" />,
  X: () => <Svg d="M18 6L6 18M6 6l12 12" />,
  Search: () => <Svg d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />,
  Trash: () => <Svg d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
};
