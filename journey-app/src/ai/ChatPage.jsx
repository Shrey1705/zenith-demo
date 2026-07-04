// Feasly copilot chat. Deterministic demo brain by default (feasibility
// questions get real code-grounded answers via the analyzer); the same
// endpoint upgrades to a live LLM when the tenant sets ANTHROPIC_API_KEY.
import React, { useState, useRef, useEffect } from 'react';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';

const GREETING = {
  role: 'assistant',
  content: `Hi! I'm your Feasly copilot, connected to the Zenith Health tenant.

Ask me a feasibility question — "can we offer monthly EMI payments?" — and I'll answer from the actual codebase, with evidence. I can also draft PRD skeletons, prioritize with RICE, shape roadmaps, and write standup templates.`,
  engine: 'deterministic'
};

const SUGGESTIONS = [
  'Can we make nominee details mandatory?',
  'Draft a PRD skeleton for monthly EMI payments',
  'Prioritize my backlog with RICE',
  'What metrics should the purchase journey track?'
];

export default function ChatPage() {
  const { token } = useWorkspace();
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', content: q }];
    setMessages(next); setInput(''); setBusy(true);
    try {
      const r = await ai.chat(token, next.map(({ role, content }) => ({ role, content })));
      setMessages([...next, { role: 'assistant', content: r.reply, engine: r.engine }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `Something went wrong: ${e.message}`, engine: 'error' }]);
    }
    setBusy(false);
  };

  return (
    <div className="chatpage">
      <h2>Copilot Chat</h2>
      <p className="hint">General PM assistant · feasibility questions answered from live code · <code>demo brain — runs offline; set ANTHROPIC_API_KEY for a live LLM</code></p>

      <div className="chatlog">
        {messages.map((m, i) => (
          <div key={i} className={'chatmsg ' + m.role}>
            <div className="chatbubble">
              {m.content}
              {m.role === 'assistant' && m.engine && m.engine !== 'error' && (
                <div className="chatengine">{m.engine === 'llm' ? '⚡ live LLM' : '🔒 offline demo brain'}</div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="chatmsg assistant"><div className="chatbubble">Thinking…</div></div>}
        <div ref={endRef} />
      </div>

      <div className="chips">
        {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
      </div>
      <div className="chatinput">
        <input
          value={input} placeholder="Ask anything — feasibility questions get code-grounded answers…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn" disabled={busy} onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}
