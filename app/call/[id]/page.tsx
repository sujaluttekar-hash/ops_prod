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
  const [participantCount, setParticipantCount] = useState(0);
  const [displayName, setDisplayName] = useState('');

  // Get user from localStorage
  const localUser = (() => {
    try { return JSON.parse(localStorage.getItem('sv_local_session') || '{}'); } catch { return {}; }
  })();

  useEffect(() => {
    setDisplayName(localUser.name || 'Butler');
    loadHuddle();
  }, []);

  async function loadHuddle() {
    const { data } = await getServiceSupabase()
      .from('huddles')
      .select('id,team,huddle_date,time,notes,status')
      .eq('id', params.id)
      .single();
    setHuddle(data);
    setLoading(false);
  }

  function getRoomName(huddleId: string) {
    // Deterministic room name from huddle ID — same for everyone
    return `stayvista-huddle-${huddleId.slice(0, 12)}`;
  }

  function joinCall() {
    if (!containerRef.current || !huddle) return;
    setJoined(true);

    // Load Jitsi Meet API
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.onload = () => {
      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      const roomName = getRoomName(huddle.id);

      const api = new JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: displayName || localUser.name || 'Butler',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          toolbarButtons: [
            'microphone', 'camera', 'chat', 'raisehand',
            'tileview', 'participants-pane', 'hangup',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND: '#141618',
          TOOLBAR_ALWAYS_VISIBLE: false,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
        },
      });

      apiRef.current = api;

      api.addListener('participantJoined', () => {
        setParticipantCount(api.getNumberOfParticipants());
      });
      api.addListener('participantLeft', () => {
        setParticipantCount(api.getNumberOfParticipants());
      });
      api.addListener('videoConferenceJoined', () => {
        setParticipantCount(api.getNumberOfParticipants());
      });
      api.addListener('readyToClose', () => {
        leaveCall();
      });
    };
    document.head.appendChild(script);
  }

  function leaveCall() {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    router.push('/huddle');
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141618' }}>
      <div style={{ color: '#9CCCFC', fontSize: 14 }}>Loading huddle…</div>
    </div>
  );

  if (!huddle) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141618' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <div style={{ color: '#fff', fontSize: 14 }}>Huddle not found</div>
        <button onClick={() => router.push('/huddle')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#9CCCFC', border: 'none', cursor: 'pointer', fontSize: 13 }}>Back to huddles</button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#141618', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1C2026', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(156,204,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💬</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{huddle.team}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {huddle.huddle_date ? new Date(huddle.huddle_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
              {huddle.time ? ` · ${huddle.time.slice(0, 5)}` : ''}
              {joined && participantCount > 0 && <span style={{ marginLeft: 8, color: '#97C459' }}>● {participantCount} in call</span>}
            </div>
          </div>
        </div>
        <button onClick={leaveCall}
          style={{ padding: '6px 14px', borderRadius: 8, background: '#E93C3C', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Leave
        </button>
      </div>

      {/* Pre-join screen */}
      {!joined && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(156,204,252,0.15)', border: '2px solid rgba(156,204,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>
              {(displayName || 'B').slice(0, 1).toUpperCase()}
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{huddle.team}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
              {huddle.huddle_date ? new Date(huddle.huddle_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              {huddle.time ? ` · ${huddle.time.slice(0, 5)}` : ''}
            </div>

            {/* Name input */}
            <div style={{ marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Your name in the call</div>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Your name" />
            </div>

            {/* Notes preview */}
            {huddle.notes && (
              <div style={{ background: 'rgba(156,204,252,0.08)', border: '1px solid rgba(156,204,252,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9CCCFC', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Agenda</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{huddle.notes}</div>
              </div>
            )}

            {/* Join button */}
            <button onClick={joinCall}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #9CCCFC, #0C447C)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3 }}>
              📹 Join huddle call
            </button>

            <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              Powered by Jitsi Meet · No download required
            </div>
          </div>
        </div>
      )}

      {/* Video call container */}
      {joined && (
        <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
      )}
    </div>
  );
}
