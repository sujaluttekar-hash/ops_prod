import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY } from './config'
const SUPABASE_KEY = SUPABASE_ANON_KEY

export const BUCKETS = {
  delightPhotos: 'delight-photos',
  taskPhotos: 'task-photos',
  trainingMaterials: 'training-materials',
} as const

let _client: any = null
export function getSupabase() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  }
  return _client
}

// Service client — uses SUPABASE_SERVICE_KEY from lib/config.ts
const SERVICE_KEY = SUPABASE_SERVICE_KEY
let _serviceClient: any = null
export function getServiceSupabase() {
  if (!_serviceClient) {
    _serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _serviceClient
}

// ─── Hardcoded profiles (shown when Supabase is unreachable) ─────────────────
export const LOCAL_PROFILES: Profile[] = [
  { id: 'd035c01f-6987-4e76-8ab7-a562235ed2c8', name: 'Aditi',           email: 'admin@stayvista.com',         role: 'super_admin', squad: 'All',      property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '8d5da751-3269-4d77-b837-45253a9435c5', name: 'Sujal',           email: 'sujal@stayvista.com',         role: 'ops_manager', squad: 'All',      property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: 'd71e6f0f-916d-4fec-af8d-d14113f70ae4', name: 'Sujal Uttekar',   email: 'sujal.uttekar@stayvista.com', role: 'butler',      squad: null,       property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: 'fedb395e-476c-43d7-a76f-c87f8e508856', name: 'Atish Tandkar',   email: 'atish@stayvista.com',         role: 'butler',      squad: 'Nashik',   property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '30ebc89e-17fc-43db-b9a8-46398d24a1e3', name: 'Kalpesh Ther',    email: 'kalpesh@stayvista.com',       role: 'butler',      squad: 'Alibaug',  property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', name: 'Kohinoor Shinde', email: 'kohinoor@stayvista.com',      role: 'butler',      squad: 'Karjat',   property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '24e03c68-5cd0-47aa-a695-75850ac2a81d', name: 'Manoj Valmiki',   email: 'manoj@stayvista.com',         role: 'butler',      squad: 'Lonavala', property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '326c84fa-7c94-42a4-b7a2-6545f1398308', name: 'Nimish',          email: 'nimish@stayvista.com',        role: 'butler',      squad: 'Alibaug',  property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '0835f144-513d-4107-968f-bb0c3ddbd6df', name: 'Ravi Kumar',      email: 'butler@stayvista.com',        role: 'butler',      squad: 'Lonavala', property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '4b2cc4e7-876b-490a-a315-192c67424328', name: 'Vinayak Kharade', email: 'vinayak@stayvista.com',       role: 'butler',      squad: 'Lonavala', property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
  { id: '4ab59e13-1d68-4607-bef8-b9fb013827ac', name: 'Vishal',          email: 'vishal@stayvista.com',        role: 'butler',      squad: 'Karjat',   property_id: null, phone: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: null },
]

// ─── Types ────────────────────────────────────────────────────────────────────
export type Profile = {
  id: string; name: string | null; email: string
  role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer'
  squad: string | null; property_id: string | null; phone: string | null
  is_active: boolean; created_at: string; updated_at: string | null
}
export type GuestDelight = {
  id: string; your_name: string; squad: string | null; booking_date: string
  booking_id: string | null; villa_name: string; booking_type: string
  status: 'pending' | 'completed' | 'overdue'; notes: string | null
  created_by: string | null; created_at: string; delight_photos?: DelightPhoto[]
}
export type DelightPhoto = {
  id: string; delight_id: string; pointer_key: string
  storage_path: string; public_url: string | null
  captured_at: string | null; uploaded_at: string
}
export type Task = {
  id: string; type: string; property_id: string | null; butler_id: string | null
  status: 'pending' | 'completed' | 'delayed'; due_time: string | null
  completed_at: string | null; photo_path: string | null; notes: string | null
  created_at: string; updated_at: string | null
}
export type Submission = {
  id: string; butler_id: string; butler_name: string; task_type: string
  property: string; date_of_service: string; submitted_at: string
  notes: string | null; photo_url: string | null; status: 'pending' | 'approved' | 'rejected'
}
export type Huddle = {
  id: string; team: string; huddle_date: string; time: string | null
  participants_expected: number; status: 'scheduled' | 'tbc' | 'completed' | 'cancelled'
  notes: string | null; created_at: string
}
export type Training = {
  id: string; name: string; training_date: string | null
  type: 'Functional' | 'Mandatory'; total_seats: number
  status: 'planned' | 'upcoming' | 'completed'; has_quiz: boolean; created_at: string
}
export type Quiz = {
  id: string; title: string; description: string | null; training_id: string | null
  created_by: string | null; is_active: boolean; pass_percentage: number
  time_limit_minutes: number | null; created_at: string
}
export type QuizQuestion = {
  id: string; quiz_id: string; question: string; type: 'mcq' | 'true_false' | 'short'
  options: string[] | null; correct_answer: string; order_no: number; created_at: string
}
export type Credential = {
  id: string; name: string; username: string; password: string
  category: string; notes: string | null; created_at: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
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

// ─── Fetch — with local fallback ──────────────────────────────────────────────
export async function fetchProfiles(): Promise<Profile[]> {
  try {
    const { data, error } = await getServiceSupabase().from('profiles').select('*').eq('is_active', true).order('name')
    if (!error && data && data.length > 0) return data
  } catch {}
  return LOCAL_PROFILES
}

export async function fetchProperties() {
  try {
    const { data, error } = await getServiceSupabase().from('properties').select('*').order('name')
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchGuestDelights(): Promise<GuestDelight[]> {
  try {
    const { data, error } = await getServiceSupabase().from('guest_delights').select('*, delight_photos(*)').order('created_at', { ascending: false })
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchTasks(): Promise<Task[]> {
  try {
    const { data, error } = await getServiceSupabase().from('tasks').select('*').order('created_at', { ascending: false })
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchSubmissions(): Promise<Submission[]> {
  try {
    const { data, error } = await getServiceSupabase().from('submissions').select('*').order('submitted_at', { ascending: false })
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchHuddles(): Promise<Huddle[]> {
  try {
    const { data, error } = await getServiceSupabase().from('huddles').select('*').order('huddle_date', { ascending: false })
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchTrainings(): Promise<Training[]> {
  try {
    const { data, error } = await getServiceSupabase().from('trainings').select('*').order('training_date', { ascending: false })
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchCredentials(): Promise<Credential[]> {
  try {
    const { data, error } = await getServiceSupabase().from('credentials').select('*').order('name')
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchQuizzes(): Promise<Quiz[]> {
  try {
    const { data, error } = await getServiceSupabase().from('quizzes').select('*, trainings(name)').eq('is_active', true).order('created_at', { ascending: false })
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  try {
    const { data, error } = await getServiceSupabase().from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_no')
    if (!error && data) return data
  } catch {}
  return []
}

export async function fetchDashboardStats() {
  try {
    const [delights, tasks, huddles] = await Promise.all([
      getServiceSupabase().from('guest_delights').select('id, status, created_at'),
      getServiceSupabase().from('tasks').select('id, status, created_at'),
      getServiceSupabase().from('huddles').select('id, status, huddle_date').gte('huddle_date', new Date().toISOString().split('T')[0]).order('huddle_date'),
    ])
    return { delights: delights.data || [], tasks: tasks.data || [], upcomingHuddles: huddles.data || [] }
  } catch {}
  return { delights: [], tasks: [], upcomingHuddles: [] }
}

export async function fetchButlerActivityForMonth(butlerId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`
  const endDate = `${year}-${String(month).padStart(2,'0')}-31`
  try {
    const [delights, tasks, huddles, trainings] = await Promise.all([
      getServiceSupabase().from('guest_delights').select('id, booking_date, status, villa_name, booking_type').eq('your_name', butlerId).gte('booking_date', startDate).lte('booking_date', endDate),
      getServiceSupabase().from('tasks').select('id, type, status, created_at').eq('butler_id', butlerId).gte('created_at', startDate).lte('created_at', endDate),
      getServiceSupabase().from('huddle_attendance').select('huddle_id, attended, huddles(team, huddle_date)').eq('butler_id', butlerId),
      getServiceSupabase().from('trainings').select('id, name, training_date, status').gte('training_date', startDate).lte('training_date', endDate),
    ])
    return { delights: delights.data || [], tasks: tasks.data || [], huddleAttendance: huddles.data || [], trainings: trainings.data || [] }
  } catch {}
  return { delights: [], tasks: [], huddleAttendance: [], trainings: [] }
}

export async function insertGuestDelight(payload: any) {
  try {
    const { data, error } = await getServiceSupabase().from('guest_delights').insert(payload).select().single()
    return { data, error }
  } catch (e: any) { return { data: null, error: e } }
}

export async function insertTask(payload: any) {
  try {
    const { data, error } = await getServiceSupabase().from('tasks').insert(payload).select().single()
    return { data, error }
  } catch (e: any) { return { data: null, error: e } }
}

export async function insertSubmission(payload: any) {
  try {
    const { data, error } = await getServiceSupabase().from('submissions').insert(payload).select().single()
    if (!error) return { data, error }
    return insertTask({ type: payload.task_type, butler_id: payload.butler_id, status: payload.status || 'pending', notes: payload.notes, photo_path: payload.photo_url })
  } catch (e: any) { return { data: null, error: e } }
}

export async function updateTaskStatus(id: string, status: string) {
  try {
    const { data, error } = await getServiceSupabase().from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  } catch (e: any) { return { data: null, error: e } }
}

export async function createQuiz(payload: any) {
  try {
    const sb = getServiceSupabase()
    const { data: quiz, error: quizErr } = await sb.from('quizzes').insert({
      title: payload.title, description: payload.description || null,
      training_id: payload.training_id || null, created_by: null,
      is_active: true, pass_percentage: payload.pass_percentage ?? 70,
      time_limit_minutes: payload.time_limit_minutes ?? null,
    }).select().single()
    if (quizErr) return { data: null, error: quizErr }
    if (payload.questions?.length > 0) {
      await sb.from('quiz_questions').insert(payload.questions.map((q: any, i: number) => ({
        quiz_id: quiz.id, question: q.question, type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer, order_no: i + 1,
      })))
    }
    return { data: quiz, error: null }
  } catch (e: any) { return { data: null, error: e } }
}

export async function submitQuizAttempt(payload: any) {
  try {
    const { data, error } = await getServiceSupabase().from('quiz_attempts').insert({
      quiz_id: payload.quiz_id, butler_id: payload.butler_id,
      score: payload.score, passed: payload.passed, attempted_at: new Date().toISOString(),
    }).select().single()
    return { data, error }
  } catch (e: any) { return { data: null, error: e } }
}

export async function uploadPhoto(bucket: string, file: File, path: string) {
  try {
    const { data, error } = await getServiceSupabase().storage.from(bucket).upload(path, file, { upsert: true })
    if (error) return { error, publicUrl: null }
    const { data: { publicUrl } } = getServiceSupabase().storage.from(bucket).getPublicUrl(data.path)
    return { error: null, publicUrl }
  } catch (e: any) { return { error: e, publicUrl: null } }
}

export async function uploadDelightPhoto(delightId: string, pointerKey: string, file: File, capturedAt?: string) {
  const path = `${delightId}/${pointerKey}_${Date.now()}.${file.name.split('.').pop()}`
  const { error: uploadErr, publicUrl } = await uploadPhoto(BUCKETS.delightPhotos, file, path)
  if (uploadErr) return { error: uploadErr }
  const { error: dbErr } = await getServiceSupabase().from('delight_photos').insert({
    delight_id: delightId, pointer_key: pointerKey, storage_path: path,
    public_url: publicUrl, captured_at: capturedAt ? new Date().toISOString() : null,
  })
  return { error: dbErr }
}

export async function uploadTaskPhoto(file: File, submissionId: string): Promise<string | null> {
  // Use delight-photos bucket as fallback if task-photos doesn't exist
  const path = `tasks/${submissionId}/${Date.now()}.${file.name.split('.').pop()}`
  let result = await uploadPhoto(BUCKETS.taskPhotos, file, path)
  if (result.error) {
    // Fallback to delight-photos bucket
    result = await uploadPhoto(BUCKETS.delightPhotos, file, path)
  }
  if (result.error) { console.error('Photo upload failed:', result.error); return null }
  return result.publicUrl
}
