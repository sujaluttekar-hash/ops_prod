'use client';
import { PROPERTIES } from '@/lib/properties-data';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getSupabase, getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

type ButlerAllocation = {
  id: string;
  name: string;
  squad: string;
  totalTasks: number;
  completedTasks: number;
  delightCount: number;
  status: 'unassigned' | 'on_track' | 'delayed';
  taskBreakdown: Record<string, number>;
  tasks: any[];
};

// All booking types matching the delight/task system
const BOOKING_TYPES = ['Non Booking', 'Booking', 'Check-In', 'Check-Out'] as const;
const TASK_TYPES = ['Arrival selfie', 'Guest welcome', 'Table layout', 'Exit selfie'] as const;

const TASK_EMOJIS: Record<string, string> = {
  'Arrival selfie': '🤳',
  'Guest welcome': '🙏',
  'Table layout': '🍽',
  'Exit selfie': '👋',
};

const BOOKING_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  'Non Booking': { bg: 'rgba(156,204,252,0.15)', color: '#0C447C' },
  'Booking':     { bg: 'rgba(151,196,89,0.15)',  color: '#2D5A0E' },
  'Check-In':    { bg: 'rgba(255,196,120,0.2)',  color: '#7A4A08' },
  'Check-Out':   { bg: 'rgba(226,140,100,0.2)',  color: '#7A2A0E' },
};


