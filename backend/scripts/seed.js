import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function seed() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ['admin@gmail.com', hash, 'Admin']
    );
    console.log('Default admin user created: admin@gmail.com / admin123');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
