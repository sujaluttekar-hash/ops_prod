import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTkxNTgsImV4cCI6MjA5NTk3NTE1OH0.fhv7K_QqLsPXQdJazgF6sf1upjt5WFeLRGfH5r8oAzQ'

export const BUCKETS = {
  delightPhotos: 'delight-photos',
  taskPhotos: 'task-photos',
  trainingMaterials: 'training-materials',
} as const

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

// ─── Types ────────────────────────────────────────────────────

export type Profile = {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer'
  squad: string | null
  property_id: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type GuestDelight = {
  id: string
  your_name: string
  squad: string | null
  booking_date: string
  booking_id: string | null
  villa_name: string
  booking_type: string
  status: 'pending' | 'completed' | 'overdue'
  notes: string | null
  created_by: string | null
  created_at: string
  delight_photos?: DelightPhoto[]
}

export type DelightPhoto = {
  id: string
  delight_id: string
  pointer_key: string
  storage_path: string
  public_url: string | null
  captured_at: string | null
  uploaded_at: string
}

export type Task = {
  id: string
  type: string
  property_id: string | null
  butler_id: string | null
  status: 'pending' | 'completed' | 'delayed'
  due_time: string | null
  completed_at: string | null
  photo_path: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export type Submission = {
  id: string
  butler_id: string
  butler_name: string
  task_type: string
  property: string
  date_of_service: string
  submitted_at: string
  notes: string | null
  photo_url: string | null
  status: 'pending' | 'approved' | 'rejected'
}

export type Huddle = {
  id: string
  team: string
  huddle_date: string
  time: string | null
  participants_expected: number
  status: 'scheduled' | 'tbc' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
}

export type Training = {
  id: string
  name: string
  training_date: string | null
  type: 'Functional' | 'Mandatory'
  total_seats: number
  status: 'planned' | 'upcoming' | 'completed'
  has_quiz: boolean
  created_at: string
}

export type Quiz = {
  id: string
  title: string
  description: string | null
  training_id: string | null
  created_by: string | null
  is_active: boolean
  pass_percentage: number
  time_limit_minutes: number | null
  created_at: string
}

export type QuizQuestion = {
  id: string
  quiz_id: string
  question: string
  type: 'mcq' | 'true_false' | 'short'
  options: string[] | null
  correct_answer: string
  order_no: number
  created_at: string
}

// ─── Auth functions ───────────────────────────────────────────

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

// ─── Fetch functions ──────────────────────────────────────────

export async function fetchProfiles(): Promise<Profile[]> {
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

export async function fetchGuestDelights(): Promise<GuestDelight[]> {
  const { data, error } = await getSupabase()
    .from('guest_delights')
    .select('*, delight_photos(*)')
    .order('created_at', { ascending: false })
  if (error) console.error('fetchGuestDelights error:', error)
  return data || []
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) console.error('fetchTasks error:', error)
  return data || []
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const { data, error } = await getSupabase()
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false })
  if (error) console.error('fetchSubmissions error:', error)
  return data || []
}

export async function fetchHuddles(): Promise<Huddle[]> {
  const { data, error } = await getSupabase()
    .from('huddles')
    .select('*')
    .order('huddle_date', { ascending: false })
  if (error) console.error('fetchHuddles error:', error)
  return data || []
}

