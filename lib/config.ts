/**
 * lib/config.ts — SINGLE SOURCE OF TRUTH
 * 
 * All keys, credentials, and constants live here.
 * API routes read from process.env (set in Vercel dashboard).
 * Fallbacks are provided so the app keeps working until env vars are set.
 * 
 * TO MIGRATE: Set these in Vercel → Project Settings → Environment Variables
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY  
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REDASH_REG_API_KEY
 *   REDASH_FEED_API_KEY
 */

// ── Supabase ──────────────────────────────────────────────────────────────────
export const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ryuxwnbrdsjwzwdimynd.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTkxNTgsImV4cCI6MjA5NTk3NTE1OH0.fhv7K_QqLsPXQdJazgF6sf1upjt5WFeLRGfH5r8oAzQ'

export const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'

// ── Redash ────────────────────────────────────────────────────────────────────
export const REDASH_BASE = 'https://redash.vistarooms.com/api/queries'

export const REDASH_REG_URL =
  `${REDASH_BASE}/847/results.csv?api_key=${process.env.REDASH_REG_API_KEY || 'wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'}`

export const REDASH_FEED_URL =
  `${REDASH_BASE}/849/results.csv?api_key=${process.env.REDASH_FEED_API_KEY || 'im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'}`

// ── Supabase auth headers (for direct REST calls) ─────────────────────────────
export const SUPABASE_SERVICE_HEADERS = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// ── Squads ────────────────────────────────────────────────────────────────────
export const SQUADS = ['Lonavala', 'Karjat', 'Nashik', 'Alibaug', 'Pune'] as const
export const SQUADS_WITH_ALL = ['All', ...SQUADS] as const
export type Squad = typeof SQUADS[number]

// ── MIS targets (matching Butler Mastersheet) ─────────────────────────────────
export const MIS_TARGETS = {
  utilisation:  25,
  sevenStar:    60,
  ota:          50,
  guestWelcome: 80,
  guestDelight: 100,
  registration: 100,
} as const

// ── Users — SINGLE SOURCE OF TRUTH ───────────────────────────────────────────
// When you add a new butler, add them HERE ONLY.
// login/page.tsx, forgot-password, and supabase.ts all import from here.
export const APP_USERS: Record<string, {
  id: string; password: string; role: string; name: string; squad: string | null
}> = {
  'admin@stayvista.com':         { id: 'd035c01f-6987-4e76-8ab7-a562235ed2c8', password: 'StayVista@2026', role: 'super_admin', name: 'Aditi',           squad: 'All'      },
  'sujal@stayvista.com':         { id: '8d5da751-3269-4d77-b837-45253a9435c5', password: 'sujal@123',      role: 'ops_manager', name: 'Sujal',           squad: 'All'      },
  'svops@stayvista.com':         { id: '74d52090-9c35-4e4f-98d5-d75b49f35bec', password: 'Svops@2026',      role: 'ops_manager', name: 'Svops',           squad: 'All'      },
  'sujal.uttekar@stayvista.com': { id: 'd71e6f0f-916d-4fec-af8d-d14113f70ae4', password: 'StayVista@2026', role: 'butler',      name: 'Sujal Uttekar',   squad: null       },
  'arbaz@stayvista.com':         { id: 'bfdbc167-f99e-40d0-80fc-ba25dc85cc36', password: 'arbaz@123',      role: 'butler',      name: 'Arbaz',           squad: 'Karjat'   },
  'atish@stayvista.com':         { id: 'fedb395e-476c-43d7-a76f-c87f8e508856', password: 'atish@123',      role: 'butler',      name: 'Atish Tandkar',   squad: 'Nashik'   },
  'kalpesh@stayvista.com':       { id: '30ebc89e-17fc-43db-b9a8-46398d24a1e3', password: 'kalpesh@123',    role: 'butler',      name: 'Kalpesh Ther',    squad: 'Karjat'   },
  'kohinoor@stayvista.com':      { id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', password: 'kohinoor@123',   role: 'butler',      name: 'Kohinoor Shinde', squad: 'Lonavala' },
  'manoj@stayvista.com':         { id: '24e03c68-5cd0-47aa-a695-75850ac2a81d', password: 'manoj@123',      role: 'butler',      name: 'Manoj Valmiki',   squad: 'Alibaug'  },
  'nimish@stayvista.com':        { id: '326c84fa-7c94-42a4-b7a2-6545f1398308', password: 'nimish@123',     role: 'butler',      name: 'Nimish',          squad: 'Karjat'   },
  'butler@stayvista.com':        { id: '0835f144-513d-4107-968f-bb0c3ddbd6df', password: 'butler@123',     role: 'butler',      name: 'Ravi Kumar',      squad: 'Lonavala' },
  'vinayak@stayvista.com':       { id: '4b2cc4e7-876b-490a-a315-192c67424328', password: 'vinayak@123',    role: 'butler',      name: 'Vinayak Kharade', squad: 'Lonavala' },
  'arbaj@stayvista.com':         { id: 'f0b06e94-fbb1-44b8-be9c-25edbbac5afb', password: 'arbaj@123',      role: 'butler',      name: 'Arbaj Shaikh',    squad: 'Karjat'   },
  'abhishek@stayvista.com':      { id: 'b42efa8e-bcab-4fe2-8cb9-db9fce5a0f24', password: 'abhishek@123',   role: 'butler',      name: 'Abhishek',        squad: 'Alibaug'  },
  'vishal@stayvista.com':        { id: '4ab59e13-1d68-4607-bef8-b9fb013827ac', password: 'vishal@123',     role: 'butler',      name: 'Vishal',          squad: 'Alibaug'  },
}

// Admin UUIDs — for system notifications
export const ADMIN_ID = 'd035c01f-6987-4e76-8ab7-a562235ed2c8'
export const SUJAL_ID = '8d5da751-3269-4d77-b837-45253a9435c5'
