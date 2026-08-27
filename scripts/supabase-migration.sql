-- ============================================================
-- PULSE App — Supabase SQL Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Categorized private uploads ──────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-uploads', 'user-uploads', FALSE, 209715200)
ON CONFLICT (id) DO UPDATE
SET public = FALSE, file_size_limit = EXCLUDED.file_size_limit;

CREATE TABLE IF NOT EXISTS public.user_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'profile_image', 'payment_proof', 'provider_license', 'institute_license',
    'certificate', 'radiology_image', 'radiology_video'
  )),
  bucket TEXT NOT NULL DEFAULT 'user-uploads' CHECK (bucket = 'user-uploads'),
  storage_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 209715200),
  related_table TEXT,
  related_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deletion_pending', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.user_uploads
  DROP CONSTRAINT IF EXISTS user_uploads_status_check;
ALTER TABLE public.user_uploads
  ADD CONSTRAINT user_uploads_status_check
  CHECK (status IN ('active', 'deletion_pending', 'deleted'));

ALTER TABLE IF EXISTS public."medicalRecords"
  ADD COLUMN IF NOT EXISTS "fileUploadId" UUID REFERENCES public.user_uploads(id),
  ADD COLUMN IF NOT EXISTS "assignedRadiologistId" TEXT;

CREATE INDEX IF NOT EXISTS user_uploads_owner_category_idx
  ON public.user_uploads (owner_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS user_uploads_related_idx
  ON public.user_uploads (related_table, related_id)
  WHERE status = 'active';

ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_radiology_upload(upload_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."medicalRecords" mr
    WHERE mr."fileUploadId" = upload_id
      AND mr."assignedRadiologistId" = auth.uid()::TEXT
      AND EXISTS (
        SELECT 1
        FROM public.doctors d
        WHERE d."userId" = auth.uid()::TEXT
          AND d.status = 'Active'
          AND (d.specialty ILIKE '%radio%' OR d."providerType" ILIKE '%radio%')
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_radiology_upload(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_radiology_upload(UUID) TO authenticated;

DROP POLICY IF EXISTS user_uploads_owner_select ON public.user_uploads;
DROP POLICY IF EXISTS user_uploads_owner_insert ON public.user_uploads;
DROP POLICY IF EXISTS user_uploads_owner_update ON public.user_uploads;
DROP POLICY IF EXISTS user_uploads_radiologist_select ON public.user_uploads;
DROP POLICY IF EXISTS user_uploads_service_role ON public.user_uploads;

CREATE POLICY "user_uploads_owner_select" ON public.user_uploads
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "user_uploads_owner_insert" ON public.user_uploads
  FOR INSERT WITH CHECK (owner_id = auth.uid() AND split_part(storage_path, '/', 1) = auth.uid()::TEXT);
CREATE POLICY "user_uploads_owner_update" ON public.user_uploads
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "user_uploads_radiologist_select" ON public.user_uploads
  FOR SELECT USING (
    category IN ('radiology_image', 'radiology_video')
    AND public.can_access_radiology_upload(id)
  );
CREATE POLICY "user_uploads_service_role" ON public.user_uploads
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS user_uploads_objects_insert ON storage.objects;
DROP POLICY IF EXISTS user_uploads_objects_select ON storage.objects;
DROP POLICY IF EXISTS user_uploads_objects_delete ON storage.objects;

CREATE POLICY "user_uploads_objects_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-uploads' AND split_part(name, '/', 1) = auth.uid()::TEXT);
CREATE POLICY "user_uploads_objects_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (
      split_part(name, '/', 1) = auth.uid()::TEXT
      OR (
        split_part(name, '/', 2) IN ('radiology_image', 'radiology_video')
        AND EXISTS (
          SELECT 1
          FROM public.user_uploads u
          WHERE u.storage_path = storage.objects.name
            AND public.can_access_radiology_upload(u.id)
        )
      )
    )
  );
CREATE POLICY "user_uploads_objects_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-uploads' AND split_part(name, '/', 1) = auth.uid()::TEXT);

ALTER TABLE IF EXISTS public.doctors
  ADD COLUMN IF NOT EXISTS "profileImageUploadId" UUID REFERENCES public.user_uploads(id),
  ADD COLUMN IF NOT EXISTS "licenseUploadId" UUID REFERENCES public.user_uploads(id);
ALTER TABLE IF EXISTS public.institute_pulse
  ADD COLUMN IF NOT EXISTS "licenseUploadId" UUID REFERENCES public.user_uploads(id);

-- Provider and institute map coordinates are nullable, but must be stored as a
-- complete, valid pair. (0,0) is rejected because legacy UI used it as a
-- missing-location placeholder.
ALTER TABLE IF EXISTS public.doctors
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE IF EXISTS public.institute_pulse
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

ALTER TABLE IF EXISTS public.doctors
  DROP CONSTRAINT IF EXISTS doctors_location_pair_valid;
ALTER TABLE IF EXISTS public.doctors
  ADD CONSTRAINT doctors_location_pair_valid CHECK (
    (lat IS NULL AND lng IS NULL)
    OR (
      lat IS NOT NULL
      AND lng IS NOT NULL
      AND lat BETWEEN -90 AND 90
      AND lng BETWEEN -180 AND 180
      AND lat <> 0
      AND lng <> 0
    )
  ) NOT VALID;

ALTER TABLE IF EXISTS public.institute_pulse
  DROP CONSTRAINT IF EXISTS institute_pulse_location_pair_valid;
ALTER TABLE IF EXISTS public.institute_pulse
  ADD CONSTRAINT institute_pulse_location_pair_valid CHECK (
    (lat IS NULL AND lng IS NULL)
    OR (
      lat IS NOT NULL
      AND lng IS NOT NULL
      AND lat BETWEEN -90 AND 90
      AND lng BETWEEN -180 AND 180
      AND lat <> 0
      AND lng <> 0
    )
  ) NOT VALID;
ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS "paymentProofUploadId" UUID REFERENCES public.user_uploads(id);
CREATE OR REPLACE FUNCTION public.enforce_user_upload_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.bucket IS DISTINCT FROM OLD.bucket
    OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
    OR NEW.original_name IS DISTINCT FROM OLD.original_name
    OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
    OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Upload identity and file metadata are immutable';
  END IF;
  IF OLD.status = 'deleted' AND NEW.status <> 'deleted' THEN
    RAISE EXCEPTION 'Deleted uploads cannot be restored';
  END IF;
  IF OLD.status = 'deletion_pending' AND NEW.status NOT IN ('deletion_pending', 'deleted') THEN
    RAISE EXCEPTION 'Uploads pending deletion cannot be restored';
  END IF;
  IF NEW.status = 'deleted' AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'deleted_at is required for deleted uploads';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_uploads_enforce_update ON public.user_uploads;
CREATE TRIGGER user_uploads_enforce_update
  BEFORE UPDATE ON public.user_uploads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_upload_update();

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
DROP POLICY IF EXISTS institutions_select ON institutions;
DROP POLICY IF EXISTS institutions_service_role ON institutions;
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
DROP POLICY IF EXISTS emergency_contacts_select ON emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_service_role ON emergency_contacts;
CREATE POLICY "emergency_contacts_select" ON emergency_contacts FOR SELECT USING (true);
CREATE POLICY "emergency_contacts_service_role" ON emergency_contacts FOR ALL USING (auth.role() = 'service_role');

-- ── Video Consultation Call Signalling ────────────────────────
-- Jitsi delivers the audio/video stream. This table only stores the minimal
-- invitation state that lets the patient and provider join the same private,
-- cryptographically random room through Supabase Realtime.
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

-- All new invitations must use the 128-bit token format generated by the app.
-- NOT VALID preserves legacy records while still enforcing the rule on inserts.
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_room_name_format;
ALTER TABLE calls ADD CONSTRAINT calls_room_name_format
  CHECK (room_name ~ '^pulse-[0-9a-f]{32}$') NOT VALID;

-- Participant IDs, patient details, and room token become immutable after a
-- patient creates an invitation. The trigger also limits status transitions:
-- patient: waiting/accepted -> ended; provider: waiting -> accepted/rejected,
-- or accepted -> ended. Service-role maintenance remains unrestricted.
CREATE OR REPLACE FUNCTION public.enforce_call_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
    OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
    OR NEW.patient_name IS DISTINCT FROM OLD.patient_name
    OR NEW.room_name IS DISTINCT FROM OLD.room_name
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Call invitation details cannot be changed';
  END IF;

  IF auth.uid()::TEXT = OLD.patient_id
    AND OLD.status IN ('waiting', 'accepted')
    AND NEW.status = 'ended' THEN
    RETURN NEW;
  END IF;

  IF auth.uid()::TEXT = OLD.doctor_id
    AND (
      (OLD.status = 'waiting' AND NEW.status IN ('accepted', 'rejected'))
      OR (OLD.status = 'accepted' AND NEW.status = 'ended')
    ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid call status transition';
END;
$$;

DROP TRIGGER IF EXISTS calls_enforce_update ON calls;
CREATE TRIGGER calls_enforce_update
  BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION public.enforce_call_update();

DROP POLICY IF EXISTS calls_participant_select ON calls;
DROP POLICY IF EXISTS calls_patient_insert ON calls;
DROP POLICY IF EXISTS calls_participant_update ON calls;
DROP POLICY IF EXISTS calls_patient_end ON calls;
DROP POLICY IF EXISTS calls_doctor_status_transition ON calls;
DROP POLICY IF EXISTS calls_service_role ON calls;

CREATE POLICY "calls_participant_select" ON calls
  FOR SELECT USING (auth.uid()::TEXT = patient_id OR auth.uid()::TEXT = doctor_id);

CREATE POLICY "calls_patient_insert" ON calls
  FOR INSERT WITH CHECK (auth.uid()::TEXT = patient_id);

CREATE POLICY "calls_patient_end" ON calls
  FOR UPDATE
  USING (auth.uid()::TEXT = patient_id AND status IN ('waiting', 'accepted'))
  WITH CHECK (auth.uid()::TEXT = patient_id AND status = 'ended');

CREATE POLICY "calls_doctor_status_transition" ON calls
  FOR UPDATE
  USING (auth.uid()::TEXT = doctor_id AND status IN ('waiting', 'accepted'))
  WITH CHECK (auth.uid()::TEXT = doctor_id AND status IN ('accepted', 'rejected', 'ended'));

CREATE POLICY "calls_service_role" ON calls
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

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
