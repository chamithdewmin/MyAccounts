import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR_ENV = process.env.UPLOADS_DIR != null ? String(process.env.UPLOADS_DIR).trim() : '';
/** Persistent disk path (required in Docker/production). Default: backend/uploads next to this package. */
const UPLOADS_ROOT = UPLOADS_DIR_ENV
  ? path.resolve(UPLOADS_DIR_ENV)
  : path.join(__dirname, '..', '..', 'uploads');
const REQUIRE_PERSISTENT_UPLOADS =
  process.env.REQUIRE_PERSISTENT_UPLOADS != null
    ? !['0', 'false', 'no'].includes(String(process.env.REQUIRE_PERSISTENT_UPLOADS).toLowerCase().trim())
    : true;
const MAX_BYTES = 52 * 1024 * 1024;

if (process.env.NODE_ENV !== 'test') {
  console.log('[files] UPLOADS_ROOT =', UPLOADS_ROOT);
  if (process.env.NODE_ENV === 'production' && !UPLOADS_DIR_ENV) {
    const msg =
      '[files] UPLOADS_DIR is not set. New uploads go under the app tree and are usually wiped on container redeploy. Set UPLOADS_DIR to a host-mounted or named volume path (see .env.example, docker-compose.uploads.example.yml).';
    if (REQUIRE_PERSISTENT_UPLOADS) {
      throw new Error(`${msg} Refusing startup in production to prevent data loss.`);
    }
    console.warn(`${msg} Continuing because REQUIRE_PERSISTENT_UPLOADS is disabled.`);
  }
}

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
  hasPassword: r.is_locked === true || r.is_locked === 't',
  createdAt: r.created_at,
});

