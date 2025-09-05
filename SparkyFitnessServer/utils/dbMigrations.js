const path = require('path');
const fs = require('fs');
const pool = require('../db/connection');
const { log } = require('../config/logging');

const migrationsDir = path.join(__dirname, '../db/migrations');

async function applyMigrations() {
  const client = await pool.connect();
  try {
    // Ensure the schema_migrations table exists
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS system;
      CREATE TABLE IF NOT EXISTS system.schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    log('info', 'Ensured schema_migrations table exists.');

    const appliedMigrationsResult = await client.query('SELECT name FROM system.schema_migrations ORDER BY name');
    const appliedMigrations = new Set(appliedMigrationsResult.rows.map(row => row.name));
    log('info', 'Applied migrations:', Array.from(appliedMigrations));

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      if (!appliedMigrations.has(file)) {
        log('info', `Applying migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO system.schema_migrations (name) VALUES ($1)', [file]);
        log('info', `Successfully applied migration: ${file}`);
      } else {
        log('info', `Migration already applied: ${file}`);
      }
    }
  } catch (error) {
    log('error', 'Error applying migrations:', error);
    process.exit(1); // Exit if migrations fail
  } finally {
    client.release();
  }
}

module.exports = {
  applyMigrations
};