export async function fetchTrainings(): Promise<Training[]> {
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

export async function fetchQuizzes(): Promise<Quiz[]> {
  const { data, error } = await getSupabase()
    .from('quizzes')
    .select('*, trainings(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) console.error('fetchQuizzes error:', error)
  return data || []
}

export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  const { data, error } = await getSupabase()
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order_no')
  if (error) console.error('fetchQuizQuestions error:', error)
  return data || []
}

// ─── Dashboard stats (fixes the missing export) ───────────────

export async function fetchDashboardStats() {
  const [delights, tasks, huddles] = await Promise.all([
    getSupabase().from('guest_delights').select('id, status, created_at'),
    getSupabase().from('tasks').select('id, status, created_at'),
    getSupabase().from('huddles').select('id, status, huddle_date').gte('huddle_date', new Date().toISOString().split('T')[0]).order('huddle_date'),
  ])
  return {
    delights: delights.data || [],
    tasks: tasks.data || [],
    upcomingHuddles: huddles.data || [],
  }
}

// ─── Butler activity calendar ─────────────────────────────────

export async function fetchButlerActivityForMonth(butlerId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`
  const endDate = `${year}-${String(month).padStart(2,'0')}-31`

  const [delights, tasks, huddles, trainings] = await Promise.all([
    getSupabase().from('guest_delights').select('id, booking_date, status, villa_name, booking_type').eq('your_name', butlerId).gte('booking_date', startDate).lte('booking_date', endDate),
    getSupabase().from('tasks').select('id, type, status, created_at').eq('butler_id', butlerId).gte('created_at', startDate).lte('created_at', endDate),
    getSupabase().from('huddle_attendance').select('huddle_id, attended, huddles(team, huddle_date)').eq('butler_id', butlerId),
    getSupabase().from('trainings').select('id, name, training_date, status').gte('training_date', startDate).lte('training_date', endDate),
  ])

  return {
    delights: delights.data || [],
    tasks: tasks.data || [],
    huddleAttendance: huddles.data || [],
    trainings: trainings.data || [],
  }
}

// ─── Insert / Update functions ────────────────────────────────

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

// Alias for submit page (was insertSubmission → maps to submissions table)
export async function insertSubmission(payload: any) {
  const { data, error } = await getSupabase()
    .from('submissions')
    .insert(payload)
    .select()
    .single()
  if (error) {
    // Fallback: insert into tasks table if submissions table doesn't exist yet
    console.warn('submissions table not found, inserting into tasks:', error)
    return insertTask({
      type: payload.task_type,
      butler_id: payload.butler_id,
      status: payload.status || 'pending',
      notes: payload.notes,
      photo_path: payload.photo_url,
    })
  }
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

// ─── Quiz management ──────────────────────────────────────────

export async function createQuiz(payload: {
  title: string
  description?: string
  training_id?: string | null
  pass_percentage?: number
  time_limit_minutes?: number | null
  questions: Array<{ question: string; type: string; options?: string[]; correct_answer: string; order_no: number }>
}) {
  const sb = getSupabase()
  const { data: { user } } = await sb.auth.getUser()

  const { data: quiz, error: quizErr } = await sb
    .from('quizzes')
    .insert({
      title: payload.title,
      description: payload.description || null,
      training_id: payload.training_id || null,
      created_by: user?.id || null,
      is_active: true,
      pass_percentage: payload.pass_percentage ?? 70,
      time_limit_minutes: payload.time_limit_minutes ?? null,
    })
    .select()
    .single()

  if (quizErr) return { data: null, error: quizErr }

  if (payload.questions.length > 0) {
    const { error: qErr } = await sb.from('quiz_questions').insert(
      payload.questions.map((q, i) => ({
        quiz_id: quiz.id,
        question: q.question,
        type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        order_no: i + 1,
      }))
    )
    if (qErr) console.error('createQuiz questions error:', qErr)
  }

  return { data: quiz, error: null }
}

export async function submitQuizAttempt(payload: {
  quiz_id: string
  butler_id: string
  answers: Record<string, string>
  score: number
  total: number
  passed: boolean
  time_taken_seconds?: number
}) {
  const { data, error } = await getSupabase()
    .from('quiz_attempts')
    .insert({
      quiz_id: payload.quiz_id,
      butler_id: payload.butler_id,
      score: payload.score,
      passed: payload.passed,
      attempted_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) console.error('submitQuizAttempt error:', error)
  return { data, error }
}

// ─── Storage functions ────────────────────────────────────────

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

// Upload delight photo and create delight_photos record
export async function uploadDelightPhoto(delightId: string, pointerKey: string, file: File, capturedAt?: string) {
  const path = `${delightId}/${pointerKey}_${Date.now()}.${file.name.split('.').pop()}`
  const { error: uploadErr, publicUrl } = await uploadPhoto(BUCKETS.delightPhotos, file, path)
  if (uploadErr) return { error: uploadErr }

  const { error: dbErr } = await getSupabase()
    .from('delight_photos')
    .insert({
      delight_id: delightId,
      pointer_key: pointerKey,
      storage_path: path,
      public_url: publicUrl,
      captured_at: capturedAt ? new Date().toISOString() : null,
    })
  return { error: dbErr }
}

// Upload task/submission photo
export async function uploadTaskPhoto(file: File, submissionId: string): Promise<string | null> {
  const path = `${submissionId}/${Date.now()}.${file.name.split('.').pop()}`
  const { error, publicUrl } = await uploadPhoto(BUCKETS.taskPhotos, file, path)
  if (error) return null
  return publicUrl
}
