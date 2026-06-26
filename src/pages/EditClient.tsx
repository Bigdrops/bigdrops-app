import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientForm, type ClientFormData } from '@/components/client/ClientForm'
import { feedback } from '@/lib/feedback'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { pageFormCardClassName } from '@/components/ui/form-page-styles'

export default function EditClient() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Partial<ClientFormData>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
      if (error) {
        console.error(error)
        feedback.error('Failed to load client')
      } else if (data) {
        // Split address back into address1 and address2 if needed
        // For now, just set the data as-is since we don't store address2 separately
        setClient({
          id: data.id,
          name: data.name || '',
          contact_person: data.contact_person || '',
          category: data.category || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          address2: '',
          city: data.city || '',
          state: data.state || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async (data: Omit<ClientFormData, 'address2'> & { address: string }) => {
    if (!id) return
    setSaving(true)
    const { error } = await supabase.from('clients').update({
      name: data.name,
      contact_person: data.contact_person,
      category: data.category,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
    }).eq('id', id)
    setSaving(false)
    if (error) {
      console.error('Update error', error)
      feedback.error('Save failed', { description: 'Failed to save client' })
    } else {
      feedback.success('Client updated')
      navigate('/clients')
    }
  }

  return (
    <Layout title="Edit Client">
      <Card className={pageFormCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Edit Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            mode="edit"
            initialData={client}
            onSave={handleSave}
            onCancel={() => navigate('/clients')}
            saving={saving}
            loading={loading}
          />
        </CardContent>
      </Card>
    </Layout>
  )
}
