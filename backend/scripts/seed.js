import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function seed() {
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ['admin@gmail.com', adminHash, 'Admin']
    );
    console.log('Default admin user created: admin@gmail.com / admin123');

    const chamithHash = await bcrypt.hash('chamith123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ['chamith@myaccounts.com', chamithHash, 'Chamith']
    );
    console.log('User Chamith created: chamith@myaccounts.com / chamith123');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
