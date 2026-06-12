
// Get current GPS position as a promise
export function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });
}

// Save butler location to server
export async function saveButlerLocation(user: { id: string; name: string; squad?: string | null }) {
  const pos = await getCurrentPosition();
  if (!pos) return null;
  try {
    await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ butler_id: user.id, butler_name: user.name, squad: user.squad || null, ...pos }),
    });
  } catch {}
  return pos;
}
