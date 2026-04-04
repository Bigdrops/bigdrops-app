import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

const formCardClassName = 'mx-auto max-w-[600px] rounded-lg border-border bg-card shadow-sm'
const formFieldClassName = 'h-11 border-zinc-300 bg-background px-3 text-sm'

export default function AddClient() {
  const navigate = useNavigate()
  const [client, setClient] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  })
  const [saving, setSaving] = useState(false)

  const update = (field, value) =>
    setClient(c => ({ ...c, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    // only send known fields
    const payload = {
      name: client.name,
      contact_person: client.contact_person,
      email: client.email,
      phone: client.phone,
      address: client.address
    }
    const { error } = await supabase.from('clients').insert(payload)
    setSaving(false)
    if (error) {
      console.error('Insert error', error)
      toast({ title: 'Save failed', description: 'Failed to save client', variant: 'destructive' })
    } else {
      navigate('/clients')
    }
  }

  return (
    <Layout title="Add Client">
      <Card className={formCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-indigo-500">New Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            className={formFieldClassName}
            placeholder="Company Name"
            value={client.name}
            onChange={e => update('name', e.target.value)}
          />
          <Input
            className={formFieldClassName}
            placeholder="Contact Person"
            value={client.contact_person}
            onChange={e => update('contact_person', e.target.value)}
          />
          <Input
            className={formFieldClassName}
            placeholder="Email"
            type="email"
            value={client.email}
            onChange={e => update('email', e.target.value)}
          />
          <Input
            className={formFieldClassName}
            placeholder="Phone"
            value={client.phone}
            onChange={e => update('phone', e.target.value)}
          />
          <Input
            className={formFieldClassName}
            placeholder="Address"
            value={client.address}
            onChange={e => update('address', e.target.value)}
          />
          <div className="flex justify-end pt-2">
            <Button type="button" className="h-10 rounded-md px-5 text-sm font-semibold" onClick={handleSave}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}
