import { defineConfig } from 'drizzle-kit';
import { DB_PATH } from './config';

export default defineConfig({
	dialect: 'postgresql',
	driver: 'pglite',
	schema: './db/schema/index.ts',
	out: './db/migrations',
	dbCredentials: {
		url: DB_PATH
	}
});
