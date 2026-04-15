import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Activity, Clock3, LogOut, LogIn, RefreshCw, ShieldCheck, Users } from 'lucide-react';
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

const formatDuration = (start, end, status) => {
  if (!start) return '—';
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return '—';
  const e = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(e) || e < s) return status === 'active' ? 'Ongoing' : '—';
  const sec = Math.floor((e - s) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = sec % 60;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
};

const statusBadge = (status) => {
  if (status === 'active') return 'bg-emerald-500/20 text-emerald-400';
  if (status === 'failed') return 'bg-red-500/20 text-red-400';
  return 'bg-slate-500/20 text-slate-300';
};

const failureLabel = (reason) => {
  if (!reason) return null;
  if (reason === 'invalid_password') return 'Invalid password';
  if (reason === 'invalid_credentials') return 'Invalid password';
  if (reason === 'unauthorized') return 'unauthorized';
  if (reason === 'invalid_token') return 'Invalid token';
  if (reason === 'session_expired') return 'Session expired';
  if (reason === 'user_not_found') return 'User not found';
  return reason.replace(/_/g, ' ');
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
    if (statsData) {
      return {
        totalUsers: statsData.totalUsers ?? users.length,
        activeSessions: statsData.activeSessions ?? items.filter((x) => x.status === 'active').length,
        failedAttempts: statsData.failedAttempts ?? items.filter((x) => x.status === 'failed').length,
        totalSessions: statsData.totalSessions ?? items.length,
      };
    }
    const activeSessions = items.filter((x) => x.status === 'active').length;
    const failedAttempts = items.filter((x) => x.status === 'failed').length;
    return {
      totalUsers: users.length,
      activeSessions,
      failedAttempts,
      totalSessions: items.length,
    };
  }, [items, users]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
            <div className="text-xs text-muted-foreground">Failed Attempts</div>
            <div className="mt-1 text-2xl font-bold">{stats.failedAttempts}</div>
            <Clock3 className="w-4 h-4 text-red-400 mt-2" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Login time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Logout time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">IP address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-secondary/20">
                    <td className="px-4 py-3 text-sm">
                      <ActivityUserCell row={row} userById={userById} />
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
                      ) : row.status === 'active' ? (
                        <span className="text-orange-400">Active session</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.status === 'failed'
                        ? '—'
                        : row.status === 'active'
                          ? <span className="text-blue-400">Ongoing</span>
                          : formatDuration(row.loginAt || row.createdAt, row.logoutAt, row.status)}
                    </td>
                    <td className="px-4 py-3 text-sm">{row.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusBadge(row.status)}`}>
                        {row.status === 'failed' ? (failureLabel(row.failureReason) || 'Failed') : row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
