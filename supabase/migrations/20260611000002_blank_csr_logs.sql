-- Create blank_csr_logs table
-- Tracks blank CSR numbers assigned for download
-- Mirrors blank_waybill_logs pattern
CREATE TABLE IF NOT EXISTS public.blank_csr_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_csr_number text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_csr_id uuid,
    reconciled_at timestamp with time zone,
    CONSTRAINT blank_csr_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_csr_logs_number_key UNIQUE (assigned_csr_number),
    CONSTRAINT blank_csr_logs_linked_csr_id_fkey FOREIGN KEY (linked_csr_id)
        REFERENCES public.csrs(id) ON DELETE SET NULL,
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_csr_id IS NULL AND reconciled_at IS NULL) OR
        (linked_csr_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_blank_csr_logs_linked_id
    ON public.blank_csr_logs(linked_csr_id);
