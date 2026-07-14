import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'

// SURL → imported as SUPABASE_URL from config
// SUPABASE_SERVICE_KEY → imported as SUPABASE_SERVICE_KEY from config
// H → use SUPABASE_SERVICE_HEADERS from config`, 'Content-Type': 'application/json' }

export async function GET() {
  // Test inserting with 'pending' status
  const test = await fetch(`${SUPABASE_URL}/rest/v1/guest_delights?select=id,status&limit=1`, { headers: SUPABASE_SERVICE_HEADERS })
  const testData = await test.json()
  
  return NextResponse.json({
    table_ok: test.ok,
    sample: testData,
    sql_to_run: `-- Run this in Supabase SQL Editor to fix the status constraint and add new columns:
ALTER TABLE guest_delights DROP CONSTRAINT IF EXISTS guest_delights_status_check;
ALTER TABLE guest_delights ADD CONSTRAINT guest_delights_status_check CHECK (status IN ('pending','completed','in_progress'));
ALTER TABLE guest_delights ADD COLUMN IF NOT EXISTS acknowledged_by UUID[] DEFAULT '{}';
ALTER TABLE delight_photos ADD COLUMN IF NOT EXISTS subtypes TEXT[] DEFAULT '{}';
ALTER TABLE delight_photos ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE;

-- Also needed for incidents and other features:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;
CREATE TABLE IF NOT EXISTS incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), villa TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium', description TEXT NOT NULL, reported_by TEXT NOT NULL, reporter_id UUID, squad TEXT, photo_url TEXT, voice_url TEXT, status TEXT NOT NULL DEFAULT 'open', resolved_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE IF NOT EXISTS butler_locations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), butler_id UUID NOT NULL, butler_name TEXT NOT NULL, squad TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS butler_locations_butler_id_idx ON butler_locations(butler_id);
CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, butler_id UUID NOT NULL, status TEXT NOT NULL DEFAULT 'absent', check_in TEXT, geo_lat DOUBLE PRECISION, geo_lng DOUBLE PRECISION, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS attendance_date_butler_idx ON attendance(date, butler_id);`
  })
}
