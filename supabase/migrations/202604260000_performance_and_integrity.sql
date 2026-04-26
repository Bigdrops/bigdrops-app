-- 1. Atomic Transaction RPCs for Invoices

CREATE OR REPLACE FUNCTION delete_invoice_transaction(p_invoice_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;
    DELETE FROM invoices WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION revert_invoice_to_quotation_transaction(
    p_invoice_id UUID,
    p_quotation_payload JSONB,
    p_quotation_items_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_created_quotation JSONB;
    v_quotation_id UUID;
    v_row quotations;
    v_item JSONB;
BEGIN
    -- Insert quotation
    INSERT INTO quotations (
        quotation_number, po_number, quotation_title, client_id, client_name, project_id,
        issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping,
        discount, vat, wht, subtotal, install_rate_total, total, amount_in_words, custom_fields
    )
    SELECT
        p_quotation_payload->>'quotation_number',
        p_quotation_payload->>'po_number',
        p_quotation_payload->>'quotation_title',
        NULLIF(p_quotation_payload->>'client_id', '')::UUID,
        p_quotation_payload->>'client_name',
        NULLIF(p_quotation_payload->>'project_id', '')::UUID,
        (p_quotation_payload->>'issue_date')::DATE,
        (p_quotation_payload->>'valid_until')::DATE,
        p_quotation_payload->>'status',
        p_quotation_payload->>'notes',
        p_quotation_payload->>'terms',
        COALESCE((p_quotation_payload->>'workmanship')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'transportation')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'shipping')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'discount')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'vat')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'wht')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'subtotal')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'install_rate_total')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'total')::NUMERIC, 0),
        p_quotation_payload->>'amount_in_words',
        (p_quotation_payload->>'custom_fields')::JSONB
    RETURNING * INTO v_row;

    v_created_quotation := to_jsonb(v_row);
    v_quotation_id := v_row.id;

    -- Insert quotation items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_quotation_items_payload)
    LOOP
        INSERT INTO quotation_items (
            quotation_id, description, quantity, unit_price, amount, 
            unit, list_index, row_type, group_name
        )
        VALUES (
            v_quotation_id,
            v_item->>'description',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            v_item->>'unit',
            (v_item->>'list_index')::INTEGER,
            v_item->>'row_type',
            v_item->>'group_name'
        );
    END LOOP;

    -- Delete invoice items and invoice
    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;
    DELETE FROM invoices WHERE id = p_invoice_id;

    RETURN v_created_quotation;
END;
$$;

-- 2. Indexes for Foreign Keys and Lookups
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_waybill_items_waybill_id ON waybill_items(waybill_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_boq_id ON boq_items(boq_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_csrs_project_id ON csrs(project_id);
CREATE INDEX IF NOT EXISTS idx_waybills_project_id ON waybills(project_id);

-- Payment and linked quotes
-- Assuming payments table exists with invoice_id
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_linked_quote_id ON invoices(linked_quote_id);
CREATE INDEX IF NOT EXISTS idx_csrs_linked_invoice_id ON csrs(linked_invoice_id);

-- Sync Queue fields (if present)
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

-- 3. GIN index for JSONB custom_fields for containment queries
CREATE INDEX IF NOT EXISTS idx_invoices_custom_fields_gin ON invoices USING GIN (custom_fields);
