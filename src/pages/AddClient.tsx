import React, { useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { pageFormCardClassName, pageFormFieldClassName, pageFormPrimaryActionClassName } from '@/components/ui/form-page-styles'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface ClientForm {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
}

export default function AddClient() {
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientForm>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  })
  const [saving, setSaving] = useState(false)

  const update = (field: keyof ClientForm, value: string) =>
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
      <Card className={pageFormCardClassName}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">New Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            className={pageFormFieldClassName}
            placeholder="Company Name"
            value={client.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('name', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Contact Person"
            value={client.contact_person}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('contact_person', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Email"
            type="email"
            value={client.email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('email', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Phone"
            value={client.phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('phone', e.target.value)}
          />
          <Input
            className={pageFormFieldClassName}
            placeholder="Address"
            value={client.address}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update('address', e.target.value)}
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
