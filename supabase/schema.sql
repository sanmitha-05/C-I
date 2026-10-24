-- ============================================================
-- Raptee.HV FI Platform — Supabase Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('cce', 'field_intelligence', 'admin');

CREATE TYPE complaint_status AS ENUM (
  'pending',
  'escalated',
  'in_progress',
  'resolved',
  'not_resolved',
  'reopened'
);

CREATE TYPE escalation_reason AS ENUM (
  'technical_support_required',
  'need_further_investigation',
  'others'
);

CREATE TYPE action_taken AS ENUM (
  'software_update',
  'component_replacement',
  'repair_adjustment',
  'inspection_diagnosis',
  'customer_guidance',
  'other'
);

CREATE TYPE rnd_consultation AS ENUM (
  'completed',
  'required',
  'technical_team',
  'none',
  'other'
);

CREATE TYPE resolution_outcome AS ENUM (
  'fix_implemented_verified',
  'recommended_fix_pending',
  'further_investigation_required',
  'unable_to_reproduce',
  'no_fix_identified',
  'other'
);

CREATE TYPE root_cause_confidence AS ENUM ('suspected', 'confirmed');

-- ============================================================
-- USER PROFILES
-- Links to auth.users; contains role information
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'cce',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- COMPLAINTS (Module 1 — primary record)
-- ============================================================

