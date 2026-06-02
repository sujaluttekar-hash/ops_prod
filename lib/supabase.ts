import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKETS = {
  DELIGHT_PHOTOS: 'delight-photos',
  TASK_PHOTOS: 'task-photos',
  TRAINING: 'training-materials',
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer';
  squad: string | null;
  property_id: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

export type Property = {
  id: string;
  name: string;
  location: string;
  status: 'occupied' | 'partial' | 'vacant';
};

export type GuestDelight = {
  id: string;
  your_name: string;
  squad: string | null;
  booking_date: string;
  booking_id: string | null;
  villa_name: string;
  booking_type: string;
  status: 'pending' | 'completed' | 'overdue';
  notes: string | null;
  created_at: string;
  delight_photos?: DelightPhoto[];
};

export type DelightPhoto = {
  id: string;
  delight_id: string;
  pointer_key: string;
  storage_path: string;
  public_url: string | null;
  captured_at: string | null;
  uploaded_at: string;
};

export type Task = {
  id: string;
  type: string;
  property_id: string | null;
  butler_id: string | null;
  status: 'pending' | 'completed' | 'delayed';
  due_time: string | null;
  completed_at: string | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
  profiles?: Profile;
  properties?: Property;
};

export type Huddle = {
  id: string;
  team: string;
  huddle_date: string;
  time: string | null;
  participants_expected: number;
  status: 'scheduled' | 'tbc' | 'completed' | 'cancelled';
  notes: string | null;
};

export type Training = {
  id: string;
  name: string;
  training_date: string | null;
  type: 'Functional' | 'Mandatory';
  total_seats: number;
  status: 'planned' | 'upcoming' | 'completed';
  has_quiz: boolean;
};

// ── Data fetchers ─────────────────────────────────────────────

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) { console.error('fetchProfiles:', error.message); return []; }
  return data ?? [];
}

export async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('name');
  if (error) { console.error('fetchProperties:', error.message); return []; }
  return data ?? [];
}

export async function fetchGuestDelights(): Promise<GuestDelight[]> {
  const { data, error } = await supabase
    .from('guest_delights')
    .select('*, delight_photos(*)')
    .order('booking_date', { ascending: false });
  if (error) { console.error('fetchGuestDelights:', error.message); return []; }
  return data ?? [];
}

export async function insertGuestDelight(payload: Partial<GuestDelight>) {
  const { data, error } = await supabase
    .from('guest_delights')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function uploadDelightPhoto(
  delightId: string,
  pointerKey: string,
  file: File,
  capturedAt: string
) {
  const ext = file.name.split('.').pop();
  const path = `${delightId}/${pointerKey}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.DELIGHT_PHOTOS)
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError };

  const { data: urlData } = supabase.storage
    .from(BUCKETS.DELIGHT_PHOTOS)
    .getPublicUrl(path);

  const { error: dbError } = await supabase.from('delight_photos').insert({
    delight_id: delightId,
    pointer_key: pointerKey,
    storage_path: path,
    public_url: urlData.publicUrl,
    captured_at: capturedAt,
  });
  return { error: dbError, publicUrl: urlData.publicUrl };
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles(name), properties(name)')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchTasks:', error.message); return []; }
  return data ?? [];
}

export async function fetchHuddles(): Promise<Huddle[]> {
  const { data, error } = await supabase
    .from('huddles')
    .select('*')
    .order('huddle_date', { ascending: false });
  if (error) { console.error('fetchHuddles:', error.message); return []; }
  return data ?? [];
}

export async function fetchTrainings(): Promise<Training[]> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*')
    .order('training_date', { ascending: false });
  if (error) { console.error('fetchTrainings:', error.message); return []; }
  return data ?? [];
}

export async function fetchDashboardStats() {
  const [delights, tasks, huddles] = await Promise.all([
    supabase.from('guest_delights').select('id, status'),
    supabase.from('tasks').select('id, status'),
    supabase.from('huddles').select('id, status, huddle_date, team, time, participants_expected')
      .gte('huddle_date', new Date().toISOString().split('T')[0])
      .order('huddle_date'),
  ]);
  return {
    delights: delights.data ?? [],
    tasks: tasks.data ?? [],
    upcomingHuddles: huddles.data ?? [],
  };
}
