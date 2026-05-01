import { Switch } from '@/components/ui/switch'

type ChannelToggleItem = {
  key: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function NotificationChannelToggles({
  items,
}: {
  items: ChannelToggleItem[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item, index) => (
        <div
          key={item.key}
          className={`flex items-start justify-between gap-4 px-4 py-3.5 ${
            index < items.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-foreground">{item.label}</div>
            {item.description ? (
              <div className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                {item.description}
              </div>
            ) : null}
          </div>

          <Switch
            checked={item.checked}
            onCheckedChange={item.onCheckedChange}
            className="mt-1 border border-border bg-input data-[state=checked]:border-primary data-[state=checked]:bg-primary [&>span]:bg-background"
          />
        </div>
      ))}
    </div>
  )
}