CREATE TABLE IF NOT EXISTS complaints (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id          TEXT NOT NULL UNIQUE,
  date_of_report       DATE NOT NULL DEFAULT CURRENT_DATE,
  reported_by          UUID NOT NULL REFERENCES user_profiles(id),
  reported_by_name     TEXT NOT NULL,
  source               TEXT,
  customer_name        TEXT,
  customer_contact     TEXT,
  chassis_vin          TEXT NOT NULL,
  vehicle_model        TEXT,
  registration_number  TEXT,
  delivery_date        DATE,
  incident_problem     TEXT NOT NULL,
  issue_summary        TEXT,
  detailed_description TEXT NOT NULL,
  incident_date        DATE,
  incident_location    TEXT,
  fault_code           TEXT,
  priority             TEXT NOT NULL DEFAULT 'medium'
                         CHECK (priority IN ('low','medium','high','critical')),
  status               complaint_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for common searches
CREATE INDEX idx_complaints_incident_id ON complaints(incident_id);
CREATE INDEX idx_complaints_chassis_vin ON complaints(chassis_vin);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_date_of_report ON complaints(date_of_report);
CREATE INDEX idx_complaints_reported_by ON complaints(reported_by);

-- ============================================================
-- AUTO-GENERATE INCIDENT ID
-- Format: CI-YYYY-NNNN (e.g. CI-2026-0001)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_incident_id()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_seq  INTEGER;
BEGIN
  IF NEW.incident_id IS NULL OR NEW.incident_id = '' THEN
    year_str := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(incident_id FROM 9) AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM complaints
    WHERE incident_id LIKE 'CI-' || year_str || '-%';

    NEW.incident_id := 'CI-' || year_str || '-' || LPAD(next_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_id
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION generate_incident_id();

-- ============================================================
-- ESCALATIONS (Module 4)
-- ============================================================

CREATE TABLE IF NOT EXISTS escalations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id      UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  reason            escalation_reason NOT NULL,
  additional_notes  TEXT,
  escalated_by      UUID NOT NULL REFERENCES user_profiles(id),
  escalated_by_name TEXT NOT NULL,
  escalated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(complaint_id)   -- one escalation per complaint (can be updated)
);

CREATE INDEX idx_escalations_complaint_id ON escalations(complaint_id);

-- ============================================================
-- CCE RESOLUTIONS (Module 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS cce_resolutions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id      UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  action_taken      action_taken NOT NULL,
  action_details    TEXT NOT NULL,
  resolved_by       UUID NOT NULL REFERENCES user_profiles(id),
  resolved_by_name  TEXT NOT NULL,
  additional_notes  TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cce_resolutions_complaint_id ON cce_resolutions(complaint_id);

-- ============================================================
-- FI INVESTIGATIONS (Module 6)
-- ============================================================

CREATE TABLE IF NOT EXISTS fi_investigations (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id             UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  investigation_findings   TEXT,
  root_cause               TEXT,
  root_cause_confidence    root_cause_confidence,
  recommended_solution     TEXT NOT NULL DEFAULT '',
  rnd_consultation         rnd_consultation NOT NULL,
  consultation_details     TEXT,
  resolution_outcome       resolution_outcome NOT NULL,
  additional_notes         TEXT,
  submitted_by             UUID NOT NULL REFERENCES user_profiles(id),
  submitted_by_name        TEXT NOT NULL,
  submitted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(complaint_id)     -- one investigation per complaint (updated in place)
);

CREATE TRIGGER fi_investigations_updated_at
  BEFORE UPDATE ON fi_investigations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_fi_investigations_complaint_id ON fi_investigations(complaint_id);

-- ============================================================
-- COMPLAINT HISTORY (Module 7 — append-only audit log)
-- ============================================================

CREATE TABLE IF NOT EXISTS complaint_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id     UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  previous_status  complaint_status,
  new_status       complaint_status,
  actor_id         UUID NOT NULL REFERENCES user_profiles(id),
  actor_name       TEXT NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaint_history_complaint_id ON complaint_history(complaint_id);
CREATE INDEX idx_complaint_history_created_at ON complaint_history(created_at);

-- ============================================================
-- ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS attachments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id      UUID REFERENCES complaints(id) ON DELETE CASCADE,
  investigation_id  UUID REFERENCES fi_investigations(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  file_size         BIGINT NOT NULL,
  uploaded_by       UUID NOT NULL REFERENCES user_profiles(id),
  uploaded_by_name  TEXT NOT NULL,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (complaint_id IS NOT NULL OR investigation_id IS NOT NULL)
);

CREATE INDEX idx_attachments_complaint_id ON attachments(complaint_id);
CREATE INDEX idx_attachments_investigation_id ON attachments(investigation_id);

-- ============================================================
-- KNOWLEDGE BASE (Module 8 — historical reference records)
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_base (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_dataset       TEXT NOT NULL,
  source_file          TEXT,
  source_sheet         TEXT,
  source_row_id        TEXT,
  historical_ref_id    TEXT,
  fault_code           TEXT,
  issue_description    TEXT,
  vehicle_model        TEXT,
  component            TEXT,
  root_cause           TEXT,
  corrective_action    TEXT,
  investigation_outcome TEXT,
  original_date        DATE,
  import_batch         TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for knowledge base searches
CREATE INDEX idx_kb_fault_code ON knowledge_base(fault_code);
CREATE INDEX idx_kb_vehicle_model ON knowledge_base(vehicle_model);
CREATE INDEX idx_kb_source_dataset ON knowledge_base(source_dataset);
CREATE INDEX idx_kb_import_batch ON knowledge_base(import_batch);
-- Full-text search index
CREATE INDEX idx_kb_fts ON knowledge_base USING gin(
  to_tsvector('english',
    COALESCE(issue_description, '') || ' ' ||
    COALESCE(root_cause, '') || ' ' ||
    COALESCE(corrective_action, '') || ' ' ||
    COALESCE(component, '')
  )
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cce_resolutions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_investigations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base    ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---- user_profiles ----
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "System can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ---- complaints ----
-- All authenticated users can read complaints
CREATE POLICY "Authenticated users read complaints"
  ON complaints FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only CCE and admins can create complaints
CREATE POLICY "CCE can create complaints"
  ON complaints FOR INSERT
  WITH CHECK (get_user_role() IN ('cce', 'admin'));

-- CCE can update their own complaints; FI and admin can update any
CREATE POLICY "CCE updates own complaints"
  ON complaints FOR UPDATE
  USING (
    get_user_role() = 'admin' OR
    get_user_role() = 'field_intelligence' OR
    (get_user_role() = 'cce' AND reported_by = auth.uid())
  );

-- ---- escalations ----
CREATE POLICY "Authenticated users read escalations"
  ON escalations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "CCE can create escalations"
  ON escalations FOR INSERT
  WITH CHECK (get_user_role() IN ('cce', 'admin'));

CREATE POLICY "CCE can update escalations"
  ON escalations FOR UPDATE
  USING (get_user_role() IN ('cce', 'admin'));

-- ---- cce_resolutions ----
CREATE POLICY "Authenticated users read cce_resolutions"
  ON cce_resolutions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "CCE can create resolutions"
  ON cce_resolutions FOR INSERT
  WITH CHECK (get_user_role() IN ('cce', 'admin'));

-- ---- fi_investigations ----
CREATE POLICY "Authenticated users read fi_investigations"
  ON fi_investigations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "FI can create investigations"
  ON fi_investigations FOR INSERT
  WITH CHECK (get_user_role() IN ('field_intelligence', 'admin'));

CREATE POLICY "FI can update investigations"
  ON fi_investigations FOR UPDATE
  USING (get_user_role() IN ('field_intelligence', 'admin'));

-- ---- complaint_history ----
CREATE POLICY "Authenticated users read history"
  ON complaint_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Any authenticated user can append history"
  ON complaint_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---- attachments ----
CREATE POLICY "Authenticated users read attachments"
  ON attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---- knowledge_base ----
CREATE POLICY "Authenticated users read knowledge base"
  ON knowledge_base FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "FI can import to knowledge base"
  ON knowledge_base FOR INSERT
  WITH CHECK (get_user_role() IN ('field_intelligence', 'admin'));

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Dashboard > Storage)
-- Or use this as SQL reference; some must be done via the UI
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) 
--   VALUES ('complaint-attachments', 'complaint-attachments', FALSE);
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('fi-evidence', 'fi-evidence', FALSE);
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('kb-imports', 'kb-imports', FALSE);

-- Storage RLS (after creating buckets):
-- CREATE POLICY "Authenticated users can read attachments"
--   ON storage.objects FOR SELECT
--   USING (auth.uid() IS NOT NULL AND bucket_id IN ('complaint-attachments','fi-evidence'));
--
-- CREATE POLICY "Authenticated users can upload to complaint-attachments"
--   ON storage.objects FOR INSERT
--   WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'complaint-attachments');
--
-- CREATE POLICY "FI can upload to fi-evidence"
--   ON storage.objects FOR INSERT
--   WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'fi-evidence'
--     AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('field_intelligence','admin'));
--
-- CREATE POLICY "Admins can manage kb-imports"
--   ON storage.objects FOR ALL
--   USING (auth.uid() IS NOT NULL AND bucket_id = 'kb-imports'
--     AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('field_intelligence','admin'));
