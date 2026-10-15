import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Building2, User, Phone, Mail, MapPin, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { cn } from '@/lib/utils'
import {
  emptySupplierForm,
  type SupplierFormValues,
} from '@/domain/supplier/types'

export type { SupplierFormValues }

type SupplierFormProps = {
  initialData?: Partial<SupplierFormValues>
  onSave: (data: SupplierFormValues) => Promise<void> | void
  onCancel?: () => void
  saving?: boolean
  loading?: boolean
  mode?: 'create' | 'edit'
  compact?: boolean
  /** Optional helper shown above the name field, e.g. the linked client. */
  contextNote?: string
}

export function SupplierForm({
  initialData,
  onSave,
  onCancel,
  saving = false,
  loading = false,
  mode = 'create',
  compact = false,
  contextNote,
}: SupplierFormProps) {
  const { isMobile } = useLayoutMode()
  const [form, setForm] = useState<SupplierFormValues>({ ...emptySupplierForm })

  useEffect(() => {
    if (initialData) {
      setForm((current) => ({ ...current, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof SupplierFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    await onSave({
      name: form.name.trim(),
      contact_person: form.contact_person.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      notes: form.notes.trim(),
    })
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', compact ? 'space-y-3' : 'space-y-4')}>
        {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  const fieldId = (field: string) => `supplier-${mode}-${field}`

  return (
    <form
      className={cn('space-y-5', compact ? 'space-y-4' : 'space-y-5')}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      {contextNote && (
        <p className="rounded-xl border border-bd-border bg-bd-surface-muted/40 px-3 py-2 text-xs text-bd-text-muted">
          {contextNote}
        </p>
      )}

      {/* Supplier name */}
      <div className="space-y-2">
        <Label
          htmlFor={fieldId('name')}
          className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5"
        >
          <Building2 className="h-3 w-3" aria-hidden="true" />
          Supplier Name *
        </Label>
        <Input
          id={fieldId('name')}
          name="name"
          className="border-bd-border bg-bd-surface-muted/50 h-11"
          value={form.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
          placeholder="e.g. Zenith Industrial Supplies Ltd"
          required
          autoFocus
        />
      </div>

      {/* Contact person */}
      <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
        <div className="space-y-2">
          <Label
            htmlFor={fieldId('contact_person')}
            className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5"
          >
            <User className="h-3 w-3" aria-hidden="true" />
            Contact Person
          </Label>
          <Input
            id={fieldId('contact_person')}
            name="contact_person"
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.contact_person}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('contact_person', e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor={fieldId('phone')}
            className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5"
          >
            <Phone className="h-3 w-3" aria-hidden="true" />
            Phone
          </Label>
          <Input
            id={fieldId('phone')}
            name="phone"
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)}
            placeholder="+234..."
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label
          htmlFor={fieldId('email')}
          className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5"
        >
          <Mail className="h-3 w-3" aria-hidden="true" />
          Email
        </Label>
        <Input
          id={fieldId('email')}
          name="email"
          className="border-bd-border bg-bd-surface-muted/50 h-11"
          type="email"
          value={form.email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)}
          placeholder="orders@supplier.com"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label
          htmlFor={fieldId('address')}
          className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5"
        >
          <MapPin className="h-3 w-3" aria-hidden="true" />
          Address
        </Label>
        <Input
          id={fieldId('address')}
          name="address"
          className="border-bd-border bg-bd-surface-muted/50 h-11"
          value={form.address}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('address', e.target.value)}
          placeholder="123 Main Street"
        />
      </div>

      {/* City & State */}
      <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
        <div className="space-y-2">
          <Label
            htmlFor={fieldId('city')}
            className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted"
          >
            City
          </Label>
          <Input
            id={fieldId('city')}
            name="city"
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.city}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('city', e.target.value)}
            placeholder="Lagos"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor={fieldId('state')}
            className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted"
          >
            State
          </Label>
          <Input
            id={fieldId('state')}
            name="state"
            className="border-bd-border bg-bd-surface-muted/50 h-11"
            value={form.state}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('state', e.target.value)}
            placeholder="Lagos State"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label
          htmlFor={fieldId('notes')}
          className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted flex items-center gap-1.5"
        >
          <StickyNote className="h-3 w-3" aria-hidden="true" />
          Notes
        </Label>
        <Textarea
          id={fieldId('notes')}
          name="notes"
          className="min-h-20 border-bd-border bg-bd-surface-muted/50"
          value={form.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField('notes', e.target.value)}
          placeholder="Payment terms, lead times, or delivery notes (optional)"
        />
      </div>

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
          type="submit"
          className={cn(
            'h-11 rounded-xl font-bold',
            onCancel ? 'flex-[1.3]' : 'w-full',
            'bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90',
          )}
          disabled={saving || !form.name.trim()}
          loading={saving}
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Supplier' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

export default SupplierForm
