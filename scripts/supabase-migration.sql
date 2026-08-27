-- ============================================================
-- PULSE App — Supabase SQL Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Institutions (Hospitals & Clinics) ──────────────────────
CREATE TABLE IF NOT EXISTS institutions (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT,
  address      TEXT,
  district     TEXT,
  city         TEXT,
  rating       NUMERIC,
  "distanceKm" NUMERIC,
  "open24h"    BOOLEAN DEFAULT FALSE,
  phone        TEXT,
  lat          NUMERIC,
  lng          NUMERIC,
  categories   TEXT[],
  services     TEXT[],
  color        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable row-level security (read-only for all authenticated users)
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions_select" ON institutions FOR SELECT USING (true);
CREATE POLICY "institutions_service_role" ON institutions FOR ALL USING (auth.role() = 'service_role');

-- ── Emergency Contacts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phones      TEXT[],
  description TEXT,
  priority    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_contacts_select" ON emergency_contacts FOR SELECT USING (true);
CREATE POLICY "emergency_contacts_service_role" ON emergency_contacts FOR ALL USING (auth.role() = 'service_role');

-- ── Video Consultation Call Signalling ────────────────────────
-- Jitsi delivers the encrypted audio/video stream. This table only stores the
-- minimal call invitation state that lets the patient and provider join the
-- same room through Supabase Realtime.
CREATE TABLE IF NOT EXISTS calls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    TEXT NOT NULL,
  patient_id   TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  room_name    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting', 'accepted', 'rejected', 'ended')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calls_doctor_waiting_idx
  ON calls (doctor_id, created_at DESC)
  WHERE status = 'waiting';

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calls' AND policyname = 'calls_participant_select'
  ) THEN
    CREATE POLICY "calls_participant_select" ON calls
      FOR SELECT USING (auth.uid()::TEXT = patient_id OR auth.uid()::TEXT = doctor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calls' AND policyname = 'calls_patient_insert'
  ) THEN
    CREATE POLICY "calls_patient_insert" ON calls
      FOR INSERT WITH CHECK (auth.uid()::TEXT = patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calls' AND policyname = 'calls_participant_update'
  ) THEN
    CREATE POLICY "calls_participant_update" ON calls
      FOR UPDATE USING (auth.uid()::TEXT = patient_id OR auth.uid()::TEXT = doctor_id)
      WITH CHECK (auth.uid()::TEXT = patient_id OR auth.uid()::TEXT = doctor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calls' AND policyname = 'calls_service_role'
  ) THEN
    CREATE POLICY "calls_service_role" ON calls
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
  END IF;
END $$;

-- ── Seed: Institutions ───────────────────────────────────────
INSERT INTO institutions (id, name, type, address, district, city, rating, "distanceKm", "open24h", phone, lat, lng, categories, services, color) VALUES
('h1','Black Lion Hospital (Tikur Anbessa)','Government','Lideta Sub-City, Semen Mazoria','Lideta','Addis Ababa',4.2,1.4,true,'+251115511211',9.0201,38.7525,ARRAY['hospital','emergency'],ARRAY['Emergency','Surgery','Oncology','Cardiology','Neurology'],'#315d93'),
('h2','St. Paul''s Hospital Millennium Medical College','Government','Gulele Sub-City, Arbegnoch Rd','Gulele','Addis Ababa',4.5,2.1,true,'+251112750125',9.0292,38.7576,ARRAY['hospital','emergency'],ARRAY['Emergency','Maternity','Pediatrics','Orthopedics','Internal Medicine'],'#059669'),
('h3','Yekatit 12 Hospital','Government','Arada Sub-City, Ras Desta Damtew St','Arada','Addis Ababa',4.0,0.8,true,'+251111222200',9.0349,38.7467,ARRAY['hospital','emergency'],ARRAY['Emergency','Internal Medicine','Gynecology','Dermatology'],'#7C3AED'),
('h4','Hayat Medical Center','Private','Bole Sub-City, Africa Ave (Bole Rd)','Bole','Addis Ababa',4.6,3.5,true,'+251115574222',9.0052,38.7637,ARRAY['hospital','clinic'],ARRAY['General Medicine','Cardiology','Radiology','Physiotherapy','Pediatrics'],'#D97706'),
('h5','ALERT Hospital','Government','Nifas Silk-Lafto, Kolfe Keranio Area','Nifas Silk-Lafto','Addis Ababa',4.3,4.8,true,'+251113711200',9.0287,38.7467,ARRAY['hospital','emergency'],ARRAY['Emergency','Leprosy Treatment','Rehabilitation','Surgery'],'#DC2626'),
('h6','Korean Hospital (Myungsung Christian Medical Center)','Mission','Bole Sub-City, Gerji Area','Bole','Addis Ababa',4.8,5.2,false,'+251116298888',9.0189,38.7712,ARRAY['hospital','clinic'],ARRAY['General Medicine','Pediatrics','Ophthalmology','Oncology','Surgery'],'#315d93'),
('h7','Nordic Medical Center','Private','Bole Sub-City, Kazanchis Area','Bole','Addis Ababa',4.7,2.9,false,'+251116639833',9.0224,38.7594,ARRAY['clinic','hospital'],ARRAY['General Practice','Dental','Gynecology','Lab Services','Radiology'],'#059669'),
('h8','Amen Hospital','Private','Kirkos Sub-City, Meskel Square Area','Kirkos','Addis Ababa',4.5,1.2,true,'+251114672222',9.0179,38.7608,ARRAY['hospital','emergency'],ARRAY['Emergency','ICU','Internal Medicine','Maternity','Surgery'],'#7C3AED'),
('h9','Menelik II Hospital','Government','Entoto Road, Addis Ketema Sub-City','Addis Ketema','Addis Ababa',4.0,3.1,true,'+251111126466',9.0338,38.7581,ARRAY['hospital','emergency'],ARRAY['Emergency','Ophthalmology','ENT','Orthopedics','Internal Medicine'],'#D97706'),
('h10','Bete-Zata Hospital','Private','Bole Sub-City, Sarbet Area','Bole','Addis Ababa',4.4,6.0,false,'+251116624488',9.0024,38.7520,ARRAY['hospital','clinic'],ARRAY['Maternity','Gynecology','Pediatrics','General Surgery','Dermatology'],'#DC2626')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Emergency Contacts ─────────────────────────────────
INSERT INTO emergency_contacts (id, name, phones, description, priority) VALUES
('e1','Ethiopian Red Cross Ambulance',ARRAY['907','+251115527110'],'National emergency ambulance service — 24/7','critical'),
('e2','Tebita Ambulance (Private)',ARRAY['8035','+251911225464','+251911641609','+251116616342'],'Private ambulance service, Addis Ababa — 24/7','critical'),
('e3','Black Lion Hospital Emergency',ARRAY['+251115511211'],'Major referral hospital emergency room','high'),
('e4','St. Paul''s Hospital Emergency',ARRAY['+251112750125'],'Government teaching hospital ER — 24/7','high'),
('e5','ALERT Hospital Emergency',ARRAY['+251113711200'],'Emergency & trauma center — 24/7','high'),
('e6','Police Emergency',ARRAY['991'],'National police emergency','medium'),
('e7','Fire Emergency',ARRAY['939'],'National fire emergency service','medium')
ON CONFLICT (id) DO NOTHING;
