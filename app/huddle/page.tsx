'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchHuddles, fetchProfiles, type Huddle, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function HuddlePage() {
  const [huddles, setHuddles] = useState<Huddle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchHuddles(), fetchProfiles()]).then(([h, p]) => { setHuddles(h); setProfiles(p); setLoading(false); });
  }, []);

  const upcoming = huddles.filter(h => h.status === 'scheduled' || h.status === 'tbc');
  const completed = huddles.filter(h => h.status === 'completed');

  return (
    <>
      <Topbar title="Butler huddles" subtitle="Fortnightly team meetings"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Schedule huddle</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total huddles', value: huddles.length, cls: 'blue' },
            { label: 'Upcoming', value: upcoming.length, cls: 'green' },
            { label: 'Completed', value: completed.length, cls: 'peach' },
            { label: 'Butlers', value: profiles.length, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Upcoming huddles</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              upcoming.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No upcoming huddles. Schedule one above.</div> :
              upcoming.map(h => {
                const d = new Date(h.huddle_date);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                    <div className="huddle-date">
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{h.time} · {h.participants_expected} expected</div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span>
                        <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '3px 8px' }}>Mark attendance</button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>All butlers</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              profiles.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers in system yet.</div> :
              profiles.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div className="sv-avatar">{p.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Huddle history</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            huddles.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No huddles recorded yet.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead><tr><th>Huddle</th><th>Date</th><th>Time</th><th>Expected</th><th>Status</th></tr></thead>
                <tbody>
                  {huddles.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.team}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{new Date(h.huddle_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{h.time ?? '—'}</td>
                      <td>{h.participants_expected}</td>
                      <td><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></td>
                    </tr>
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
