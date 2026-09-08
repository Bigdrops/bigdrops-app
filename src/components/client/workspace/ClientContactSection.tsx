import React from 'react'
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react'
import type { ClientRecord } from '@/domain/clientWorkspace'
import { cn } from '@/lib/utils'

interface Props {
  client: ClientRecord
}

export const ClientContactSection: React.FC<Props> = ({ client }) => {
  const [open, setOpen] = React.useState(false)

  const phone = client.phone?.trim()
  const email = client.email?.trim()
  const addressLine = [client.address, client.city, client.state].filter(Boolean).join(', ')

  const actions = [
    phone
      ? { label: 'Call', sub: phone, icon: Phone, href: `tel:${phone.replace(/\s+/g, '')}` }
      : null,
    email
      ? { label: 'Email', sub: email, icon: Mail, href: `mailto:${email}` }
      : null,
    addressLine
      ? {
          label: 'Directions',
          sub: addressLine,
          icon: MapPin,
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`,
        }
      : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null)

  if (actions.length === 0 && !client.contact_person) return null

  return (
    <section aria-label="Contact" className="rounded-2xl border border-bd-border bg-bd-surface shadow-sm">
      <div className="grid grid-cols-3 divide-x divide-bd-border/60">
        {actions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            target={action.label === 'Directions' ? '_blank' : undefined}
            rel={action.label === 'Directions' ? 'noreferrer' : undefined}
            className="flex min-h-[60px] flex-col items-center justify-center gap-1 px-2 py-3 transition-colors hover:bg-bd-surface-muted/50 active:bg-bd-surface-muted"
          >
            <action.icon className="size-5 text-[hsl(var(--bd-button-primary-bg))]" />
            <span className="text-[11px] font-bold text-foreground">{action.label}</span>
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[48px] w-full items-center justify-between gap-2 border-t border-bd-border/60 px-4 text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
          Contact and account details
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-bd-text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <dl className="space-y-3 border-t border-bd-border/60 px-4 py-4">
          {client.contact_person && (
            <DetailRow label="Contact person" value={client.contact_person} />
          )}
          {phone && <DetailRow label="Phone" value={phone} />}
          {email && <DetailRow label="Email" value={email} />}
          {addressLine && <DetailRow label="Address" value={addressLine} />}
          {client.category && <DetailRow label="Category" value={client.category} />}
        </dl>
      )}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-bold leading-snug text-foreground">{value}</dd>
    </div>
  )
}
