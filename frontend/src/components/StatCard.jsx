/**
 * Stat card for report pages (Lovable-style).
 * label, value (display string, e.g. "796,000" or "30.9"), change (number, e.g. 14.2 or -3.4), icon, optional prefix (e.g. "LKR " or "" for Net Margin).
 */
export default function StatCard({ label, value, change, icon, prefix = "" }) {
  const changeStr =
    change != null
      ? `${change >= 0 ? "+" : ""}${change}% vs last period`
      : null;
  const isPositive = change != null && change >= 0;

  return (
    <div className="report-card relative overflow-hidden">
      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary opacity-90">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tracking-tight font-mono text-foreground">
        {prefix !== "" && prefix != null ? `${prefix}${value}` : value}
      </p>
      {changeStr && (
        <p
          className={`mt-1 text-sm font-semibold ${
            isPositive ? "stat-change-positive" : "stat-change-negative"
          }`}
        >
          {changeStr}
        </p>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/30 to-transparent"
        aria-hidden
      />
    </div>
  );
}
