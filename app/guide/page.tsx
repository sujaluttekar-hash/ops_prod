'use client';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

// ── Data ──────────────────────────────────────────────────────
const BUTLER_SECTIONS = [
  {
    id: 'login', icon: '🔐', title: 'Logging in',
    color: '#0C447C', bg: 'rgba(156,204,252,0.1)', border: '#9CCCFC',
    steps: [
      { n: '1', text: 'Open ops-prod.vercel.app on Safari (iPhone) or Chrome (Android)' },
      { n: '2', text: 'Enter your StayVista email — e.g. manoj@stayvista.com' },
      { n: '3', text: 'Enter your password — e.g. manoj@123' },
      { n: '4', text: 'Tap Sign in → you land on your personal dashboard' },
    ],
    tip: 'If you forget your password, ask your supervisor — they can see it in Credentials.',
  },
  {
    id: 'tasks', icon: '✓', title: 'Completing a task',
    color: '#2D5A0E', bg: 'rgba(151,196,89,0.1)', border: '#97C459',
    steps: [
      { n: '1', text: 'Tap ☰ (top right) → My Tasks' },
      { n: '2', text: 'Find your task — it shows villa name and due time' },
      { n: '3', text: 'Tap Complete task (black button)' },
      { n: '4', text: 'Tap 📷 Camera or Gallery to add a photo proof (optional but recommended)' },
      { n: '5', text: 'Hold 🎙 mic button to record a voice note (optional)' },
      { n: '6', text: 'Add any notes in the text box (optional)' },
      { n: '7', text: 'Tap ✓ Submit & complete — task saves instantly' },
    ],
    tip: 'GPS location is captured automatically in the background. You do not need to do anything for it.',
  },
  {
    id: 'delight', icon: '🎁', title: 'Guest delight',
    color: '#7A4A08', bg: 'rgba(254,213,169,0.15)', border: '#FED5A9',
    steps: [
      { n: '1', text: 'Tap ☰ → Guest Delight' },
      { n: '2', text: 'Tap + Log activity' },
      { n: '3', text: 'Fill in your name, squad, booking date, booking type' },
      { n: '4', text: 'Search and select the villa name from the dropdown' },
      { n: '5', text: 'Upload up to 5 photos using Camera or Gallery' },
      { n: '6', text: 'Tap Submit entry — done!' },
    ],
    tip: 'The villa name must be selected from the dropdown list — not typed manually.',
  },
  {
    id: 'attendance', icon: '📅', title: 'Marking attendance',
    color: '#2D5A0E', bg: 'rgba(151,196,89,0.08)', border: '#97C459',
    steps: [
      { n: '1', text: 'Tap ☰ → Attendance' },
      { n: '2', text: "Today's date is shown at the top" },
      { n: '3', text: 'Find your name in the list' },
      { n: '4', text: 'Tap P (Present), H (Half day), or A (Absent)' },
      { n: '5', text: 'Your GPS location is captured and shared with your supervisor' },
    ],
    tip: 'Mark attendance every morning. Your location pin will appear on the admin map once you mark Present.',
  },
  {
    id: 'cases', icon: '🆘', title: 'Reporting a case',
    color: '#8B2020', bg: 'rgba(233,160,167,0.1)', border: '#E9A0A7',
    steps: [
      { n: '1', text: 'Tap ☰ → Cases' },
      { n: '2', text: 'Tap 🆘 Report incident (red button)' },
      { n: '3', text: 'Search and select the villa from the dropdown' },
      { n: '4', text: 'Choose the category — damage, complaint, appliance failure etc.' },
      { n: '5', text: 'Set severity — Critical, High, Medium, or Low' },
      { n: '6', text: 'Describe what happened in the text box' },
      { n: '7', text: 'Hold 🎙 to record a voice note (optional)' },
      { n: '8', text: 'Take a photo of the issue (optional)' },
      { n: '9', text: 'Tap Report — your supervisor is notified immediately' },
    ],
    tip: 'Use Critical for urgent safety issues. Admin will see it on their phone right away.',
  },
  {
    id: 'huddles', icon: '💬', title: 'Huddles & Training',
    color: '#0C447C', bg: 'rgba(156,204,252,0.08)', border: '#9CCCFC',
    steps: [
      { n: '1', text: 'Tap ☰ → Huddles to see scheduled team meetings' },
      { n: '2', text: 'Tap ✅ Acknowledge to confirm you have read/attended' },
      { n: '3', text: 'If a quiz is attached — tap Take quiz and answer the questions' },
      { n: '4', text: 'For Training — tap ☰ → Training to see your sessions' },
      { n: '5', text: 'Admin marks your attendance for each training session' },
    ],
    tip: "Acknowledging a huddle is important — admin tracks who has seen each update.",
  },
];

