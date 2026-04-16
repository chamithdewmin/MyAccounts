import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminRequest } from '../lib/dataScope.js';

const router = express.Router();
router.use(authMiddleware);

const newId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const STATUSES = ['in_progress', 'completed', 'on_hold'];
const TASK_STATUSES = ['todo', 'doing', 'done'];

const toProject = (row, extra = {}) => ({
  id: row.id,
  name: row.name,
  clientId: row.client_id || null,
  clientName: row.client_name || null,
  price: Number(row.price) || 0,
  status: row.status || 'in_progress',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...extra,
});

const toTaskRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description || '',
  status: row.status,
  assignedTo: row.assigned_to,
  assigneeName: row.assignee_name || null,
  hourlyRate: Number(row.hourly_rate) || 0,
  dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
  position: row.position ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Hours from closed logs + open segment to now */
async function taskHours(client, taskId) {
  const { rows } = await client.query(
    `SELECT start_time, end_time FROM time_logs WHERE task_id = $1 ORDER BY start_time ASC`,
    [taskId],
  );
  let seconds = 0;
  const now = Date.now();
  for (const r of rows) {
    const start = new Date(r.start_time).getTime();
    const end = r.end_time ? new Date(r.end_time).getTime() : now;
    seconds += Math.max(0, (end - start) / 1000);
  }
  return seconds / 3600;
}

async function taskCost(client, taskId, hourlyRate) {
  const h = await taskHours(client, taskId);
  return h * (Number(hourlyRate) || 0);
}

async function assertProject(client, projectId, userId) {
  const { rows } = await client.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
  return rows[0] || null;
}

const ymdFromDb = (v) => {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
    if (m) return m[1];
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const mo = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return String(v).slice(0, 10);
};

const toProjectExpense = (r) => ({
  id: r.id,
  projectId: r.project_id,
  amount: Number(r.amount) || 0,
  expenseDate: ymdFromDb(r.expense_date),
  category: r.category || 'Other',
  notes: r.notes || '',
  createdAt: r.created_at,
});

