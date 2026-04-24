import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Activity,
  Ban,
  FileDown,
  FileText,
  KeyRound,
  LogOut,
  LogIn,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { deriveDeviceType } from '@/lib/userAgent';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { downloadDocumentPdfFromElement } from '@/utils/pdfPrint';

const ADMIN_EMAIL = 'LOGOZODEV@gmail.com';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const formatSecondsAsHMS = (totalSeconds) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = sec % 60;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
};

const formatDuration = (start, end, status) => {
  if (!start) return '—';
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return '—';
  const e = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(e) || e < s) return status === 'active' ? 'Ongoing' : '—';
  const sec = Math.floor((e - s) / 1000);
  return formatSecondsAsHMS(sec);
};

const formatLiveElapsed = (start, refreshSeq) => {
  void refreshSeq;
  if (!start) return '—';
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return '—';
  return formatSecondsAsHMS((Date.now() - s) / 1000);
};

/** Same rule as GET /login-activity/stats: COALESCE(success,true) AND logout_at IS NULL (API exposes logoutAt). */
const coalescedLoginSuccess = (row) => {
  if (typeof row.success === 'boolean') return row.success;
  const st = String(row.status || '').toLowerCase();
  return st !== 'failed' && st !== 'unauthorized';
};

const isOpenLoginSessionRow = (row) =>
  coalescedLoginSuccess(row) && (row.logoutAt == null || row.logoutAt === '');

const countOpenLoginSessions = (rows) => rows.filter(isOpenLoginSessionRow).length;

/** Stable display label; legacy rows used raw UUID in JWT `sid`. Full value in `title` for ops / logout correlation. */
const formatSessionIdLabel = (raw) => {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('sess_')) return s;
  const compact = s.replace(/-/g, '');
  if (compact.length >= 8) return `sess_${compact.slice(0, 9)}`;
  return `sess_${compact}`;
};

/** Compact hint (e.g. Chrome 122 / Windows 10); hover shows stored snippet (≤150 chars). Heuristic only, no UA library. */
const userAgentHint = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return { line: '—', title: undefined };
  const m = s.match(/\b(Edg(?:e)?|Chrome|Firefox|Safari)\/(\d+)/i);
  const br = m
    ? `${/^edg/i.test(m[1]) ? 'Edge' : m[1]} ${m[2]}`
    : null;
  let os;
  if (/Windows NT 10\.0/i.test(s)) os = 'Windows 10';
  else if (/Windows NT 11\.0/i.test(s)) os = 'Windows 11';
  else {
    const mac = s.match(/\bMac OS X ([\d_]+)/i);
    if (mac) os = `macOS ${mac[1].replace(/_/g, '.')}`;
    else {
      const and = s.match(/\bAndroid (\d+)/i);
      if (and) os = `Android ${and[1]}`;
      else {
        const ios = s.match(/CPU (?:iPhone|iPad) OS ([\d_]+)/i);
        if (ios) os = `iOS ${ios[1].replace(/_/g, '.')}`;
      }
    }
  }
  const line = br && os ? `${br} / ${os}` : br || os || (s.length > 56 ? `${s.slice(0, 56)}…` : s);
  return { line, title: s };
};

const statusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'bg-emerald-500/20 text-emerald-400';
  if (s === 'completed') return 'bg-slate-500/20 text-slate-300';
  if (s === 'failed') return 'bg-red-500/20 text-red-400';
  if (s === 'unauthorized') return 'bg-amber-500/15 text-amber-400';
  return 'bg-slate-500/20 text-slate-300';
};

const FAILURE_REASON_INVALID = new Set([
  'invalid_password',
  'invalid_credentials',
  'unauthorized',
  'user_blocked',
]);
const FAILURE_REASON_BLOCKED = new Set(['session_expired', 'invalid_token', 'user_not_found', 'blocked_ip']);

/** Matches /login-activity/stats failure buckets. */
const failureKind = (reason) => {
  const r = reason ? String(reason) : '';
  if (FAILURE_REASON_INVALID.has(r)) return 'invalid_credentials';
  if (FAILURE_REASON_BLOCKED.has(r)) return 'blocked_ip';
  return 'failed_login';
};

/** Only: active | completed | failed | unauthorized (legacy `failed` + non-credential reason → unauthorized). */
const displayActivityStatus = (row) => {
  const raw = String(row?.status || '').toLowerCase().trim();
  if (raw === 'active' || raw === 'completed') return raw;
  if (raw === 'unauthorized') return 'unauthorized';
  if (raw === 'failed') {
    if (failureKind(row.failureReason) !== 'invalid_credentials') return 'unauthorized';
    return 'failed';
  }
  return 'failed';
};