const ADMIN_SECTIONS = [
  {
    id: 'roster', icon: '📋', title: 'Daily roster',
    color: '#0C447C', bg: 'rgba(156,204,252,0.1)', border: '#9CCCFC',
    steps: [
      { n: '1', text: 'Tap ☰ → Daily Roster' },
      { n: '2', text: 'Click any day on the week calendar strip' },
      { n: '3', text: 'Each butler has a colour-coded dropdown' },
      { n: '4', text: 'Select: Check-In / Check-Out / Booking / Non Booking' },
      { n: '5', text: 'Tap Save next to a butler, or 💾 Save all at the top' },
      { n: '6', text: 'Butler gets a notification on their phone instantly' },
      { n: '7', text: 'Tap 📊 Monthly (top right) to see the full month grid' },
      { n: '8', text: 'Tap ⬇ Export CSV to download the monthly allocation report' },
    ],
    tip: 'Colour codes: 🟢 Check-In · 🔴 Check-Out · 🔵 Booking · 🟡 Non Booking',
  },
  {
    id: 'assign', icon: '✓', title: 'Assigning a task',
    color: '#2D5A0E', bg: 'rgba(151,196,89,0.1)', border: '#97C459',
    steps: [
      { n: '1', text: 'Tap ☰ → Tasks' },
      { n: '2', text: 'Tap + Assign task (top right button)' },
      { n: '3', text: 'Select the butler from the dropdown' },
      { n: '4', text: 'Pick task type — Arrival selfie, Table layout, Guest welcome, Exit selfie, or Custom task' },
      { n: '5', text: 'For custom — type a description in the text box that appears' },
      { n: '6', text: 'Type the villa name' },
      { n: '7', text: 'Set a due time (optional)' },
      { n: '8', text: 'Tap Assign task — butler sees it in My Tasks immediately' },
    ],
    tip: 'Once completed, the task shows a 📷 View photo button if the butler uploaded proof.',
  },
  {
    id: 'map', icon: '🗺', title: 'Property map',
    color: '#4C1D95', bg: 'rgba(196,181,253,0.1)', border: '#C4B5FD',
    steps: [
      { n: '1', text: 'Tap ☰ → Property Map' },
      { n: '2', text: 'Blue pins = Lonavala villas, Green pins = Karjat villas' },
      { n: '3', text: 'Butler pins appear as dark circles with initials' },
      { n: '4', text: '🟢 Green dot = butler is live (updated in last 2 min)' },
      { n: '5', text: '🔴 Red dot = butler is offline — shows last seen time' },
      { n: '6', text: 'Tap any villa pin to see name, address, Google Maps link' },
      { n: '7', text: 'Use layer checkboxes to show/hide different pin types' },
      { n: '8', text: 'Use ☰ List view (top right) for a searchable list of all villas' },
    ],
    tip: 'Butlers must allow location permission on their phone. It auto-updates every 30 seconds.',
  },
  {
    id: 'reports', icon: '📊', title: 'Reports & exports',
    color: '#7A4A08', bg: 'rgba(254,213,169,0.12)', border: '#FED5A9',
    steps: [
      { n: '1', text: 'Tap ☰ → MIS & Reports' },
      { n: '2', text: 'Use filters: Month, Year, Butler, Villa to narrow results' },
      { n: '3', text: 'See KPI cards, donut charts, bar charts, activity calendar' },
      { n: '4', text: 'Click any day on the calendar → see all that day\'s activity' },
      { n: '5', text: 'Scroll to Export Reports section' },
      { n: '6', text: 'Tap ⬇ CSV next to any report to download it' },
      { n: '7', text: 'For per-butler data → Management tab → ⬇ CSV next to butler name' },
    ],
    tip: 'All CSVs open correctly in Excel, Google Sheets, and Numbers.',
  },
  {
    id: 'credentials', icon: '🔐', title: 'Managing users',
    color: '#8B2020', bg: 'rgba(233,160,167,0.1)', border: '#E9A0A7',
    steps: [
      { n: '1', text: 'Tap ☰ → Credentials' },
      { n: '2', text: 'See all 11 accounts with emails and passwords' },
      { n: '3', text: 'Tap 👁 to show/hide a password · Tap ⎘ to copy it' },
      { n: '4', text: 'Tap the Active/Inactive badge to enable or disable an account' },
      { n: '5', text: 'Tap + Add user to create a new account' },
      { n: '6', text: 'Fill in name, email, password, role and squad' },
      { n: '7', text: 'Tap + Add user — they can log in immediately' },
    ],
    tip: 'New users added here can log in right away — no code changes needed.',
  },
  {
    id: 'cases-admin', icon: '🆘', title: 'Managing cases',
    color: '#8B2020', bg: 'rgba(233,160,167,0.08)', border: '#E9A0A7',
    steps: [
      { n: '1', text: 'Tap ☰ → Cases' },
      { n: '2', text: 'See all open incidents from all butlers' },
      { n: '3', text: 'Use filters: Open / In progress / Resolved / Critical' },
      { n: '4', text: 'Tap any photo on a card to expand it full screen' },
      { n: '5', text: 'Tap ▶ to play any attached voice note' },
      { n: '6', text: 'Use the status dropdown on each card to update: Open → In progress → Resolved' },
    ],
    tip: 'You get a notification bell alert the moment a butler reports any case.',
  },
];

