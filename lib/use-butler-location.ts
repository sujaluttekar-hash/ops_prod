'use client';
import { useEffect, useRef, useState } from 'react';

export type LocationStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported';

export function useButlerLocation(user: { id: string; name: string; squad?: string | null; role: string } | null) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedRef = useRef(false);

  async function saveLocation(lat: number, lng: number, accuracy: number, u: any) {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ butler_id: u.id, butler_name: u.name, squad: u.squad || null, lat, lng, accuracy }),
      });
    } catch {}
  }

  function startTracking(u: any) {
    if (!u || u.role !== 'butler') return; // NEVER track admins
    if (startedRef.current) return;
    if (!navigator?.geolocation) { setStatus('unsupported'); return; }
    startedRef.current = true;
    setStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('active');
        saveLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, u);
        // Keep updating every 30s
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => saveLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy, u),
            () => {},
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 20000 }
          );
        }, 30000);
      },
      (err) => {
        startedRef.current = false;
        setStatus(err.code === 1 ? 'denied' : 'idle');
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
    );
  }

  useEffect(() => {
    // ONLY run for butlers — read from localStorage directly for reliability
    try {
      const stored = localStorage.getItem('sv_local_session');
      if (!stored) return;
      const u = JSON.parse(stored);
      if (!u || u.role !== 'butler') return; // hard gate for admins
      const t = setTimeout(() => startTracking(u), 1500);
      return () => clearTimeout(t);
    } catch {}
  }, []);

  // Also trigger when auth prop is set (later)
  useEffect(() => {
    if (!user || user.role !== 'butler' || startedRef.current) return;
    startTracking(user);
  }, [user?.id, user?.role]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return { status };
}