const absolutePath = (relative) => {
  const rel = String(relative || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = rel.split('/').filter((p) => p && p !== '..' && p !== '.');
  if (parts.length < 2) return null;
  return path.join(UPLOADS_ROOT, ...parts);
};

/**
 * Build extra candidate relative paths for legacy DB rows.
 * Example legacy values: "uploads/12/file.png", "/uploads/12/file.png".
 */
const legacyRelativeCandidates = (storedRel) => {
  const rel = String(storedRel || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel) return [];
  const parts = rel.split('/').filter((p) => p && p !== '..' && p !== '.');
  if (parts.length < 2) return [];
  const first = String(parts[0]).toLowerCase();
  if (first === 'uploads') {
    return [parts.slice(1).join('/')];
  }
  return [];
};

/** Canonical relative path under UPLOADS_ROOT (POSIX slashes). Root = flat `uid/name`; folder = `uid/folders/{id}/name`. */
const storageRelPath = (uid, folderId, filename) => {
  const u = String(uid);
  const base = path.basename(String(filename || '').replace(/\\/g, '/')) || '';
  if (!base) return null;
  if (folderId == null || folderId === '') return `${u}/${base}`;
  const fid = Number(folderId);
  if (!Number.isInteger(fid) || fid <= 0) return `${u}/${base}`;
  return `${u}/folders/${fid}/${base}`;
};

const canReadFile = async (abs) => {
  if (!abs) return false;
  try {
    await fs.promises.access(abs, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Find bytes on disk for a file row (handles legacy flat layout + folder layout).
 */
const findExistingFileAbs = async (uid, filename, storedRel, folderIdFromRow) => {
  const u = String(uid);
  const fn = String(filename || path.basename(String(storedRel || '').replace(/\\/g, '/')) || '');
  if (!fn) return null;
  const attempts = [];
  const storedRaw = String(storedRel || '').trim();
  // Legacy compatibility: older rows may have absolute file paths.
  if (storedRaw && path.isAbsolute(storedRaw)) attempts.push(storedRaw);
  const a0 = absolutePath(storedRel);
  if (a0) attempts.push(a0);
  const legacyRels = legacyRelativeCandidates(storedRel);
  for (let i = 0; i < legacyRels.length; i += 1) {
    const ai = absolutePath(legacyRels[i]);
    if (ai) attempts.push(ai);
  }
  attempts.push(path.join(UPLOADS_ROOT, u, fn));
  const fid = folderIdFromRow != null && folderIdFromRow !== '' ? Number(folderIdFromRow) : null;
  if (Number.isInteger(fid) && fid > 0) {
    attempts.push(path.join(UPLOADS_ROOT, u, 'folders', String(fid), fn));
  }
  const seen = new Set();
  for (const p of attempts) {
    const key = path.normalize(p);
    if (seen.has(key)) continue;
    seen.add(key);
    if (await canReadFile(p)) return p;
  }
  return null;
};

const moveFileAcrossDirs = async (fromAbs, toAbs) => {
  if (!fromAbs || !toAbs) throw new Error('moveFileAcrossDirs: missing path');
  if (path.normalize(fromAbs) === path.normalize(toAbs)) return;
  await fs.promises.mkdir(path.dirname(toAbs), { recursive: true });
  try {
    await fs.promises.rename(fromAbs, toAbs);
  } catch (e) {
    if (e && e.code === 'EXDEV') {
      await fs.promises.copyFile(fromAbs, toAbs);
      await fs.promises.unlink(fromAbs);
    } else {
      throw e;
    }
  }
};

/** Move on-disk object to match folder_id; updates relative path string for DB. */
const relocateToFolderLayout = async (uid, filename, storedRel, folderIdFromRow, nextFolderId) => {
  const fromAbs = await findExistingFileAbs(uid, filename, storedRel, folderIdFromRow);
  if (!fromAbs) return { error: 'File missing on disk' };
  const nextRel = storageRelPath(uid, nextFolderId, filename);
  const toAbs = absolutePath(nextRel);
  if (!toAbs) return { error: 'Invalid file path' };
  if (path.normalize(fromAbs) === path.normalize(toAbs)) return { relativePath: nextRel };
  await moveFileAcrossDirs(fromAbs, toAbs);
  return { relativePath: nextRel };
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
    const { rows } = await pool.query(
      'SELECT id, name, is_locked, created_at FROM folders WHERE user_id = $1 ORDER BY name ASC',
      [uid],
    );
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

router.patch('/folders/:id(\\d+)', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid folder id' });
    const rawName = String(req.body?.name || '').trim();
    if (!rawName) return res.status(400).json({ error: 'Folder name required' });
    const name = rawName.slice(0, 255);
    const { rows } = await pool.query(
      'UPDATE folders SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name, is_locked, created_at',
      [name, id, uid],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Folder not found' });
    res.json(toFolder(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Folder already exists' });
    console.error('[folders PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/folders/:id(\\d+)/password', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid folder id' });
    const enabled = req.body?.enabled === true;
    if (!enabled) {
      const { rows } = await pool.query(
        `UPDATE folders
         SET is_locked = false, use_login_password = true, access_password_hash = NULL
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, is_locked, created_at`,
        [id, uid],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Folder not found' });
      return res.json(toFolder(rows[0]));
    }
    const useLoginPassword = req.body?.useLoginPassword !== false;
    let passwordHash = null;
    if (!useLoginPassword) {
      const password = String(req.body?.password || '').trim();
      if (password.length < 4) return res.status(400).json({ error: 'Folder password must be at least 4 characters' });
      passwordHash = await bcrypt.hash(password, 10);
    }
    const { rows } = await pool.query(
      `UPDATE folders
       SET is_locked = true, use_login_password = $1, access_password_hash = $2
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, is_locked, created_at`,
      [useLoginPassword, passwordHash, id, uid],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Folder not found' });
    res.json(toFolder(rows[0]));
  } catch (err) {
    console.error('[folders password PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/folders/:id(\\d+)/unlock', async (req, res) => {
  try {
    const uid = req.user.dataUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid folder id' });
    const password = String(req.body?.password || '');
    if (!password) return res.status(400).json({ error: 'Password required' });
    const { rows } = await pool.query(
      `SELECT f.id, f.name, f.is_locked, f.use_login_password, f.access_password_hash, u.password_hash AS user_password_hash
       FROM folders f
       JOIN users u ON u.id = f.user_id
       WHERE f.id = $1 AND f.user_id = $2`,
      [id, uid],
    );
    const folder = rows[0];
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (!(folder.is_locked === true || folder.is_locked === 't')) return res.json({ success: true, unlocked: true });
    const ok = folder.use_login_password
      ? await bcrypt.compare(password, String(folder.user_password_hash || ''))
      : await bcrypt.compare(password, String(folder.access_password_hash || ''));
    if (!ok) return res.status(400).json({ error: 'Incorrect password' });
    res.json({ success: true, unlocked: true });
  } catch (err) {
    console.error('[folders unlock POST]', err);
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
      const { rows: folderFiles } = await client.query(
        'SELECT id, filename, file_path, folder_id FROM files WHERE user_id = $1 AND folder_id = $2',
        [uid, id],
      );
      for (let i = 0; i < folderFiles.length; i += 1) {
        const f = folderFiles[i];
        const moved = await relocateToFolderLayout(uid, f.filename, f.file_path, f.folder_id, null);
        if (moved.error) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: moved.error,
            detail: `Could not move file id ${f.id} when deleting folder. Fix disk or UPLOADS_DIR.`,
          });
        }
        await client.query('UPDATE files SET folder_id = NULL, file_path = $1 WHERE id = $2 AND user_id = $3', [
          moved.relativePath,
          f.id,
          uid,
        ]);
      }
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

    if (folderIdRaw == null || String(folderIdRaw).trim() === '') {
      conds.push('(f.folder_id IS NULL OR COALESCE(fo.is_locked, false) = false)');
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

    let relativePath = `${uid}/${file.filename}`;
    if (folder.folderId) {
      const targetRel = storageRelPath(uid, folder.folderId, file.filename);
      const targetAbs = absolutePath(targetRel);
      if (!targetAbs) {
        try {
          fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        return res.status(500).json({ error: 'Invalid storage path' });
      }
      try {
        await moveFileAcrossDirs(file.path, targetAbs);
      } catch (e) {
        console.error('[files upload move]', e.message);
        try {
          fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        return res.status(500).json({ error: 'Could not place file in folder on disk' });
      }
      relativePath = targetRel;
    }
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
      'SELECT original_name, file_type, file_path, filename, folder_id FROM files WHERE id = $1 AND user_id = $2',
      [id, uid],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const abs = await findExistingFileAbs(uid, rows[0].filename, rows[0].file_path, rows[0].folder_id);
    if (!abs) return res.status(404).json({ error: 'File missing on disk' });

    const inline = String(req.query.inline || '') === '1';
    const name = rows[0].original_name || 'download';
    res.setHeader('Content-Type', rows[0].file_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(name).replace(/'/g, '%27')}"`,
    );
    const stream = fs.createReadStream(abs);
    stream.on('error', (streamErr) => {
      console.error('[files file stream]', streamErr.message, abs);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File read failed' });
      } else {
        try {
          res.destroy(streamErr);
        } catch {
          /* ignore */
        }
      }
    });
    stream.pipe(res);
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

      let nextFilePath = existing[0].file_path;
      const prevFolderNorm =
        existing[0].folder_id == null || existing[0].folder_id === ''
          ? null
          : Number(existing[0].folder_id);
      const nextFolderNorm =
        nextFolderId == null || nextFolderId === '' ? null : Number(nextFolderId);
      if (folder_id !== undefined && prevFolderNorm !== nextFolderNorm) {
        const moved = await relocateToFolderLayout(
          uid,
          existing[0].filename,
          existing[0].file_path,
          existing[0].folder_id,
          nextFolderId,
        );
        if (moved.error) return res.status(400).json({ error: moved.error });
        nextFilePath = moved.relativePath;
      }

      await client.query(
        `UPDATE files SET original_name = $2, tags = $3, folder_id = $4, linked_type = $5, linked_id = $6, file_path = $7 WHERE id = $1 AND user_id = $8`,
        [id, nextName, nextTags, nextFolderId, nextLt, nextLid, nextFilePath, uid],
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
    const { rows } = await pool.query(
      'SELECT file_path, filename, folder_id FROM files WHERE id = $1 AND user_id = $2',
      [id, uid],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const abs = await findExistingFileAbs(uid, rows[0].filename, rows[0].file_path, rows[0].folder_id);
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
