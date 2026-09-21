import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';
import path from 'path';

async function runMigrate() {
  const targetUrl = process.env.DATABASE_URL || 'file:./data/local.db';
  console.log(`Running migrations against target: ${targetUrl.startsWith('file:') ? targetUrl : targetUrl.split('?')[0]}...`);
  const migrationsFolder = path.resolve(process.cwd(), './src/server/db/migrations');
  await migrate(db, { migrationsFolder });
  console.log('Migrations completed successfully.');
}

runMigrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
