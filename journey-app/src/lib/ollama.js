// Minimal Ollama client — talks to a locally hosted runtime (default
// http://localhost:11434). Everything is feature-detected: in a deployed
// environment with no local runtime, callers degrade gracefully.
const DEFAULT_ENDPOINT = 'http://localhost:11434';

export async function detectOllama(endpoint = DEFAULT_ENDPOINT) {
  try {
    const r = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.models || []).map((m) => ({ name: m.name, sizeGb: Math.round((m.size / 1e9) * 10) / 10 }));
  } catch { return null; }
}

export async function ollamaChat({ endpoint = DEFAULT_ENDPOINT, model, messages, temperature = 0.1 }) {
  const r = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature } })
  });
  if (!r.ok) throw new Error(`Local model error (${r.status}) — is Ollama running?`);
  const d = await r.json();
  return d.message?.content || '';
}

export async function ollamaEmbed({ endpoint = DEFAULT_ENDPOINT, model, input }) {
  const r = await fetch(`${endpoint}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, input })
  });
  if (!r.ok) throw new Error(`Embedding error (${r.status}) — is the embedding model pulled? Try: ollama pull nomic-embed-text`);
  const d = await r.json();
  return d.embeddings || [];
}

export { DEFAULT_ENDPOINT };
