// Local-model client for offline tooling (sim engine, drafts, summaries).
// Speaks OpenAI-compatible /v1/chat/completions and auto-detects whichever
// server is up: vMLX (:8080) first, LM Studio (:1234) as fallback. Override
// with QWEN_ENDPOINT / QWEN_MODEL env vars. No dependencies — Node 18+ fetch.
const CANDIDATES = ['http://localhost:8080', 'http://localhost:1234'];

let cached = null;
async function pickServer() {
  if (cached) return cached;
  if (process.env.QWEN_ENDPOINT) {
    cached = { base: process.env.QWEN_ENDPOINT, model: process.env.QWEN_MODEL };
    return cached;
  }
  for (const base of CANDIDATES) {
    try {
      const r = await fetch(`${base}/v1/models`, { signal: AbortSignal.timeout(2000) });
      if (!r.ok) continue;
      const models = (await r.json()).data || [];
      // Prefer a chat-capable coder/instruct model over embedding models.
      const m = models.find((x) => !/embed/i.test(x.id)) || models[0];
      if (m) { cached = { base, model: process.env.QWEN_MODEL || m.id }; return cached; }
    } catch { /* server not up — try next */ }
  }
  throw new Error('No local model server found on :8080 (vMLX) or :1234 (LM Studio). Start vMLX and load a model.');
}

async function chat(messages, { temperature = 0.3, maxTokens = 1800 } = {}) {
  const { base, model } = await pickServer();
  const r = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(10 * 60 * 1000)
  });
  if (!r.ok) throw new Error(`Model server ${base} returned ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty completion from ${model}`);
  return content;
}

// Ask for JSON, tolerate the fences and preambles small models add, retry.
async function chatJSON(messages, { retries = 2, ...opts } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const raw = await chat(messages, opts);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object in reply');
      return JSON.parse(match[0]);
    } catch (e) { lastErr = e; }
  }
  throw new Error(`Model failed to produce valid JSON after ${retries + 1} attempts: ${lastErr.message}`);
}

module.exports = { pickServer, chat, chatJSON };
