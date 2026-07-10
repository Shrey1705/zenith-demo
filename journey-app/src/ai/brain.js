// One router for every chat surface: when a local model is active, questions
// go through the RAG pipeline (retrieve → grounded, low-temperature local
// generation with citations); otherwise the deterministic demo backend
// answers. Same contract either way: { reply, engine, sources }.
import { ai } from '../lib/api';
import { askLocal } from './rag';
import { usingLocal } from './workspace';

export async function askFeasly({ token, ws, project, messages, onProgress }) {
  if (usingLocal(ws)) {
    const question = messages[messages.length - 1].content;
    return askLocal({ question, project, token, local: ws.local, onProgress });
  }
  const r = await ai.chat(token, messages.map(({ role, content }) => ({ role, content })));
  return { reply: r.reply, engine: r.engine, sources: null };
}
