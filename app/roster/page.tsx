'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getSupabase, getServiceSupabase, fetchProfiles, type Profile } from '@/lib/supabase';
import { getShiftClass } from '@/lib/utils';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];

type RosterRow = { id: string; butler_id: string; week_start: string; mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string; profiles?: Profile; };

export default function RosterPage() {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await getServiceSupabase().from('rosters').select('*, profiles(*)').order('week_start', { ascending: false });
      setRoster(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Topbar title="Roster management" subtitle="Weekly shift schedule"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sv-btn" style={{ fontSize: 12 }}>⬆ Upload CSV</button>
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Add shift</button>
          </div>
        } />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Weekly roster</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            roster.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)', fontSize: 13 }}>
                No roster data yet. Upload a CSV or add shifts manually.
              </div>
            ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Butler</th>
                    {DAYS.map(d => <th key={d} style={{ textAlign: 'center' }}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {roster.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="sv-avatar">{(r.profiles?.name ?? '??').slice(0,2).toUpperCase()}</div>
                          <span style={{ fontWeight: 500 }}>{r.profiles?.name ?? r.butler_id}</span>
                        </div>
                      </td>
                      {DAY_KEYS.map(day => (
                        <td key={day} style={{ textAlign: 'center' }}>
                          <span className={`badge ${getShiftClass((r as any)[day])}`}>{(r as any)[day]}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, fontSize: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-m">M</span> Morning 6am–2pm</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-e">E</span> Evening 2pm–10pm</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-n">N</span> Night 10pm–6am</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-off">Off</span> Weekly off</span>
          </div>
        </div>
      </div>
    </>
  );
}
