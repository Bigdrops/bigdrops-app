import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientForm, type ClientFormData } from '@/components/client/ClientForm'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import Layout from '../components/Layout'
import { pageFormCardClassName } from '@/components/ui/form-page-styles'

export default function AddClient() {
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: Omit<ClientFormData, 'address2'> & { address: string }) => {
    setSaving(true)
    const { error } = await tenantClient.from('clients').insert({
      name: data.name,
      contact_person: data.contact_person,
      category: data.category,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
    })
    setSaving(false)
    if (error) {
      console.error('Insert error', error)
      feedback.error('Save failed', { description: 'Failed to save client' })
    } else {
      feedback.success('Client created')
      navigate('/clients')
    }
  }

  return (
    <Layout title="Add Client">
      <Card className={pageFormCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">New Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            mode="create"
            onSave={handleSave}
            onCancel={() => navigate('/clients')}
            saving={saving}
          />
        </CardContent>
      </Card>
    </Layout>
  )
}
