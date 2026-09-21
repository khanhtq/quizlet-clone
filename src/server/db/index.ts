import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

const dbUrl = process.env.DATABASE_URL || 'file:./data/local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

// If using local file db in development, make sure data directory exists
if (process.env.NODE_ENV !== 'production' && dbUrl.startsWith('file:')) {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

export const db = drizzle(client, { schema });
export { schema };
export * from './schema';
