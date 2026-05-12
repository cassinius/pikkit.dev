import { access, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

type Check = {
	name: string;
	ok: boolean;
	detail: string;
	fix?: string;
};

const REQUIRED_PLAYBOOKS = [
	'audit-deps.md',
	'harden-frontend.md',
	'memory-audit.md',
	'sveltekit.md',
	'web-security.md'
];

const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
const REPO_PLAYBOOKS_DIR = process.env.PLAYBOOKS_DIR ?? resolve(process.cwd(), 'db/seeds/playbooks');
const COLORS_ENABLED = process.env.NO_COLOR === undefined;
const color = {
	green: (value: string) => (COLORS_ENABLED ? `\x1b[32m${value}\x1b[0m` : value),
	red: (value: string) => (COLORS_ENABLED ? `\x1b[31m${value}\x1b[0m` : value)
};

async function run(command: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
	const proc = Bun.spawn([command, ...args], {
		stdout: 'pipe',
		stderr: 'pipe'
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);

	return {
		ok: exitCode === 0,
		stdout: stdout.trim(),
		stderr: stderr.trim()
	};
}

function parseMajor(version: string): number | null {
	const match = version.match(/v?(\d+)/);
	return match ? Number(match[1]) : null;
}

async function checkCommandVersion(
	name: string,
	command: string,
	args: string[],
	options: { minMajor?: number; fix?: string } = {}
): Promise<Check> {
	try {
		const result = await run(command, args);
		if (!result.ok) {
			return {
				name,
				ok: false,
				detail: result.stderr || result.stdout || `${command} exited unsuccessfully`,
				fix: options.fix
			};
		}

		if (options.minMajor) {
			const major = parseMajor(result.stdout);
			if (major === null || major < options.minMajor) {
				return {
					name,
					ok: false,
					detail: `${result.stdout || 'unknown version'}; expected major >= ${options.minMajor}`,
					fix: options.fix
				};
			}
		}

		return { name, ok: true, detail: result.stdout.split('\n')[0] ?? 'ok' };
	} catch (error) {
		return {
			name,
			ok: false,
			detail: error instanceof Error ? error.message : String(error),
			fix: options.fix
		};
	}
}

async function checkPlaybookDir(name: string, directory: string): Promise<Check> {
	try {
		const directoryStat = await stat(directory);
		if (!directoryStat.isDirectory()) {
			return {
				name,
				ok: false,
				detail: `${directory} exists but is not a directory`
			};
		}

		const files = new Set(await readdir(directory));
		const missing = REQUIRED_PLAYBOOKS.filter((file) => !files.has(file));

		return missing.length === 0
			? {
				name,
				ok: true,
				detail: `${directory} contains ${REQUIRED_PLAYBOOKS.length} required playbooks`
			}
			: {
				name,
				ok: false,
				detail: `${directory} is missing: ${missing.join(', ')}`
			};
	} catch {
		return {
			name,
			ok: false,
			detail: `${directory} does not exist`,
			fix: 'Set PLAYBOOKS_DIR or add the five seed playbooks.'
		};
	}
}

async function checkPathExists(name: string, path: string): Promise<Check> {
	try {
		await access(path);
		return { name, ok: true, detail: path };
	} catch {
		return { name, ok: false, detail: `${path} not found` };
	}
}

async function checkOllamaModel(): Promise<Check> {
	const result = await run('ollama', ['list']);
	if (!result.ok) {
		return {
			name: 'Ollama embedding model',
			ok: false,
			detail: result.stderr || result.stdout || 'ollama list failed',
			fix: 'Start Ollama and run `ollama pull nomic-embed-text`.'
		};
	}

	const hasModel = result.stdout
		.split('\n')
		.some((line) => line.trim().startsWith(`${EMBED_MODEL}:`) || line.trim().startsWith(EMBED_MODEL));

	return hasModel
		? { name: 'Ollama embedding model', ok: true, detail: EMBED_MODEL }
		: {
			name: 'Ollama embedding model',
			ok: false,
			detail: `${EMBED_MODEL} was not found in ollama list`,
			fix: `ollama pull ${EMBED_MODEL}`
		};
}

function printCheck(check: Check) {
	const prefix = check.ok ? color.green('OK  ') : color.red('FAIL');
	console.log(`${prefix} ${check.name}: ${check.detail}`);
	if (!check.ok && check.fix) {
		console.log(`     fix: ${check.fix}`);
	}
}

const checks = await Promise.all([
	checkCommandVersion('Bun', 'bun', ['--version']),
	checkCommandVersion('Node', 'node', ['--version'], {
		minMajor: 20,
		fix: 'Install Node 20+.'
	}),
	checkCommandVersion('Ollama', 'ollama', ['--version'], {
		fix: 'Install Ollama and ensure it is on PATH.'
	}),
	checkOllamaModel(),
	checkPlaybookDir('Seed playbooks', REPO_PLAYBOOKS_DIR),
	checkPathExists('Pikkit project root', resolve(process.cwd(), 'package.json')),
	checkPathExists('Database config', resolve(process.cwd(), 'db/drizzle.config.ts')),
	checkPathExists('Data directory', resolve(process.cwd(), 'data'))
]);

console.log('Pikkit preflight\n');
checks.forEach(printCheck);

const failed = checks.filter((check) => !check.ok);
const summary = `${checks.length - failed.length}/${checks.length} checks passed.`;
console.log(`\n${failed.length === 0 ? color.green(summary) : color.red(summary)}`);

if (failed.length > 0) {
	process.exit(1);
}
