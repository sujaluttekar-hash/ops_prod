'use client';
import { useEffect, useRef, useState } from 'react';

export type LocationStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported';

export function useButlerLocation(user: { id: string; name: string; squad?: string | null; role: string } | null) {
  // GUARD: if user is null or not a butler, return immediately — no geolocation calls
  const isButler = user?.role === 'butler';
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
    if (!u || u.role !== 'butler') return; // never track non-butlers
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
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        }, 30000);
      },
      (err) => {
        startedRef.current = false;
        setStatus(err.code === 1 ? 'denied' : 'idle');
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    );
  }

  useEffect(() => {
    // ONLY run for butlers — hard gate before any geolocation call
    try {
      const stored = localStorage.getItem('sv_local_session');
      if (!stored) return;
      const u = JSON.parse(stored);
      // Strict role check — never ask non-butlers for location
      if (!u || u.role !== 'butler') return;
      const t = setTimeout(() => startTracking(u), 1500);
      return () => clearTimeout(t);
    } catch {}
  }, []);

  // Also trigger when auth context resolves — but only for butlers
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'butler') return; // NEVER track admin/supervisor
    if (startedRef.current) return;
    startTracking(user);
  }, [user?.id, user?.role]);

  return { status };
}
