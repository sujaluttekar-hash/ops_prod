'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { PROPERTIES } from '@/lib/properties-data';
import { useAuth } from '@/lib/auth-context';

type Property = { id: string; name: string; squad: string; address: string; lat: number; lng: number; kms: number; };

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

    filtered.forEach(p => {
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
  }, [filtered, mapLoaded]);

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
          .map-layout { flex-direction: column !important; }
          .map-sidebar { width: 100% !important; height: 260px !important; border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; }
          .map-container { height: 55vh !important; }
        }
      `}</style>

      <Topbar
        title="Property Map"
        subtitle={`${filtered.length} of ${PROPERTIES.length} properties`}
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
