'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

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

export default function AllocationPage() {
  const { user } = useAuth();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [squad, setSquad] = useState<string>('All');
  const [allocations, setAllocations] = useState<ButlerAllocation[]>([]);
  const [expandedButler, setExpandedButler] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllocations();
  }, [date, squad]);

  const loadAllocations = async () => {
    setLoading(true);
    try {
      let q = getSupabase()
        .from('profiles')
        .select('*')
        .eq('role', 'butler');

      if (squad !== 'All') {
        q = q.eq('squad', squad);
      }

      const { data: butlers } = await q;

      if (!butlers) {
        setAllocations([]);
        setLoading(false);
        return;
      }

      const { data: tasks } = await getSupabase()
        .from('tasks')
        .select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      const { data: delights } = await getSupabase()
        .from('guest_delights')
        .select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      const allocMap: Record<string, ButlerAllocation> = {};

      butlers.forEach(butler => {
        const butlerTasks = tasks?.filter(t => t.butler_id === butler.id) || [];
        const butlerDelights = delights?.filter(d => d.butler_id === butler.id) || [];

        const breakdown: Record<string, number> = {
          'Arrival selfie': 0,
          'Guest welcome': 0,
          'Table layout': 0,
          'Exit selfie': 0,
        };

        butlerTasks.forEach(t => {
          if (t.type in breakdown) breakdown[t.type]++;
        });

        const completed = butlerTasks.filter(t => t.status === 'completed').length;
        const delayed = butlerTasks.filter(t => t.status === 'delayed').length;

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
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const taskEmojis: Record<string, string> = {
    'Arrival selfie': '📱',
    'Guest welcome': '🙏',
    'Table layout': '🍽',
    'Exit selfie': '👋',
  };

  if (user?.role === 'butler') {
    return (
      <Topbar title="Allocation" subtitle="You don't have access to this page" actions={null} />
    );
  }

  return (
    <>
      <Topbar
        title="Daily Allocation"
        subtitle="Track what butlers are doing today"
        actions={null}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 4 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="sv-select" style={{ width: 140 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 4 }}>Squad</label>
            <select value={squad} onChange={e => setSquad(e.target.value)} className="sv-select" style={{ width: 140 }}>
              <option>All</option>
              <option>Lonavala</option>
              <option>Alibaug</option>
              <option>Karjat</option>
              <option>Nashik</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{allocations.length}</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>On track</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{allocations.filter(a => a.status === 'on_track').length}</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Delayed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{allocations.filter(a => a.status === 'delayed').length}</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks assigned</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{allocations.reduce((a, b) => a + b.totalTasks, 0)}</div>
          </div>
        </div>

        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler allocation — {date}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table" style={{ width: '100%', minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Butler</th>
                  <th style={{ textAlign: 'left' }}>Squad</th>
                  <th style={{ textAlign: 'left' }}>Progress</th>
                  <th style={{ textAlign: 'left' }}>Tasks</th>
                  <th style={{ textAlign: 'left' }}>Delights</th>
                  <th style={{ textAlign: 'left' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(alloc => (
                  <tr key={alloc.id} onClick={() => setExpandedButler(expandedButler === alloc.id ? null : alloc.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{alloc.name}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{alloc.squad}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-track" style={{ width: 80 }}>
                          <div className="progress-fill fill-blue" style={{ width: `${alloc.totalTasks > 0 ? (alloc.completedTasks / alloc.totalTasks) * 100 : 0}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{alloc.completedTasks}/{alloc.totalTasks}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {Object.entries(alloc.taskBreakdown).map(([type, count]) => (
                          count > 0 && <span key={type} title={type} style={{ fontSize: 16, opacity: 1 }}>{taskEmojis[type]}</span>
                        ))}
                      </div>
                    </td>
                    <td>{alloc.delightCount}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                        background: alloc.status === 'delayed' ? 'rgba(233,160,167,0.15)' : alloc.status === 'on_track' ? 'rgba(151,196,89,0.15)' : 'rgba(156,204,252,0.12)',
                        color: alloc.status === 'delayed' ? '#E9A0A7' : alloc.status === 'on_track' ? '#97C459' : '#9CCCFC'
                      }}>
                        {alloc.status === 'delayed' ? '⚠ Delayed' : alloc.status === 'on_track' ? '✓ On track' : '— Unassigned'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}>
                        {expandedButler === alloc.id ? '▼' : '▶'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allocations.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted-fg)' }}>
              No butlers found for the selected filters
            </div>
          )}
        </div>
      </div>
    </>
  );
}
