import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplierForm } from '@/components/supplier/SupplierForm'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { invalidateListCache, supplierListCacheKey } from '@/lib/cache/listCache'
import { getSupplier, updateSupplier } from '@/modules/supplier/supplierService'
import { supplierFormFromRecord, type SupplierFormValues } from '@/domain/supplier/types'
import Layout from '../components/Layout'
import { pageFormCardClassName } from '@/components/ui/form-page-styles'

export default function EditSupplier() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantClient, schemaName } = useEntity()
  const [supplier, setSupplier] = useState<Partial<SupplierFormValues>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [archivedNotice, setArchivedNotice] = useState(false)

  const load = useCallback(async () => {
    if (!id || !tenantClient.isReady) return
    const { data, error } = await getSupplier(tenantClient, id)
    if (error || !data) {
      feedback.error('Failed to load supplier', { description: error || undefined })
    } else {
      setSupplier(supplierFormFromRecord(data))
      setArchivedNotice(Boolean(data.archived_at))
    }
    setLoading(false)
  }, [id, tenantClient.isReady])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async (data: SupplierFormValues) => {
    if (!id) return
    setSaving(true)
    const { data: updated, error } = await updateSupplier(tenantClient, id, data)
    setSaving(false)

    if (error || !updated) {
      feedback.error('Save failed', { description: error || 'Failed to save supplier' })
      return
    }

    feedback.success('Supplier updated')
    if (schemaName) invalidateListCache(supplierListCacheKey(schemaName))
    navigate('/suppliers')
  }

  return (
    <Layout title="Edit Supplier">
      <Card className={pageFormCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Edit Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            mode="edit"
            initialData={supplier}
            onSave={handleSave}
            onCancel={() => navigate('/suppliers')}
            saving={saving}
            loading={loading}
            contextNote={
              archivedNotice
                ? 'This supplier is archived. Editing it does not restore it to active pickers.'
                : undefined
            }
          />
        </CardContent>
      </Card>
    </Layout>
  )
}
