'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type ButlerPerf = {
  id: string; name: string; squad: string;
  // Tasks
  tasksTotal: number; tasksDone: number; tasksDoneOnTime: number;
  avgCompletionMinutes: number;
  // Delight
  delightsTotal: number; delightsDone: number;
  photosUploaded: number; photosApproved: number; photosDeclined: number;
  // Attendance
  daysPresent: number; daysAbsent: number; daysHalf: number; daysAllocated: number;
  // Allocation breakdown
  checkIns: number; checkOuts: number; bookings: number; nonBooking: number;
  // Cases
  casesReported: number; casesCritical: number;
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#2D5A0E' : score >= 60 ? '#7A4A08' : '#8B2020';
  const bg = score >= 80 ? 'rgba(151,196,89,0.12)' : score >= 60 ? 'rgba(254,213,169,0.2)' : 'rgba(233,160,167,0.15)';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Average' : 'Needs work';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{score}%</div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: bg, color }}>{label}</span>
    </div>
  );
}

function MiniBar({ val, max, color }: { val: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  );
}

export default function PerformancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSuper = user ? isSupervisor(user.role as any) : false;

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [squad, setSquad] = useState('All');
  const [data, setData] = useState<ButlerPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ButlerPerf | null>(null);

  useEffect(() => {
    if (!isSuper) { router.push('/dashboard'); return; }
    load();
  }, [month, year, squad, isSuper]);

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const end   = `${year}-${String(month+1).padStart(2,'0')}-31`;

    let bQ = sb.from('profiles').select('id,name,squad').eq('role','butler').eq('is_active',true);
    if (squad !== 'All') bQ = bQ.eq('squad', squad);
    const { data: butlers } = await bQ.order('name');

    const [tasksR, delightsR, photosR, attR, allocR, casesR] = await Promise.all([
      sb.from('tasks').select('id,type,status,butler_id,notes,created_at,completed_at,due_time')
        .gte('created_at',`${start}T00:00:00`).lte('created_at',`${end}T23:59:59`),
      sb.from('guest_delights').select('id,your_name,status,created_at')
        .gte('created_at',`${start}T00:00:00`).lte('created_at',`${end}T23:59:59`),
      sb.from('delight_photos').select('id,delight_id,photo_status'),
      sb.from('attendance').select('butler_id,status,date')
        .gte('date', start).lte('date', end),
      sb.from('tasks').select('type,butler_id,notes,created_at')
        .in('type',['Check-In','Check-Out','Booking','Non Booking'])
        .gte('created_at',`${start}T00:00:00`).lte('created_at',`${end}T23:59:59`),
      sb.from('incidents').select('reporter_id,severity,created_at')
        .gte('created_at',`${start}T00:00:00`).lte('created_at',`${end}T23:59:59`),
    ]);

    const tasks    = tasksR.data    || [];
    const delights = delightsR.data || [];
    const photos   = photosR.data   || [];
    const att      = attR.data      || [];
    const alloc    = allocR.data    || [];
    const cases    = casesR.data    || [];

    // Build delight → photo map
    const photosByDelight: Record<string, any[]> = {};
    photos.forEach((p: any) => {
      if (!photosByDelight[p.delight_id]) photosByDelight[p.delight_id] = [];
      photosByDelight[p.delight_id].push(p);
    });

    const perf: ButlerPerf[] = (butlers || []).map((b: any) => {
      const bName = b.name;

      // Tasks — match by butler_id or name in notes
      const bTasks = tasks.filter((t: any) => {
        if (t.butler_id === b.id) return true;
        const m = t.notes?.match(/Butler: ([^·]+)/);
        return m && m[1].trim() === bName;
      }).filter((t: any) => !['Check-In','Check-Out','Booking','Non Booking'].includes(t.type));

      const done = bTasks.filter((t: any) => t.status === 'completed');
      // Response time: minutes from created_at to completed_at
      const responseTimes = done.filter((t: any) => t.completed_at).map((t: any) => {
        return (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 60000;
      });
      const avgMins = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
        : 0;

      // On-time: completed before due_time on same day
      const onTime = done.filter((t: any) => {
        if (!t.due_time || !t.completed_at) return false;
        const dueH = parseInt(t.due_time.slice(0,2));
        const dueM = parseInt(t.due_time.slice(3,5));
        const comp = new Date(t.completed_at);
        return comp.getHours() < dueH || (comp.getHours() === dueH && comp.getMinutes() <= dueM);
      });

      // Delights
      const bDelights = delights.filter((d: any) => d.your_name === bName);
      let photosUp = 0, photosApp = 0, photosDec = 0;
      bDelights.forEach((d: any) => {
        const ps = photosByDelight[d.id] || [];
        photosUp += ps.length;
        photosApp += ps.filter((p: any) => p.photo_status === 'approved').length;
        photosDec += ps.filter((p: any) => p.photo_status === 'declined').length;
      });

      // Attendance
      const bAtt = att.filter((a: any) => a.butler_id === b.id);
      const present = bAtt.filter((a: any) => a.status === 'present').length;
      const absent  = bAtt.filter((a: any) => a.status === 'absent').length;
      const half    = bAtt.filter((a: any) => a.status === 'half_day').length;

      // Allocation
      const bAlloc = alloc.filter((t: any) => {
        if (t.butler_id === b.id) return true;
        const m = t.notes?.match(/Butler: ([^·]+)/);
        return m && m[1].trim() === bName;
      });
      const daysAllocated = bAlloc.length;
      const checkIns  = bAlloc.filter((t: any) => t.type === 'Check-In').length;
      const checkOuts = bAlloc.filter((t: any) => t.type === 'Check-Out').length;
      const bookings  = bAlloc.filter((t: any) => t.type === 'Booking').length;
      const nonBook   = bAlloc.filter((t: any) => t.type === 'Non Booking').length;

      // Cases
      const bCases = cases.filter((c: any) => c.reporter_id === b.id);

      return {
        id: b.id, name: bName, squad: b.squad,
        tasksTotal: bTasks.length, tasksDone: done.length, tasksDoneOnTime: onTime.length,
        avgCompletionMinutes: avgMins,
        delightsTotal: bDelights.length, delightsDone: bDelights.filter((d: any) => d.status === 'completed').length,
        photosUploaded: photosUp, photosApproved: photosApp, photosDeclined: photosDec,
        daysPresent: present, daysAbsent: absent, daysHalf: half, daysAllocated,
        checkIns, checkOuts, bookings, nonBooking: nonBook,
        casesReported: bCases.length, casesCritical: bCases.filter((c: any) => c.severity === 'critical').length,
      };
    });

    setData(perf);
    setLoading(false);
  }

  function calcScore(b: ButlerPerf) {
    let s = 0, w = 0;
    if (b.tasksTotal > 0) { s += (b.tasksDone / b.tasksTotal) * 35; w += 35; }
    if (b.delightsTotal > 0) { s += (b.photosApproved / Math.max(b.photosUploaded,1)) * 25; w += 25; }
    if (b.daysAllocated > 0) { s += (b.daysPresent / b.daysAllocated) * 25; w += 25; }
    if (b.tasksTotal > 0) { s += (b.tasksDoneOnTime / Math.max(b.tasksDone,1)) * 15; w += 15; }
    return w > 0 ? Math.round((s / w) * 100) : 0;
  }

  function exportCSV() {
    const headers = ['Butler','Squad','Score%','Tasks Total','Tasks Done','Completion%','Avg Response(mins)','On-Time%','Delights','Photos Uploaded','Photos Approved','Photos Declined','Approval%','Days Present','Days Absent','Half Days','Days Allocated','Check-Ins','Check-Outs','Bookings','Non-Booking','Cases Reported','Critical Cases'];
    const rows = data.map(b => {
      const score = calcScore(b);
      return [
        b.name, b.squad, score,
        b.tasksTotal, b.tasksDone,
        b.tasksTotal > 0 ? Math.round(b.tasksDone/b.tasksTotal*100) : 0,
        b.avgCompletionMinutes,
        b.tasksDone > 0 ? Math.round(b.tasksDoneOnTime/b.tasksDone*100) : 0,
        b.delightsTotal, b.photosUploaded, b.photosApproved, b.photosDeclined,
        b.photosUploaded > 0 ? Math.round(b.photosApproved/b.photosUploaded*100) : 0,
        b.daysPresent, b.daysAbsent, b.daysHalf, b.daysAllocated,
        b.checkIns, b.checkOuts, b.bookings, b.nonBooking,
        b.casesReported, b.casesCritical,
      ];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `butler_performance_${MONTHS[month]}_${year}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  const sel = (k: string) => ({ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', outline: 'none' });

  return (
    <>
      <Topbar title="Butler performance" subtitle={`${MONTHS[month]} ${year} · Quality, attendance & task metrics`}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={sel('m')}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} style={sel('y')}>
              {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={squad} onChange={e => setSquad(e.target.value)} style={sel('s')}>
              {['All','Lonavala','Karjat','Nashik','Alibaug'].map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={exportCSV}>⬇ CSV</button>
          </div>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading performance data…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.map(b => {
              const score = calcScore(b);
              const taskPct  = b.tasksTotal > 0 ? Math.round(b.tasksDone / b.tasksTotal * 100) : 0;
              const photoPct = b.photosUploaded > 0 ? Math.round(b.photosApproved / b.photosUploaded * 100) : 0;
              const attPct   = b.daysAllocated > 0 ? Math.round(b.daysPresent / b.daysAllocated * 100) : 0;
              const onTimePct = b.tasksDone > 0 ? Math.round(b.tasksDoneOnTime / b.tasksDone * 100) : 0;
              const isOpen = selected?.id === b.id;

              return (
                <div key={b.id} className="sv-card" style={{ cursor: 'pointer' }} onClick={() => setSelected(isOpen ? null : b)}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: isOpen ? 16 : 0 }}>
                    <div className="sv-avatar" style={{ width: 38, height: 38, fontSize: 14, flexShrink: 0 }}>{b.name.slice(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{b.squad}</div>
                    </div>
                    <ScoreBadge score={score} />
                    <div style={{ fontSize: 18, color: 'var(--muted-fg)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>⌄</div>
                  </div>

                  {/* Collapsed mini bars */}
                  {!isOpen && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12 }}>
                      {[
                        { label: 'Tasks', val: taskPct, color: '#9CCCFC' },
                        { label: 'Photo quality', val: photoPct, color: '#97C459' },
                        { label: 'Attendance', val: attPct, color: '#FED5A9' },
                        { label: 'On-time', val: onTimePct, color: '#E9A0A7' },
                      ].map(m => (
                        <div key={m.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{m.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sv-dark)' }}>{m.val}%</span>
                          </div>
                          <MiniBar val={m.val} max={100} color={m.color} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>

                        {/* Tasks block */}
                        <div style={{ background: 'rgba(156,204,252,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#0C447C', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>✓ Tasks</div>
                          {[
                            ['Assigned', b.tasksTotal],
                            ['Completed', `${b.tasksDone} (${taskPct}%)`],
                            ['On-time', `${b.tasksDoneOnTime} (${onTimePct}%)`],
                            ['Avg response', b.avgCompletionMinutes > 0 ? `${b.avgCompletionMinutes < 60 ? b.avgCompletionMinutes+'m' : Math.round(b.avgCompletionMinutes/60)+'h'}` : '—'],
                          ].map(([k,v]) => (
                            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{k}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sv-dark)' }}>{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Photo quality block */}
                        <div style={{ background: 'rgba(151,196,89,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#2D5A0E', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>🎁 Photo quality</div>
                          {[
                            ['Delights logged', b.delightsTotal],
                            ['Delights completed', b.delightsDone],
                            ['Photos uploaded', b.photosUploaded],
                            ['Approved', `${b.photosApproved} (${photoPct}%)`],
                            ['Declined / Redo', b.photosDeclined],
                          ].map(([k,v]) => (
                            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{k}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sv-dark)' }}>{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Attendance block */}
                        <div style={{ background: 'rgba(254,213,169,0.12)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#7A4A08', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>📅 Attendance</div>
                          {[
                            ['Present', b.daysPresent],
                            ['Absent', b.daysAbsent],
                            ['Half day', b.daysHalf],
                            ['Attendance %', `${attPct}%`],
                          ].map(([k,v]) => (
                            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{k}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sv-dark)' }}>{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Allocation block */}
                        <div style={{ background: 'rgba(196,181,253,0.1)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>📋 Allocation</div>
                          {[
                            ['Check-Ins', b.checkIns],
                            ['Check-Outs', b.checkOuts],
                            ['Bookings', b.bookings],
                            ['Non-Booking', b.nonBooking],
                            ['Total allocated days', b.daysAllocated],
                          ].map(([k,v]) => (
                            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{k}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sv-dark)' }}>{v}</span>
                            </div>
                          ))}
                        </div>

                      </div>

                      {/* Cases row */}
                      {b.casesReported > 0 && (
                        <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(233,160,167,0.1)', borderRadius: 8, display: 'flex', gap: 20 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>🆘 Cases reported: <strong>{b.casesReported}</strong></span>
                          {b.casesCritical > 0 && <span style={{ fontSize: 11, color: '#8B2020', fontWeight: 600 }}>⚠ {b.casesCritical} critical</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