const failureDetail = (reason) => {
  if (!reason) return null;
  if (reason === 'invalid_password') return 'Wrong password';
  if (reason === 'user_blocked') return 'Account disabled';
  if (reason === 'invalid_credentials') return 'Unknown email or wrong password';
  if (reason === 'unauthorized') return 'Unknown email (legacy code)';
  if (reason === 'missing_token') return 'No bearer token on API request';
  if (reason === 'invalid_token') return 'Invalid or expired token';
  if (reason === 'session_expired') return 'Session revoked or token version changed';
  if (reason === 'user_not_found') return 'User no longer exists';
  if (reason === 'blocked_ip') return 'IP blocked';
  return reason.replace(/_/g, ' ');
};

const isFailedActivityRow = (row) => {
  if (row.success === false) return true;
  const st = String(row.status || '').toLowerCase();
  return st === 'failed' || st === 'unauthorized';
};

const countFailedBreakdown = (rows) => {
  let invalidCredentials = 0;
  let blockedIp = 0;
  let failedLogin = 0;
  for (const row of rows) {
    if (!isFailedActivityRow(row)) continue;
    const k = failureKind(row.failureReason);
    if (k === 'invalid_credentials') invalidCredentials += 1;
    else if (k === 'blocked_ip') blockedIp += 1;
    else failedLogin += 1;
  }
  const total = invalidCredentials + blockedIp + failedLogin;
  return { invalidCredentials, blockedIp, failedLogin, total };
};

/** Resolve display fields for a login_activity row (handles both /login-activity and /activity shapes). */
const resolveActivityUser = (row, userById) => {
  const uidRaw = row.userId;
  const uid = uidRaw != null && uidRaw !== '' ? Number(uidRaw) : NaN;
  const fromList = Number.isFinite(uid) ? userById[uid] : undefined;
  const name =
    (row.userName && String(row.userName).trim()) ||
    (fromList?.name && String(fromList.name).trim()) ||
    '';
  const email = String(row.email || fromList?.email || '').trim();
  const roleSource = row.role != null && row.role !== '' ? row.role : fromList?.role;
  let showRole = false;
  let isAdmin = false;
  if (roleSource != null && String(roleSource).trim() !== '') {
    showRole = true;
    isAdmin = String(roleSource).toLowerCase() === 'admin';
  } else if (Number.isFinite(uid)) {
    showRole = true;
    isAdmin = false;
  }
  const roleLabel = isAdmin ? 'Admin' : 'Staff';
  const primaryTitle = name || email || 'Unknown';
  const showEmailSubline = Boolean(name && email);
  return { primaryTitle, email, showEmailSubline, showRole, isAdmin, roleLabel };
};

const deviceLabel = (row) => {
  const stored = String(row.deviceType || '').trim().toLowerCase();
  if (stored && stored !== 'unknown') return stored;
  return deriveDeviceType(row.userAgent || '');
};

const loginRiskTier = (score) => {
  const s = Number(score) || 0;
  if (s >= 71) return 'high';
  if (s >= 31) return 'suspicious';
  return 'safe';
};

/** Used in exports, search, and tooltips */
const loginRiskLabel = (tier) => {
  if (tier === 'high') return 'High risk';
  if (tier === 'suspicious') return 'Medium risk';
  return 'Low risk';
};

/** Bottom line inside the risk card */
const loginRiskShortLabel = (tier) => {
  if (tier === 'high') return 'High';
  if (tier === 'suspicious') return 'Medium';
  return 'Low risk';
};

const loginRiskLabelClass = (tier) => {
  if (tier === 'high') return 'text-red-400';
  if (tier === 'suspicious') return 'text-amber-400';
  return 'text-emerald-400';
};

const loginRiskTooltip = (score, tier) =>
  `Login risk score ${score} out of 100. ` +
  `0–30: low (green), 31–70: medium (amber), 71+: high (red). This session: ${loginRiskLabel(tier)}.`;

const LoginRiskScoreLine = ({ score }) => {
  const s = Number(score) || 0;
  return (
    <div className="flex min-w-0 items-baseline gap-0.5 tabular-nums leading-none">
      <span className="text-base font-bold tracking-tight text-foreground">{s}</span>
      <span className="text-[9px] font-medium tracking-wide text-muted-foreground">/ 100</span>
    </div>
  );
};

