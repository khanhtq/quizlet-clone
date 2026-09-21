import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';
import path from 'path';

async function runMigrate() {
  console.log('Running migrations...');
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
