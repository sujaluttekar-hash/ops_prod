'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      const { data: { user } } = await sb.auth.getUser();
      let profile = null;
      if (session?.user?.id) {
        const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        profile = data;
      }
      setInfo({
        session_uid: session?.user?.id,
        session_email: session?.user?.email,
        getUser_uid: user?.id,
        getUser_email: user?.email,
        profile: profile,
        sv_uid_storage: typeof window !== 'undefined' ? sessionStorage.getItem('sv_uid') : null,
      });
    }
    load();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}>
      <h2 style={{ marginBottom: 20, fontFamily: 'sans-serif' }}>Session debug</h2>
      <pre style={{ background: '#f5f5f5', padding: 20, borderRadius: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {info ? JSON.stringify(info, null, 2) : 'Loading...'}
      </pre>
    </div>
  );
}
