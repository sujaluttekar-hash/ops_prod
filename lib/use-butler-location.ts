'use client';
import { useEffect, useRef, useState } from 'react';

export type LocationStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

export function useButlerLocation(user: { id: string; name: string; squad?: string | null; role: string } | null) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchRef = useRef<number | null>(null);

  async function saveLocation(lat: number, lng: number, accuracy: number) {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          butler_id: user?.id,
          butler_name: user?.name,
          squad: user?.squad || null,
          lat, lng, accuracy,
        }),
      });
    } catch {}
  }

  function startTracking() {
    if (!navigator.geolocation) { setStatus('error'); return; }
    setStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('active');
        saveLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);

        // Update every 30 seconds
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => saveLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
            () => {},
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }, 30000);
      },
      (err) => {
        setStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    // Only track for butlers
    if (!user || user.role !== 'butler') return;
    startTracking();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchRef.current) navigator.geolocation?.clearWatch(watchRef.current);
    };
  }, [user?.id]);

  return { status, startTracking };
}
