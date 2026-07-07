import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout'
import { RfqEditor } from '@/components/rfq/RfqEditor'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { denormalizeToDbRfq, denormalizeToDbRfqItem, normalizeDbRfq } from '@/domain/rfq/normalize'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'

export default function EditRfq() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [items, setItems] = useState<RfqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rfqResult, itemsResult] = await Promise.all([
        supabase.from('rfqs').select('*').eq('id', id).single(),
        supabase.from('rfq_items').select('*').eq('rfq_id', id).order('sort_order'),
      ]);

      if (rfqResult.data) {
        setRfq(normalizeDbRfq(rfqResult.data, itemsResult.data || []));
        setItems(itemsResult.data || []);
      } else {
        feedback.error('RFQ not found');
        navigate('/rfqs');
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const handleSave = async (updatedRfq: Rfq, updatedItems: RfqItem[]) => {
    setSaving(true);
    const dbRfq = denormalizeToDbRfq(updatedRfq);
    const { error: rfqError } = await supabase
      .from('rfqs')
      .update(dbRfq)
      .eq('id', id);

    if (rfqError) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(rfqError, { action: 'save' }),
      });
      setSaving(false);
      return;
    }

    // Upsert items (delete and re-insert for simplicity)
    const { error: deleteError } = await supabase.from('rfq_items').delete().eq('rfq_id', id);
    if (deleteError) {
       feedback.error('Item save failed', {
         description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
       });
       setSaving(false);
       return;
    }

    const dbItems = updatedItems
      .filter((item) => item.description?.trim())
      .map((item, idx) => denormalizeToDbRfqItem({ ...item, sort_order: idx }, id!));

    if (dbItems.length > 0) {
      const { error: itemsError } = await supabase.from('rfq_items').insert(dbItems);
      if (itemsError) {
        feedback.error('Item save failed', { description: itemsError.message });
      }
    }

    setSaving(false);
    feedback.success('RFQ updated successfully');
    navigate(`/rfqs/${id}`);
  };

  if (loading) {
    return <Layout title="Edit RFQ" session={null} hidePageHeader immersive><div className="p-12 text-center text-muted-foreground animate-pulse">Loading Document...</div></Layout>;
  }

  return (
    <Layout title="Edit RFQ" session={null} hidePageHeader immersive>
      <RfqEditor initialRfq={rfq!} initialItems={items} onSave={handleSave} saving={saving} />
    </Layout>
  );
}
