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
        color: 'text-sky-400',
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
        color: 'text-rose-400',
        hint: 'DB payload size (line items, notes). PDFs are usually generated on demand.',
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
        color: 'text-violet-400',
        hint: 'Approximate size of stored client records.',
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
        color: 'text-slate-400',
        hint:
          data.logsScope === 'system'
            ? 'All login/session rows on this server (admin view).'
            : 'Login activity rows for your user only.',
      },
    ];
  }, [data, admin]);

  const warnQuota = pctUsed >= 90 && (data?.totalBytes || 0) > 0;

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
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  {warnQuota ? (
                    <p className="text-sm text-amber-200/90 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      You are near the configured overview quota. Adjust <code className="text-xs bg-secondary px-1 rounded">STORAGE_OVERVIEW_QUOTA_GB</code> on the API if needed.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Quota is for this dashboard only (default 10 GB). Set <span className="font-mono">STORAGE_OVERVIEW_QUOTA_GB</span> in the backend environment to change it.
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={card.to}
                      className="group block h-full rounded-2xl border border-border bg-card/90 p-4 shadow-sm transition-colors hover:bg-secondary/30 hover:border-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-5 h-5 shrink-0 ${card.color}`} />
                          <span className="font-semibold text-foreground truncate">{card.title}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground tabular-nums mt-3">{formatBytes(card.bytes)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {card.count} {card.countLabel}
                      </p>
                      {card.hint ? <p className="text-[11px] text-muted-foreground/90 mt-2 leading-snug">{card.hint}</p> : null}
                      <p className="text-sm font-medium text-sky-400 mt-3 group-hover:underline">{card.cta}</p>
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
