import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DB_PATH } from '../config';

const resolvedPath = resolve(DB_PATH);
const cwd = `${process.cwd()}/`;

if (!resolvedPath.startsWith(cwd)) {
	throw new Error(`Refusing to delete DB path outside project: ${resolvedPath}`);
}

if (!existsSync(resolvedPath)) {
	console.log(`No local PGlite database found at ${resolvedPath}`);
	process.exit(0);
}

await rm(resolvedPath, { recursive: true, force: true });
console.log(`Deleted local PGlite database at ${resolvedPath}`);
