import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ryuxwnbrdsjwzwdimynd.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTkxNTgsImV4cCI6MjA5NTk3NTE1OH0.fhv7K_QqLsPXQdJazgF6sf1upjt5WFeLRGfH5r8oAzQ';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

export const supabase = {
  get auth() { return getSupabase().auth; },
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args),
  storage: { from: (bucket: string) => getSupabase().storage.from(bucket) },
  channel: (...args: Parameters<SupabaseClient['channel']>) => getSupabase().channel(...args),
  removeChannel: (...args: Parameters<SupabaseClient['removeChannel']>) => getSupabase().removeChannel(...args),
} as unknown as SupabaseClient;

export const BUCKETS = {
  DELIGHT_PHOTOS: 'delight-photos',
  TASK_PHOTOS: 'task-photos',
  TRAINING: 'training-materials',
};

export type Profile = {
  id: string; name: string; email: string;
  role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer';
  squad: string | null; property_id: string | null;
  phone: string | null; is_active: boolean; created_at: string;
};
export type Property = { id: string; name: string; location: string; status: 'occupied' | 'partial' | 'vacant'; };
export type GuestDelight = {
  id: string; your_name: string; squad: string | null;
  booking_date: string; booking_id: string | null;
  villa_name: string; booking_type: string;
  status: 'pending' | 'completed' | 'overdue';
  notes: string | null; created_at: string;
  delight_photos?: DelightPhoto[];
};
export type DelightPhoto = {
  id: string; delight_id: string; pointer_key: string;
  storage_path: string; public_url: string | null;
  captured_at: string | null; uploaded_at: string;
};
export type Task = {
  id: string; type: string; property_id: string | null;
  butler_id: string | null; status: 'pending' | 'completed' | 'delayed';
  due_time: string | null; completed_at: string | null;
  photo_path: string | null; notes: string | null; created_at: string;
  profiles?: Profile; properties?: Property;
};
export type Huddle = {
  id: string; team: string; huddle_date: string;
  time: string | null; participants_expected: number;
  status: 'scheduled' | 'tbc' | 'completed' | 'cancelled'; notes: string | null;
};
export type Training = {
  id: string; name: string; training_date: string | null;
  type: 'Functional' | 'Mandatory'; total_seats: number;
  status: 'planned' | 'upcoming' | 'completed'; has_quiz: boolean;
};
export type Submission = {
  id: string; butler_id: string; butler_name: string;
  task_type: string; property: string; date_of_service: string;
  submitted_at: string; notes: string; photo_url: string | null;
  status: 'pending' | 'approved';
};
export type Credential = {
  id: string; name: string; type: string; property: string;
  value: string; expiry: string | null; expiry_warning: boolean;
};

export async function signIn(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({ email, password });
}
export async function signOut() {
  return getSupabase().auth.signOut();
}
export async function getSession() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session;
}
export async function getUser() {
  const { data: { user } } = await getSupabase().auth.getUser();
  return user;
}
export async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await getSupabase().from('profiles').select('*').eq('is_active', true).order('name');
  return data ?? [];
}
export async function fetchProperties(): Promise<Property[]> {
  const { data } = await getSupabase().from('properties').select('*').order('name');
  return data ?? [];
}
export async function fetchGuestDelights(): Promise<GuestDelight[]> {
  const { data } = await getSupabase().from('guest_delights').select('*, delight_photos(*)').order('booking_date', { ascending: false });
  return data ?? [];
}
export async function insertGuestDelight(payload: Partial<GuestDelight>) {
  return getSupabase().from('guest_delights').insert(payload).select().single();
}
export async function uploadDelightPhoto(delightId: string, pointerKey: string, file: File, capturedAt: string) {
  const sb = getSupabase();
  const ext = file.name.split('.').pop();
  const path = `${delightId}/${pointerKey}-${Date.now()}.${ext}`;
  const { error: uploadError } = await sb.storage.from(BUCKETS.DELIGHT_PHOTOS).upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError };
  const { data: urlData } = sb.storage.from(BUCKETS.DELIGHT_PHOTOS).getPublicUrl(path);
  const { error: dbError } = await sb.from('delight_photos').insert({ delight_id: delightId, pointer_key: pointerKey, storage_path: path, public_url: urlData.publicUrl, captured_at: capturedAt });
  return { error: dbError, publicUrl: urlData.publicUrl };
}
export async function fetchTasks(): Promise<Task[]> {
  const { data } = await getSupabase().from('tasks').select('*, profiles(name), properties(name)').order('created_at', { ascending: false });
  return data ?? [];
}
export async function fetchSubmissions(): Promise<Submission[]> {
  const { data } = await getSupabase().from('submissions').select('*').order('submitted_at', { ascending: false });
  return data ?? [];
}
export async function insertSubmission(payload: Partial<Submission>) {
  return getSupabase().from('submissions').insert(payload).select().single();
}
export async function uploadTaskPhoto(file: File, submissionId: string): Promise<string | null> {
  const sb = getSupabase();
  const ext = file.name.split('.').pop();
  const path = `${submissionId}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from(BUCKETS.TASK_PHOTOS).upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = sb.storage.from(BUCKETS.TASK_PHOTOS).getPublicUrl(path);
  return data.publicUrl;
}
export async function fetchHuddles(): Promise<Huddle[]> {
  const { data } = await getSupabase().from('huddles').select('*').order('huddle_date', { ascending: false });
  return data ?? [];
}
export async function fetchTrainings(): Promise<Training[]> {
  const { data } = await getSupabase().from('trainings').select('*').order('training_date', { ascending: false });
  return data ?? [];
}
export async function fetchCredentials(): Promise<Credential[]> {
  const { data } = await getSupabase().from('credentials').select('*').order('name');
  return data ?? [];
}
export async function fetchDashboardStats() {
  const sb = getSupabase();
  const [delights, tasks, huddles] = await Promise.all([
    sb.from('guest_delights').select('id, status'),
    sb.from('tasks').select('id, status'),
    sb.from('huddles').select('id, status, huddle_date, team, time, participants_expected').gte('huddle_date', new Date().toISOString().split('T')[0]).order('huddle_date'),
  ]);
  return { delights: delights.data ?? [], tasks: tasks.data ?? [], upcomingHuddles: huddles.data ?? [] };
}
