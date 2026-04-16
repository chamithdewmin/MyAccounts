import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const MAX_BYTES = 52 * 1024 * 1024;

const ensureUploadsRoot = () => {
  try {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  } catch {
    /* ignore */
  }
};

const typeFilterSql = (alias = 'f') => {
  const t = `${alias}.file_type`;
  return {
    images: `${t} LIKE 'image/%'`,
    pdfs: `${t} = 'application/pdf'`,
    docs: `(
      ${t} ILIKE '%word%' OR ${t} ILIKE '%excel%' OR ${t} ILIKE '%spreadsheet%' OR
      ${t} = 'text/plain' OR ${t} ILIKE '%csv%' OR ${t} ILIKE '%powerpoint%' OR
      ${t} ILIKE '%opendocument%'
    )`,
    others: `NOT (
      ${t} LIKE 'image/%' OR ${t} = 'application/pdf' OR
      (${t} ILIKE '%word%' OR ${t} ILIKE '%excel%' OR ${t} ILIKE '%spreadsheet%' OR
       ${t} = 'text/plain' OR ${t} ILIKE '%csv%' OR ${t} ILIKE '%powerpoint%' OR ${t} ILIKE '%opendocument%')
    )`,
  };
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    ensureUploadsRoot();
    const uid = req.user?.dataUserId;
    const dir = path.join(UPLOADS_ROOT, String(uid));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').replace(/[^\w.-]/g, '') || '';
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    cb(null, base + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
});

const router = express.Router();
router.use(authMiddleware);

const toRow = (r) => ({
  id: r.id,
  filename: r.filename,
  originalName: r.original_name,
  fileType: r.file_type,
  fileSize: Number(r.file_size),
  filePath: r.file_path,
  uploadedBy: r.uploaded_by,
  uploadedByName: r.uploaded_by_name || '',
  folderId: r.folder_id != null ? Number(r.folder_id) : null,
  folderName: r.folder_name || null,
  linkedType: r.linked_type,
  linkedId: r.linked_id,
  linkedLabel: r.linked_label || null,
  tags: r.tags || '',
  createdAt: r.created_at,
});

const toFolder = (r) => ({
  id: Number(r.id),
  name: r.name,
  createdAt: r.created_at,
});

const absolutePath = (relative) => {
  const rel = String(relative || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = rel.split('/').filter((p) => p && p !== '..' && p !== '.');
  if (parts.length < 2) return null;
  return path.join(UPLOADS_ROOT, ...parts);
};

const validateLink = async (client, { linkedType, linkedId, userId }) => {
  const lt = linkedType != null ? String(linkedType).toLowerCase().trim() : '';
  const lid = linkedId != null ? String(linkedId).trim() : '';
  if (!lt && !lid) return { linkedType: null, linkedId: null };
  if (lt !== 'client' && lt !== 'invoice') {
    return { error: 'linked_type must be client or invoice' };
  }
  if (!lid) return { error: 'linked_id required when linking' };
  if (lt === 'client') {
    const { rows } = await client.query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [lid, userId]);
    if (!rows[0]) return { error: 'Client not found' };
    return { linkedType: 'client', linkedId: lid };
  }
  const { rows } = await client.query('SELECT id, invoice_number FROM invoices WHERE id = $1 AND user_id = $2', [
    lid,
    userId,
  ]);
  if (!rows[0]) return { error: 'Invoice not found' };
  return { linkedType: 'invoice', linkedId: rows[0].id };
};

const validateFolderId = async (client, { folderId, userId }) => {
  if (folderId == null || folderId === '') return { folderId: null };
  const parsed = Number(folderId);
  if (!Number.isInteger(parsed) || parsed <= 0) return { error: 'Invalid folder id' };
  const { rows } = await client.query('SELECT id FROM folders WHERE id = $1 AND user_id = $2', [parsed, userId]);
  if (!rows[0]) return { error: 'Folder not found' };
  return { folderId: parsed };
};

