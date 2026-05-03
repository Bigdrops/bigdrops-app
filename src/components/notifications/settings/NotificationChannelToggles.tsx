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
    <div className="overflow-hidden rounded-[var(--notification-radius)] border border-[var(--notification-border)] bg-[var(--notification-bg)]">
      {items.map((item, index) => (
        <div
          key={item.key}
          className={`flex items-start justify-between gap-4 px-4 py-3.5 ${
            index < items.length - 1 ? 'border-b border-[var(--notification-border)]' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[var(--notification-text)]">{item.label}</div>
            {item.description ? (
              <div className="mt-0.5 text-[12px] leading-5 text-[var(--notification-muted-text)]">
                {item.description}
              </div>
            ) : null}
          </div>

          <Switch
            checked={item.checked}
            onCheckedChange={item.onCheckedChange}
            className="mt-1 border border-[var(--notification-border)] bg-[var(--notification-bg)] data-[state=checked]:border-[var(--notification-active-bg)] data-[state=checked]:bg-[var(--notification-active-bg)] [&>span]:bg-[var(--notification-bg)]"
          />
        </div>
      ))}
    </div>
  )
}
