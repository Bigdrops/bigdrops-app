import * as React from 'react'
import { UnifiedActionSheet, type ActionGroup } from '@/components/actions/UnifiedActionSheet'
import { moreGroups } from './navData'

interface MobileMoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  handleMorePick: (key: string) => void
}

export function MobileMoreSheet({
  open,
  onOpenChange,
  handleMorePick,
}: MobileMoreSheetProps) {
  const groups: ActionGroup[] = moreGroups.map(group => ({
    label: group.sheetLabel || group.group,
    actions: group.items.map(item => ({
      key: item.key,
      label: item.label,
      icon: <item.icon />,
      onClick: () => handleMorePick(item.key)
    }))
  }))

  return (
    <UnifiedActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="More"
      description="Admin, reporting, and workspace utilities"
      groups={groups}
      layout="list-compact"
      showDescriptions={false}
    />
  )
}
