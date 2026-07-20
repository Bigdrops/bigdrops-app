-- Domain: Letters (Official Correspondence)
-- Created: 2026-07-10
-- Spec: docs/prd/Correspondence-module.md

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS letters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  letter_number     text NOT NULL,
  recipient_id      uuid,
  recipient_name    text NOT NULL,
  recipient_address text,
  subject           text NOT NULL,
  body              jsonb NOT NULL DEFAULT '[]'::jsonb,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','issued','archived','cancelled')),
  custom_fields     jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  updated_at        timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_letters_number     ON letters (letter_number);
CREATE INDEX        IF NOT EXISTS idx_letters_tenant     ON letters (tenant_id);
CREATE INDEX        IF NOT EXISTS idx_letters_status     ON letters (status);
CREATE INDEX        IF NOT EXISTS idx_letters_created_at ON letters (created_at DESC);

-- ============================================================
-- PREFIX FORMAT: {prefix}-{serial}
-- Letter prefix is validated in TypeScript; DB stores raw text.
-- ============================================================

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY letters_authenticated_select ON letters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY letters_authenticated_insert ON letters
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_approved = true
    )
  );

CREATE POLICY letters_authenticated_update ON letters
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY letters_authenticated_delete ON letters
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_letters_set_updated_at
  BEFORE UPDATE ON letters
  FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

CREATE TRIGGER trg_letters_stamp_ownership
  BEFORE INSERT OR UPDATE ON letters
  FOR EACH ROW EXECUTE FUNCTION stamp_row_ownership();
