-- ============================================================
-- StayVista Butler Ops — Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'butler' check (role in ('super_admin','ops_manager','butler','trainer')),
  squad       text,
  property_id text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── PROPERTIES ──────────────────────────────────────────────
create table if not exists properties (
  id       text primary key,
  name     text not null,
  location text,
  status   text not null default 'occupied' check (status in ('occupied','partial','vacant'))
);
alter table properties enable row level security;
create policy "Authenticated can view properties" on properties for select using (auth.role() = 'authenticated');
create policy "Admins can manage properties" on properties for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);

-- Seed properties
insert into properties (id, name, location, status) values
  ('vs', 'Villa Serenity', 'Lonavala', 'occupied'),
  ('ca', 'Casa Azure',     'Alibaug',  'occupied'),
  ('th', 'The Hillside',   'Karjat',   'partial'),
  ('vb', 'Villa Bloom',    'Nashik',   'vacant'),
  ('cp', 'Casa Paradiso',  'Pune',     'occupied')
on conflict (id) do nothing;

-- ─── GUEST DELIGHTS ──────────────────────────────────────────
create table if not exists guest_delights (
  id           uuid primary key default gen_random_uuid(),
  your_name    text not null,
  squad        text,
  booking_date date not null,
  booking_id   text,
  villa_name   text not null,
  booking_type text not null default 'Standard',
  status       text not null default 'pending' check (status in ('pending','completed','overdue')),
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now()
);
alter table guest_delights enable row level security;
create policy "Authenticated can view delights" on guest_delights for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert delights" on guest_delights for insert with check (auth.role() = 'authenticated');
create policy "Owner or admin can update delights" on guest_delights for update using (
  auth.uid() = created_by or
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);

-- ─── DELIGHT PHOTOS ──────────────────────────────────────────
create table if not exists delight_photos (
  id           uuid primary key default gen_random_uuid(),
  delight_id   uuid not null references guest_delights(id) on delete cascade,
  pointer_key  text not null,
  storage_path text not null,
  public_url   text,
  captured_at  timestamptz,
  uploaded_at  timestamptz default now()
);
alter table delight_photos enable row level security;
create policy "Authenticated can view delight photos" on delight_photos for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert delight photos" on delight_photos for insert with check (auth.role() = 'authenticated');

-- ─── TASKS ───────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  property_id  text references properties(id),
  butler_id    uuid references auth.users(id),
  status       text not null default 'pending' check (status in ('pending','completed','delayed')),
  due_time     text,
  completed_at timestamptz,
  photo_path   text,
  notes        text,
  created_at   timestamptz default now()
);
alter table tasks enable row level security;
create policy "Authenticated can view tasks" on tasks for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert tasks" on tasks for insert with check (auth.role() = 'authenticated');
create policy "Assigned butler or admin can update task" on tasks for update using (
  auth.uid() = butler_id or
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);

-- ─── SUBMISSIONS ─────────────────────────────────────────────
create table if not exists submissions (
  id              uuid primary key default gen_random_uuid(),
  butler_id       uuid references auth.users(id),
  butler_name     text not null,
  task_type       text not null,
  property        text not null,
  date_of_service date not null,
  submitted_at    timestamptz default now(),
  notes           text,
  photo_url       text,
  status          text not null default 'pending' check (status in ('pending','approved'))
);
alter table submissions enable row level security;
create policy "Authenticated can view submissions" on submissions for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert submissions" on submissions for insert with check (auth.role() = 'authenticated');
create policy "Admins can update submissions" on submissions for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);

-- ─── HUDDLES ─────────────────────────────────────────────────
create table if not exists huddles (
  id                    uuid primary key default gen_random_uuid(),
  team                  text not null,
  huddle_date           date not null,
  time                  text,
  participants_expected int not null default 8,
  status                text not null default 'scheduled' check (status in ('scheduled','tbc','completed','cancelled')),
  notes                 text,
  created_at            timestamptz default now()
);
alter table huddles enable row level security;
create policy "Authenticated can view huddles" on huddles for select using (auth.role() = 'authenticated');
create policy "Admins can manage huddles" on huddles for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);

-- ─── TRAININGS ───────────────────────────────────────────────
create table if not exists trainings (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  training_date date,
  type          text not null default 'Functional' check (type in ('Functional','Mandatory')),
  total_seats   int not null default 8,
  status        text not null default 'planned' check (status in ('planned','upcoming','completed')),
  has_quiz      boolean not null default false,
  created_at    timestamptz default now()
);
alter table trainings enable row level security;
create policy "Authenticated can view trainings" on trainings for select using (auth.role() = 'authenticated');
create policy "Admins can manage trainings" on trainings for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager','trainer'))
);

-- ─── CREDENTIALS ─────────────────────────────────────────────
create table if not exists credentials (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  type           text not null,
  property       text not null,
  value          text not null,
  expiry         text,
  expiry_warning boolean not null default false,
  created_at     timestamptz default now()
);
alter table credentials enable row level security;
create policy "Admins can view credentials" on credentials for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);
create policy "Admins can manage credentials" on credentials for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','ops_manager'))
);

-- ─── STORAGE BUCKETS ─────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('delight-photos',     'delight-photos',     true),
  ('task-photos',        'task-photos',         true),
  ('training-materials', 'training-materials',  false)
on conflict (id) do nothing;

create policy "Authenticated can upload delight photos"
  on storage.objects for insert with check (bucket_id = 'delight-photos' and auth.role() = 'authenticated');
create policy "Anyone can view delight photos"
  on storage.objects for select using (bucket_id = 'delight-photos');

create policy "Authenticated can upload task photos"
  on storage.objects for insert with check (bucket_id = 'task-photos' and auth.role() = 'authenticated');
create policy "Anyone can view task photos"
  on storage.objects for select using (bucket_id = 'task-photos');
