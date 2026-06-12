-- Butler live locations table
CREATE TABLE IF NOT EXISTS butler_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  butler_id UUID NOT NULL,
  butler_name TEXT NOT NULL,
  squad TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one row per butler (upsert on butler_id)
CREATE UNIQUE INDEX IF NOT EXISTS butler_locations_butler_id_idx ON butler_locations(butler_id);

-- Add geo columns to attendance table for check-in location
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;
