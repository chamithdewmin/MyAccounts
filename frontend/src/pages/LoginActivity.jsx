import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Activity, Ban, KeyRound, LogOut, LogIn, RefreshCw, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const ADMIN_EMAIL = 'logozodev@gmail.com';

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

const FAILURE_REASON_INVALID = new Set(['invalid_password', 'invalid_credentials', 'unauthorized']);
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

  return (
    <>
      <Helmet>
        <title>Login Activity - LogozoPOS</title>
        <meta name="description" content="Track login sessions, active users, and failed sign-in attempts" />
      </Helmet>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Login Activity</h1>
            <p className="text-muted-foreground text-sm">
              Sessions, active logins, and failed sign-in attempts.
            </p>
            <p className="text-muted-foreground text-xs max-w-3xl mt-1">
              Invalid credentials = wrong email or password on the sign-in form. Failed login = protected API called
              without a token. Blocked IP = invalid or revoked session (token checks).
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Session ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Login time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Logout time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">IP address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User-Agent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const disp = displayActivityStatus(row);
                  const uaHint = userAgentHint(row.userAgent);
                  return (
                  <tr key={row.id} className="border-t border-border hover:bg-secondary/20">
                    <td className="px-4 py-3 text-sm">
                      <ActivityUserCell row={row} userById={userById} />
                    </td>
                    <td className="px-4 py-3 text-sm min-w-[10rem] max-w-[14rem]">
                      {formatSessionIdLabel(row.sessionId) ? (
                        <span
                          className="font-mono text-xs text-cyan-400/95 break-all select-all"
                          title={row.sessionId ? String(row.sessionId) : undefined}
                        >
                          {formatSessionIdLabel(row.sessionId)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.loginAt || row.createdAt ? (
                        <span className="inline-flex items-center gap-1 text-white">
                          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                          {formatDateTime(row.loginAt || row.createdAt)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.logoutAt ? (
                        <span className="inline-flex items-center gap-1 text-white">
                          <LogOut className="w-3.5 h-3.5 text-red-400" />
                          {formatDateTime(row.logoutAt)}
                        </span>
                      ) : isOpenLoginSessionRow(row) ? (
                        <span className="text-orange-400">Still active</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {disp === 'failed' || disp === 'unauthorized'
                        ? '—'
                        : isOpenLoginSessionRow(row)
                          ? (
                            <span className="text-blue-400" aria-live="polite">
                              Live ({formatLiveElapsed(row.loginAt || row.createdAt, liveTick)})
                            </span>
                            )
                          : formatDuration(row.loginAt || row.createdAt, row.logoutAt, disp)}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-sm max-w-[13rem]">
                      <span
                        className="text-xs text-muted-foreground line-clamp-2 break-words"
                        title={uaHint.title}
                      >
                        {uaHint.line}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusBadge(disp)}`}
                        title={
                          disp === 'failed' || disp === 'unauthorized'
                            ? failureDetail(row.failureReason) || undefined
                            : undefined
                        }
                      >
                        {disp}
                      </span>
                    </td>
                  </tr>
                  );
                })}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No login activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
