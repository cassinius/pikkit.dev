import type { AtomAppliesTo } from '../../../db/schema';
import type { AtomDraft, AtomSeverity } from './types';

const CATEGORY_BY_IMPORT: Record<string, string> = {
	'audit-deps': 'dependency-audit',
	'harden-frontend': 'frontend-hardening',
	'memory-audit': 'memory-management',
	sveltekit: 'sveltekit',
	'web-security': 'web-security'
};

const ID_ALIASES: Record<string, string> = {
	'harden-frontend:Bounded Caches': 'bounded-cache-lru',
	'harden-frontend:Content Security Policy': 'csp-production',
	'audit-deps:Known Vulnerabilities': 'known-vulnerabilities',
	'sveltekit:Store Subscription Hygiene': 'store-subscription-hygiene',
	'web-security:Content Security Policy': 'web-security-csp'
};

const DETECT_COMMANDS: Record<string, string> = {
	'fetch-resilience':
		"rg -n \"await fetch\\(\" src --glob '*.{ts,svelte}' | rg -v 'fetchWithRetry|fetchWrapper|\\.test\\.|\\.spec\\.'",
	'bounded-cache-lru':
		"rg -n \"new Map<|new Map\\(\" src --glob '*.ts' | rg -iv 'lru|cache.*max|pending|timeout'",
	'store-subscription-hygiene':
		"rg -n \"\\.subscribe\\(\" src --glob '*.ts' | rg -v 'unsubscribe|unsub|destroy|onDestroy|cleanup'",
	'csp-production': "rg -n \"Content-Security-Policy|script-src|unsafe-inline|on[a-z]+=\" .",
	'web-security-csp': "rg -n \"Content-Security-Policy|script-src|unsafe-inline|on[a-z]+=\" .",
	'known-vulnerabilities': 'bun audit || npm audit',
	'unmaintained-packages': 'bun outdated || npm outdated'
};

const SEE_ALSO: Record<string, string[]> = {
	'bounded-cache-lru': ['context-switch-cleanup', 'unbounded-collections'],
	'unbounded-collections': ['bounded-cache-lru', 'context-switch-cleanup'],
	'context-switch-cleanup': ['bounded-cache-lru', 'unbounded-collections'],
	'fetch-resilience': ['initialization-error-boundaries'],
	'csp-production': ['web-security-csp', 'input-sanitization-output-encoding'],
	'web-security-csp': ['csp-production', 'third-party-risk'],
	'store-subscription-hygiene': ['component-cleanup-ondestroy-onmount-return'],
	'immutable-store-updates': ['store-subscription-hygiene']
};

const EXTRA_TRIGGERS: Record<string, string[]> = {
	'csp-production': [
		'csp',
		'content security policy',
		'setting up csp for production',
		'production csp',
		'script-src self',
		'unsafe-inline unsafe-eval'
	],
	'web-security-csp': [
		'csp',
		'content security policy',
		'web security csp',
		'clickjacking frame ancestors',
		'object-src none',
		'base-uri self'
	],
	'known-vulnerabilities': [
		'npm audit',
		'bun audit',
		'checking npm packages for vulnerabilities',
		'known cves',
		'high critical vulnerabilities'
	],
	'bounded-cache-lru': [
		'adding a cache for decoded images',
		'image cache',
		'decoded image retention',
		'lru cache eviction'
	],
	'store-subscription-hygiene': [
		'svelte store subscription cleanup',
		'unsubscribe svelte store',
		'module level store subscribe'
	]
};

export function parsePlaybookToAtoms(content: string, importName: string): AtomDraft[] {
	const importKey = importName.replace(/\.md$/, '');
	const category = CATEGORY_BY_IMPORT[importKey] ?? slugify(importKey);
	const appliesTo = deriveAppliesTo(content, importKey);
	const sections = content.split(/\n##\s+/).slice(1);

	return sections.flatMap((section) => {
		const [headingLine = '', ...bodyLines] = section.split('\n');
		const title = normalizeTitle(headingLine);
		const body = bodyLines.join('\n').trim();
		const checklist = [...body.matchAll(/^- \[ \]\s+(.+)$/gm)].map((match) => cleanInlineMarkdown(match[1]));

		if (!title || checklist.length === 0) {
			return [];
		}

		const id = ID_ALIASES[`${importKey}:${title}`] ?? slugify(title);
		const redFlag = body.match(/^\*\*Red flag:\*\*\s*(.+)$/m)?.[1];
		const normalizedRedFlag = redFlag ? cleanInlineMarkdown(redFlag) : undefined;
		const triggers = unique([
			title,
			category.replace(/-/g, ' '),
			...title.split(/[-/–—&()]+|\s+/),
			...(EXTRA_TRIGGERS[id] ?? []),
			checklist[0],
			normalizedRedFlag
		].filter(isPresent));

		return [
			{
				id,
				version: 1,
				title,
				category,
				severity: deriveSeverity(title, category, checklist, normalizedRedFlag),
				triggers,
				applies_to: appliesTo,
				checklist,
				red_flag: normalizedRedFlag,
				detect_cmd: DETECT_COMMANDS[id],
				fix_pattern: deriveFixPattern(title, checklist, normalizedRedFlag),
				see_also: SEE_ALSO[id] ?? []
			}
		];
	});
}

function normalizeTitle(value: string): string {
	return value.replace(/^\d+\.\s*/, '').trim();
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[`'"$:@]/g, '')
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function cleanInlineMarkdown(value: string): string {
	return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}

function unique(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 2))];
}

function isPresent(value: string | undefined): value is string {
	return typeof value === 'string' && value.length > 0;
}

function deriveAppliesTo(content: string, importKey: string): AtomAppliesTo {
	const text = `${content.slice(0, 300)} ${importKey}`.toLowerCase();
	const languages = new Set<string>();
	const frameworks = new Set<string>();
	const runtime = new Set<string>();

	if (/javascript|typescript|svelte|vite|web/.test(text)) {
		languages.add('javascript');
		languages.add('typescript');
	}
	if (/sveltekit/.test(text)) {
		frameworks.add('sveltekit');
		frameworks.add('svelte');
	}
	if (/svelte/.test(text)) frameworks.add('svelte');
	if (/vite/.test(text)) frameworks.add('vite');
	if (/web|browser|frontend|svelte|vite/.test(text)) runtime.add('browser');
	if (/node|dependency|package|npm|bun/.test(text)) runtime.add('node');

	return {
		languages: [...languages],
		frameworks: [...frameworks],
		runtime: [...runtime]
	};
}

function deriveSeverity(
	title: string,
	category: string,
	checklist: string[],
	redFlag: string | undefined
): AtomSeverity {
	const text = `${title} ${category} ${checklist.join(' ')} ${redFlag ?? ''}`.toLowerCase();

	if (/auth|session|csrf|token|credentials|sensitive|xss|input sanitization/.test(text)) {
		return 'high';
	}
	if (/security|csp|transport|worker|cache|memory|vulnerab|supply chain|fetch|initialization/.test(text)) {
		return 'high';
	}
	if (/bundle|verification|stats|source map|deprecated|build-only/.test(text)) {
		return 'low';
	}

	return 'medium';
}

function deriveFixPattern(title: string, checklist: string[], redFlag: string | undefined): string {
	const firstItems = checklist.slice(0, 3);
	const redFlagSentence = redFlag ? ` Avoid the red flag: ${redFlag}` : '';
	return `For ${title}, satisfy the checklist: ${firstItems.join('; ')}.${redFlagSentence}`;
}
