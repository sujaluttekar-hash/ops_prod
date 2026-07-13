'use client';
import { useState, useEffect, useMemo } from 'react';
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
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<any[]>([]); // all tasks for the month
  const [monthlyButlers, setMonthlyButlers] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
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

  async function loadMonthly() {
    setMonthlyLoading(true);
    const sb = getServiceSupabase();
    const startDate = `${reportYear}-${String(reportMonth + 1).padStart(2,'0')}-01`;
    const endDate = `${reportYear}-${String(reportMonth + 1).padStart(2,'0')}-31`;

    try {
      // Use server API for tasks — guaranteed to work
      const [butlerRes, tasksRes] = await Promise.all([
        sb.from('profiles').select('id,name,squad,role').eq('role','butler').eq('is_active',true).order('name'),
        fetch(`/api/tasks?all=1`, { cache: 'no-store' }).then(r => r.json()),
      ]);

      const allTasks = Array.isArray(tasksRes) ? tasksRes : [];
      // Filter to this month — check both created_at and notes Date: field
      const monthTasks = allTasks.filter((t: any) => {
        const dateFromNotes = t.notes?.match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1];
        const dateFromCreated = (t.created_at || '').slice(0, 10);
        const d = dateFromNotes || dateFromCreated;
        return d >= startDate && d <= endDate;
      });

      setMonthlyButlers(butlerRes.data || []);
      setMonthlyData(monthTasks);
    } catch (e) {
      console.error('loadMonthly error:', e);
    }
    setMonthlyLoading(false);
  }

  useEffect(() => { if (view === 'monthly') loadMonthly(); }, [view, reportMonth, reportYear]);

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
        notes: `Butler: ${butler.name} · ButlerID: ${butler.id} · Date: ${date}`,
        created_at: `${date}T08:00:00+05:30`,
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
    const saved = Object.values(newSaved).filter(Boolean).length;
    setSaveMsg(`✅ Saved ${saved} of ${butlers.filter(b => selections[b.id]).length} allocations`);
    setTimeout(() => setSaveMsg(''), 3000);
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
      notes: `Butler: ${butler.name} · ButlerID: ${butler.id} · Date: ${date}`,
      created_at: `${date}T08:00:00+05:30`,
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
      <Topbar title="Daily allocation" subtitle={view === 'daily' ? `Butler booking type assignment · ${new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : `Monthly report · ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][reportMonth]} ${reportYear}`}
        actions={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: 2, gap: 2 }}>
              {(['daily','monthly'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: view === v ? '#1B1D1F' : 'transparent', color: view === v ? '#fff' : 'var(--muted-fg)', cursor: 'pointer', fontWeight: view === v ? 600 : 400 }}>
                  {v === 'daily' ? '📅 Daily' : '📊 Monthly'}
                </button>
              ))}
            </div>
            {view === 'daily' && (
              <select value={squad} onChange={e => setSquad(e.target.value)} className="sv-select" style={{ fontSize: 12 }}>
                {['All','Lonavala','Karjat','Nashik','Alibaug','Pune','Alibaug','Pune','Alibaug','Pune'].map(s => <option key={s}>{s}</option>)}
              </select>
            )}
            {saveMsg && <span style={{ fontSize: 12, color: '#2D5A0E', fontWeight: 600 }}>{saveMsg}</span>}
            {view === 'daily' && isSuper && anyChanged && (
              <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={saveAll} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save all'}
              </button>
            )}
            {view === 'monthly' && (
              <>
                <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)} className="sv-select" style={{ fontSize: 12 }}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={reportYear} onChange={e => setReportYear(+e.target.value)} className="sv-select" style={{ fontSize: 12 }}>
                  {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
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
        {/* ── MONTHLY REPORT ─────────────────────────────────── */}
        {view === 'monthly' && (
          <MonthlyReport butlers={monthlyButlers} tasks={monthlyData} month={reportMonth} year={reportYear} loading={monthlyLoading} />
        )}
      </div>
    </>
  );
}

// ── Monthly Report Component ──────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPE_ABBR: Record<string,string> = { 'Check-In': 'CI', 'Check-Out': 'CO', 'Booking': 'BK', 'Non Booking': 'NB' };
const TYPE_CLR: Record<string,{bg:string;color:string}> = {
  'Check-In':    { bg: '#97C459', color: '#fff' },
  'Check-Out':   { bg: '#E9A0A7', color: '#fff' },
  'Booking':     { bg: '#9CCCFC', color: '#0C447C' },
  'Non Booking': { bg: '#FED5A9', color: '#7A4A08' },
};

function MonthlyReport({ butlers, tasks, month, year, loading }: { butlers: any[]; tasks: any[]; month: number; year: number; loading: boolean }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();

  // Build lookup: butlerId → date → booking type (only roster types)
  const ROSTER_TYPES = new Set(['Check-In','Check-Out','Booking','Non Booking']);
  const lookup: Record<string, Record<string, string>> = {};
  tasks.forEach((t: any) => {
    if (!ROSTER_TYPES.has(t.type)) return; // skip task types like Arrival selfie etc
    // Extract date from notes "Date: YYYY-MM-DD" if present, else from created_at
    const dateFromNotes = t.notes?.match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1];
    const raw = t.created_at || '';
    const d = dateFromNotes || raw.slice(0, 10);
    if (!d || !t.butler_id) return;
    if (!lookup[t.butler_id]) lookup[t.butler_id] = {};
    // Only set if not already set (keep first/most recent)
    if (!lookup[t.butler_id][d]) lookup[t.butler_id][d] = t.type;
  });

  // Summary counts per butler for the month
  function getCount(butlerId: string, type: string) {
    return Object.values(lookup[butlerId] || {}).filter(v => v === type).length;
  }

  // Export as CSV
  function exportCSV() {
    const headers = ['Butler', 'Squad', ...days.map(d => `${d} ${MONTHS[month]}`), 'Check-In', 'Check-Out', 'Booking', 'Non Booking'];
    const rows = butlers.map(b => {
      const dayCells = days.map(d => {
        const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        return lookup[b.id]?.[iso] ? TYPE_ABBR[lookup[b.id][iso]] || lookup[b.id][iso] : '';
      });
      return [b.name, b.squad || '', ...dayCells, getCount(b.id,'Check-In'), getCount(b.id,'Check-Out'), getCount(b.id,'Booking'), getCount(b.id,'Non Booking')];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `allocation_${MONTHS[month]}_${year}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading monthly data…</div>;

  return (
    <div>
      {/* Legend + export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_CLR).map(([type, clr]) => (
            <span key={type} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: clr.bg, color: clr.color }}>
              {TYPE_ABBR[type]} = {type}
            </span>
          ))}
        </div>
        <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      {/* Monthly grid — horizontal scroll */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, minWidth: daysInMonth * 36 + 200 }}>
          <thead>
            <tr style={{ background: '#1B1D1F' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: '#fff', fontSize: 11, fontWeight: 700, position: 'sticky', left: 0, background: '#1B1D1F', minWidth: 140, zIndex: 2 }}>Butler</th>
              {days.map(d => {
                const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isToday = new Date(iso).toDateString() === today.toDateString();
                const dow = new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
                return (
                  <th key={d} style={{ padding: '6px 2px', color: isToday ? '#97C459' : 'rgba(255,255,255,0.6)', fontWeight: isToday ? 700 : 400, fontSize: 10, textAlign: 'center', minWidth: 34, background: isToday ? 'rgba(151,196,89,0.15)' : 'transparent' }}>
                    <div>{d}</div>
                    <div style={{ fontSize: 8, opacity: 0.7 }}>{dow}</div>
                  </th>
                );
              })}
              {['CI','CO','BK','NB'].map(abbr => (
                <th key={abbr} style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center', minWidth: 32 }}>{abbr}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {butlers.map((b, ri) => (
              <tr key={b.id} style={{ background: ri % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                <td style={{ padding: '8px 14px', position: 'sticky', left: 0, background: ri % 2 === 0 ? '#fff' : '#F9FAFB', zIndex: 1, borderRight: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{b.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{b.squad || '—'}</div>
                </td>
                {days.map(d => {
                  const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  const type = lookup[b.id]?.[iso];
                  const clr = type ? TYPE_CLR[type] : null;
                  const isToday = new Date(iso).toDateString() === today.toDateString();
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: '4px 2px', background: isToday ? 'rgba(156,204,252,0.08)' : 'transparent' }}>
                      {type && clr ? (
                        <div style={{ width: 28, height: 22, borderRadius: 4, background: clr.bg, color: clr.color, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          {TYPE_ABBR[type] || type.slice(0,2).toUpperCase()}
                        </div>
                      ) : (
                        <div style={{ width: 28, height: 22, borderRadius: 4, background: 'rgba(0,0,0,0.04)', margin: '0 auto' }} />
                      )}
                    </td>
                  );
                })}
                {['Check-In','Check-Out','Booking','Non Booking'].map(type => (
                  <td key={type} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: TYPE_CLR[type]?.color || 'var(--muted-fg)', padding: '4px 8px' }}>
                    {getCount(b.id, type) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}