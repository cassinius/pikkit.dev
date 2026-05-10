import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'postgresql',
	driver: 'pglite',
	schema: './db/schema/index.ts',
	out: './db/migrations',
	dbCredentials: {
		url: process.env.PIKKIT_DB_PATH ?? './data/pikkit-db'
	}
});
