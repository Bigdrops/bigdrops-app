import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { pageFormCardClassName, pageFormFieldClassName, pageFormPrimaryActionClassName } from '@/components/ui/form-page-styles'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function EditClient() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
      if (error) console.error(error)
      else setClient(data || {})
      setLoading(false)
    }
    if (id) load()
  }, [id])

  const update = (field, value) =>
    setClient(c => ({ ...c, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('clients').update(client).eq('id', id)
    setSaving(false)
    if (error) {
      console.error('Update error', error)
      toast({ title: 'Save failed', description: 'Failed to save client', variant: 'destructive' })
    } else {
      navigate('/clients')
    }
  }

  if (loading) return <Layout title="Edit Client"><p className="p-8">Loading...</p></Layout>

  return (
    <Layout title="Edit Client">
      <Card className={pageFormCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Edit Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            className={pageFormFieldClassName}
            placeholder="Company Name"
            value={client.name || ''}
            onChange={e => update('name', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Contact Person"
            value={client.contact_person || ''}
            onChange={e => update('contact_person', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Email"
            type="email"
            value={client.email || ''}
            onChange={e => update('email', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Phone"
            value={client.phone || ''}
            onChange={e => update('phone', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Address"
            value={client.address || ''}
            onChange={e => update('address', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="City"
            value={client.city || ''}
            onChange={e => update('city', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="State"
            value={client.state || ''}
            onChange={e => update('state', e.target.value)}
          />
          <div className="flex justify-end pt-2">
            <Button type="button" className={pageFormPrimaryActionClassName} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}
