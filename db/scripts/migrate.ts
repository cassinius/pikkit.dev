import { migrate } from 'drizzle-orm/pglite/migrator';
import { getDb, getPgliteClient } from '../client';

const db = await getDb();
await migrate(db, { migrationsFolder: 'db/migrations' });

const client = await getPgliteClient();
await client.close();

console.log('PGlite migrations applied.');
