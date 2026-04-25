import * as React from 'react'
import {
  mobileDetailAmountClassName,
  mobileDetailCardClassName,
  mobileDetailGroupHeaderClassName,
  mobileDetailLabelClassName,
  mobileDetailMutedValueClassName,
  mobileDetailNumberBadgeClassName,
  mobileDetailRowClassName,
  mobileDetailTwoColumnGridClassName,
  mobileDetailValueClassName,
} from '@/components/ui/operational-card-styles'

/**
 * ViewMobileItemCard.tsx
 *
 * Read-only vertical card for viewing invoice line items on mobile.
 * Used in ViewInvoice page to replace horizontal scrolling table.
 */

interface MobileItem {
  row_type: 'group_header' | 'standard' | string
  group_name?: string | null
  amount?: number | null
  quantity: number
  unit_price: number
  description: string
  sub_description?: string | null
  make?: string | null
  unit?: string | null
  image_url?: string | null
}

interface ViewMobileItemCardProps {
  item: MobileItem
  number: number | string
}

export default function ViewMobileItemCard({ item, number }: ViewMobileItemCardProps) {
  if (item.row_type === 'group_header') {
    return (
      <div className={mobileDetailGroupHeaderClassName}>
        <div className="text-sm font-bold text-white">{item.group_name}</div>
      </div>
    )
  }

  const amount = item.amount || (item.quantity * item.unit_price) || 0

  return (
    <div className={mobileDetailCardClassName}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={mobileDetailNumberBadgeClassName}>{number}</span>
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <div className={mobileDetailRowClassName}>
        <div className={mobileDetailLabelClassName}>Description</div>
        <div className={mobileDetailValueClassName}>
          <div className="font-semibold">{item.description}</div>
          {item.sub_description && (
            <div className={mobileDetailMutedValueClassName}>{item.sub_description}</div>
          )}
        </div>
      </div>

      {item.make && (
        <div className={mobileDetailRowClassName}>
          <div className={mobileDetailLabelClassName}>Make / Brand</div>
          <div className={mobileDetailValueClassName}>{item.make}</div>
        </div>
      )}

      <div className={mobileDetailTwoColumnGridClassName}>
        <div>
          <div className={mobileDetailLabelClassName}>Quantity</div>
          <div className={mobileDetailValueClassName}>{item.quantity}</div>
        </div>
        {item.unit && (
          <div>
            <div className={mobileDetailLabelClassName}>Unit</div>
            <div className={mobileDetailValueClassName}>{item.unit}</div>
          </div>
        )}
      </div>

      <div className={mobileDetailTwoColumnGridClassName}>
        <div>
          <div className={mobileDetailLabelClassName}>Unit Price</div>
          <div className={mobileDetailValueClassName}>₦{Number(item.unit_price || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className={mobileDetailLabelClassName}>Amount</div>
          <div className={mobileDetailAmountClassName}>
            ₦{Number(amount).toLocaleString()}
          </div>
        </div>
      </div>

      {item.image_url && (
        <div className={mobileDetailRowClassName}>
          <div className={mobileDetailLabelClassName}>Image</div>
          <img
            src={item.image_url}
            alt={item.description}
            className="mt-1.5 h-auto max-w-full rounded-md border border-gray-200"
          />
        </div>
      )}
    </div>
  )
}
