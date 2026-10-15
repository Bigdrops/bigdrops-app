import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplierForm } from '@/components/supplier/SupplierForm'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { invalidateListCache, supplierListCacheKey } from '@/lib/cache/listCache'
import { createSupplier } from '@/modules/supplier/supplierService'
import type { SupplierFormValues } from '@/domain/supplier/types'
import Layout from '../components/Layout'
import { pageFormCardClassName } from '@/components/ui/form-page-styles'

export default function AddSupplier() {
  const navigate = useNavigate()
  const { tenantClient, schemaName } = useEntity()
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: SupplierFormValues) => {
    setSaving(true)
    const { data: supplier, error } = await createSupplier(tenantClient, data)
    setSaving(false)

    if (error || !supplier) {
      feedback.error('Save failed', { description: error || 'Failed to save supplier' })
      return
    }

    feedback.success('Supplier created')
    if (schemaName) invalidateListCache(supplierListCacheKey(schemaName))
    navigate('/suppliers')
  }

  return (
    <Layout title="Add Supplier">
      <Card className={pageFormCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">New Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            mode="create"
            onSave={handleSave}
            onCancel={() => navigate('/suppliers')}
            saving={saving}
          />
        </CardContent>
      </Card>
    </Layout>
  )
}