router.get('/folders', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const { rows } = await pool.query('SELECT id, name, created_at FROM folders WHERE user_id = $1 ORDER BY name ASC', [uid]);
    res.json(rows.map(toFolder));
  } catch (err) {
    console.error('[folders GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const rawName = String(req.body?.name || '').trim();
    if (!rawName) return res.status(400).json({ error: 'Folder name required' });
    const name = rawName.slice(0, 255);
    const { rows } = await pool.query(
      'INSERT INTO folders (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [uid, name],
    );
    res.status(201).json(toFolder(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Folder already exists' });
    console.error('[folders POST]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/folders/:id(\\d+)', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid folder id' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT id, name FROM folders WHERE id = $1 AND user_id = $2', [id, uid]);
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Folder not found' });
      }
      // Keep files safe: move folder files back to root before deleting folder.
      await client.query('UPDATE files SET folder_id = NULL WHERE user_id = $1 AND folder_id = $2', [uid, id]);
      await client.query('DELETE FROM folders WHERE id = $1 AND user_id = $2', [id, uid]);
      await client.query('COMMIT');
      res.json({ success: true, movedToRoot: true, folderName: rows[0].name });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[folders DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const q = req.query.q != null ? String(req.query.q).trim() : '';
    const type = String(req.query.type || 'all').toLowerCase();
    const scope = String(req.query.scope || 'all').toLowerCase();
    const folderIdRaw = req.query.folder_id ?? req.query.folderId;

    const conds = ['f.user_id = $1'];
    const params = [uid];
    let p = 2;

    if (q) {
      conds.push(
        `(LOWER(f.original_name) LIKE LOWER($${p}) OR LOWER(COALESCE(f.tags, '')) LIKE LOWER($${p}) OR LOWER(COALESCE(f.file_type, '')) LIKE LOWER($${p}))`,
      );
      params.push(`%${q}%`);
      p += 1;
    }

    if (scope === 'unlinked') {
      conds.push('(f.linked_type IS NULL OR f.linked_id IS NULL OR f.linked_id = \'\')');
    } else if (scope === 'client') {
      conds.push(`f.linked_type = 'client'`);
    } else if (scope === 'invoice') {
      conds.push(`f.linked_type = 'invoice'`);
    }

    const tf = typeFilterSql('f');
    if (type === 'images') conds.push(`(${tf.images})`);
    else if (type === 'pdfs') conds.push(`(${tf.pdfs})`);
    else if (type === 'docs') conds.push(`(${tf.docs})`);
    else if (type === 'others') conds.push(`(${tf.others})`);
    if (folderIdRaw != null && String(folderIdRaw).trim() !== '') {
      const parsedFolderId = Number(folderIdRaw);
      if (!Number.isInteger(parsedFolderId) || parsedFolderId <= 0) {
        return res.status(400).json({ error: 'Invalid folder id' });
      }
      conds.push(`f.folder_id = $${p}`);
      params.push(parsedFolderId);
      p += 1;
    }

    const where = conds.join(' AND ');
    const sql = `
      SELECT
        f.id, f.filename, f.original_name, f.file_type, f.file_size, f.file_path,
        f.uploaded_by, f.folder_id, f.linked_type, f.linked_id, f.tags, f.created_at,
        u.name AS uploaded_by_name,
        fo.name AS folder_name,
        CASE
          WHEN f.linked_type = 'client' THEN c.name
          WHEN f.linked_type = 'invoice' THEN COALESCE(NULLIF(inv.invoice_number, ''), inv.id::text)
          ELSE NULL
        END AS linked_label
      FROM files f
      LEFT JOIN users u ON u.id = f.uploaded_by
      LEFT JOIN folders fo ON fo.id = f.folder_id AND fo.user_id = f.user_id
      LEFT JOIN clients c ON f.linked_type = 'client' AND c.id = f.linked_id AND c.user_id = f.user_id
      LEFT JOIN invoices inv ON f.linked_type = 'invoice' AND inv.id = f.linked_id AND inv.user_id = f.user_id
      WHERE ${where}
      ORDER BY f.created_at DESC
    `;
    const { rows } = await pool.query(sql, params);
    // IMPORTANT: do not auto-delete records when file is temporarily unavailable on disk.
    // Data must remain until user explicitly deletes.
    res.json(rows.map(toRow));
  } catch (err) {
    console.error('[files GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const uid = req.user.dataUserId;
  const uploadedBy = req.user.id;
  const originalName = path.basename(file.originalname || 'file').slice(0, 500) || 'file';
  const tags = req.body.tags != null ? String(req.body.tags).slice(0, 2000) : '';
  const folderRaw = req.body.folder_id ?? req.body.folderId;
  let linkedType = req.body.linked_type != null ? String(req.body.linked_type).trim() : '';
  let linkedId = req.body.linked_id != null ? String(req.body.linked_id).trim() : '';
  if (!linkedType || !linkedId) {
    linkedType = '';
    linkedId = '';
  }

  const client = await pool.connect();
  try {
    const link = await validateLink(client, {
      linkedType: linkedType || null,
      linkedId: linkedId || null,
      userId: uid,
    });
    if (link.error) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({ error: link.error });
    }
    const folder = await validateFolderId(client, { folderId: folderRaw, userId: uid });
    if (folder.error) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({ error: folder.error });
    }

    const relativePath = `${uid}/${file.filename}`;
    const { rows: ins } = await client.query(
      `INSERT INTO files (
        user_id, filename, original_name, file_type, file_size, file_path, uploaded_by, folder_id, linked_type, linked_id, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        uid,
        file.filename,
        originalName,
        file.mimetype || 'application/octet-stream',
        file.size || 0,
        relativePath,
        uploadedBy,
        folder.folderId,
        link.linkedType,
        link.linkedId,
        tags,
      ],
    );
    const newId = ins[0].id;
    const { rows } = await client.query(
      `
      SELECT
        f.id, f.filename, f.original_name, f.file_type, f.file_size, f.file_path,
        f.uploaded_by, f.folder_id, f.linked_type, f.linked_id, f.tags, f.created_at,
        u.name AS uploaded_by_name,
        fo.name AS folder_name,
        CASE
          WHEN f.linked_type = 'client' THEN c.name
          WHEN f.linked_type = 'invoice' THEN COALESCE(NULLIF(inv.invoice_number, ''), inv.id::text)
          ELSE NULL
        END AS linked_label
      FROM files f
      LEFT JOIN users u ON u.id = f.uploaded_by
      LEFT JOIN folders fo ON fo.id = f.folder_id AND fo.user_id = f.user_id
      LEFT JOIN clients c ON f.linked_type = 'client' AND c.id = f.linked_id AND c.user_id = f.user_id
      LEFT JOIN invoices inv ON f.linked_type = 'invoice' AND inv.id = f.linked_id AND inv.user_id = f.user_id
      WHERE f.id = $1
      `,
      [newId],
    );
    res.status(201).json(toRow(rows[0]));
  } catch (err) {
    console.error('[files upload]', err);
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.use((err, _req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB)` });
  }
  next(err);
});

