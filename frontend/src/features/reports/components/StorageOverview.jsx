import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HardDrive,
  Folder,
  FileText,
  Users,
  Activity,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'logozodev@gmail.com';
const isAdminUser = (u) =>
  String(u?.role || '').toLowerCase() === 'admin' || String(u?.email || '').toLowerCase().trim() === ADMIN_EMAIL;

const formatBytes = (n) => {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  return `${(v / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const DONUT = {
  files: '#38bdf8',
  invoices: '#fb7185',
  clients: '#a78bfa',
  logs: '#64748b',
};

/** Dashboard-style row: icon tile + label + large value (like income / expense stat cards). */
const StorageStatRow = ({ icon: Icon, iconClassName, iconBgClass, label, value, sub, right }) => (
  <div className="flex items-center gap-4 min-w-0">
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}
      aria-hidden
    >
      <Icon className={`h-5 w-5 ${iconClassName}`} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-medium text-muted-foreground m-0">{label}</p>
        {right}
      </div>
      <p className="text-xl font-extrabold tracking-tight text-foreground tabular-nums mt-1 m-0 sm:text-[22px]">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-0.5 m-0 leading-snug">{sub}</p> : null}
    </div>
  </div>
);

const StorageOverview = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.storage.overview();
      setData(d);
    } catch (e) {
      toast({ title: 'Could not load storage', description: e.message, variant: 'destructive' });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const admin = isAdminUser(user);

  const donutData = useMemo(() => {
    if (!data) return [];
    const rows = [
      { key: 'files', name: 'Files', value: data.filesBytes },
      { key: 'invoices', name: 'Invoices', value: data.invoicesBytes },
      { key: 'clients', name: 'Clients', value: data.clientsBytes },
      { key: 'logs', name: 'Logs', value: data.logsBytes },
    ].filter((r) => r.value > 0);
    return rows.length ? rows : [];
  }, [data]);

  const pctUsed = useMemo(() => {
    if (!data?.quotaBytes) return 0;
    return Math.min(100, Math.round(((data.totalBytes || 0) / data.quotaBytes) * 1000) / 10);
  }, [data]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: 'files',
        title: 'Files',
        bytes: data.filesBytes,
        count: data.filesCount,
        countLabel: 'files',
        to: '/file-manager',
        cta: 'Open File Manager',
        icon: Folder,
        iconBg: 'bg-sky-500/15',
        iconClass: 'text-sky-400',
        hint: 'Uploaded documents and attachments.',
      },
      {
        key: 'invoices',
        title: 'Invoices',
        bytes: data.invoicesBytes,
        count: data.invoicesCount,
        countLabel: 'invoices',
        to: '/invoices',
        cta: 'View Invoices',
        icon: FileText,
        iconBg: 'bg-rose-500/15',
        iconClass: 'text-rose-400',
        hint: 'DB payload (line items, notes). PDFs are usually generated on demand.',
      },
      {
        key: 'clients',
        title: 'Client data',
        bytes: data.clientsBytes,
        count: data.clientsCount,
        countLabel: 'clients',
        to: '/clients',
        cta: 'View Clients',
        icon: Users,
        iconBg: 'bg-violet-500/15',
        iconClass: 'text-violet-400',
        hint: 'Stored client records.',
      },
      {
        key: 'logs',
        title: 'System logs',
        bytes: data.logsBytes,
        count: data.logsRowCount,
        countLabel: 'rows',
        to: admin ? '/login-activity' : '/dashboard',
        cta: admin ? 'Open Login Activity' : 'Dashboard',
        icon: Activity,
        iconBg: 'bg-slate-500/15',
        iconClass: 'text-slate-400',
        hint:
          data.logsScope === 'system'
            ? 'All login/session rows on this server (admin).'
            : 'Login activity for your account.',
      },
    ];
  }, [data, admin]);

  const warnQuota = pctUsed >= 90 && (data?.totalBytes || 0) > 0;

  const dbFootprint = data ? data.invoicesBytes + data.clientsBytes + data.logsBytes : 0;
  const dbLabelSub = data
    ? `${data.invoicesCount} invoices · ${data.clientsCount} clients · ${data.logsRowCount} log rows`
    : '';

  const listStagger = 0.22;
  const listDuration = 0.55;

  return (
    <>
      <Helmet>
        <title>Storage Overview - LogozoPOS</title>
        <meta name="description" content="System-wide storage usage across files, invoices, clients, and logs" />
      </Helmet>

      <div className="page-y flex flex-col gap-5 min-h-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analytics</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-1">Storage Overview</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Workspace footprint across uploads, invoice records, clients, and authentication logs. Figures are estimates
              from live data (refreshed on each load).
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2 self-start" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading storage…
          </div>
        ) : data ? (
          <>
            <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <HardDrive className="w-5 h-5 text-sky-400 shrink-0" />
                    Total storage
                  </div>
                  <p className="text-lg sm:text-xl text-muted-foreground">
                    <span className="font-bold text-foreground tabular-nums">{formatBytes(data.totalBytes)}</span>
                    <span> / </span>
                    <span className="tabular-nums font-medium text-foreground">{formatBytes(data.quotaBytes)}</span>
                    <span className="text-sm ml-2 tabular-nums">({pctUsed}%)</span>
                  </p>
                  <div className="h-3 w-full rounded-full bg-secondary/80 overflow-hidden ring-1 ring-border/50">
                    <motion.div
                      className={`h-full rounded-full ${warnQuota ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-sky-500 to-cyan-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pctUsed}%` }}
                      transition={{ duration: 0.85, ease: 'easeOut' }}
                    />
                  </div>
                  {warnQuota && (
                    <p className="text-sm text-amber-200/90 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      You are near the overview quota shown above.
                    </p>
                  )}
                </div>
                <div className="w-full max-w-[300px] mx-auto lg:mx-0 lg:shrink-0 h-[220px]">
                  {donutData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {donutData.map((e) => (
                            <Cell key={e.key} fill={DONUT[e.key] || '#94a3b8'} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value) => [formatBytes(value), 'Size']}
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                      No stored data yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Finance-style dual card: two pillars like income / expenses */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: listDuration, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                <div className="p-5 sm:p-6">
                  <StorageStatRow
                    icon={Folder}
                    iconBgClass="bg-sky-500/15"
                    iconClassName="text-sky-400"
                    label="File uploads"
                    value={formatBytes(data.filesBytes)}
                    sub={`${data.filesCount} file${data.filesCount === 1 ? '' : 's'} on disk`}
                  />
                  <div className="mt-4 pt-4 border-t border-border/80">
                    <Link
                      to="/file-manager"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-sky-400 hover:underline"
                    >
                      Open File Manager
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="p-5 sm:p-6 bg-secondary/20">
                  <StorageStatRow
                    icon={Database}
                    iconBgClass="bg-violet-500/15"
                    iconClassName="text-violet-400"
                    label="Records & logs"
                    value={formatBytes(dbFootprint)}
                    sub={dbLabelSub}
                  />
                  <div className="mt-4 pt-4 border-t border-border/80 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                    <Link to="/invoices" className="text-rose-400/90 hover:underline">
                      Invoices
                    </Link>
                    <span className="text-muted-foreground">·</span>
                    <Link to="/clients" className="text-violet-400/90 hover:underline">
                      Clients
                    </Link>
                    <span className="text-muted-foreground">·</span>
                    <Link to={admin ? '/login-activity' : '/dashboard'} className="text-slate-400 hover:underline">
                      {admin ? 'Logs' : 'Home'}
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Category cards — same visual language as dashboard stat rows, slower stagger */}
            <div className="flex flex-col gap-3">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.32 + i * listStagger,
                      duration: listDuration,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <Link
                      to={card.to}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 px-5 py-4 shadow-sm transition-colors hover:bg-secondary/35 hover:border-sky-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-6 sm:py-5"
                    >
                      <div className="min-w-0 flex-1">
                        <StorageStatRow
                          icon={Icon}
                          iconBgClass={card.iconBg}
                          iconClassName={card.iconClass}
                          label={card.title}
                          value={formatBytes(card.bytes)}
                          sub={`${card.count} ${card.countLabel}`}
                        />
                        {card.hint ? (
                          <p className="text-[10px] text-muted-foreground/90 mt-2 leading-snug line-clamp-2 pl-[3.25rem] sm:pl-16">
                            {card.hint}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        <span className="text-xs font-semibold text-sky-400 group-hover:underline max-w-[7rem] text-right sm:max-w-none">
                          {card.cta}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};

export default StorageOverview;
