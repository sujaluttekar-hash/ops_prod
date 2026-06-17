'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [huddle, setHuddle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [participantCount, setParticipantCount] = useState(1);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    // Must run client-side only
    const stored = localStorage.getItem('sv_local_session');
    if (stored) {
      try { setDisplayName(JSON.parse(stored).name || ''); } catch {}
    }
    loadHuddle();
  }, []);

  async function loadHuddle() {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { data, error } = await getServiceSupabase()
      .from('huddles').select('id,team,huddle_date,time,notes,status').eq('id', id).single();
    if (error) setError('Could not load huddle');
    setHuddle(data);
    setLoading(false);
  }

  function getRoomName(id: string) {
    return `stayvista-huddle-${id.replace(/-/g, '').slice(0, 16)}`;
  }

  function joinCall() {
    if (!huddle) return;
    setJoining(true);
    setJoined(true); // show container div first so it mounts in DOM
  }

  // Load Jitsi AFTER the container is in the DOM
  useEffect(() => {
    if (!joined || !huddle) return;

    function initJitsi() {
      if (!containerRef.current) {
        setTimeout(initJitsi, 100); // wait for DOM
        return;
      }

      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      if (!JitsiMeetExternalAPI) {
        setTimeout(initJitsi, 200);
        return;
      }

      try {
        const api = new JitsiMeetExternalAPI('meet.jit.si', {
          roomName: getRoomName(huddle.id),
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: { displayName: displayName || 'Butler' },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            toolbarButtons: ['microphone','camera','chat','raisehand','tileview','participants-pane','hangup'],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#141618',
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
          },
        });

        apiRef.current = api;
        setJoining(false);

        api.addListener('videoConferenceJoined', () => setParticipantCount(api.getNumberOfParticipants()));
        api.addListener('participantJoined', () => setParticipantCount(api.getNumberOfParticipants()));
        api.addListener('participantLeft', () => setParticipantCount(api.getNumberOfParticipants()));
        api.addListener('readyToClose', leaveCall);
      } catch (e: any) {
        setError('Could not start video: ' + e.message);
        setJoining(false);
        setJoined(false);
      }
    }

    // Load external Jitsi script
    if ((window as any).JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const s = document.createElement('script');
      s.src = 'https://meet.jit.si/external_api.js';
      s.async = true;
      s.onload = initJitsi;
      s.onerror = () => { setError('Could not load Jitsi. Check internet connection.'); setJoined(false); setJoining(false); };
      document.head.appendChild(s);
    }

    return () => {
      if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; }
    };
  }, [joined, huddle]);

  function leaveCall() {
    if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; }
    router.push('/huddle');
  }

  if (loading) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141618' }}>
      <div style={{ color: '#9CCCFC', fontSize: 14 }}>Loading…</div>
    </div>
  );

  if (!huddle || error) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141618' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
        <div style={{ color: '#fff', fontSize: 14, marginBottom: 16 }}>{error || 'Huddle not found'}</div>
        <button onClick={() => router.push('/huddle')} style={{ padding: '8px 20px', borderRadius: 8, background: '#9CCCFC', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Back to huddles</button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#141618', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1C2026', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(156,204,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💬</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{huddle.team}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {huddle.huddle_date ? new Date(huddle.huddle_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
              {huddle.time ? ` · ${huddle.time.slice(0,5)}` : ''}
              {joined && !joining && <span style={{ marginLeft: 8, color: '#97C459' }}>● {participantCount} in call</span>}
            </div>
          </div>
        </div>
        <button onClick={leaveCall} style={{ padding: '6px 14px', borderRadius: 8, background: '#E93C3C', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Leave
        </button>
      </div>

      {/* Pre-join */}
      {!joined && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(156,204,252,0.12)', border: '2px solid rgba(156,204,252,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px', color: '#9CCCFC' }}>
              {(displayName || 'B').slice(0,1).toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{huddle.team}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
              {huddle.huddle_date ? new Date(huddle.huddle_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              {huddle.time ? ` · ${huddle.time.slice(0,5)}` : ''}
            </div>

            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Your name in the call</div>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Your name" />
            </div>

            {huddle.notes && (
              <div style={{ background: 'rgba(156,204,252,0.07)', border: '1px solid rgba(156,204,252,0.12)', borderRadius: 10, padding: '12px 14px', marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9CCCFC', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Agenda</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{huddle.notes}</div>
              </div>
            )}

            <button onClick={joinCall} disabled={!displayName.trim()}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: displayName.trim() ? 'linear-gradient(135deg, #9CCCFC 0%, #0C447C 100%)' : 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: displayName.trim() ? 'pointer' : 'not-allowed', opacity: displayName.trim() ? 1 : 0.5 }}>
              📹 Join huddle call
            </button>
            <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Powered by Jitsi Meet · No download required</div>
          </div>
        </div>
      )}

      {/* Video — always rendered when joined so ref mounts */}
      <div ref={containerRef} style={{ flex: joined ? 1 : 0, width: '100%', display: joined ? 'block' : 'none', position: 'relative' }}>
        {joining && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141618', zIndex: 5 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📹</div>
              <div style={{ color: '#9CCCFC', fontSize: 14 }}>Connecting to call…</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>This may take a few seconds</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
