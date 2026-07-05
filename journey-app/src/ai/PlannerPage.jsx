// Planner — lightweight task/reminder list plus upcoming calls, kept
// deliberately separate from BRD work. Flat list, not a full calendar.
import React, { useState } from 'react';
import { loadWS, saveWS, uid } from './workspace';

export default function PlannerPage() {
  const [ws, setWs] = useState(loadWS);
  const [task, setTask] = useState({ title: '', due: '' });
  const [ev, setEv] = useState({ title: '', time: '10:00' });
  const write = (next) => setWs(saveWS(next));

  const addTask = () => {
    if (!task.title.trim()) return;
    write({ ...ws, tasks: [{ id: uid(), title: task.title.trim(), due: task.due, done: false }, ...ws.tasks] });
    setTask({ title: '', due: '' });
  };
  const toggleTask = (id) => write({ ...ws, tasks: ws.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  const removeTask = (id) => write({ ...ws, tasks: ws.tasks.filter((t) => t.id !== id) });

  const addEvent = () => {
    if (!ev.title.trim()) return;
    write({ ...ws, events: [{ id: uid(), title: ev.title.trim(), time: ev.time }, ...ws.events] });
    setEv({ title: '', time: '10:00' });
  };
  const removeEvent = (id) => write({ ...ws, events: ws.events.filter((e) => e.id !== id) });
  const connect = (k) => write({ ...ws, connectors: { ...ws.connectors, [k]: !ws.connectors[k] } });

  return (
    <div>
      <h1 className="dashh1sm">Planner</h1>
      <p className="dashsub" style={{ marginBottom: 22 }}>Tasks, reminders and upcoming calls — separate from BRD work by design.</p>

      <div className="plannercols">
        <div>
          <h3 className="ws-h3" style={{ marginTop: 0 }}>✅ Tasks</h3>
          <div className="taskadd">
            <input value={task.title} placeholder="Add a task…" onChange={(e) => setTask({ ...task, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <input type="date" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
            <button className="btn" style={{ marginTop: 0 }} onClick={addTask}>Add</button>
          </div>
          {ws.tasks.map((t) => (
            <div key={t.id} className={'taskrow' + (t.done ? ' done' : '')}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span className="tasktitle">{t.title}</span>
              <span className="taskdue">{t.due}</span>
              <button className="taskdel" onClick={() => removeTask(t.id)}>✕</button>
            </div>
          ))}
          {!ws.tasks.length && <p className="hint">Nothing yet — add your first task above.</p>}
        </div>

        <div>
          <h3 className="ws-h3" style={{ marginTop: 0 }}>📞 Upcoming</h3>
          <div className="taskadd">
            <input value={ev.title} placeholder="Schedule a call or meeting…" onChange={(e) => setEv({ ...ev, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addEvent()} />
            <input type="time" value={ev.time} onChange={(e) => setEv({ ...ev, time: e.target.value })} />
            <button className="btn" style={{ marginTop: 0 }} onClick={addEvent}>Add</button>
          </div>
          {ws.events.map((e) => (
            <div key={e.id} className="taskrow">
              <span>📞</span>
              <span className="tasktitle">{e.title}</span>
              <span className="taskdue">{e.time}</span>
              <button className="taskdel" onClick={() => removeEvent(e.id)}>✕</button>
            </div>
          ))}
          {!ws.events.length && <p className="hint" style={{ marginBottom: 20 }}>Nothing scheduled.</p>}

          <h3 className="ws-h3">🔗 Connectors</h3>
          {[['outlook', '📧 Outlook — mail & calendar'], ['gmail', '✉️ Gmail — mail & calendar']].map(([k, label]) => (
            <div className="connectorow" key={k}>
              <span>{label}</span>
              <button className={ws.connectors[k] ? 'btn ghost' : 'btn gold'} style={{ margin: 0, padding: '7px 14px' }} onClick={() => connect(k)}>
                {ws.connectors[k] ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
