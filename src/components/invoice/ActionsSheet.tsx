import * as React from 'react'
import {
  Check,
  FileText,
  Zap,
} from 'lucide-react'
import { UnifiedActionSheet, type ActionItem } from '@/components/actions/UnifiedActionSheet'
import { getActionsSheetItems } from './mobileFormHelpers.js'

interface ActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenColumnManager: () => void
  onImport: () => void
  onAddGroup: () => void
  onScrollToAdditionalInfo: () => void
  onSaveDraft: () => void
  onCancel: () => void
  onScrollToLinks: () => void
  mergeQtyUnit: boolean
  onToggleMergeQtyUnit: () => void
}

export default function ActionsSheet({
  open,
  onOpenChange,
  onOpenColumnManager,
  onImport,
  onAddGroup,
  onScrollToAdditionalInfo,
  onSaveDraft,
  onCancel,
  onScrollToLinks,
  mergeQtyUnit,
  onToggleMergeQtyUnit,
}: ActionsSheetProps) {
  const rawActions = getActionsSheetItems({ mergeQtyUnit })
  const actionMap: Record<string, (() => void) | undefined> = {
    draft: onSaveDraft,
    cancel: onCancel,
    columns: onOpenColumnManager,
    import: onImport,
    qtyUnitMerge: onToggleMergeQtyUnit,
    group: onAddGroup,
    notes: onScrollToAdditionalInfo,
    links: onScrollToLinks,
  }

  const unifiedActions: ActionItem[] = rawActions.map((action: any) => ({
    key: action.key,
    label: action.label,
    description: action.description,
    icon: action.key === 'qtyUnitMerge' ? <Zap /> : <action.icon />,
    tone: action.tone || "default",
    isSwitch: action.key === 'qtyUnitMerge',
    isActive: action.key === 'qtyUnitMerge' ? mergeQtyUnit : false,
    closeOnClick: action.key !== 'qtyUnitMerge',
    onClick: () => actionMap[action.key]?.()
  }))

  return (
    <UnifiedActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Quick Actions"
      actions={unifiedActions}
      layout="list-compact"
    />
  )
}
