'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';
import { fetchProfiles, fetchGuestDelights, fetchHuddles, fetchTrainings, getSupabase, getServiceSupabase, type Profile, type GuestDelight, type Huddle, type Training } from '@/lib/supabase';

type DayEvent = {
  type: 'delight' | 'huddle' | 'training' | 'task';
  label: string;
  sub?: string;
  color: 'blue' | 'green' | 'coral' | 'peach' | 'amber';
  status?: string;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function colorClass(c: DayEvent['color']) {
  const map: Record<string, string> = {
    blue: 'rgba(156,204,252,0.2)',
    green: 'rgba(151,196,89,0.18)',
    coral: 'rgba(226,140,100,0.2)',
    peach: 'rgba(255,196,120,0.2)',
    amber: 'rgba(255,180,60,0.2)',
  };
  return map[c] || map.blue;
}
function textColor(c: DayEvent['color']) {
  const map: Record<string, string> = { blue:'#0C447C', green:'#2D5A0E', coral:'#7A2A0E', peach:'#7A4A08', amber:'#7A5000' };
  return map[c] || map.blue;
}

export default function ButlerCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedButler, setSelectedButler] = useState<Profile | null>(null);
  const [delights, setDelights] = useState<GuestDelight[]>([]);
  const [huddles, setHuddles] = useState<Huddle[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [huddleAttendance, setHuddleAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfiles().then(p => {
      setProfiles(p);
      try {
        const stored = localStorage.getItem('sv_local_session');
        if (stored) {
          const lu = JSON.parse(stored);
          if (lu.role === 'butler') {
            setSelectedButler(p.find((b: any) => b.id === lu.id) || p[0]);
          } else {
            setSelectedButler(p[0]);
          }
        } else { setSelectedButler(p[0]); }
      } catch { setSelectedButler(p[0]); }
    });
  }, []);

  useEffect(() => {
    if (!selectedButler) return;
    setLoading(true);
    const startDate = `${year}-${String(month + 1).padStart(2,'0')}-01`;
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    Promise.all([
      fetchGuestDelights(),
      fetchHuddles(),
      fetchTrainings(),
      getServiceSupabase().from('huddle_attendance')
        .select('huddle_id, attended')
        .eq('butler_id', selectedButler.id),
    ]).then(([d, h, t, att]) => {
      // Filter by butler name (delights use your_name, not butler_id)
      const myDelights = d.filter(x => {
        const bd = x.booking_date;
        return x.your_name === selectedButler.name && bd >= startDate && bd <= endDate;
      });
      const monthHuddles = h.filter(x => {
        const hd = x.huddle_date;
        return hd >= startDate && hd <= endDate;
      });
      const monthTrainings = t.filter(x => {
        if (!x.training_date) return false;
        return x.training_date >= startDate && x.training_date <= endDate;
      });
      const attMap: Record<string, boolean> = {};
      (att.data || []).forEach((a: any) => { attMap[a.huddle_id] = a.attended; });

      setDelights(myDelights);
      setHuddles(monthHuddles);
      setTrainings(monthTrainings);
      setHuddleAttendance(attMap);
      setLoading(false);
    });
  }, [selectedButler, year, month]);

  // Build events per day
  const eventsByDay: Record<number, DayEvent[]> = {};
  const addEvent = (dateStr: string, ev: DayEvent) => {
    const d = new Date(dateStr);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  };

  delights.forEach(d => addEvent(d.booking_date, {
    type: 'delight',
    label: d.villa_name,
    sub: d.booking_type,
    color: d.status === 'completed' ? 'green' : d.status === 'overdue' ? 'coral' : 'blue',
    status: d.status,
  }));
  huddles.forEach(h => {
    const attended = huddleAttendance[h.id];
    addEvent(h.huddle_date, {
      type: 'huddle',
      label: 'Huddle',
      sub: h.team.split(' ')[0],
      color: h.status === 'completed' ? (attended ? 'green' : 'coral') : 'peach',
      status: h.status,
    });
  });
  trainings.forEach(t => {
    if (t.training_date) addEvent(t.training_date, {
      type: 'training',
      label: 'Training',
      sub: t.name.split(' ').slice(0,2).join(' '),
      color: t.status === 'completed' ? 'green' : 'amber',
      status: t.status,
    });
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

  // Stats for the month
  const delightDone = delights.filter(d => d.status === 'completed').length;
  const huddlesAttended = huddles.filter(h => huddleAttendance[h.id]).length;
  const totalHuddlesInMonth = huddles.length;
  const trainingsInMonth = trainings.length;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <>
      <Topbar
        title="Butler calendar"
        subtitle="Monthly activity view per butler"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="sv-select"
              style={{ fontSize: 13 }}
              value={selectedButler?.id || ''}
              onChange={e => setSelectedButler(profiles.find(p => p.id === e.target.value) || null)}
            >
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button className="sv-btn" onClick={prevMonth} style={{ fontSize: 18, lineHeight: 1, padding: '6px 14px' }}>‹</button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{MONTHS[month]} {year}</div>
          <button className="sv-btn" onClick={nextMonth} style={{ fontSize: 18, lineHeight: 1, padding: '6px 14px' }}>›</button>
        </div>

        {/* Month summary strip */}
        {selectedButler && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Delights done', value: `${delightDone}/${delights.length}`, cls: 'green' },
              { label: 'Huddle attendance', value: `${huddlesAttended}/${totalHuddlesInMonth}`, cls: 'blue' },
              { label: 'Trainings', value: trainingsInMonth, cls: 'peach' },
              { label: 'Total activity days', value: Object.keys(eventsByDay).length, cls: 'coral' },
            ].map(m => (
              <div key={m.label} className={`metric-card ${m.cls}`}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{m.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Calendar grid */}
        <div className="sv-card" style={{ padding: 20 }}>
          {selectedButler && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="sv-avatar">{(selectedButler.name || '??').slice(0,2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedButler.name || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{selectedButler.squad ?? '—'} · {selectedButler.role}</div>
              </div>
            </div>
          )}

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 90 }} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const evs = eventsByDay[day] || [];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div key={day} style={{
                  minHeight: 90,
                  borderRadius: 8,
                  border: isToday ? '2px solid #9CCCFC' : '0.5px solid rgba(0,0,0,0.06)',
                  background: isToday ? 'rgba(156,204,252,0.06)' : evs.length > 0 ? 'rgba(0,0,0,0.015)' : 'transparent',
                  padding: '6px 5px',
                  position: 'relative',
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#0C447C' : 'var(--sv-mid)',
                    marginBottom: 4,
                  }}>{day}</div>
                  {evs.slice(0, 3).map((ev, i) => (
                    <div key={i} style={{
                      background: colorClass(ev.color),
                      color: textColor(ev.color),
                      borderRadius: 4,
                      padding: '2px 5px',
                      fontSize: 9.5,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {ev.type === 'delight' ? '🎁' : ev.type === 'huddle' ? '◎' : ev.type === 'training' ? '📚' : '✓'} {ev.label}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--muted-fg)', paddingLeft: 4 }}>+{evs.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 12 }}>
          {[
            { icon: '🎁', label: 'Guest delight', bg: 'rgba(156,204,252,0.2)', color: '#0C447C' },
            { icon: '◎', label: 'Huddle attended', bg: 'rgba(151,196,89,0.18)', color: '#2D5A0E' },
            { icon: '◎', label: 'Huddle missed', bg: 'rgba(226,140,100,0.2)', color: '#7A2A0E' },
            { icon: '📚', label: 'Training', bg: 'rgba(255,180,60,0.2)', color: '#7A5000' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ background: l.bg, color: l.color, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>{l.icon} {l.label}</div>
            </div>
          ))}
        </div>

        {/* Activity detail list */}
        {delights.length > 0 && (
          <div className="sv-card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Delight log — {MONTHS[month]}</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead><tr><th>Date</th><th>Villa</th><th>Type</th><th>Booking ID</th><th>Status</th></tr></thead>
                <tbody>
                  {delights.map(d => (
                    <tr key={d.id}>
                      <td style={{ color: 'var(--muted-fg)' }}>{new Date(d.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ fontWeight: 500 }}>{d.villa_name}</td>
                      <td><span className="badge badge-blue">{d.booking_type}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.booking_id ?? '—'}</td>
                      <td>
                        <span className={d.status === 'completed' ? 'badge badge-green' : d.status === 'overdue' ? 'badge badge-red' : 'badge badge-amber'}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
