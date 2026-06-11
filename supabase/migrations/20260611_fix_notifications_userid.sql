-- Fix notifications table: user_id references auth.users but we use profiles.id
-- Drop the FK constraint and change to plain UUID so local session IDs work

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Also add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
