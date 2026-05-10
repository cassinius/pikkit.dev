const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
const EXPECTED_DIMENSIONS = 768;

type OllamaEmbedResponse = {
  embeddings?: number[][];
  embedding?: number[];
};

export async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: text }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama embedding failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OllamaEmbedResponse;
  const vector = Array.isArray(data.embeddings?.[0])
    ? data.embeddings[0]
    : data.embedding;

  if (!Array.isArray(vector) || vector.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Expected ${EXPECTED_DIMENSIONS}-dimensional embedding, got ${vector?.length ?? "none"}`,
    );
  }

  return vector;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embed));
}
