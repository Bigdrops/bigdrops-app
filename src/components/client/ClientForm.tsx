import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Building2, User, Phone, Mail, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Residential', 'Commercial', 'Industrial', 'Government', 'NGO', 'Other'] as const

export type ClientFormData = {
  id?: string
  name: string
  contact_person: string
  category: string
  email: string
  phone: string
  address: string
  address2: string
  city: string
  state: string
}

type ClientFormProps = {
  initialData?: Partial<ClientFormData>
  onSave: (data: Omit<ClientFormData, 'address2'> & { address: string }) => Promise<void>
  onCancel?: () => void
  saving?: boolean
  loading?: boolean
  mode?: 'create' | 'edit'
  compact?: boolean
}

const emptyForm: ClientFormData = {
  name: '',
  contact_person: '',
  category: '',
  email: '',
  phone: '',
  address: '',
  address2: '',
  city: '',
  state: '',
}

export function ClientForm({
  initialData,
  onSave,
  onCancel,
  saving = false,
  loading = false,
  mode = 'create',
  compact = false,
}: ClientFormProps) {
  const { isMobile } = useLayoutMode()
  const [form, setForm] = useState<ClientFormData>({ ...emptyForm })

  useEffect(() => {
    if (initialData) {
      setForm((current) => ({ ...current, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof ClientFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return

    const address = form.address2.trim()
      ? `${form.address.trim()}, ${form.address2.trim()}`
      : form.address.trim()

    await onSave({
      id: form.id,
      name: form.name.trim(),
      contact_person: form.contact_person.trim(),
      category: form.category,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address,
      city: form.city.trim(),
      state: form.state.trim(),
    })
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", compact ? "space-y-3" : "space-y-4")}>
        {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-5", compact ? "space-y-4" : "space-y-5")}>
      {/* Company Name */}
      <div className="space-y-2">
        <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Company / Client Name *
        </Label>
        <Input
          className="border-bd-border bg-bd-surface-muted/50 h-11"
          value={form.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
          placeholder="e.g. Coronation Power & Gas Ltd"
          autoFocus
        />
      </div>

      {/* Contact Person & Category */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5">
            <User className="h-3 w-3" />
            Contact Person
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.contact_person}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('contact_person', e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5">
            <Tag className="h-3 w-3" />
            Category
          </Label>
          <Select
            value={form.category || '__none__'}
            onValueChange={(value) => updateField('category', value === '__none__' ? '' : value)}
          >
            <SelectTrigger className="h-11 border-bd-border bg-bd-surface-muted/50">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select category</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Phone & Email */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            Phone
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)}
            placeholder="+234..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            Email
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            type="email"
            value={form.email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)}
            placeholder="info@company.com"
          />
        </div>
      </div>

      {/* Address Lines */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            Address Line 1
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.address}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('address', e.target.value)}
            placeholder="123 Main Street"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">
            Address Line 2
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.address2}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('address2', e.target.value)}
            placeholder="Suite 100, Building B (optional)"
          />
        </div>
      </div>

      {/* City & State */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">
            City
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.city}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('city', e.target.value)}
            placeholder="Lagos"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">
            State
          </Label>
          <Input
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.state}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('state', e.target.value)}
            placeholder="Lagos State"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 rounded-xl border-bd-border bg-bd-surface text-bd-text"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          className={cn(
            "h-11 rounded-xl font-bold",
            onCancel ? "flex-[1.3]" : "w-full",
            "bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90"
          )}
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          loading={saving}
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Client' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}