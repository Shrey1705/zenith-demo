// Planner — tasks with reminders, a month calendar for scheduling calls and
// meetings, and demo email/calendar connectors (Outlook, Gmail).
import React, { useState } from 'react';
import { loadWS, saveWS, uid, now, ymd, monthMatrix } from './workspace';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const KIND_ICON = { call: '📞', meeting: '👥', reminder: '🔔' };

export default function PlannerPage() {
  const [ws, setWs] = useState(loadWS);
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selDay, setSelDay] = useState(ymd(today));
  const [task, setTask] = useState({ title: '', due: '', remind: false });
  const [ev, setEv] = useState({ title: '', time: '10:00', kind: 'call' });
  const write = (next) => setWs(saveWS(next));

  const addTask = () => {
    if (!task.title.trim()) return;
    write({ ...ws, tasks: [{ id: uid(), ...task, title: task.title.trim(), done: false, createdAt: now() }, ...ws.tasks] });
    setTask({ title: '', due: '', remind: false });
  };
  const toggleTask = (id) => write({ ...ws, tasks: ws.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  const removeTask = (id) => write({ ...ws, tasks: ws.tasks.filter((t) => t.id !== id) });

  const addEvent = () => {
    if (!ev.title.trim()) return;
    write({ ...ws, events: [...ws.events, { id: uid(), ...ev, title: ev.title.trim(), date: selDay }] });
    setEv({ title: '', time: '10:00', kind: 'call' });
  };
  const removeEvent = (id) => write({ ...ws, events: ws.events.filter((e) => e.id !== id) });
  const connect = (k) => write({ ...ws, connectors: { ...ws.connectors, [k]: !ws.connectors[k] } });

  const dueSoon = ws.tasks.filter((t) => !t.done && t.remind && t.due && t.due <= ymd(today));
  const weeks = monthMatrix(view.y, view.m);
  const dayEvents = ws.events.filter((e) => e.date === selDay).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div>
      <h2>Planner</h2>
      <p className="hint">Tasks, reminders and your calendar — synced connectors push invites automatically.</p>

      {dueSoon.length > 0 && (
        <div className="banner a" style={{ marginBottom: 14 }}>
          <b>🔔 {dueSoon.length} reminder{dueSoon.length > 1 ? 's' : ''} due</b>
          <p className="hint">{dueSoon.map((t) => t.title).join(' · ')}</p>
        </div>
      )}

      <div className="plannercols">
        <div>
          <h3 className="ws-h3">✅ Tasks</h3>
          <div className="taskadd">
            <input value={task.title} placeholder="Add a task…" onChange={(e) => setTask({ ...task, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <input type="date" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
            <label className="remindlbl"><input type="checkbox" checked={task.remind} onChange={(e) => setTask({ ...task, remind: e.target.checked })} /> 🔔</label>
            <button className="btn" style={{ marginTop: 0 }} onClick={addTask}>Add</button>
          </div>
          {ws.tasks.map((t) => (
            <div key={t.id} className={'taskrow' + (t.done ? ' done' : '')}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span className="tasktitle">{t.title}</span>
              {t.due && <span className={'taskdue' + (!t.done && t.due < ymd(today) ? ' late' : '')}>{t.due}</span>}
              {t.remind && <span>🔔</span>}
              <button className="taskdel" onClick={() => removeTask(t.id)}>✕</button>
            </div>
          ))}
          {!ws.tasks.length && <p className="hint">Nothing yet — add your first task above.</p>}

          <h3 className="ws-h3">🔗 Connectors</h3>
          {[['outlook', 'Outlook — mail & calendar'], ['gmail', 'Gmail — mail & calendar']].map(([k, label]) => (
            <div className="connector" key={k} style={{ padding: '12px 16px' }}>
              <div><h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>{k === 'outlook' ? '📧' : '✉️'} {label}</h4>
                <p className="hint">{ws.connectors[k] ? 'Connected — calendar invites sync automatically (simulated)' : 'Not connected'}</p></div>
              <button className={'btn ' + (ws.connectors[k] ? 'ghost' : 'gold')} style={{ marginTop: 0 }} onClick={() => connect(k)}>
                {ws.connectors[k] ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>

        <div>
          <h3 className="ws-h3">🗓 Calendar</h3>
          <div className="calhead">
            <button onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}>‹</button>
            <b>{MONTHS[view.m]} {view.y}</b>
            <button onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}>›</button>
          </div>
          <div className="calgrid">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="caldow">{d}</span>)}
            {weeks.flat().map((d, i) => {
              if (!d) return <span key={i} className="calday empty" />;
              const key = ymd(d);
              const evs = ws.events.filter((e) => e.date === key);
              return (
                <button key={i} className={'calday' + (key === selDay ? ' sel' : '') + (key === ymd(today) ? ' today' : '')} onClick={() => setSelDay(key)}>
                  {d.getUTCDate()}
                  {evs.length > 0 && <span className="evdot">{evs.length}</span>}
                </button>
              );
            })}
          </div>

          <h3 className="ws-h3">{selDay}</h3>
          {dayEvents.map((e) => (
            <div key={e.id} className="taskrow">
              <span>{KIND_ICON[e.kind]}</span>
              <span className="tasktitle">{e.title}</span>
              <span className="taskdue">{e.time}</span>
              <button className="taskdel" onClick={() => removeEvent(e.id)}>✕</button>
            </div>
          ))}
          <div className="taskadd">
            <input value={ev.title} placeholder="Schedule a call or meeting…" onChange={(e) => setEv({ ...ev, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addEvent()} />
            <input type="time" value={ev.time} onChange={(e) => setEv({ ...ev, time: e.target.value })} />
            <select value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })}>
              <option value="call">📞 Call</option>
              <option value="meeting">👥 Meeting</option>
              <option value="reminder">🔔 Reminder</option>
            </select>
            <button className="btn" style={{ marginTop: 0 }} onClick={addEvent}>Add</button>
          </div>
          {(ws.connectors.outlook || ws.connectors.gmail) && dayEvents.length > 0 && (
            <p className="hint">✓ Invites for {selDay} synced to {[ws.connectors.outlook && 'Outlook', ws.connectors.gmail && 'Gmail'].filter(Boolean).join(' & ')} (simulated)</p>
          )}
        </div>
      </div>
    </div>
  );
}
