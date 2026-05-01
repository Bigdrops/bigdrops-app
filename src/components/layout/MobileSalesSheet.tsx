import * as React from 'react'
import { UnifiedActionSheet, type ActionItem } from '@/components/actions/UnifiedActionSheet'
import { salesPicker } from './navData'

interface MobileSalesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  handleSalesPick: (key: string) => void
}

export function MobileSalesSheet({
  open,
  onOpenChange,
  handleSalesPick,
}: MobileSalesSheetProps) {
  const actions: ActionItem[] = salesPicker.map(item => ({
    key: item.key,
    label: item.label,
    description: item.description,
    icon: <item.icon />,
    onClick: () => handleSalesPick(item.key)
  }))

  return (
    <UnifiedActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Quick Create"
      description="Start a new sales or dispatch record"
      actions={actions}
      layout="grid-scroll"
      hideIcons={false}
      showDescriptions={false}
    />
  )
}