const FAQS = [
  { q: 'App not loading?', a: 'Close the browser tab completely and reopen. On iPhone, clear Safari cache: Settings → Safari → Clear History and Website Data.' },
  { q: 'Location not working?', a: 'Go to Settings → Safari (or Chrome) → Location → Allow. This is for butlers only — admins do not need location.' },
  { q: 'My tasks are empty?', a: 'Close and reopen the Tasks tab. It polls every 15 seconds. If still empty, ask your supervisor to re-assign.' },
  { q: 'Photo did not upload?', a: 'Check your wifi or 4G signal. The task still saves without a photo — you can try uploading later.' },
  { q: 'Forgot my password?', a: 'Ask admin. They can see and copy it from the Credentials tab.' },
  { q: 'Case stuck on Submitting?', a: 'The incidents database table may not be set up yet. Tell admin to visit ops-prod.vercel.app/api/setup-db to check.' },
  { q: 'How do I add a new butler?', a: 'Admin → Credentials → + Add user. Fill in details, set role to Butler, pick squad. They can log in immediately.' },
  { q: 'Can butlers see each other?', a: 'No. Butlers only see their own tasks, cases, attendance and calendar. Admin sees everything.' },
];

// ── Components ────────────────────────────────────────────────
function SectionCard({ section, isOpen, onToggle }: { section: any; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isOpen ? section.border : 'rgba(0,0,0,0.07)'}`, transition: 'border-color 0.2s', marginBottom: 10 }}>
      {/* Header */}
      <button onClick={onToggle} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: isOpen ? section.bg : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: section.bg, border: `1.5px solid ${section.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{section.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sv-dark)' }}>{section.title}</div>
          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{section.steps.length} steps</div>
        </div>
        <div style={{ fontSize: 18, color: 'var(--muted-fg)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>⌄</div>
      </button>

      {/* Body */}
      {isOpen && (
        <div style={{ padding: '0 18px 16px', background: '#fff' }}>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14 }}>
            {section.steps.map((step: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: section.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1 }}>{step.n}</div>
                <div style={{ fontSize: 13, color: 'var(--sv-dark)', lineHeight: 1.5, paddingTop: 3 }}>{step.text}</div>
              </div>
            ))}
            {section.tip && (
              <div style={{ marginTop: 6, padding: '10px 14px', background: section.bg, borderRadius: 9, fontSize: 12, color: section.color, lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>💡</span>
                <span>{section.tip}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function GuidePage() {
  const { user } = useAuth();
  const isSuper = user ? isSupervisor(user.role as any) : false;
  const [tab, setTab] = useState<'butler' | 'admin' | 'faq'>('butler');
  const [openId, setOpenId] = useState<string | null>('login');

  const sections = tab === 'butler' ? BUTLER_SECTIONS : tab === 'admin' ? ADMIN_SECTIONS : [];

  return (
    <>
      <Topbar title="Help & Guide" subtitle="Step-by-step instructions for using the app" />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4 }}>
          {[
            { key: 'butler', label: '👤 Butler guide' },
            { key: 'admin',  label: '⚙️ Admin guide' },
            { key: 'faq',    label: '❓ FAQs' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key as any); setOpenId(null); }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', background: tab === t.key ? '#1B1D1F' : 'transparent', color: tab === t.key ? '#fff' : 'var(--muted-fg)', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 500, transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Quick tip banner */}
        {tab === 'butler' && (
          <div style={{ background: 'rgba(151,196,89,0.08)', border: '1px solid #97C459', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 22 }}>📱</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2D5A0E' }}>You're a butler — here's all you need</div>
              <div style={{ fontSize: 11, color: '#2D5A0E', marginTop: 2, opacity: 0.8 }}>Tap any section below to expand the steps. All your data is private — admins can't see other butlers either.</div>
            </div>
          </div>
        )}
        {tab === 'admin' && (
          <div style={{ background: 'rgba(156,204,252,0.1)', border: '1px solid #9CCCFC', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0C447C' }}>Admin & Supervisor guide</div>
              <div style={{ fontSize: 11, color: '#0C447C', marginTop: 2, opacity: 0.8 }}>Everything you can do to manage your team, assign work, and track performance.</div>
            </div>
          </div>
        )}

        {/* Accordion sections */}
        {sections.length > 0 && (
          <div>
            {sections.map(section => (
              <SectionCard key={section.id} section={section} isOpen={openId === section.id} onToggle={() => setOpenId(openId === section.id ? null : section.id)} />
            ))}
          </div>
        )}

        {/* FAQs */}
        {tab === 'faq' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 16 }}>Tap any question to see the answer.</div>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 8 }}>
                <button onClick={() => setOpenId(openId === `faq-${i}` ? null : `faq-${i}`)}
                  style={{ width: '100%', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: openId === `faq-${i}` ? 'rgba(0,0,0,0.03)' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sv-dark)' }}>❓ {faq.q}</span>
                  <span style={{ fontSize: 16, color: 'var(--muted-fg)', transition: 'transform 0.2s', transform: openId === `faq-${i}` ? 'rotate(180deg)' : 'none', flexShrink: 0, marginLeft: 8 }}>⌄</span>
                </button>
                {openId === `faq-${i}` && (
                  <div style={{ padding: '0 18px 14px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ paddingTop: 12, fontSize: 13, color: 'var(--muted-fg)', lineHeight: 1.6 }}>{faq.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* App info footer */}
        <div style={{ marginTop: 28, padding: '16px 20px', background: '#1B1D1F', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>StayVista Butler Ops</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>ops-prod.vercel.app · v2.0</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <div style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: 'rgba(151,196,89,0.15)', color: '#97C459', fontWeight: 600 }}>🏠 Back to app</div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
