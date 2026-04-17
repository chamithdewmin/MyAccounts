import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdminRequest } from '../lib/dataScope.js';
import { assertProject, taskHours, TASK_STATUSES, toTaskRow } from './projects.js';

const router = express.Router();
router.use(authMiddleware);

const newId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

async function assertTask(client, taskId, userId) {
  const { rows } = await client.query(
    `SELECT t.* FROM tasks t WHERE t.id = $1 AND t.user_id = $2`,
    [taskId, userId],
  );
  return rows[0] || null;
}

async function enrichTask(client, row) {
  const hours = await taskHours(client, row.id);
  const { rows: open } = await client.query(
    `SELECT id FROM time_logs WHERE task_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
    [row.id],
  );
  const { rows: u } = await client.query('SELECT name FROM users WHERE id = $1', [row.assigned_to]);
  return {
    ...toTaskRow({ ...row, assignee_name: u[0]?.name || null }),
    hoursWorked: Math.round(hours * 100) / 100,
    hasOpenTimer: !!open[0],
    openLogId: open[0]?.id || null,
  };
}

/** GET /:taskId — task + comments + time logs */
router.get('/:taskId', async (req, res) => {
  const uid = req.user.dataUserId;
  const { taskId } = req.params;
  const client = await pool.connect();
  try {
    const t = await assertTask(client, taskId, uid);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const p = await assertProject(client, t.project_id, uid);
    if (!p) return res.status(404).json({ error: 'Not found' });

    const { rows: logs } = await client.query(
      `SELECT id, start_time, end_time, created_at FROM time_logs WHERE task_id = $1 ORDER BY start_time ASC`,
      [taskId],
    );
    const { rows: comments } = await client.query(
      `SELECT c.id, c.body, c.created_at, u.name AS author_name, u.id AS author_id
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId],
    );

    const task = await enrichTask(client, t);
    res.json({
      task,
      projectId: t.project_id,
      timeLogs: logs.map((r) => ({
        id: r.id,
        startTime: r.start_time,
        endTime: r.end_time,
        createdAt: r.created_at,
      })),
      comments: comments.map((r) => ({
        id: r.id,
        body: r.body,
        createdAt: r.created_at,
        authorName: r.author_name,
        authorId: r.author_id,
      })),
    });
  } catch (err) {
    console.error('[projectTasks get]', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.patch('/:taskId', async (req, res) => {
  const uid = req.user.dataUserId;
  const { taskId } = req.params;
  try {
    const cur = await assertTask(pool, taskId, uid);
    if (!cur) return res.status(404).json({ error: 'Not found' });

    const { title, description, status, assignedTo, dueDate } = req.body;
    let t = cur.title;
    if (title !== undefined) {
      t = String(title).trim();
      if (!t) return res.status(400).json({ error: 'Title required' });
    }
    let desc = cur.description;
    if (description !== undefined) desc = String(description || '').trim();
    let st = cur.status;
    if (status !== undefined) {
      const s = String(status).toLowerCase();
      if (!TASK_STATUSES.includes(s)) return res.status(400).json({ error: 'Invalid status' });
      st = s;
    }
    let assign = cur.assigned_to;
    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === '') assign = null;
      else {
        assign = Number(assignedTo);
        if (!Number.isInteger(assign)) return res.status(400).json({ error: 'Invalid assignee' });
        const admin = isAdminRequest(req);
        const actorId = Number(req.user.id);
        if (!admin && assign !== actorId) {
          return res.status(403).json({ error: 'Staff can only assign to themselves' });
        }
        const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id = $1', [assign]);
        if (!rowCount) return res.status(400).json({ error: 'User not found' });
      }
    }
    let due = cur.due_date;
    if (dueDate !== undefined) {
      due = dueDate ? String(dueDate).trim().slice(0, 10) : null;
      if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        return res.status(400).json({ error: 'Invalid due date (use YYYY-MM-DD)' });
      }
    }

    await pool.query(
      `UPDATE tasks SET title = $1, description = $2, status = $3, assigned_to = $4, due_date = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7`,
      [t, desc, st, assign, due, taskId, uid],
    );

    const { rows } = await pool.query(
      `SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`,
      [taskId],
    );
    const client = await pool.connect();
    try {
      res.json(await enrichTask(client, rows[0]));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[projectTasks patch]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:taskId', async (req, res) => {
  const uid = req.user.dataUserId;
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.taskId, uid]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[projectTasks delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:taskId/timer/start', async (req, res) => {
  const uid = req.user.dataUserId;
  const { taskId } = req.params;
  const client = await pool.connect();
  try {
    const t = await assertTask(client, taskId, uid);
    if (!t) return res.status(404).json({ error: 'Not found' });

    const { rows: open } = await client.query(
      `SELECT id FROM time_logs WHERE task_id = $1 AND end_time IS NULL LIMIT 1`,
      [taskId],
    );
    if (open[0]) return res.status(400).json({ error: 'Timer already running' });

    const id = newId('TL');
    await client.query(
      `INSERT INTO time_logs (id, task_id, user_id, start_time) VALUES ($1, $2, $3, NOW())`,
      [id, taskId, uid],
    );

    const { rows } = await client.query(`SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`, [taskId]);
    res.status(201).json(await enrichTask(client, rows[0]));
  } catch (err) {
    console.error('[timer start]', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/:taskId/timer/stop', async (req, res) => {
  const uid = req.user.dataUserId;
  const { taskId } = req.params;
  const client = await pool.connect();
  try {
    const t = await assertTask(client, taskId, uid);
    if (!t) return res.status(404).json({ error: 'Not found' });

    const { rowCount } = await client.query(
      `UPDATE time_logs SET end_time = NOW()
       WHERE id = (
         SELECT id FROM time_logs WHERE task_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1
       ) AND task_id = $1`,
      [taskId],
    );
    if (!rowCount) return res.status(400).json({ error: 'No running timer' });

    const { rows } = await client.query(`SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1`, [taskId]);
    res.json(await enrichTask(client, rows[0]));
  } catch (err) {
    console.error('[timer stop]', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/:taskId/comments', async (req, res) => {
  const uid = req.user.id;
  const { taskId } = req.params;
  try {
    const t = await assertTask(pool, taskId, req.user.dataUserId);
    if (!t) return res.status(404).json({ error: 'Not found' });

    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment text required' });

    const id = newId('CM');
    await pool.query(
      `INSERT INTO task_comments (id, task_id, user_id, body) VALUES ($1, $2, $3, $4)`,
      [id, taskId, uid, body],
    );
    const { rows } = await pool.query(
      `SELECT c.id, c.body, c.created_at, u.name AS author_name, u.id AS author_id
       FROM task_comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      [id],
    );
    const r = rows[0];
    res.status(201).json({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      authorName: r.author_name,
      authorId: r.author_id,
    });
  } catch (err) {
    console.error('[task comment]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
