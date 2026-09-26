import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout'
import { RfqEditor } from '@/components/rfq/RfqEditor'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { denormalizeToDbRfq, denormalizeToDbRfqItem, getNextRfqNumber } from '@/domain/rfq/normalize'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { parseTrailingSequence } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'

export default function NewRfq() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { tenantClient } = useEntity();
  const [saving, setSaving] = useState(false);

  const handleSave = async (rfq: Rfq, items: RfqItem[]) => {
    setSaving(true);

    const rfqPrefix = resolvePrefix(settings?.document_prefixes, 'rfq');
    const rfqFamily = `${rfqPrefix}-`;
    // The field starts empty, so any non-empty value was explicitly typed.
    const manualNumber = String(rfq.rfq_number || '').trim() || undefined;

    const { data: createdRfq, error: rfqError } = await withUniqueRetry(
      async (candidateNumber: string) => {
        const dbRfq = denormalizeToDbRfq({ ...rfq, rfq_number: candidateNumber });
        return tenantClient.from('rfqs').insert([dbRfq]).select().single();
      },
      async () => {
        const [{ data: rows }, cursor] = await Promise.all([
          tenantClient.from('rfqs').select('rfq_number'),
          fetchAutoCursor(tenantClient, rfqFamily),
        ]);
        return getNextRfqNumber(rows || [], rfqPrefix, cursor);
      },
      manualNumber,
    );

    // Advance the automatic cursor only for system-generated numbers.
    if (!rfqError && createdRfq && !manualNumber) {
      const seq = parseTrailingSequence((createdRfq as { rfq_number?: string | null })?.rfq_number);
      if (seq !== null) await advanceAutoCursor(tenantClient, rfqFamily, seq);
    }

    if (rfqError || !createdRfq) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(rfqError, { action: 'save' }),
      });
      setSaving(false);
      return;
    }

    const { id: rfqId } = createdRfq;
    const dbItems = items
      .filter((item) => item.description?.trim())
      .map((item, idx) => denormalizeToDbRfqItem({ ...item, sort_order: idx }, rfqId));

    if (dbItems.length > 0) {
      const { error: itemsError } = await tenantClient.from('rfq_items').insert(dbItems);
      if (itemsError) {
        feedback.error('Item save failed', { description: itemsError.message });
        // Optionally delete the parent RFQ here but let's keep it for now
      }
    }

    setSaving(false);
    feedback.success('RFQ created successfully');
    navigate(`/rfqs/${rfqId}`);
  };

  return (
    <Layout title="New RFQ" session={null} hidePageHeader immersive>
      <RfqEditor onSave={handleSave} saving={saving} />
    </Layout>
  );
}
