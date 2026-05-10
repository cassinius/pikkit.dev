import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { drizzle } from 'drizzle-orm/pglite';
import { DB_PATH } from './config';
import * as schema from './schema';

let clientPromise: Promise<PGlite> | null = null;
let dbPromise: Promise<ReturnType<typeof drizzle<typeof schema>>> | null = null;

export async function getPgliteClient(): Promise<PGlite> {
	if (!clientPromise) {
		clientPromise = PGlite.create(DB_PATH, { extensions: { vector } }).then(async (client) => {
			await client.exec('CREATE EXTENSION IF NOT EXISTS vector');
			return client;
		});
	}

	return clientPromise;
}

export async function getDb() {
	if (!dbPromise) {
		dbPromise = getPgliteClient().then((client) => drizzle({ client, schema }));
	}

	return dbPromise;
}
