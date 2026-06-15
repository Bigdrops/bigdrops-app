-- Add document_prefixes JSONB column to settings table
-- Stores configurable prefix per document type for the prefix engine
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS document_prefixes jsonb DEFAULT '{
  "waybill": "WBL",
  "invoice": "INV",
  "boq": "BOQ",
  "rfq": "RFQ",
  "quotation": "QTN",
  "project": "PRJ",
  "csr": "CSR"
}'::jsonb;

ALTER TABLE settings
ADD CONSTRAINT check_document_prefixes_format CHECK (
  document_prefixes IS NULL OR (
    jsonb_typeof(document_prefixes) = 'object' AND
    (document_prefixes->>'waybill')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'invoice')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'boq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'rfq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'quotation') ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'project')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'csr')       ~ '^[A-Z0-9]{2,6}$'
  )
);
