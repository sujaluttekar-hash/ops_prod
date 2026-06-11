-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor
-- Clears all seeded / sample training data
-- Only removes rows inserted by the schema seed, not real ones
-- ============================================================

-- Clear sample trainings (the 4 hardcoded ones from schema)
DELETE FROM trainings WHERE name IN (
  'F&B service standards',
  'Guest communication & etiquette',
  'Property knowledge deep-dive',
  'Safety & emergency protocols'
);

-- The table is now empty and will only show trainings you schedule
-- via the "Schedule training" button in the app.
