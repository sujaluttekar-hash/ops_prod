'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { PROPERTIES } from '@/lib/properties-data';
import { getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Property = { id: string; name: string; squad: string; address: string; lat: number; lng: number; kms: number; };
type TaskPin = { id: string; type: string; status: string; butler: string; villa: string; due_time: string | null; lat: number; lng: number; };

const SQUAD_COLORS = {
  Lonavala: '#9CCCFC',
  Karjat: '#97C459',
};

const SQUAD_CENTER: Record<string, [number, number]> = {
  Lonavala: [18.754, 73.405],
  Karjat: [18.920, 73.350],
};

export default function MapPage() {
  const { user } = useAuth();
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selected, setSelected] = useState<Property | null>(null);
  const [squadFilter, setSquadFilter] = useState<'All' | 'Lonavala' | 'Karjat'>('All');
  const [search, setSearch] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [listView, setListView] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [taskPins, setTaskPins] = useState<TaskPin[]>([]);
  const taskMarkersRef = useRef<any[]>([]);
  const [showButlers, setShowButlers] = useState(true);
  const [butlerLocations, setButlerLocations] = useState<any[]>([]);
  const butlerMarkersRef = useRef<any[]>([]);
  const [showLonavala, setShowLonavala] = useState(true);
  const [showKarjat, setShowKarjat] = useState(true);

  // Load live butler locations — poll every 30s
  useEffect(() => {
    function fetchLocations() {
      fetch('/api/location', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setButlerLocations(data); })
        .catch(() => {});
    }
    fetchLocations();
    const t = setInterval(fetchLocations, 30000);
    return () => clearInterval(t);
  }, []);

  // Load active tasks — use geo_lat/geo_lng if available, else match villa name
  useEffect(() => {
    fetch('/api/tasks?all=1', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const pins: TaskPin[] = [];
        data.filter(t => t.status === 'pending' || t.status === 'completed').forEach((t: any) => {
          // Use actual GPS location if task was completed with GPS
          if (t.geo_lat && t.geo_lng) {
            const villaMatch = t.notes?.match(/Villa: ([^·]+)/);
            pins.push({
              id: t.id, type: t.type, status: t.status,
              butler: t.butler_name || t.notes?.match(/Butler: ([^·]+)/)?.[1]?.trim() || 'Butler',
              villa: villaMatch?.[1]?.trim() || '—',
              due_time: t.due_time,
              lat: t.geo_lat, lng: t.geo_lng,
            });
            return;
          }
          // Fallback: match villa name from notes to property coordinates
          const villaMatch = t.notes?.match(/Villa: ([^·]+)/);
          if (!villaMatch) return;
          const villaName = villaMatch[1].trim();
          const prop = PROPERTIES.find((p: any) => p.name.toLowerCase() === villaName.toLowerCase() || p.name.toLowerCase().includes(villaName.toLowerCase()));
          if (!prop) return;
          const butlerMatch = t.notes?.match(/Butler: ([^·]+)/);
          pins.push({
            id: t.id, type: t.type, status: t.status,
            butler: butlerMatch?.[1]?.trim() || 'Butler',
            villa: villaName,
            due_time: t.due_time,
            lat: prop.lat, lng: prop.lng,
          });
        });
        setTaskPins(pins);
      }).catch(() => {});
  }, []);

  const filtered = PROPERTIES.filter(p => {
    const matchSquad = squadFilter === 'All' || p.squad === squadFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase());
    return matchSquad && matchSearch;
  });

  // Load Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([18.82, 73.39], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [mapLoaded]);

  // Update markers when filter/search changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Apply squad visibility filter
    const visibleVillas = filtered.filter(p => {
      if (p.squad === 'Lonavala' && !showLonavala) return false;
      if (p.squad === 'Karjat' && !showKarjat) return false;
      return true;
    });
    visibleVillas.forEach(p => {
      const color = SQUAD_COLORS[p.squad as keyof typeof SQUAD_COLORS] || '#E9A0A7';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:${color};
          border:2.5px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:700;color:#1B1D1F;
          cursor:pointer;transition:transform 0.15s;
        ">SV</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([p.lat, p.lng], { icon })
        .addTo(map)
        .on('click', () => setSelected(p));

      // Tooltip on hover
      marker.bindTooltip(`<b>${p.name}</b><br>${p.squad} · ${p.kms} km`, {
        direction: 'top', offset: [0, -12],
        className: 'sv-map-tooltip',
      });

      markersRef.current.push(marker);
    });
  }, [filtered, showLonavala, showKarjat, mapLoaded]);

  // Render task pins as activity markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    taskMarkersRef.current.forEach(m => map.removeLayer(m));
    taskMarkersRef.current = [];
    if (!showTasks) return;
    taskPins.forEach(t => {
      const isPending = t.status === 'pending';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:22px;height:22px;border-radius:4px;
          background:${isPending ? '#FED5A9' : '#97C459'};
          border:2px solid ${isPending ? '#7A4A08' : '#2D5A0E'};
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;cursor:pointer;
        ">${isPending ? '⏳' : '✅'}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const m = L.marker([t.lat, t.lng], { icon, zIndexOffset: 500 })
        .addTo(map)
        .bindTooltip(`<b>${t.type}</b><br>👤 ${t.butler}<br>🏡 ${t.villa}${t.due_time ? '<br>⏰ ' + t.due_time : ''}<br><span style="color:${isPending ? '#7A4A08' : '#2D5A0E'}">${isPending ? 'Pending' : 'Completed'}</span>`, {
          direction: 'top', offset: [0, -10], className: 'sv-map-tooltip',
        });
      taskMarkersRef.current.push(m);
    });
  }, [taskPins, showTasks, mapLoaded]);

  // Render live butler pins
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    butlerMarkersRef.current.forEach(m => map.removeLayer(m));
    butlerMarkersRef.current = [];
    if (!showButlers) return;

    // Live = updated within last 2 minutes. Offline = anything older → red pin
    const liveThreshold = Date.now() - 2 * 60 * 1000; // 2 minutes

    butlerLocations.forEach(b => {
      const updatedMs = new Date(b.updated_at).getTime();
      const isLive = updatedMs > liveThreshold;
      const minutesAgo = Math.floor((Date.now() - updatedMs) / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);
      const timeLabel = minutesAgo < 1
        ? 'just now'
        : minutesAgo < 60
          ? `${minutesAgo}m ago`
          : `${hoursAgo}h ago`;

      const initials = (b.butler_name || '??').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();

      // Green border + dot = live. Red border + no dot = offline
      const borderColor = isLive ? '#97C459' : '#E9A0A7';
      const bgColor = isLive ? '#1B1D1F' : '#8B2020';
      const dotColor = isLive ? '#97C459' : '#E55353';

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:38px;height:38px;">
          <div style="
            width:38px;height:38px;border-radius:50%;
            background:${bgColor};
            border:3px solid ${borderColor};
            box-shadow:0 3px 12px rgba(0,0,0,0.4);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:700;color:#fff;cursor:pointer;
          ">${initials}</div>
          <div style="
            position:absolute;bottom:0;right:0;
            width:11px;height:11px;border-radius:50%;
            background:${dotColor};border:2px solid #fff;
          "></div>
        </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const statusText = isLive
        ? `<span style="color:#97C459">🟢 Live · ${timeLabel}</span>`
        : `<span style="color:#E9A0A7">🔴 Offline · last seen ${timeLabel}</span>`;

      const m = L.marker([b.lat, b.lng], { icon, zIndexOffset: 1000 })
        .addTo(map)
        .bindTooltip(`<b>👤 ${b.butler_name}</b><br>${b.squad || '—'}<br>${statusText}`, {
          direction: 'top', offset: [0, -16], className: 'sv-map-tooltip', permanent: false,
        });

      butlerMarkersRef.current.push(m);
    });
  }, [butlerLocations, showButlers, mapLoaded]);

  function flyTo(p: Property) {
    setSelected(p);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([p.lat, p.lng], 15, { duration: 1 });
    }
  }

  function focusSquad(squad: string) {
    setSquadFilter(squad as any);
    if (mapInstanceRef.current && SQUAD_CENTER[squad]) {
      mapInstanceRef.current.flyTo(SQUAD_CENTER[squad], 11, { duration: 1 });
    }
  }

  const lonavalaCount = PROPERTIES.filter(p => p.squad === 'Lonavala').length;
  const karjatCount = PROPERTIES.filter(p => p.squad === 'Karjat').length;

  return (
    <>
      <style>{`
        .sv-map-tooltip { background: #1B1D1F; color: #fff; border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .sv-map-tooltip::before { border-top-color: #1B1D1F !important; }
        .leaflet-control-attribution { display: none; }
        @media (max-width: 768px) {
          .map-layout { flex-direction: column !important; height: auto !important; min-height: unset !important; }
          .map-sidebar { width: 100% !important; height: 200px !important; border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; overflow-y: auto !important; }
          .map-container { height: 52vh !important; min-height: 300px !important; }
          .map-legend { display: none !important; }
        }
      `}</style>

      <Topbar
        title="Property Map"
        subtitle={(() => {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('sv_local_session') : null;
          const lu = stored ? JSON.parse(stored) : null;
          const base = `${filtered.length} of ${PROPERTIES.length} villas · ${taskPins.filter(t => t.status === 'pending').length} tasks`;
          return lu?.role === 'butler' ? base : base + ` · ${butlerLocations.length} butlers live`;
        })()}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>

            <button className="sv-btn" style={{ fontSize: 11, padding: '5px 10px', background: listView ? '#1B1D1F' : undefined, color: listView ? '#fff' : undefined }} onClick={() => setListView(v => !v)}>
              {listView ? '🗺 Map' : '☰ List'}
            </button>
          </div>
        }
      />

      <div style={{ padding: '16px 24px 8px' }} className="page-enter">
        <div className="sv-strip" />

        {/* Squad summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'All Properties', count: PROPERTIES.length, squad: 'All', color: '#E9A0A7', bg: 'rgba(233,160,167,0.1)' },
            { label: 'Lonavala', count: lonavalaCount, squad: 'Lonavala', color: '#0C447C', bg: 'rgba(156,204,252,0.12)' },
            { label: 'Karjat', count: karjatCount, squad: 'Karjat', color: '#2D5A0E', bg: 'rgba(151,196,89,0.12)' },
          ].map(s => (
            <div key={s.squad}
              onClick={() => focusSquad(s.squad)}
              className="sv-card"
              style={{ cursor: 'pointer', background: squadFilter === s.squad ? s.bg : undefined, borderColor: squadFilter === s.squad ? s.color : undefined, transition: 'all 0.15s', padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 2 }}>villas</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search villa name or address…"
          className="sv-input"
          style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
        />

        {/* Map + Sidebar layout */}
        {!listView ? (
          <div className="map-layout" style={{ display: 'flex', height: '68vh', minHeight: 440, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {/* Sidebar */}
            <div className="map-sidebar" style={{ width: 260, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 11, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {filtered.length} properties
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.map(p => (
                  <div key={p.id}
                    onClick={() => flyTo(p)}
                    style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.04)', cursor: 'pointer', background: selected?.id === p.id ? 'rgba(156,204,252,0.1)' : 'transparent', transition: 'background 0.1s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: SQUAD_COLORS[p.squad as keyof typeof SQUAD_COLORS] || '#E9A0A7' }} />
                      <div style={{ fontSize: 12, fontWeight: selected?.id === p.id ? 700 : 500, lineHeight: 1.3, flex: 1 }}>{p.name}</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 3, paddingLeft: 15 }}>{p.squad} · {p.kms} km</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <div ref={mapRef} className="map-container" style={{ width: '100%', height: '100%' }} />
              {!mapLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f3', fontSize: 13, color: 'var(--muted-fg)' }}>
                  Loading map…
                </div>
              )}

              {/* Map legend — interactive checkboxes */}
              <div className="map-legend" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 16px rgba(0,0,0,0.14)', fontSize: 12, minWidth: 170 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted-fg)' }}>Layers</div>
                {[
                  { dot: '#9CCCFC', label: 'Lonavala villas', checked: showLonavala, toggle: () => setShowLonavala(v => !v) },
                  { dot: '#97C459', label: 'Karjat villas', checked: showKarjat, toggle: () => setShowKarjat(v => !v) },
                  { dot: '#FED5A9', label: 'Pending tasks', square: true, checked: showTasks, toggle: () => setShowTasks(v => !v) },
                  { dot: '#1B1D1F', label: `Butlers (${butlerLocations.length}) 🟢live 🔴offline`, circle: true, checked: showButlers, toggle: () => setShowButlers(v => !v) },
                ].map(l => (
                  <div key={l.label} onClick={l.toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${l.checked ? l.dot : 'rgba(0,0,0,0.2)'}`, background: l.checked ? l.dot : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                      {l.checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 9, height: 9, borderRadius: (l as any).square ? 2 : '50%', background: l.dot, border: (l as any).circle ? '2px solid #97C459' : '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                      <span style={{ color: l.checked ? '#1B1D1F' : '#aaa', fontWeight: l.checked ? 500 : 400, transition: 'color 0.15s' }}>{l.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected property panel */}
              {selected && (
                <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 1000, maxWidth: 400 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span className={`badge ${selected.squad === 'Lonavala' ? 'badge-blue' : 'badge-green'}`}>{selected.squad}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{selected.kms} km from hub</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>ID: {selected.id}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted-fg)', padding: '0 4px' }}>✕</button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', lineHeight: 1.5, marginBottom: 10 }}>{selected.address}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="sv-btn sv-btn-primary" style={{ width: '100%', fontSize: 11, justifyContent: 'center' }}>📍 Open in Google Maps</button>
                    </a>
                    <a href={`https://www.stayvista.com/villa/${selected.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <button className="sv-btn" style={{ fontSize: 11 }}>🏠 StayVista</button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="sv-card" style={{ padding: 0 }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Squad</th>
                  <th>Dist.</th>
                  <th>Address</th>
                  <th>Maps</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => { setListView(false); setTimeout(() => flyTo(p), 100); }} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>ID: {p.id}</div>
                    </td>
                    <td>
                      <span className={`badge ${p.squad === 'Lonavala' ? 'badge-blue' : 'badge-green'}`}>{p.squad}</span>
                    </td>
                    <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{p.kms} km</td>
                    <td style={{ color: 'var(--muted-fg)', fontSize: 11, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</td>
                    <td>
                      <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                        <button className="sv-btn" style={{ fontSize: 10, padding: '3px 8px' }}>📍</button>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
