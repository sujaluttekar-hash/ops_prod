'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';
import { saveButlerLocation, getCurrentPosition } from '@/lib/get-location';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  present: { bg: 'rgba(151,196,89,0.12)', color: '#2D5A0E', label: 'Present' },
  absent: { bg: 'rgba(233,160,167,0.12)', color: '#8B2020', label: 'Absent' },
  half_day: { bg: 'rgba(254,213,169,0.2)', color: '#7A4A08', label: 'Half day' },
};


// ── Week Calendar ─────────────────────────────────────────────
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
        const isToday = iso === today;
        const isSelected = iso === currentDate;
        return (
          <button key={iso} onClick={() => onSelectDate(iso)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${isSelected ? '#1B1D1F' : isToday ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: isSelected ? '#1B1D1F' : isToday ? 'rgba(156,204,252,0.1)' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: isSelected ? '#9CCCFC' : 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayNames[idx]}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#fff' : isToday ? '#0C447C' : '#1B1D1F', marginTop: 2 }}>{dd.getDate()}</div>
            <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.5)' : 'var(--muted-fg)', marginTop: 1 }}>{dd.toLocaleDateString('en-GB', { month: 'short' })}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [squad, setSquad] = useState('All');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    let q = sb.from('profiles').select('*').eq('role', 'butler').eq('is_active', true);
    if (squad !== 'All') q = q.eq('squad', squad);
    const { data: butlers } = await q;
    if (!butlers) { setLoading(false); return; }

    const [attRes, tasksRes, delightsRes] = await Promise.all([
      sb.from('attendance').select('*').eq('date', date),
      sb.from('tasks').select('butler_id,status').gte('created_at', `${date}T00:00:00`).lt('created_at', `${date}T23:59:59`),
      sb.from('guest_delights').select('your_name').eq('booking_date', date),
    ]);

    const attMap: Record<string, any> = {};
    (attRes.data || []).forEach((a: any) => { attMap[a.butler_id] = a; });

    const filtered = isSuper ? butlers : butlers.filter((b: any) => b.id === user?.id);
    setRecords(filtered.map((b: any) => ({
      id: b.id, name: b.name, squad: b.squad || '—',
      status: attMap[b.id]?.status || 'absent',
      check_in: attMap[b.id]?.check_in || null,
      tasks_done: (tasksRes.data || []).filter((t: any) => t.butler_id === b.id && t.status === 'completed').length,
      tasks_total: (tasksRes.data || []).filter((t: any) => t.butler_id === b.id).length,
      delights: (delightsRes.data || []).filter((d: any) => d.your_name === b.name).length,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [date, squad, user?.id]);

  async function markAttendance(butlerId: string, status: string) {
    setMarkingId(butlerId);
    const now = new Date().toTimeString().slice(0, 5);

    // Get GPS — ONLY for butler marking themselves present, never for admin
    let geo_lat: number | null = null;
    let geo_lng: number | null = null;
    const localSession = (() => { try { return JSON.parse(localStorage.getItem('sv_local_session') || '{}'); } catch { return {}; } })();
    const isButlerMarkingSelf = localSession.role === 'butler' && localSession.id === butlerId;
    if (status !== 'absent' && isButlerMarkingSelf) {
      const pos = await getCurrentPosition();
      if (pos) { geo_lat = pos.lat; geo_lng = pos.lng; }
    }

    await getServiceSupabase().from('attendance').upsert({
      date, butler_id: butlerId, status,
      check_in: status !== 'absent' ? now : null,
      geo_lat, geo_lng,
    }, { onConflict: 'date,butler_id' });

    // Only push to map if butler marked themselves
    try {
      const stored = localStorage.getItem('sv_local_session');
      if (stored && status !== 'absent' && isButlerMarkingSelf) {
        const u = JSON.parse(stored);
        if (geo_lat && geo_lng) {
          await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ butler_id: u.id, butler_name: u.name, squad: u.squad || null, lat: geo_lat, lng: geo_lng, accuracy: 0 }),
          });
        }
      }
    } catch {}

    await load();
    setMarkingId(null);
  }

  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const half = records.filter(r => r.status === 'half_day').length;

  return (
    <>
      <Topbar title="Attendance" subtitle={`${date} · ${present} present · ${absent} absent`}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="sv-input" style={{ fontSize: 12, padding: '5px 8px' }} />
            {isSuper && (
              <select value={squad} onChange={e => setSquad(e.target.value)} className="sv-select" style={{ fontSize: 12, padding: '5px 8px' }}>
                {['All','Lonavala','Karjat','Nashik','Alibaug','Pune'].map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <WeekCalendar currentDate={date} onSelectDate={setDate} />
        {isSuper && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[{ l: 'Present', v: present, c: 'green' }, { l: 'Absent', v: absent, c: 'coral' }, { l: 'Half day', v: half, c: 'peach' }, { l: 'Total', v: records.length, c: 'blue' }].map(s => (
              <div key={s.l} className={`metric-card ${s.c}`}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}
        <div className="sv-card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Butler</th>
                    {isSuper && <th>Squad</th>}
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Tasks</th>
                    <th>Delights</th>
                    {isSuper && <th>Mark</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.absent;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sv-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{r.name.slice(0,2).toUpperCase()}</div>
                            <div>
                              <span style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</span>
                              {r.tasks_total === 0 && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(0,0,0,0.07)', color: 'var(--muted-fg)' }}>No tasks</span>}
                            </div>
                          </div>
                        </td>
                        {isSuper && <td style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{r.squad}</td>}
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{r.check_in || '—'}</td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: r.tasks_done === r.tasks_total && r.tasks_total > 0 ? '#2D5A0E' : 'inherit' }}>{r.tasks_done}/{r.tasks_total}</td>
                        <td style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{r.delights}</td>
                        {isSuper && (
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[['present','P'],['half_day','H'],['absent','A']].map(([s, lbl]) => (
                                <button key={s} disabled={markingId === r.id} onClick={() => markAttendance(r.id, s)}
                                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: `1.5px solid ${r.status === s ? STATUS_COLORS[s]?.color : 'rgba(0,0,0,0.1)'}`, background: r.status === s ? STATUS_COLORS[s]?.bg : 'white', color: r.status === s ? STATUS_COLORS[s]?.color : 'var(--muted-fg)', cursor: 'pointer', fontWeight: r.status === s ? 700 : 400, transition: 'all 0.1s' }}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