/** Tier-specific layout: low = emoji + score + label; medium/high = emoji + Risk, score, level */
const LoginRiskCard = ({ score, tier }) => {
  const s = Number(score) || 0;
  const aria = `${loginRiskLabel(tier)}, score ${s} out of 100`;
  const emoji = tier === 'high' ? '🔴' : tier === 'suspicious' ? '🟡' : '🟢';

  return (
    <div
      role="group"
      aria-label={aria}
      title={loginRiskTooltip(s, tier)}
      className={cn(
        'min-w-[5.75rem] max-w-[8.25rem] rounded-lg border px-2 py-1.5 shadow-sm transition-colors',
        'bg-card/80 backdrop-blur-sm',
        tier === 'safe' && 'border-emerald-500/25',
        tier === 'suspicious' && 'border-amber-500/30',
        tier === 'high' && 'border-red-500/30',
      )}
    >
      {tier === 'safe' ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[0.95rem] leading-none select-none" aria-hidden>
              {emoji}
            </span>
            <LoginRiskScoreLine score={s} />
          </div>
          <p className={cn('mt-1 text-[10px] font-semibold leading-snug', loginRiskLabelClass(tier))}>
            {loginRiskShortLabel(tier)}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <span className="text-[0.95rem] leading-none select-none" aria-hidden>
              {emoji}
            </span>
            <span className={cn('text-[10px] font-bold uppercase tracking-wide', loginRiskLabelClass(tier))}>Risk</span>
          </div>
          <div className="mt-0.5">
            <LoginRiskScoreLine score={s} />
          </div>
          <p className={cn('mt-1 text-[10px] font-semibold leading-snug', loginRiskLabelClass(tier))}>
            {loginRiskShortLabel(tier)}
          </p>
        </>
      )}
    </div>
  );
};

