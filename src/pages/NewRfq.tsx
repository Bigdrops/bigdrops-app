import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout'
import { RfqEditor } from '@/components/rfq/RfqEditor'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { denormalizeToDbRfq, denormalizeToDbRfqItem, getNextRfqNumber } from '@/domain/rfq/normalize'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'

export default function NewRfq() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSave = async (rfq: Rfq, items: RfqItem[]) => {
    setSaving(true);
    
    // Get next RFQ number
    const { data: existingRfqs } = await supabase.from('rfqs').select('rfq_number');
    const rfqNumber = rfq.rfq_number || getNextRfqNumber(existingRfqs || []);

    const dbRfq = denormalizeToDbRfq({ ...rfq, rfq_number: rfqNumber });
    const { data: createdRfq, error: rfqError } = await supabase
      .from('rfqs')
      .insert([dbRfq])
      .select()
      .single();

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
      const { error: itemsError } = await supabase.from('rfq_items').insert(dbItems);
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
    <Layout title="New RFQ" session={null} hidePageHeader>
      <RfqEditor onSave={handleSave} saving={saving} />
    </Layout>
  );
}