// ── Villa Search Dropdown ─────────────────────────────────────
function VillaSearch({ value, onChange, squad }: { value: string; onChange: (v: string) => void; squad: string }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const results = query.length > 0
    ? PROPERTIES
        .filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.address.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (squad && a.squad === squad ? -1 : 0) - (squad && b.squad === squad ? -1 : 0))
        .slice(0, 12)
    : PROPERTIES.filter(p => !squad || p.squad === squad).slice(0, 12);

  function select(name: string) { setQuery(name); onChange(name); setOpen(false); }

  return (
    <div style={{ position: 'relative' }}>
      <input className="sv-input" style={{ width: '100%' }} placeholder="Search villa name…"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {results.map(p => (
            <div key={p.id} onMouseDown={() => select(p.name)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: p.squad === 'Lonavala' ? '#9CCCFC' : '#97C459' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 1 }}>{p.squad} · {p.kms} km</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assign Task Modal ────────────────────────────────────────
function AssignTaskModal({
  butler,
  date,
  properties,
  onClose,
  onSaved,
}: {
  butler: ButlerAllocation;
  date: string;
  properties: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    booking_type: 'Booking' as typeof BOOKING_TYPES[number],
    task_type: '' as string,
    property_id: '',
    due_time: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      // If custom task, use the notes as the task type label
      const taskType = form.task_type === 'Custom task'
        ? (form.notes || 'Custom task')
        : (form.task_type || form.booking_type);

      const notesText = [
        form.property_id ? `Villa: ${form.property_id}` : '',
        form.task_type === 'Custom task' ? '' : (form.notes || ''),
      ].filter(Boolean).join(' · ');

      // Try inserting with butler_id; if FK constraint blocks it, retry without it
      let taskErr: any = null;
      const taskPayload: any = {
        type: taskType,
        status: 'pending',
        due_time: form.due_time || null,
        created_at: `${date}T${form.due_time || '08:00'}:00`,
      };

      // ALWAYS store butler name in notes for reliable matching
      // butler_id may be null due to FK constraint — name is the fallback identifier
      const fullNotes = [
        `Butler: ${butler.name}`,
        `ButlerID: ${butler.id}`,
        notesText || '',
      ].filter(Boolean).join(' · ');

      // First try with butler_id
      const { error: err1, data: insertedTask } = await getServiceSupabase().from('tasks').insert({
        ...taskPayload,
        butler_id: butler.id,
        notes: fullNotes,
      }).select().single();

      if (err1) {
        // FK failed — insert without butler_id
        console.warn('butler_id FK failed:', err1.message);
        const { error: err2 } = await getServiceSupabase().from('tasks').insert({
          ...taskPayload,
          butler_id: null,
          notes: fullNotes,
        });
        taskErr = err2;
      }

      if (taskErr) throw new Error(taskErr.message);

      // Send notification to the butler
      try {
        const notifRes = await getServiceSupabase().from('notifications').insert({
          user_id: butler.id,
          title: 'New task assigned',
          body: `You have been assigned: ${form.task_type || form.booking_type}${form.property_id ? ' at ' + form.property_id : ''}${form.due_time ? ' · Due ' + form.due_time : ''}`,
          type: 'task',
          read: false,
        });
        if (notifRes.error) console.warn('Notification insert failed:', notifRes.error.message, notifRes.error.code);
      } catch (e: any) { console.warn('Notification error:', e.message); }

      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (err: any) { setError(err.message); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Assign task</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
              <span className="sv-avatar" style={{ display: 'inline-flex', width: 20, height: 20, fontSize: 9, marginRight: 6 }}>{butler.name.slice(0,2).toUpperCase()}</span>
              {butler.name} · {butler.squad}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Task assigned!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{butler.name} has been notified.</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

            {/* Booking type — dropdown */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Booking type *</div>
              <select className="sv-select" style={{ width: '100%' }} value={form.booking_type}
                onChange={e => setForm(f => ({ ...f, booking_type: e.target.value as any }))}>
                {BOOKING_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>

            {/* Task type */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Task type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                {TASK_TYPES.map(tt => (
                  <button key={tt} type="button"
                    onClick={() => setForm(f => ({ ...f, task_type: f.task_type === tt ? '' : tt }))}
                    style={{ padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${form.task_type === tt ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: form.task_type === tt ? 'rgba(156,204,252,0.1)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: form.task_type === tt ? 600 : 400, transition: 'all 0.12s' }}>
                    <span style={{ fontSize: 18 }}>{TASK_EMOJIS[tt]}</span> {tt}
                  </button>
                ))}
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, task_type: f.task_type === 'Custom task' ? '' : 'Custom task' }))}
                  style={{ padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${form.task_type === 'Custom task' ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: form.task_type === 'Custom task' ? 'rgba(156,204,252,0.1)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: form.task_type === 'Custom task' ? 600 : 400, transition: 'all 0.12s' }}>
                  <span style={{ fontSize: 18 }}>✏️</span> Custom task
                </button>
              </div>
              {form.task_type === 'Custom task' && (
                <input className="sv-input" style={{ width: '100%', marginTop: 8 }} placeholder="Describe the task…"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              )}
            </div>

            {/* Property */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Villa / Property</div>
              <VillaSearch value={form.property_id} onChange={v => setForm(f => ({ ...f, property_id: v }))} squad={butler?.squad || ''} />
            </div>

            {/* Due time */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Due time</div>
              <input className="sv-input" style={{ width: '100%' }} type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Notes</div>
              <textarea className="sv-input" style={{ width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="Instructions for the butler…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Assigning…' : 'Assign task'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Butler detail row (expanded) ────────────────────────────
function ButlerDetailRow({ alloc, onAssign }: { alloc: ButlerAllocation; onAssign: () => void }) {
  return (
    <tr>
      <td colSpan={8} style={{ background: 'rgba(0,0,0,0.018)', padding: 0 }}>
        <div style={{ padding: '16px 20px' }}>
          {/* Booking type quick-assign + Assign task */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: alloc.tasks.length > 0 ? 14 : 0 }}>
            <select className="sv-select" style={{ fontSize: 12, padding: '6px 12px', minWidth: 160 }}
              onChange={async e => {
                const bt = e.target.value;
                if (!bt) return;
                e.target.value = '';
                await getServiceSupabase().from('tasks').insert({
                  type: bt,
                  butler_id: alloc.id,
                  status: 'pending',
                  created_at: new Date().toISOString(),
                });
                // Notify butler
                try {
                  const nr = await getServiceSupabase().from('notifications').insert({
                    user_id: alloc.id,
                    title: 'New task assigned',
                    body: `You have been assigned: ${bt}`,
                    type: 'task',
                    read: false,
                  });
                  if (nr.error) console.warn('Notification failed:', nr.error.message, nr.error.code);
                } catch (e: any) { console.warn('Notification error:', e.message); }
                onAssign();
              }}>
              <option value="">Booking type…</option>
              {BOOKING_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
            <button className="sv-btn" style={{ fontSize: 12 }} onClick={onAssign}>
              + Assign task
            </button>
            {alloc.tasks.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>No tasks assigned yet.</div>
            )}
          </div>

          {alloc.tasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Task breakdown
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {alloc.tasks.map((t: any, i: number) => (
                  <div key={i} style={{ background: t.status === 'completed' ? 'rgba(151,196,89,0.12)' : t.status === 'delayed' ? 'rgba(226,75,74,0.08)' : 'var(--muted)', borderRadius: 8, padding: '8px 12px', fontSize: 12, border: `0.5px solid ${t.status === 'completed' ? '#97C459' : t.status === 'delayed' ? '#E9A0A7' : 'rgba(0,0,0,0.08)'}` }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{TASK_EMOJIS[t.type] || '✓'} {t.type}</div>
                    <div style={{ color: 'var(--muted-fg)', fontSize: 11 }}>{t.due_time || '—'} · {t.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Butler Utilization Panel (admin/supervisor only) ─────────
function UtilizationPanel({ allocations }: { allocations: ButlerAllocation[] }) {
  const total = allocations.length;
  const assigned = allocations.filter(a => a.totalTasks > 0).length;
  const unassigned = total - assigned;
  const utilizationPct = total > 0 ? Math.round(assigned / total * 100) : 0;
  const avgTasksPerButler = total > 0 ? (allocations.reduce((s, a) => s + a.totalTasks, 0) / total).toFixed(1) : '0';
  const avgCompletionPct = assigned > 0
    ? Math.round(allocations.filter(a => a.totalTasks > 0).reduce((s, a) => s + (a.completedTasks / a.totalTasks * 100), 0) / assigned)
    : 0;

  // Task type breakdown across all butlers
  const typeBreakdown: Record<string, number> = {};
  allocations.forEach(a => {
    Object.entries(a.taskBreakdown).forEach(([type, count]) => {
      typeBreakdown[type] = (typeBreakdown[type] || 0) + count;
    });
  });
  const totalTypeTasks = Object.values(typeBreakdown).reduce((s, v) => s + v, 0);

  return (
    <div className="sv-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Butler utilization</div>
        <span style={{ fontSize: 11, background: 'rgba(156,204,252,0.15)', color: '#0C447C', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>Admin & supervisor only</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 16 }}>How effectively the butler team is deployed today</div>

      {/* Utilization gauge row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Utilization', value: `${utilizationPct}%`, sub: `${assigned}/${total} assigned`, color: utilizationPct >= 80 ? '#2D5A0E' : utilizationPct >= 50 ? '#7A4A08' : '#8B2020', bg: utilizationPct >= 80 ? 'rgba(151,196,89,0.1)' : utilizationPct >= 50 ? 'rgba(255,196,120,0.15)' : 'rgba(226,75,74,0.08)' },
          { label: 'Avg tasks/butler', value: avgTasksPerButler, sub: 'across all butlers', color: '#0C447C', bg: 'rgba(156,204,252,0.1)' },
          { label: 'Avg completion', value: `${avgCompletionPct}%`, sub: 'of assigned tasks', color: avgCompletionPct >= 80 ? '#2D5A0E' : '#7A4A08', bg: avgCompletionPct >= 80 ? 'rgba(151,196,89,0.1)' : 'rgba(255,196,120,0.15)' },
          { label: 'Unassigned', value: unassigned, sub: 'need tasks today', color: unassigned > 0 ? '#8B2020' : '#2D5A0E', bg: unassigned > 0 ? 'rgba(226,75,74,0.08)' : 'rgba(151,196,89,0.08)' },
        ].map(m => (
          <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Utilization bar per butler */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Per-butler view</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {allocations.map(a => {
          const pct = a.totalTasks > 0 ? Math.round(a.completedTasks / a.totalTasks * 100) : 0;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {a.name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 140, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                {a.totalTasks === 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(0,0,0,0.07)', color: 'var(--muted-fg)', whiteSpace: 'nowrap', flexShrink: 0 }}>No tasks</span>}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ height: 7, borderRadius: 4, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 4,
                    background: a.status === 'delayed' ? '#E9A0A7' : a.totalTasks === 0 ? 'rgba(0,0,0,0.1)' : pct === 100 ? '#97C459' : '#9CCCFC',
                    width: a.totalTasks === 0 ? '4px' : `${pct}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, width: 60, textAlign: 'right', flexShrink: 0, color: a.totalTasks === 0 ? 'var(--muted-fg)' : pct === 100 ? '#2D5A0E' : '#0C447C' }}>
                {a.totalTasks === 0 ? 'No tasks' : `${a.completedTasks}/${a.totalTasks}`}
              </div>
              <div style={{ width: 70, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: a.status === 'delayed' ? 'rgba(233,160,167,0.15)' : a.status === 'on_track' ? 'rgba(151,196,89,0.15)' : 'rgba(0,0,0,0.06)', color: a.status === 'delayed' ? '#8B2020' : a.status === 'on_track' ? '#2D5A0E' : 'var(--muted-fg)' }}>
                  {a.status === 'delayed' ? 'Delayed' : a.status === 'on_track' ? 'On track' : 'Empty'}
                </span>
              </div>
            </div>
          );
        })}
        {allocations.length === 0 && <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butler data for this date.</div>}
      </div>

      {/* Task type breakdown */}
      {totalTypeTasks > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 20 }}>Task type breakdown</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(typeBreakdown).filter(([, v]) => v > 0).map(([type, count]) => (
              <div key={type} style={{ background: 'var(--muted)', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{TASK_EMOJIS[type] || '✓'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{count}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{type}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

// ── Week Calendar ─────────────────────────────────────────────
function WeekCalendar({ currentDate, onSelectDate }: { currentDate: string; onSelectDate: (d: string) => void }) {
  const d = new Date(currentDate);
  // Get Monday of current week
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));

  const days = Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
      {days.map(dd => {
        const iso = dd.toISOString().slice(0, 10);
        const isToday = iso === today;
        const isSelected = iso === currentDate;
        const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        return (
          <button key={iso} onClick={() => onSelectDate(iso)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${isSelected ? '#1B1D1F' : isToday ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: isSelected ? '#1B1D1F' : isToday ? 'rgba(156,204,252,0.1)' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: isSelected ? '#9CCCFC' : 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayNames[days.indexOf(dd)]}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#fff' : isToday ? '#0C447C' : '#1B1D1F', marginTop: 2 }}>{dd.getDate()}</div>
            <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.5)' : 'var(--muted-fg)', marginTop: 1 }}>{dd.toLocaleDateString('en-GB', { month: 'short' })}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function AllocationPage() {
  const { user } = useAuth();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [squad, setSquad] = useState<string>('All');
  const [allocations, setAllocations] = useState<ButlerAllocation[]>([]);
  const [expandedButler, setExpandedButler] = useState<string | null>(null);
  const [assigningButler, setAssigningButler] = useState<ButlerAllocation | null>(null);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuper = user && isSupervisor(user.role as any);

  // Block butlers entirely
  if (user?.role === 'butler') {
    return (
      <>
        <Topbar title="Allocation" subtitle="You don't have access to this page" actions={null} />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>
          This section is for supervisors and admins only.
        </div>
      </>
    );
  }

  useEffect(() => {
    getServiceSupabase().from('properties').select('id, name').order('name').then((res: any) => setProperties(res.data ?? []));
  }, []);

  useEffect(() => { loadAllocations(); }, [date, squad]);

  const loadAllocations = async () => {
    setLoading(true);
    try {
      let q = getServiceSupabase().from('profiles').select('*').eq('role', 'butler').eq('is_active', true);
      if (squad !== 'All') q = q.eq('squad', squad);
      const { data: butlers } = await q;
      if (!butlers) { setAllocations([]); setLoading(false); return; }

      const { data: tasks } = await getServiceSupabase()
        .from('tasks').select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      const { data: delights } = await getServiceSupabase()
        .from('guest_delights').select('*')
        .eq('booking_date', date);

      const allocMap: Record<string, ButlerAllocation> = {};
      butlers.forEach((butler: any) => {
        const butlerTasks = tasks?.filter((t: any) => t.butler_id === butler.id) || [];
        const butlerDelights = delights?.filter((d: any) => d.your_name === butler.name) || [];
        const breakdown: Record<string, number> = { 'Arrival selfie': 0, 'Guest welcome': 0, 'Table layout': 0, 'Exit selfie': 0 };
        butlerTasks.forEach((t: any) => { if (t.type in breakdown) breakdown[t.type]++; });
        const completed = butlerTasks.filter((t: any) => t.status === 'completed').length;
        const delayed = butlerTasks.filter((t: any) => t.status === 'delayed').length;
        allocMap[butler.id] = {
          id: butler.id,
          name: butler.name || 'Unknown',
          squad: butler.squad || 'Unassigned',
          totalTasks: butlerTasks.length,
          completedTasks: completed,
          delightCount: butlerDelights.length,
          status: delayed > 0 ? 'delayed' : completed === butlerTasks.length && butlerTasks.length > 0 ? 'on_track' : 'unassigned',
          taskBreakdown: breakdown,
          tasks: butlerTasks,
        };
      });
      setAllocations(Object.values(allocMap));
    } catch (err) { console.error('Load error:', err); }
    finally { setLoading(false); }
  };

  const squads = ['All', 'Lonavala', 'Alibaug', 'Karjat', 'Nashik', 'Pune'];

  return (
    <>
      {assigningButler && (
        <AssignTaskModal
          butler={assigningButler}
          date={date}
          properties={properties}
          onClose={() => setAssigningButler(null)}
          onSaved={() => { setAssigningButler(null); loadAllocations(); }}
        />
      )}

      <Topbar
        title="Daily allocation"
        subtitle="Track what every butler is doing today"
        actions={null}
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <WeekCalendar currentDate={date} onSelectDate={setDate} />

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="sv-select" style={{ width: 148 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Squad</label>
            <select value={squad} onChange={e => setSquad(e.target.value)} className="sv-select" style={{ width: 140 }}>
              {squads.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="sv-btn" style={{ fontSize: 12 }} onClick={loadAllocations}>↻ Refresh</button>
        </div>

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total butlers', value: allocations.length, cls: 'blue' },
            { label: 'On track', value: allocations.filter(a => a.status === 'on_track').length, cls: 'green' },
            { label: 'Delayed', value: allocations.filter(a => a.status === 'delayed').length, cls: 'coral' },
            { label: 'Unassigned', value: allocations.filter(a => a.status === 'unassigned').length, cls: 'peach' },
            { label: 'Total tasks', value: allocations.reduce((s, a) => s + a.totalTasks, 0), cls: 'blue' },
            { label: 'Delights logged', value: allocations.reduce((s, a) => s + a.delightCount, 0), cls: 'green' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Butler Utilization — admin/supervisor only */}
        {isSuper && !loading && <UtilizationPanel allocations={allocations} />}

        {/* Allocation table */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Butler allocation — {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 14 }}>Click a row to expand · Assign tasks from the row actions</div>

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : allocations.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted-fg)' }}>No butlers found for the selected filters.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table" style={{ width: '100%', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>Butler</th>
                    <th>Squad</th>
                    <th>Progress</th>
                    <th>Task types</th>
                    <th>Delights</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Assign</th>
                    <th style={{ textAlign: 'center' }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(alloc => (
                    <>
                      <tr key={alloc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sv-avatar">{alloc.name.slice(0,2).toUpperCase()}</div>
                            <span style={{ fontWeight: 500 }}>{alloc.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted-fg)' }}>{alloc.squad}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-track" style={{ width: 72 }}>
                              <div className="progress-fill fill-blue" style={{ width: `${alloc.totalTasks > 0 ? (alloc.completedTasks / alloc.totalTasks) * 100 : 0}%` }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{alloc.completedTasks}/{alloc.totalTasks}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {Object.entries(alloc.taskBreakdown).map(([type, count]) =>
                              count > 0 && (
                                <span key={type} title={`${type} (${count})`} style={{ fontSize: 17 }}>{TASK_EMOJIS[type]}</span>
                              )
                            )}
                            {alloc.totalTasks === 0 && <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>None</span>}
                          </div>
                        </td>
                        <td style={{ fontWeight: alloc.delightCount > 0 ? 600 : 400, color: alloc.delightCount > 0 ? '#2D5A0E' : 'var(--muted-fg)' }}>
                          {alloc.delightCount}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: alloc.status === 'delayed' ? 'rgba(233,160,167,0.15)' : alloc.status === 'on_track' ? 'rgba(151,196,89,0.15)' : 'rgba(156,204,252,0.12)', color: alloc.status === 'delayed' ? '#E9A0A7' : alloc.status === 'on_track' ? '#97C459' : '#9CCCFC' }}>
                            {alloc.status === 'delayed' ? '⚠ Delayed' : alloc.status === 'on_track' ? '✓ On track' : '— Unassigned'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setAssigningButler(alloc)}>
                            Assign task
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setExpandedButler(expandedButler === alloc.id ? null : alloc.id)}>
                            {expandedButler === alloc.id ? '▼' : '▶'}
                          </button>
                        </td>
                      </tr>
                      {expandedButler === alloc.id && (
                        <ButlerDetailRow alloc={alloc} onAssign={() => setAssigningButler(alloc)} />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
