import { embed } from '../../src/lib/embed/ollama';
import { getPgliteClient } from '../client';

const query = process.argv.slice(2).join(' ').trim();
const limit = Number(process.env.LIMIT ?? 5);

type SearchRow = {
	id: string;
	title: string;
	category: string;
	severity: string;
	similarity: number | string;
	triggers: string[] | null;
	red_flag: string | null;
};

if (!query) {
	console.error('Usage: bun run db:search -- "adding a cache for decoded images"');
	process.exit(1);
}

const vector = await embed(query);
const client = await getPgliteClient();

const results = await client.query(
	`
	SELECT
		a.id,
		a.title,
		a.category,
		a.severity,
		1 - (e.embedding <=> $1::vector) AS similarity,
		a.triggers,
		a.red_flag
	FROM atoms a
	INNER JOIN atom_embeddings e ON e.atom_id = a.id
	ORDER BY e.embedding <=> $1::vector
	`,
	[JSON.stringify(vector)]
);

const terms = query
	.toLowerCase()
	.split(/[^a-z0-9]+/)
	.filter((term) => term.length > 2);

const ranked = results.rows
	.map((row) => {
		const searchRow = row as SearchRow;
		const searchable = [
			searchRow.id,
			searchRow.title,
			searchRow.category,
			searchRow.red_flag,
			...(Array.isArray(searchRow.triggers) ? searchRow.triggers : [])
		]
			.join(' ')
			.toLowerCase();
		const lexicalHits = terms.filter((term) => searchable.includes(term)).length;
		const lexicalScore = terms.length > 0 ? lexicalHits / terms.length : 0;
		const score = Number(searchRow.similarity) + lexicalScore * 0.2;

		return {
			id: searchRow.id,
			title: searchRow.title,
			category: searchRow.category,
			severity: searchRow.severity,
			score,
			similarity: Number(searchRow.similarity),
			lexicalScore,
			red_flag: searchRow.red_flag
		};
	})
	.sort((a, b) => b.score - a.score)
	.slice(0, limit);

console.table(ranked);
await client.close();