router.get('/:id(\\d+)/file', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query(
      'SELECT original_name, file_type, file_path FROM files WHERE id = $1 AND user_id = $2',
      [id, uid],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const abs = absolutePath(rows[0].file_path);
    if (!abs || !fs.existsSync(abs)) {
      return res.status(404).json({ error: 'File missing on disk' });
    }
    const inline = String(req.query.inline || '') === '1';
    const name = rows[0].original_name || 'download';
    res.setHeader('Content-Type', rows[0].file_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(name).replace(/'/g, '%27')}"`,
    );
    fs.createReadStream(abs).pipe(res);
  } catch (err) {
    console.error('[files file]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id(\\d+)', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { rows: existing } = await pool.query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!existing[0]) return res.status(404).json({ error: 'Not found' });

    const originalName = req.body.originalName ?? req.body.original_name;
    const tags = req.body.tags;
    const linked_type = req.body.linked_type ?? req.body.linkedType;
    const linked_id = req.body.linked_id ?? req.body.linkedId;
    const folder_id = req.body.folder_id ?? req.body.folderId;
    const client = await pool.connect();
    try {
      let nextName = existing[0].original_name;
      let nextTags = existing[0].tags;
      let nextLt = existing[0].linked_type;
      let nextLid = existing[0].linked_id;
      let nextFolderId = existing[0].folder_id;

      if (originalName != null) {
        const n = String(originalName).trim().slice(0, 500);
        if (n) nextName = n;
      }
      if (tags != null) nextTags = String(tags).slice(0, 2000);

      if (linked_type !== undefined || linked_id !== undefined) {
        const ltEmpty = linked_type === null || linked_type === '' || linked_type === undefined;
        const lidEmpty = linked_id === null || linked_id === '' || linked_id === undefined;
        if (ltEmpty && lidEmpty) {
          nextLt = null;
          nextLid = null;
        } else {
          const link = await validateLink(client, {
            linkedType: linked_type,
            linkedId: linked_id,
            userId: uid,
          });
          if (link.error) return res.status(400).json({ error: link.error });
          nextLt = link.linkedType;
          nextLid = link.linkedId;
        }
      }
      if (folder_id !== undefined) {
        const folder = await validateFolderId(client, { folderId: folder_id, userId: uid });
        if (folder.error) return res.status(400).json({ error: folder.error });
        nextFolderId = folder.folderId;
      }

      await client.query(
        `UPDATE files SET original_name = $2, tags = $3, folder_id = $4, linked_type = $5, linked_id = $6 WHERE id = $1 AND user_id = $7`,
        [id, nextName, nextTags, nextFolderId, nextLt, nextLid, uid],
      );

      const { rows } = await client.query(
        `
        SELECT
          f.id, f.filename, f.original_name, f.file_type, f.file_size, f.file_path,
          f.uploaded_by, f.folder_id, f.linked_type, f.linked_id, f.tags, f.created_at,
          u.name AS uploaded_by_name,
          fo.name AS folder_name,
          CASE
            WHEN f.linked_type = 'client' THEN c.name
            WHEN f.linked_type = 'invoice' THEN COALESCE(NULLIF(inv.invoice_number, ''), inv.id::text)
            ELSE NULL
          END AS linked_label
        FROM files f
        LEFT JOIN users u ON u.id = f.uploaded_by
        LEFT JOIN folders fo ON fo.id = f.folder_id AND fo.user_id = f.user_id
        LEFT JOIN clients c ON f.linked_type = 'client' AND c.id = f.linked_id AND c.user_id = f.user_id
        LEFT JOIN invoices inv ON f.linked_type = 'invoice' AND inv.id = f.linked_id AND inv.user_id = f.user_id
        WHERE f.id = $1
        `,
        [id],
      );
      res.json(toRow(rows[0]));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[files PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id(\\d+)', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('SELECT file_path FROM files WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const abs = absolutePath(rows[0].file_path);
    await pool.query('DELETE FROM files WHERE id = $1 AND user_id = $2', [id, uid]);
    if (abs) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[files DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
