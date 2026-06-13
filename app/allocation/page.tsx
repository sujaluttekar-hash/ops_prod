'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

const BOOKING_TYPES = ['', 'Check-In', 'Check-Out', 'Booking', 'Non Booking'] as const;
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  'Check-In':    { bg: 'rgba(151,196,89,0.12)',  color: '#2D5A0E' },
  'Check-Out':   { bg: 'rgba(233,160,167,0.12)', color: '#8B2020' },
  'Booking':     { bg: 'rgba(156,204,252,0.12)', color: '#0C447C' },
  'Non Booking': { bg: 'rgba(254,213,169,0.15)', color: '#7A4A08' },
};

// ── Week Calendar ──────────────────────────────────────────────
function WeekCalendar({ currentDate, onSelectDate }: { currentDate: string; onSelectDate: (d: string) => void }) {
  const d = new Date(currentDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const days = Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
  const today = new Date().toISOString().slice(0, 10);
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
      {days.map((dd, idx) => {
        const iso = dd.toISOString().slice(0, 10);
        const isSel = iso === currentDate;
        const isToday = iso === today;
        return (
          <button key={iso} onClick={() => onSelectDate(iso)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${isSel ? '#1B1D1F' : isToday ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: isSel ? '#1B1D1F' : isToday ? 'rgba(156,204,252,0.1)' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: isSel ? '#9CCCFC' : 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayNames[idx]}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: isSel ? '#fff' : isToday ? '#0C447C' : '#1B1D1F', marginTop: 2 }}>{dd.getDate()}</div>
            <div style={{ fontSize: 9, color: isSel ? 'rgba(255,255,255,0.5)' : 'var(--muted-fg)', marginTop: 1 }}>{dd.toLocaleDateString('en-GB', { month: 'short' })}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function AllocationPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [squad, setSquad] = useState('All');
  const [butlers, setButlers] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({}); // butlerId → booking type
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    let q = sb.from('profiles').select('id,name,squad,role').eq('role','butler').eq('is_active',true);
    if (squad !== 'All') q = q.eq('squad', squad);
    const { data: bList } = await q.order('name');

    // Load existing allocations for this date from tasks table
    const { data: tasks } = await sb.from('tasks')
      .select('butler_id,type,notes')
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    // Build current selections from tasks
    const sel: Record<string, string> = {};
    (tasks || []).forEach((t: any) => {
      const nameMatch = t.notes?.match(/Butler: ([^·\n]+)/);
      const bId = t.butler_id;
      if (bId && BOOKING_TYPES.includes(t.type as any) && !sel[bId]) {
        sel[bId] = t.type;
      }
    });

    setButlers(bList || []);
    setSelections(sel);
    setSaved({});
    setLoading(false);
  }

  useEffect(() => { load(); }, [date, squad]);

  async function saveAll() {
    setSaving(true);
    const sb = getServiceSupabase();
    const newSaved: Record<string, boolean> = {};

    for (const butler of butlers) {
      const bType = selections[butler.id];
      if (!bType) { newSaved[butler.id] = false; continue; }

      // Save as a task record for this date
      const { error } = await sb.from('tasks').insert({
        type: bType,
        butler_id: butler.id,
        status: 'pending',
        notes: `Butler: ${butler.name} · ButlerID: ${butler.id}`,
        created_at: `${date}T08:00:00`,
      });

      if (!error) {
        // Send notification
        try {
          await sb.from('notifications').insert({
            user_id: butler.id,
            title: 'Allocation updated',
            body: `You are allocated to ${bType} for ${new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
            type: 'task', read: false,
          });
        } catch {}
        newSaved[butler.id] = true;
      }
    }

    setSaved(newSaved);
    setSaving(false);
  }

  async function saveSingle(butler: any) {
    const bType = selections[butler.id];
    if (!bType) return;
    setSaving(true);
    const sb = getServiceSupabase();
    const { error } = await sb.from('tasks').insert({
      type: bType,
      butler_id: butler.id,
      status: 'pending',
      notes: `Butler: ${butler.name} · ButlerID: ${butler.id}`,
      created_at: `${date}T08:00:00`,
    });
    if (!error) {
      try {
        await sb.from('notifications').insert({
          user_id: butler.id, title: 'Allocation updated',
          body: `You are allocated to ${bType} on ${date}`,
          type: 'task', read: false,
        });
      } catch {}
      setSaved(s => ({ ...s, [butler.id]: true }));
    }
    setSaving(false);
  }

  // Summary counts
  const summary = BOOKING_TYPES.filter(Boolean).map(t => ({
    type: t,
    count: butlers.filter(b => selections[b.id] === t).length,
    ...TYPE_COLORS[t],
  })).filter(s => s.count > 0);

  const unallocated = butlers.filter(b => !selections[b.id]).length;
  const anyChanged = butlers.some(b => selections[b.id] && !saved[b.id]);

  return (
    <>
      <Topbar title="Daily allocation" subtitle={`Butler booking type assignment · ${new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={squad} onChange={e => setSquad(e.target.value)} className="sv-select" style={{ fontSize: 12 }}>
              {['All','Lonavala','Karjat','Nashik','Alibaug'].map(s => <option key={s}>{s}</option>)}
            </select>
            {isSuper && anyChanged && (
              <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={saveAll} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save all'}
              </button>
            )}
          </div>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <WeekCalendar currentDate={date} onSelectDate={setDate} />

        {/* Summary pills */}
        {summary.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {summary.map(s => (
              <div key={s.type} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color }}>
                {s.type} · {s.count}
              </div>
            ))}
            {unallocated > 0 && (
              <div style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(0,0,0,0.06)', color: 'var(--muted-fg)' }}>
                Unallocated · {unallocated}
              </div>
            )}
          </div>
        )}

        {/* Butler allocation table */}
        <div className="sv-card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {butlers.length} butlers · {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {isSuper && anyChanged && (
              <button className="sv-btn sv-btn-primary" style={{ fontSize: 11 }} onClick={saveAll} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save all allocations'}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : (
            butlers.map((b, i) => {
              const sel = selections[b.id] || '';
              const isSaved = saved[b.id];
              const tc = TYPE_COLORS[sel];
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < butlers.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', background: isSaved ? 'rgba(151,196,89,0.04)' : 'white', transition: 'background 0.2s' }}>
                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 180, flexShrink: 0 }}>
                    <div className="sv-avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{b.name.slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 1 }}>{b.squad || '—'}</div>
                    </div>
                  </div>

                  {/* Booking type dropdown */}
                  <div style={{ flex: 1 }}>
                    <select
                      value={sel}
                      onChange={e => { setSelections(s => ({ ...s, [b.id]: e.target.value })); setSaved(sv => ({ ...sv, [b.id]: false })); }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${sel ? (tc?.color || 'rgba(0,0,0,0.15)') : 'rgba(0,0,0,0.12)'}`, background: sel ? (tc?.bg || '#fff') : '#fff', color: sel ? (tc?.color || '#1B1D1F') : 'var(--muted-fg)', fontSize: 13, fontWeight: sel ? 600 : 400, cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                      <option value="">— Not allocated —</option>
                      {BOOKING_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Save single / saved indicator */}
                  {isSuper && (
                    <div style={{ flexShrink: 0, width: 80, textAlign: 'right' }}>
                      {isSaved ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#2D5A0E' }}>✅ Saved</span>
                      ) : sel ? (
                        <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => saveSingle(b)} disabled={saving}>
                          Save
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>—</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