const rowMatchesSearch = (row, userById, query) => {
  const t = String(query || '').trim().toLowerCase();
  if (!t) return true;
  const u = resolveActivityUser(row, userById);
  const blob = [
    u.primaryTitle,
    u.email,
    row.userId,
    row.email,
    row.userName,
    row.ipAddress,
    row.sessionId,
    row.deviceType,
    deviceLabel(row),
    row.riskScore != null ? String(row.riskScore) : '',
    loginRiskLabel(loginRiskTier(Number(row.riskScore ?? 0))),
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ')
    .toLowerCase();
  return blob.includes(t);
};

const csvEscape = (val) => {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const escapePdfHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const exportFilenameStamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

/** PDF capture height guard: very tall tables can fail in html2canvas; CSV has full data. */
const PDF_EXPORT_ROW_LIMIT = 200;

function ActivityUserCell({ row, userById }) {
  const u = resolveActivityUser(row, userById);
  return (
    <div className="space-y-1 min-w-[12rem]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{u.primaryTitle}</span>
        {u.showRole && (
          <span
            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${
              u.isAdmin
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-secondary text-muted-foreground border-border'
            }`}
          >
            {u.roleLabel}
          </span>
        )}
      </div>
      {u.showEmailSubline && <div className="text-xs text-muted-foreground">{u.email}</div>}
    </div>
  );
}

export default function LoginActivity() {
  const { user } = useAuth();
  const isAdmin =
    String(user?.role || '').toLowerCase() === 'admin' ||
    String(user?.email || '').toLowerCase() === ADMIN_EMAIL;
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [liveTick, setLiveTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const pdfHostRef = useRef(null);

  const hasActiveSession = useMemo(() => items.some(isOpenLoginSessionRow), [items]);

  useEffect(() => {
    if (!hasActiveSession) return undefined;
    const id = setInterval(() => setLiveTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasActiveSession]);

  const loadData = async (userFilter = filter) => {
    try {
      const userId = userFilter === 'all' ? null : Number(userFilter);
      const [rows, stats, data] = await Promise.all([
        api.auth.getLoginActivity().catch(() => []),
        api.auth.getLoginActivityStats().catch(() => null),
        api.auth.getActivity(userFilter === 'all' ? undefined : userFilter).catch(() => ({ items: [], users: [] })),
      ]);
      const fallbackRows = Array.isArray(data?.items) ? data.items : [];
      const mergedRows = Array.isArray(rows) && rows.length > 0 ? rows : fallbackRows;
      const filteredRows =
        userId && Number.isInteger(userId)
          ? mergedRows.filter((r) => Number(r.userId) === userId)
          : mergedRows;
      setItems(filteredRows);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setStatsData(stats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData('all');
  }, []);

  useEffect(() => {
    if (!loading) loadData(filter);
  }, [filter]);

  const stats = useMemo(() => {
    const openSessions = countOpenLoginSessions(items);
    const fb = countFailedBreakdown(items);
    if (statsData) {
      return {
        totalUsers: statsData.totalUsers ?? users.length,
        activeSessions: statsData.activeSessions ?? openSessions,
        totalSessions: statsData.totalSessions ?? items.length,
        failedAttempts: statsData.failedAttempts ?? fb.total,
        failedInvalidCredentials: statsData.failedInvalidCredentials ?? fb.invalidCredentials,
        failedLogin: statsData.failedLogin ?? fb.failedLogin,
        failedBlockedIp: statsData.failedBlockedIp ?? fb.blockedIp,
      };
    }
    return {
      totalUsers: users.length,
      activeSessions: openSessions,
      totalSessions: items.length,
      failedAttempts: fb.total,
      failedInvalidCredentials: fb.invalidCredentials,
      failedLogin: fb.failedLogin,
      failedBlockedIp: fb.blockedIp,
    };
  }, [items, users, statsData]);

  const userById = useMemo(() => {
    const m = {};
    for (const u of users) {
      if (u?.id != null) m[Number(u.id)] = u;
    }
    return m;
  }, [users]);

  const filteredItems = useMemo(
    () => items.filter((row) => rowMatchesSearch(row, userById, searchQuery)),
    [items, userById, searchQuery],
  );

  const durationExportLabel = (row) => {
    const disp = displayActivityStatus(row);
    if (disp === 'failed' || disp === 'unauthorized') return '—';
    if (isOpenLoginSessionRow(row)) return `Live (${formatLiveElapsed(row.loginAt || row.createdAt, liveTick)})`;
    return formatDuration(row.loginAt || row.createdAt, row.logoutAt, disp);
  };

  const handleExportCsv = () => {
    const stamp = exportFilenameStamp();
    const headers = [
      'User',
      'Email',
      'User ID',
      'Session ID',
      'Login time',
      'Logout time',
      'Duration',
      'IP address',
      'User-Agent',
      'Device',
      'Risk (score — level)',
      'Status',
      'Failure reason',
    ];
    const lines = [headers.map(csvEscape).join(',')];
    for (const row of filteredItems) {
      const u = resolveActivityUser(row, userById);
      const disp = displayActivityStatus(row);
      const rs = Number(row.riskScore ?? 0);
      const rt = loginRiskTier(rs);
      lines.push(
        [
          u.primaryTitle,
          u.email,
          row.userId ?? '',
          row.sessionId ?? '',
          formatDateTime(row.loginAt || row.createdAt),
          row.logoutAt ? formatDateTime(row.logoutAt) : isOpenLoginSessionRow(row) ? 'Still active' : '—',
          durationExportLabel(row),
          row.ipAddress ?? '',
          row.userAgent ?? '',
          deviceLabel(row),
          `${rs} — ${loginRiskLabel(rt)}`,
          disp,
          row.failureReason ?? '',
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-activity-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const host = pdfHostRef.current;
    if (!host) return;
    const stamp = exportFilenameStamp();
    const rows = filteredItems;
    const slice = rows.slice(0, PDF_EXPORT_ROW_LIMIT);
    setExportingPdf(true);
    try {
      const head =
        '<thead><tr>' +
        ['User', 'Email', 'Session ID', 'Login', 'Logout', 'IP', 'Device', 'Risk (0–100)', 'Status']
          .map((h) => `<th style="border:1px solid #e1e1e1;padding:4px 6px;font-size:10px;background:#f5f5f5;">${escapePdfHtml(h)}</th>`)
          .join('') +
        '</tr></thead>';
      const bodyRows = slice
        .map((row) => {
          const u = resolveActivityUser(row, userById);
          const disp = displayActivityStatus(row);
          const rs = Number(row.riskScore ?? 0);
          const rt = loginRiskTier(rs);
          const cells = [
            u.primaryTitle,
            u.email,
            row.sessionId ?? '—',
            formatDateTime(row.loginAt || row.createdAt),
            row.logoutAt ? formatDateTime(row.logoutAt) : isOpenLoginSessionRow(row) ? 'Still active' : '—',
            row.ipAddress ?? '—',
            deviceLabel(row),
            `${rs} — ${loginRiskLabel(rt)}`,
            disp,
          ];
          return `<tr>${cells
            .map(
              (c) =>
                `<td style="border:1px solid #e1e1e1;padding:4px 6px;font-size:9px;vertical-align:top;">${escapePdfHtml(c)}</td>`,
            )
            .join('')}</tr>`;
        })
        .join('');
      const note =
        rows.length > slice.length
          ? `<p style="font-size:10px;color:#666;margin:8px 0 0;">Showing first ${slice.length} of ${rows.length} rows. Export CSV for the full list.</p>`
          : '';
      host.innerHTML = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111;">
        <h2 style="font-size:14px;margin:0 0 6px;">Login activity</h2>
        <p style="font-size:10px;color:#444;margin:0 0 10px;">${escapePdfHtml(new Date().toLocaleString())} · ${rows.length} row(s)</p>
        ${note}
        <table style="border-collapse:collapse;width:100%;">${head}<tbody>${bodyRows}</tbody></table>
      </div>`;
      await downloadDocumentPdfFromElement(host, `login-activity-${stamp}.pdf`, { scale: 1.35, jpegQuality: 0.9 });
    } catch (e) {
      console.error(e);
      window.alert('Could not create PDF. Try CSV export, or fewer rows.');
    } finally {
      host.innerHTML = '';
      setExportingPdf(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login Activity - LOGOZODEV</title>
        <meta name="description" content="Track login sessions, active users, and failed sign-in attempts" />
      </Helmet>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Login Activity</h1>
            <p className="text-muted-foreground text-sm">
              Sessions, active logins, and failed sign-in attempts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <select
                className="px-3 py-2 bg-input border border-border rounded-lg text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRefreshing(true);
                loadData(filter);
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Total Users</div>
            <div className="mt-1 text-2xl font-bold">{stats.totalUsers}</div>
            <Users className="w-4 h-4 text-primary mt-2" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Active Sessions</div>
            <div className="mt-1 text-2xl font-bold">{stats.activeSessions}</div>
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-2" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Total Sessions</div>
            <div className="mt-1 text-2xl font-bold">{stats.totalSessions}</div>
            <Activity className="w-4 h-4 text-cyan-400 mt-2" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Invalid credentials</div>
            <div className="mt-1 text-2xl font-bold">{stats.failedInvalidCredentials}</div>
            <KeyRound className="w-4 h-4 text-amber-400 mt-2" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Failed login</div>
            <div className="mt-1 text-2xl font-bold">{stats.failedLogin}</div>
            <ShieldAlert className="w-4 h-4 text-orange-400 mt-2" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Blocked IP</div>
            <div className="mt-1 text-2xl font-bold">{stats.failedBlockedIp}</div>
            <Ban className="w-4 h-4 text-red-400 mt-2" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border bg-card/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user, email, IP, device, or risk score…"
                className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Search login activity by user or IP"
              />
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {searchQuery.trim() && filteredItems.length !== items.length ? (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Showing {filteredItems.length} of {items.length}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={!filteredItems.length}
              >
                <FileDown className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleExportPdf()}
                disabled={!filteredItems.length || exportingPdf}
              >
                <FileText className="mr-1.5 h-4 w-4" />
                {exportingPdf ? 'PDF…' : 'Export PDF'}
              </Button>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="flex flex-col divide-y divide-border md:hidden">
            {!loading && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No login activity yet.</p>
            )}
            {!loading && items.length > 0 && filteredItems.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No rows match your search.</p>
            )}
            {filteredItems.map((row) => {
              const disp = displayActivityStatus(row);
              const uaHint = userAgentHint(row.userAgent);
              const score = Number(row.riskScore ?? 0);
              const tier = loginRiskTier(score);
              return (
                <div key={row.id} className="px-4 py-4 flex flex-col gap-2.5 hover:bg-secondary/20 transition-colors">
                  {/* Top: user + status */}
                  <div className="flex items-start justify-between gap-2">
                    <ActivityUserCell row={row} userById={userById} />
                    <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${statusBadge(disp)}`}
                      title={disp === 'failed' || disp === 'unauthorized' ? failureDetail(row.failureReason) || undefined : undefined}>
                      {disp}
                    </span>
                  </div>

                  {/* Login / logout times */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {(row.loginAt || row.createdAt) && (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <LogIn className="w-3 h-3 text-emerald-400" />
                        {formatDateTime(row.loginAt || row.createdAt)}
                      </span>
                    )}
                    {row.logoutAt ? (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <LogOut className="w-3 h-3 text-red-400" />
                        {formatDateTime(row.logoutAt)}
                      </span>
                    ) : isOpenLoginSessionRow(row) ? (
                      <span className="text-orange-400 font-medium">Still active</span>
                    ) : null}
                  </div>

                  {/* Duration + device + IP */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {disp !== 'failed' && disp !== 'unauthorized' && (
                      <span>
                        {isOpenLoginSessionRow(row)
                          ? <span className="text-blue-400">Live ({formatLiveElapsed(row.loginAt || row.createdAt, liveTick)})</span>
                          : formatDuration(row.loginAt || row.createdAt, row.logoutAt, disp)}
                      </span>
                    )}
                    {row.ipAddress && <span>· {row.ipAddress}</span>}
                    <span className="capitalize">· {deviceLabel(row)}</span>
                  </div>

                  {/* User agent + risk */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground line-clamp-1 flex-1" title={uaHint.title}>{uaHint.line}</span>
                    <div className="flex-shrink-0">
                      <LoginRiskCard score={score} tier={tier} />
                    </div>
                  </div>

                  {/* Session ID */}
                  {formatSessionIdLabel(row.sessionId) && (
                    <span className="font-mono text-[10px] text-cyan-400/80 break-all select-all">
                      {formatSessionIdLabel(row.sessionId)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 text-left font-semibold">User</th>
                  <th className="px-5 py-3 text-left font-semibold">Session</th>
                  <th className="px-5 py-3 text-left font-semibold">Login / Logout</th>
                  <th className="px-5 py-3 text-left font-semibold">Duration</th>
                  <th className="px-5 py-3 text-left font-semibold">IP · Device</th>
                  <th className="px-5 py-3 text-left font-semibold">Risk</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((row) => {
                  const disp = displayActivityStatus(row);
                  const uaHint = userAgentHint(row.userAgent);
                  const score = Number(row.riskScore ?? 0);
                  const tier = loginRiskTier(score);
                  const isActive = isOpenLoginSessionRow(row);
                  const isFailed = disp === 'failed' || disp === 'unauthorized';
                  return (
                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                      {/* User */}
                      <td className="px-5 py-4">
                        <ActivityUserCell row={row} userById={userById} />
                      </td>

                      {/* Session ID */}
                      <td className="px-5 py-4 max-w-[140px]">
                        {formatSessionIdLabel(row.sessionId) ? (
                          <span className="font-mono text-xs text-cyan-400/90 break-all select-all leading-relaxed"
                            title={row.sessionId ? String(row.sessionId) : undefined}>
                            {formatSessionIdLabel(row.sessionId)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>

                      {/* Login + Logout stacked */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          {(row.loginAt || row.createdAt) ? (
                            <span className="inline-flex items-center gap-1.5 text-foreground">
                              <LogIn className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="text-xs">{formatDateTime(row.loginAt || row.createdAt)}</span>
                            </span>
                          ) : null}
                          {row.logoutAt ? (
                            <span className="inline-flex items-center gap-1.5 text-foreground">
                              <LogOut className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span className="text-xs">{formatDateTime(row.logoutAt)}</span>
                            </span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                              <span className="text-xs text-orange-400 font-medium">Still active</span>
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isFailed ? (
                          <span className="text-muted-foreground">—</span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium text-xs" aria-live="polite">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            {formatLiveElapsed(row.loginAt || row.createdAt, liveTick)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(row.loginAt || row.createdAt, row.logoutAt, disp)}
                          </span>
                        )}
                      </td>

                      {/* IP + Device + User-Agent stacked */}
                      <td className="px-5 py-4 max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-foreground">{row.ipAddress || '—'}</span>
                          <span className="text-xs text-muted-foreground capitalize">{deviceLabel(row)}</span>
                          <span className="text-[11px] text-muted-foreground/70 truncate" title={uaHint.title}>{uaHint.line}</span>
                        </div>
                      </td>

                      {/* Risk */}
                      <td className="px-5 py-4">
                        <LoginRiskCard score={score} tier={tier} />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(disp)}`}
                          title={isFailed ? failureDetail(row.failureReason) || undefined : undefined}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            disp === 'active' ? 'bg-green-400 animate-pulse'
                            : disp === 'failed' || disp === 'unauthorized' ? 'bg-red-400'
                            : 'bg-current opacity-70'
                          }`} />
                          {disp}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">No login activity yet.</td></tr>
                )}
                {!loading && items.length > 0 && filteredItems.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">No rows match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div
        ref={pdfHostRef}
        className="fixed left-[-12000px] top-0 w-[860px] bg-white p-3 text-black"
        aria-hidden
      />
    </>
  );
}
