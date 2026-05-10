import { sql } from 'drizzle-orm';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { getDb, getPgliteClient } from '../client';
import { atomEmbeddings, atoms } from '../schema';
import { embed } from '../../src/lib/embed/ollama';
import { parsePlaybookToAtoms } from '../../src/lib/atoms/parser';

const EXPECTED_ATOM_COUNT = 33;
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
const PLAYBOOKS_DIR =
	process.env.PLAYBOOKS_DIR ?? resolve(homedir(), 'develop/skills/playbooks');

const db = await getDb();
const files = (await readdir(PLAYBOOKS_DIR))
	.filter((file) => file.endsWith('.md'))
	.sort();

let atomCount = 0;

for (const file of files) {
	const content = await readFile(join(PLAYBOOKS_DIR, file), 'utf-8');
	const parsedAtoms = parsePlaybookToAtoms(content, file);

	console.log(`Parsed ${parsedAtoms.length.toString().padStart(2, ' ')} atoms from ${file}`);

	for (const atom of parsedAtoms) {
		const embeddingText = [
			atom.title,
			...atom.triggers,
			...atom.checklist.slice(0, 3),
			atom.red_flag ?? '',
			atom.fix_pattern ?? ''
		].join('\n');
		const embedding = await embed(embeddingText);
		const now = new Date();

		await db
			.insert(atoms)
			.values({
				id: atom.id,
				version: atom.version,
				title: atom.title,
				category: atom.category,
				severity: atom.severity,
				triggers: atom.triggers,
				appliesTo: atom.applies_to,
				checklist: atom.checklist,
				redFlag: atom.red_flag,
				detectCmd: atom.detect_cmd,
				fixPattern: atom.fix_pattern,
				seeAlso: atom.see_also,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: atoms.id,
				set: {
					version: atom.version,
					title: atom.title,
					category: atom.category,
					severity: atom.severity,
					triggers: atom.triggers,
					appliesTo: atom.applies_to,
					checklist: atom.checklist,
					redFlag: atom.red_flag,
					detectCmd: atom.detect_cmd,
					fixPattern: atom.fix_pattern,
					seeAlso: atom.see_also,
					updatedAt: now
				}
			});

		await db
			.insert(atomEmbeddings)
			.values({
				atomId: atom.id,
				model: EMBEDDING_MODEL,
				embeddingText,
				embedding,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: atomEmbeddings.atomId,
				set: {
					model: EMBEDDING_MODEL,
					embeddingText,
					embedding,
					updatedAt: now
				}
			});

		atomCount += 1;
	}
}

if (atomCount !== EXPECTED_ATOM_COUNT) {
	throw new Error(`Expected ${EXPECTED_ATOM_COUNT} atoms, parsed ${atomCount}`);
}

const [{ count }] = await db
	.select({ count: sql<number>`count(*)::int` })
	.from(atoms);

console.log(`Seeded ${atomCount} playbook atoms. atoms table now has ${count} rows.`);

const client = await getPgliteClient();
await client.close();