/** GET / — list projects with task counts + total cost */
router.get('/', async (req, res) => {
  const uid = req.user.dataUserId;
  try {
    const { rows: projects } = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
       WHERE p.user_id = $1
       ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC`,
      [uid],
    );

    const { rows: taskCounts } = await pool.query(
      `SELECT t.project_id,
              COUNT(*)::int AS task_total,
              COUNT(*) FILTER (WHERE t.status = 'done')::int AS task_done
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id AND p.user_id = $1
       GROUP BY t.project_id`,
      [uid],
    );
    const countMap = new Map(
      taskCounts.map((r) => [r.project_id, { taskTotal: r.task_total, taskDone: r.task_done }]),
    );

    const { rows: allTasks } = await pool.query(
      `SELECT t.id, t.project_id, t.hourly_rate
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id AND p.user_id = $1`,
      [uid],
    );

    const costByProject = new Map();
    const dbClient = await pool.connect();
    try {
      for (const t of allTasks) {
        const c = await taskCost(dbClient, t.id, t.hourly_rate);
        costByProject.set(t.project_id, (costByProject.get(t.project_id) || 0) + c);
      }
    } finally {
      dbClient.release();
    }

    const { rows: expenseSums } = await pool.query(
      `SELECT project_id, COALESCE(SUM(amount), 0)::numeric AS sum_exp
       FROM project_expenses
       WHERE user_id = $1
       GROUP BY project_id`,
      [uid],
    );
    const expenseMap = new Map(expenseSums.map((r) => [r.project_id, Number(r.sum_exp) || 0]));

    const out = projects.map((p) => {
      const counts = countMap.get(p.id) || { taskTotal: 0, taskDone: 0 };
      const taskCostTotal = Math.round((costByProject.get(p.id) || 0) * 100) / 100;
      const expenseTotal = Math.round((expenseMap.get(p.id) || 0) * 100) / 100;
      const totalCost = Math.round((taskCostTotal + expenseTotal) * 100) / 100;
      const price = Number(p.price) || 0;
      const netProfit = Math.round((price - totalCost) * 100) / 100;
      const progress = counts.taskTotal > 0 ? Math.round((counts.taskDone / counts.taskTotal) * 100) : 0;
      return toProject(p, {
        taskTotal: counts.taskTotal,
        taskDone: counts.taskDone,
        progress,
        taskCostTotal,
        expenseTotal,
        totalCost,
        netProfit,
      });
    });

    res.json(out);
  } catch (err) {
    console.error('[projects list]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const uid = req.user.dataUserId;
  try {
    const { name, clientId, price, status } = req.body;
    const n = String(name || '').trim();
    if (!n) return res.status(400).json({ error: 'Project name is required' });
    const st = String(status || 'in_progress').toLowerCase();
    if (!STATUSES.includes(st)) return res.status(400).json({ error: 'Invalid status' });
    const pr = Number(price);
    if (Number.isNaN(pr) || pr < 0) return res.status(400).json({ error: 'Invalid price' });

    let cid = clientId ? String(clientId).trim() : null;
    if (cid) {
      const { rowCount } = await pool.query('SELECT 1 FROM clients WHERE id = $1 AND user_id = $2', [cid, uid]);
      if (!rowCount) return res.status(400).json({ error: 'Client not found' });
    } else cid = null;

    const id = newId('PRJ');
    const { rows } = await pool.query(
      `INSERT INTO projects (id, user_id, name, client_id, price, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, (SELECT name FROM clients c WHERE c.id = $4 AND c.user_id = $2) AS client_name`,
      [id, uid, n, cid, pr, st],
    );
    const row = rows[0];
    res.status(201).json(
      toProject(row, {
        taskTotal: 0,
        taskDone: 0,
        progress: 0,
        taskCostTotal: 0,
        expenseTotal: 0,
        totalCost: 0,
        netProfit: pr,
      }),
    );
  } catch (err) {
    console.error('[projects create]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:projectId/expenses', async (req, res) => {
  const uid = req.user.dataUserId;
  const { projectId } = req.params;
  try {
    const p = await assertProject(pool, projectId, uid);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query(
      `SELECT * FROM project_expenses WHERE project_id = $1 AND user_id = $2 ORDER BY expense_date DESC, created_at DESC`,
      [projectId, uid],
    );
    res.json(rows.map(toProjectExpense));
  } catch (err) {
    console.error('[project expenses list]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:projectId/expenses', async (req, res) => {
  const uid = req.user.dataUserId;
  const { projectId } = req.params;
  try {
    const p = await assertProject(pool, projectId, uid);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { amount, expenseDate, category, notes } = req.body;
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) return res.status(400).json({ error: 'Invalid amount' });
    const ed = String(expenseDate || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ed)) return res.status(400).json({ error: 'Valid expense date required (YYYY-MM-DD)' });
    const cat = String(category || 'Other').trim() || 'Other';
    const note = String(notes || '').trim();

    const id = newId('PEX');
    const { rows } = await pool.query(
      `INSERT INTO project_expenses (id, project_id, user_id, amount, expense_date, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, projectId, uid, amt, ed, cat, note],
    );
    res.status(201).json(toProjectExpense(rows[0]));
  } catch (err) {
    console.error('[project expenses create]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:projectId/expenses/:expenseId', async (req, res) => {
  const uid = req.user.dataUserId;
  const { projectId, expenseId } = req.params;
  try {
    const p = await assertProject(pool, projectId, uid);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { rows: curRows } = await pool.query(
      `SELECT * FROM project_expenses WHERE id = $1 AND project_id = $2 AND user_id = $3`,
      [expenseId, projectId, uid],
    );
    if (!curRows[0]) return res.status(404).json({ error: 'Not found' });
    const cur = curRows[0];

    const { amount, expenseDate, category, notes } = req.body;
    let amt = Number(cur.amount);
    if (amount !== undefined) {
      amt = Number(amount);
      if (Number.isNaN(amt) || amt < 0) return res.status(400).json({ error: 'Invalid amount' });
    }
    let ed = ymdFromDb(cur.expense_date);
    if (expenseDate !== undefined) {
      const s = String(expenseDate || '').trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return res.status(400).json({ error: 'Invalid date' });
      ed = s;
    }
    const cat = category !== undefined ? String(category || 'Other').trim() || 'Other' : cur.category;
    const note = notes !== undefined ? String(notes || '').trim() : cur.notes;

    await pool.query(
      `UPDATE project_expenses SET amount = $1, expense_date = $2, category = $3, notes = $4 WHERE id = $5 AND project_id = $6 AND user_id = $7`,
      [amt, ed, cat, note, expenseId, projectId, uid],
    );
    const { rows } = await pool.query(`SELECT * FROM project_expenses WHERE id = $1`, [expenseId]);
    res.json(toProjectExpense(rows[0]));
  } catch (err) {
    console.error('[project expenses patch]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:projectId/expenses/:expenseId', async (req, res) => {
  const uid = req.user.dataUserId;
  const { projectId, expenseId } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM project_expenses WHERE id = $1 AND project_id = $2 AND user_id = $3`,
      [expenseId, projectId, uid],
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[project expenses delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:projectId', async (req, res) => {
  const uid = req.user.dataUserId;
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
       WHERE p.id = $1 AND p.user_id = $2`,
      [projectId, uid],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const p = rows[0];

    const { rows: tasks } = await pool.query(
      `SELECT t.*, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id = $1 AND t.user_id = $2
       ORDER BY t.status, t.position ASC, t.created_at ASC`,
      [projectId, uid],
    );

    const client = await pool.connect();
    const enriched = [];
    try {
      for (const t of tasks) {
        const hours = await taskHours(client, t.id);
        const cost = hours * (Number(t.hourly_rate) || 0);
        const { rows: open } = await client.query(
          `SELECT id FROM time_logs WHERE task_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
          [t.id],
        );
        enriched.push({
          ...toTaskRow(t),
          hoursWorked: Math.round(hours * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          hasOpenTimer: !!open[0],
          openLogId: open[0]?.id || null,
        });
      }
    } finally {
      client.release();
    }

    const taskCostTotal = Math.round(enriched.reduce((s, t) => s + t.cost, 0) * 100) / 100;

    const { rows: expRows } = await pool.query(
      `SELECT * FROM project_expenses WHERE project_id = $1 AND user_id = $2 ORDER BY expense_date DESC, created_at DESC`,
      [projectId, uid],
    );
    const projectExpenses = expRows.map(toProjectExpense);
    const expenseTotal = Math.round(expRows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;

    const totalCost = Math.round((taskCostTotal + expenseTotal) * 100) / 100;
    const price = Number(p.price) || 0;
    const netProfit = Math.round((price - totalCost) * 100) / 100;
    const taskTotal = tasks.length;
    const taskDone = tasks.filter((t) => t.status === 'done').length;
    const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
    const marginWarning = price > 0 && totalCost >= price * 0.8;

    let assignees = [];
    if (isAdminRequest(req)) {
      const { rows: ar } = await pool.query(`SELECT id, name, email FROM users ORDER BY name NULLS LAST, id ASC`);
      assignees = ar.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    } else {
      const { rows: ar } = await pool.query(`SELECT id, name, email FROM users WHERE id = $1`, [req.user.id]);
      assignees = ar.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    }

    res.json({
      ...toProject(p),
      tasks: enriched,
      taskCostTotal,
      expenseTotal,
      totalCost,
      netProfit,
      progress,
      marginWarning,
      taskTotal,
      taskDone,
      assignees,
      projectExpenses,
    });
  } catch (err) {
    console.error('[projects get]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:projectId', async (req, res) => {
  const uid = req.user.dataUserId;
  const { projectId } = req.params;
  try {
    const cur = await assertProject(pool, projectId, uid);
    if (!cur) return res.status(404).json({ error: 'Not found' });

    const { name, clientId, price, status } = req.body;
    let cid = cur.client_id;
    if (clientId !== undefined) {
      if (clientId === null || clientId === '') cid = null;
      else {
        const c = String(clientId).trim();
        const { rowCount } = await pool.query('SELECT 1 FROM clients WHERE id = $1 AND user_id = $2', [c, uid]);
        if (!rowCount) return res.status(400).json({ error: 'Client not found' });
        cid = c;
      }
    }
    const n = name !== undefined ? String(name).trim() : cur.name;
    if (!n) return res.status(400).json({ error: 'Name required' });
    const pr = price !== undefined ? Number(price) : Number(cur.price);
    if (Number.isNaN(pr) || pr < 0) return res.status(400).json({ error: 'Invalid price' });
    let st = cur.status;
    if (status !== undefined) {
      const s = String(status).toLowerCase();
      if (!STATUSES.includes(s)) return res.status(400).json({ error: 'Invalid status' });
      st = s;
    }

    await pool.query(
      `UPDATE projects SET name = $1, client_id = $2, price = $3, status = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6`,
      [n, cid, pr, st, projectId, uid],
    );

    const { rows } = await pool.query(
      `SELECT p.*, c.name AS client_name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
       WHERE p.id = $1 AND p.user_id = $2`,
      [projectId, uid],
    );
    res.json(toProject(rows[0]));
  } catch (err) {
    console.error('[projects patch]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:projectId', async (req, res) => {
  const uid = req.user.dataUserId;
  try {
    const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.projectId, uid]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[projects delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:projectId/tasks', async (req, res) => {
  const uid = req.user.dataUserId;
  try {
    const p = await assertProject(pool, req.params.projectId, uid);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { rows: tasks } = await pool.query(
      `SELECT t.*, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id = $1 AND t.user_id = $2
       ORDER BY t.status, t.position ASC, t.created_at ASC`,
      [req.params.projectId, uid],
    );
    const client = await pool.connect();
    const enriched = [];
    try {
      for (const t of tasks) {
        const hours = await taskHours(client, t.id);
        const cost = hours * (Number(t.hourly_rate) || 0);
        const { rows: open } = await client.query(
          `SELECT id FROM time_logs WHERE task_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
          [t.id],
        );
        enriched.push({
          ...toTaskRow(t),
          hoursWorked: Math.round(hours * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          hasOpenTimer: !!open[0],
          openLogId: open[0]?.id || null,
        });
      }
    } finally {
      client.release();
    }
    res.json(enriched);
  } catch (err) {
    console.error('[projects tasks list]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:projectId/tasks', async (req, res) => {
  const uid = req.user.dataUserId;
  try {
    const p = await assertProject(pool, req.params.projectId, uid);
    if (!p) return res.status(404).json({ error: 'Not found' });

    const { title, description, status, assignedTo, hourlyRate, dueDate } = req.body;
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ error: 'Title is required' });
    const st = String(status || 'todo').toLowerCase();
    if (!TASK_STATUSES.includes(st)) return res.status(400).json({ error: 'Invalid task status' });
    const rate = Number(hourlyRate);
    if (Number.isNaN(rate) || rate < 0) return res.status(400).json({ error: 'Invalid hourly rate' });

    let assign = assignedTo != null && assignedTo !== '' ? Number(assignedTo) : null;
    if (assign != null && !Number.isInteger(assign)) return res.status(400).json({ error: 'Invalid assignee' });
    if (assign != null) {
      if (!isAdminRequest(req) && assign !== req.user.id) {
        return res.status(403).json({ error: 'Staff can only assign tasks to themselves' });
      }
      const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id = $1', [assign]);
      if (!rowCount) return res.status(400).json({ error: 'User not found' });
    }

    const due = dueDate ? String(dueDate).trim().slice(0, 10) : null;
    const { rows: maxPos } = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE project_id = $1 AND status = $2`,
      [req.params.projectId, st],
    );
    const position = maxPos[0]?.next_pos ?? 0;

    const id = newId('TSK');
    const { rows } = await pool.query(
      `INSERT INTO tasks (id, project_id, user_id, title, description, status, assigned_to, hourly_rate, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, req.params.projectId, uid, t, String(description || '').trim(), st, assign, rate, due || null, position],
    );
    const row = rows[0];
    const { rows: u } = await pool.query('SELECT name FROM users WHERE id = $1', [row.assigned_to]);
    res.status(201).json({
      ...toTaskRow({ ...row, assignee_name: u[0]?.name || null }),
      hoursWorked: 0,
      cost: 0,
      hasOpenTimer: false,
      openLogId: null,
    });
  } catch (err) {
    console.error('[projects task create]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { taskHours, taskCost, assertProject, TASK_STATUSES, toTaskRow };
export default router;
