'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RosterPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/attendance'); }, []);
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Redirecting to Attendance…</div>;
}
