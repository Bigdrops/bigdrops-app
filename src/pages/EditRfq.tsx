import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout'
import { RfqEditor } from '@/components/rfq/RfqEditor'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { denormalizeToDbRfq, denormalizeToDbRfqItem, normalizeDbRfq } from '@/domain/rfq/normalize'
import { supabase } from '@/supabase'
import { toast } from '@/hooks/use-toast'

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
        toast({ title: 'RFQ not found', variant: 'destructive' });
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
      toast({ title: 'Save failed', description: rfqError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Upsert items (delete and re-insert for simplicity)
    const { error: deleteError } = await supabase.from('rfq_items').delete().eq('rfq_id', id);
    if (deleteError) {
       toast({ title: 'Item save failed', description: deleteError.message, variant: 'destructive' });
       setSaving(false);
       return;
    }

    const dbItems = updatedItems
      .filter((item) => item.description?.trim())
      .map((item, idx) => denormalizeToDbRfqItem({ ...item, sort_order: idx }, id!));

    if (dbItems.length > 0) {
      const { error: itemsError } = await supabase.from('rfq_items').insert(dbItems);
      if (itemsError) {
        toast({ title: 'Item save failed', description: itemsError.message, variant: 'destructive' });
      }
    }

    setSaving(false);
    toast({ title: 'RFQ updated successfully' });
    navigate(`/rfqs/${id}`);
  };

  if (loading) {
    return <Layout title="Edit RFQ" session={null} hidePageHeader><div className="p-12 text-center text-muted-foreground animate-pulse">Loading Document...</div></Layout>;
  }

  return (
    <Layout title="Edit RFQ" session={null} hidePageHeader>
      <RfqEditor initialRfq={rfq!} initialItems={items} onSave={handleSave} saving={saving} />
    </Layout>
  );
}
