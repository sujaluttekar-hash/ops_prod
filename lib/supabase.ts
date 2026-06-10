import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTkxNTgsImV4cCI6MjA5NTk3NTE1OH0.fhv7K_QqLsPXQdJazgF6sf1upjt5WFeLRGfH5r8oAzQ'

let _client: any = null

export function getSupabase() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _client
}

// Auth functions
export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut()
  return { error }
}

export async function getSession() {
  const { data } = await getSupabase().auth.getSession()
  return data.session
}

export async function getUser() {
  const { data } = await getSupabase().auth.getUser()
  return data.user
}

// Data fetching functions
export async function fetchProfiles() {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) console.error('fetchProfiles error:', error)
  return data || []
}

export async function fetchProperties() {
  const { data, error } = await getSupabase()
    .from('properties')
    .select('*')
    .order('name')

  if (error) console.error('fetchProperties error:', error)
  return data || []
}

export async function fetchGuestDelights() {
  const { data, error } = await getSupabase()
    .from('guest_delights')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('fetchGuestDelights error:', error)
  return data || []
}

export async function fetchTasks() {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('fetchTasks error:', error)
  return data || []
}

export async function fetchHuddles() {
  const { data, error } = await getSupabase()
    .from('huddles')
    .select('*')
    .order('huddle_date', { ascending: false })

  if (error) console.error('fetchHuddles error:', error)
  return data || []
}

export async function fetchTrainings() {
  const { data, error } = await getSupabase()
    .from('trainings')
    .select('*')
    .order('training_date', { ascending: false })

  if (error) console.error('fetchTrainings error:', error)
  return data || []
}

export async function fetchCredentials() {
  const { data, error } = await getSupabase()
    .from('credentials')
    .select('*')
    .order('name')

  if (error) console.error('fetchCredentials error:', error)
  return data || []
}

// Insert/Update functions
export async function insertGuestDelight(payload: any) {
  const { data, error } = await getSupabase()
    .from('guest_delights')
    .insert(payload)
    .select()
    .single()

  if (error) console.error('insertGuestDelight error:', error)
  return { data, error }
}

export async function insertTask(payload: any) {
  const { data, error } = await getSupabase()
    .from('tasks')
    .insert(payload)
    .select()
    .single()

  if (error) console.error('insertTask error:', error)
  return { data, error }
}

export async function updateTaskStatus(id: string, status: string) {
  const { data, error } = await getSupabase()
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) console.error('updateTaskStatus error:', error)
  return { data, error }
}

// Storage functions
export async function uploadPhoto(bucket: string, file: File, path: string) {
  const { data, error } = await getSupabase()
    .storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) {
    console.error('uploadPhoto error:', error)
    return { error, publicUrl: null }
  }

  const { data: { publicUrl } } = getSupabase()
    .storage
    .from(bucket)
    .getPublicUrl(data.path)

  return { error: null, publicUrl }
}
