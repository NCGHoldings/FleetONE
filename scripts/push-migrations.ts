import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env file manually since we are running with node
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const DB_PASSWORD = process.env.DATABASE_PASSWORD;
const PROJECT_URL = process.env.VITE_SUPABASE_URL;

if (!DB_PASSWORD || !PROJECT_URL) {
    console.error('Missing DATABASE_PASSWORD or VITE_SUPABASE_URL');
    process.exit(1);
}

// Extract project ID from URL
// https://[project-id].supabase.co
const projectId = PROJECT_URL.split('//')[1].split('.')[0];
const connectionString = `postgres://postgres.${projectId}:${DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
// Note: Region might vary. Defaulting to common pooler or using direct connection if possible.
// Better to use direct connection: db.[project-ref].supabase.co
const directConnectionString = `postgres://postgres:[password]@db.${projectId}.supabase.co:5432/postgres`.replace('[password]', DB_PASSWORD);

console.log(`Connecting to database...`);

const client = new Client({
    connectionString: directConnectionString,
    ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

async function runMigrations() {
    try {
        await client.connect();
        console.log('Connected successfully.');

        // 1. Setup migrations table
        await client.query(`
      CREATE SCHEMA IF NOT EXISTS supabase_migrations;
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version text PRIMARY KEY,
        statements text[],
        name text
      );
    `);

        // 2. Get applied migrations
        const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations');
        const appliedVersions = new Set(res.rows.map(r => r.version));

        // 3. Read migration files
        const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.log('No migrations directory found.');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Sort by timestamp

        for (const file of files) {
            const version = file.split('_')[0];
            if (appliedVersions.has(version)) {
                console.log(`Skipping ${file} (already applied)`);
                continue;
            }

            console.log(`Applying ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query(
                    'INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ($1, $2, $3)',
                    [version, file, [sql]]
                );
                await client.query('COMMIT');
                console.log(`Successfully applied ${file}`);
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(`Failed to apply ${file}:`, e);
                process.exit(1);
            }
        }

        console.log('All migrations applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigrations();
