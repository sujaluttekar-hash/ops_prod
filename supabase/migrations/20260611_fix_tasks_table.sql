-- Fix 1: Add updated_at column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Fix 2: Drop FK constraint on butler_id (references auth.users but we use profiles.id)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_butler_id_fkey;

-- Fix 3: Also drop property_id FK (we store text names not UUIDs)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_property_id_fkey;

-- Fix 4: Rebuild indexes
CREATE INDEX IF NOT EXISTS idx_tasks_butler ON tasks(butler_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Fix 3: Drop the type CHECK constraint so custom task types can be stored
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
