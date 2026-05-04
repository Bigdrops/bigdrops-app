import { AlertCircle, Bell, ClipboardList, Receipt, Wallet } from 'lucide-react'

import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { type TaxFiling, type TaxInputEntry, type TaxReminder, type WhtReceipt } from '@/domain/compliance/types'

import ComplianceActionQueue from './ComplianceActionQueue'
import { type ComplianceActionItem } from './ComplianceActionRow'
import ComplianceKpiStrip, { type ComplianceKpiItem } from './ComplianceKpiStrip'
import ComplianceRecentActivity, { type ComplianceActivityItem } from './ComplianceRecentActivity'

type ComplianceTargetSection = 'vat' | 'wht' | 'filings' | 'obligations'

type InvoiceRecord = {
  id: string
  invoice_number?: string | null
  client_name?: string | null
  issue_date?: string | null
  vat?: number | string | null
}

type PaymentRecord = {
  id: string
  invoice_id?: string | null
  invoice_number?: string | null
  client_name?: string | null
  date?: string | null
  wht_amount?: number | string | null
}

interface ComplianceOverviewProps {
  invoices: InvoiceRecord[]
  payments: PaymentRecord[]
  receipts: WhtReceipt[]
  taxInputs: TaxInputEntry[]
  filings: TaxFiling[]
  reminders: TaxReminder[]
  onNavigateSection: (section: ComplianceTargetSection) => void
}

type QueueCandidate = ComplianceActionItem & {
  groupRank: number
  dueSortValue: number | null
  amountSortValue: number
}

type ActivityCandidate = ComplianceActivityItem & {
  sortValue: number
}

const TAX_TYPE_LABELS: Record<'vat' | 'wht' | 'cit', string> = {
  vat: 'VAT',
  wht: 'WHT',
  cit: 'CIT',
}

function getTimestamp(value?: string | null) {
  if (!value) return Number.NaN
  return new Date(value).getTime()
}

function getAmount(value?: number | string | null) {
  return Number(value || 0)
}

function isDateBeforeToday(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date.getTime() < today.getTime()
}

function formatPeriod(periodStart?: string | null, periodEnd?: string | null) {
  if (periodStart && periodEnd) {
    return `Period ${formatDisplayDate(periodStart)} - ${formatDisplayDate(periodEnd)}`
  }

  if (periodStart) {
    return `Period ${formatDisplayDate(periodStart)}`
  }

  return undefined
}

function sortQueue(items: QueueCandidate[]) {
  return [...items].sort((left, right) => {
    if (left.groupRank !== right.groupRank) return left.groupRank - right.groupRank
    if (left.dueSortValue !== null && right.dueSortValue !== null) return left.dueSortValue - right.dueSortValue
    if (left.dueSortValue !== null) return -1
    if (right.dueSortValue !== null) return 1
    if (left.amountSortValue !== right.amountSortValue) return right.amountSortValue - left.amountSortValue
    return left.title.localeCompare(right.title)
  })
}

export default function ComplianceOverview({
  invoices,
  payments,
  receipts,
  taxInputs,
  filings,
  reminders,
  onNavigateSection,
}: ComplianceOverviewProps) {
  const recoverableVatTotal = taxInputs
    .filter((entry) => entry.is_recoverable)
    .reduce((sum, entry) => sum + getAmount(entry.vat_amount), 0)

  const vatCharged = invoices.reduce((sum, invoice) => sum + getAmount(invoice.vat), 0)

  const receiptByPaymentId = new Map(receipts.map((receipt) => [receipt.payment_id, receipt]))

  const untrackedWhtPayments = payments.filter((payment) => {
    return getAmount(payment.wht_amount) > 0 && !receiptByPaymentId.has(payment.id)
  })

  const requestedReceipts = receipts.filter((receipt) => receipt.receipt_status === 'requested')
  const verificationReceipts = receipts.filter((receipt) => receipt.receipt_status === 'pending' || receipt.receipt_status === 'received')

  const overdueReminders = reminders.filter((reminder) => {
    if (reminder.status === 'resolved' || reminder.status === 'cancelled') return false
    return reminder.status === 'overdue' || isDateBeforeToday(reminder.due_date)
  })

  const dueReminders = reminders.filter((reminder) => {
    if (reminder.status !== 'due') return false
    return !isDateBeforeToday(reminder.due_date)
  })

  const upcomingReminders = reminders.filter((reminder) => {
    return reminder.status === 'upcoming' && !isDateBeforeToday(reminder.due_date)
  })

  const overdueFilings = filings.filter((filing) => filing.status === 'overdue')
  const openFilings = filings.filter((filing) => filing.status === 'draft' || filing.status === 'ready')

  const filingsAttentionCount = overdueFilings.length + openFilings.length
  const whtAwaitingReceiptCount = untrackedWhtPayments.length + requestedReceipts.length + verificationReceipts.length

  const kpiItems: ComplianceKpiItem[] = [
    {
      label: 'VAT Charged',
      value: formatNaira(vatCharged),
      detail: `${invoices.length} invoices in current view`,
      icon: <Receipt className="h-4 w-4" />,
      tone: 'warning',
    },
    {
      label: 'Recoverable VAT',
      value: formatNaira(recoverableVatTotal),
      detail: `${taxInputs.filter((entry) => entry.is_recoverable).length} recoverable inputs`,
      icon: <Wallet className="h-4 w-4" />,
      tone: 'success',
    },
    {
      label: 'WHT Awaiting Receipt',
      value: String(whtAwaitingReceiptCount),
      detail: `${untrackedWhtPayments.length} untracked, ${requestedReceipts.length + verificationReceipts.length} in follow-up`,
      icon: <AlertCircle className="h-4 w-4" />,
      tone: whtAwaitingReceiptCount > 0 ? 'danger' : 'info',
    },
    {
      label: 'Open / Overdue Filings',
      value: String(filingsAttentionCount),
      detail: `${overdueFilings.length} overdue, ${openFilings.length} open`,
      icon: <ClipboardList className="h-4 w-4" />,
      tone: overdueFilings.length > 0 ? 'danger' : filingsAttentionCount > 0 ? 'info' : 'success',
    },
  ]

  const paymentById = new Map(payments.map((payment) => [payment.id, payment]))

  const queueItems = sortQueue([
    ...overdueReminders.map<QueueCandidate>((reminder) => ({
      id: `obligation-overdue-${reminder.id}`,
      sourceType: 'Obligation',
      title: `${TAX_TYPE_LABELS[reminder.tax_type]} obligation is overdue`,
      context: reminder.notes || 'Resolve the overdue obligation and confirm its filing linkage if needed.',
      statusLabel: 'Overdue',
      severity: 'overdue',
      actionLabel: 'Open obligations',
      targetSection: 'obligations',
      taxTypeLabel: TAX_TYPE_LABELS[reminder.tax_type],
      dueLabel: `Due ${formatDisplayDate(reminder.due_date)}`,
      periodLabel: formatPeriod(reminder.period_start, reminder.period_end),
      secondaryMeta: reminder.linked_filing_id ? ['Linked filing'] : undefined,
      groupRank: 1,
      dueSortValue: getTimestamp(reminder.due_date),
      amountSortValue: 0,
    })),
    ...overdueFilings.map<QueueCandidate>((filing) => ({
      id: `filing-overdue-${filing.id}`,
      sourceType: 'Filing',
      title: `${TAX_TYPE_LABELS[filing.tax_type]} filing is overdue`,
      context: filing.notes || 'Review the record, confirm submission status, and settle any outstanding amount.',
      statusLabel: 'Overdue',
      severity: 'overdue',
      actionLabel: 'Open filings',
      targetSection: 'filings',
      amountLabel: formatNaira(filing.amount_due),
      taxTypeLabel: TAX_TYPE_LABELS[filing.tax_type],
      periodLabel: formatPeriod(filing.period_start, filing.period_end),
      secondaryMeta: filing.receipt_reference ? [`Ref ${filing.receipt_reference}`] : undefined,
      groupRank: 2,
      dueSortValue: null,
      amountSortValue: getAmount(filing.amount_due),
    })),
    ...untrackedWhtPayments.map<QueueCandidate>((payment) => ({
      id: `wht-untracked-${payment.id}`,
      sourceType: 'WHT',
      title: 'Initialize WHT receipt tracking',
      context: `${payment.invoice_number || 'Payment'}${payment.client_name ? ` · ${payment.client_name}` : ''}`,
      statusLabel: 'Untracked',
      severity: 'warning',
      actionLabel: 'Open WHT receipts',
      targetSection: 'wht',
      amountLabel: formatNaira(payment.wht_amount),
      taxTypeLabel: 'WHT',
      dueLabel: payment.date ? `Paid ${formatDisplayDate(payment.date)}` : undefined,
      groupRank: 3,
      dueSortValue: null,
      amountSortValue: getAmount(payment.wht_amount),
    })),
    ...requestedReceipts.map<QueueCandidate>((receipt) => {
      const payment = paymentById.get(receipt.payment_id)
      return {
        id: `wht-requested-${receipt.id}`,
        sourceType: 'WHT',
        title: 'Follow up on requested WHT receipt',
        context: `${payment?.invoice_number || receipt.client_name || 'Receipt request'}${payment?.client_name ? ` · ${payment.client_name}` : ''}`,
        statusLabel: 'Requested',
        severity: 'warning',
        actionLabel: 'Open WHT receipts',
        targetSection: 'wht',
        amountLabel: formatNaira(receipt.wht_amount),
        taxTypeLabel: 'WHT',
        dueLabel: payment?.date ? `Paid ${formatDisplayDate(payment.date)}` : undefined,
        secondaryMeta: receipt.receipt_number ? [`Receipt ${receipt.receipt_number}`] : undefined,
        groupRank: 4,
        dueSortValue: null,
        amountSortValue: getAmount(receipt.wht_amount),
      }
    }),
    ...verificationReceipts.map<QueueCandidate>((receipt) => {
      const payment = paymentById.get(receipt.payment_id)
      return {
        id: `wht-followup-${receipt.id}`,
        sourceType: 'WHT',
        title: receipt.receipt_status === 'received' ? 'Verify received WHT receipt' : 'Advance pending WHT receipt',
        context: `${payment?.invoice_number || receipt.client_name || 'WHT receipt'}${payment?.client_name ? ` · ${payment.client_name}` : ''}`,
        statusLabel: receipt.receipt_status === 'received' ? 'Received' : 'Pending',
        severity: receipt.receipt_status === 'received' ? 'info' : 'warning',
        actionLabel: 'Open WHT receipts',
        targetSection: 'wht',
        amountLabel: formatNaira(receipt.wht_amount),
        taxTypeLabel: 'WHT',
        dueLabel: payment?.date ? `Paid ${formatDisplayDate(payment.date)}` : undefined,
        secondaryMeta: receipt.received_at ? [`Received ${formatDisplayDate(receipt.received_at)}`] : undefined,
        groupRank: 4.5,
        dueSortValue: null,
        amountSortValue: getAmount(receipt.wht_amount),
      }
    }),
    ...dueReminders.map<QueueCandidate>((reminder) => ({
      id: `obligation-due-${reminder.id}`,
      sourceType: 'Obligation',
      title: `${TAX_TYPE_LABELS[reminder.tax_type]} obligation is due`,
      context: reminder.notes || 'Handle this due obligation before it becomes overdue.',
      statusLabel: 'Due',
      severity: 'warning',
      actionLabel: 'Open obligations',
      targetSection: 'obligations',
      taxTypeLabel: TAX_TYPE_LABELS[reminder.tax_type],
      dueLabel: `Due ${formatDisplayDate(reminder.due_date)}`,
      periodLabel: formatPeriod(reminder.period_start, reminder.period_end),
      secondaryMeta: reminder.linked_filing_id ? ['Linked filing'] : undefined,
      groupRank: 5,
      dueSortValue: getTimestamp(reminder.due_date),
      amountSortValue: 0,
    })),
    ...openFilings.map<QueueCandidate>((filing) => ({
      id: `filing-open-${filing.id}`,
      sourceType: 'Filing',
      title: `${TAX_TYPE_LABELS[filing.tax_type]} filing is ${filing.status}`,
      context: filing.notes || 'Finish preparation, confirm submission, or settle the remaining filing amount.',
      statusLabel: filing.status === 'ready' ? 'Ready' : 'Draft',
      severity: filing.status === 'ready' ? 'info' : 'warning',
      actionLabel: 'Open filings',
      targetSection: 'filings',
      amountLabel: formatNaira(filing.amount_due),
      taxTypeLabel: TAX_TYPE_LABELS[filing.tax_type],
      periodLabel: formatPeriod(filing.period_start, filing.period_end),
      secondaryMeta: filing.portal_reference ? [`Portal ${filing.portal_reference}`] : undefined,
      groupRank: 6,
      dueSortValue: null,
      amountSortValue: getAmount(filing.amount_due),
    })),
    ...upcomingReminders.map<QueueCandidate>((reminder) => ({
      id: `obligation-upcoming-${reminder.id}`,
      sourceType: 'Obligation',
      title: `Upcoming ${TAX_TYPE_LABELS[reminder.tax_type]} obligation`,
      context: reminder.notes || 'Keep this obligation in view and prepare supporting records early.',
      statusLabel: 'Upcoming',
      severity: 'info',
      actionLabel: 'Open obligations',
      targetSection: 'obligations',
      taxTypeLabel: TAX_TYPE_LABELS[reminder.tax_type],
      dueLabel: `Due ${formatDisplayDate(reminder.due_date)}`,
      periodLabel: formatPeriod(reminder.period_start, reminder.period_end),
      secondaryMeta: reminder.linked_filing_id ? ['Linked filing'] : undefined,
      groupRank: 7,
      dueSortValue: getTimestamp(reminder.due_date),
      amountSortValue: 0,
    })),
  ]).map(({ groupRank, dueSortValue, amountSortValue, ...item }) => item)

  const recentActivityItems = [
    ...invoices
      .filter((invoice) => getAmount(invoice.vat) > 0 && invoice.issue_date)
      .map<ActivityCandidate>((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: `VAT charged on ${invoice.invoice_number || 'invoice'}`,
        detail: invoice.client_name || 'Invoice VAT exposure recorded.',
        dateLabel: formatDisplayDate(invoice.issue_date!),
        amountLabel: formatNaira(invoice.vat),
        tone: 'warning',
        sortValue: getTimestamp(invoice.issue_date),
      })),
    ...payments
      .filter((payment) => getAmount(payment.wht_amount) > 0 && payment.date)
      .map<ActivityCandidate>((payment) => ({
        id: `payment-${payment.id}`,
        title: `WHT deducted from ${payment.invoice_number || 'payment'}`,
        detail: payment.client_name || 'Payment created a WHT follow-up item.',
        dateLabel: formatDisplayDate(payment.date!),
        amountLabel: formatNaira(payment.wht_amount),
        tone: 'danger',
        sortValue: getTimestamp(payment.date),
      })),
    ...receipts
      .filter((receipt) => receipt.updated_at || receipt.received_at)
      .map<ActivityCandidate>((receipt) => ({
        id: `receipt-${receipt.id}`,
        title: `WHT receipt marked ${receipt.receipt_status}`,
        detail: receipt.client_name || 'Receipt status changed.',
        dateLabel: formatDisplayDate(receipt.received_at || receipt.updated_at),
        amountLabel: receipt.wht_amount ? formatNaira(receipt.wht_amount) : undefined,
        tone: receipt.receipt_status === 'verified' ? 'success' : receipt.receipt_status === 'requested' ? 'warning' : 'info',
        sortValue: getTimestamp(receipt.received_at || receipt.updated_at),
      })),
    ...filings
      .filter((filing) => filing.updated_at || filing.submitted_at || filing.created_at)
      .map<ActivityCandidate>((filing) => ({
        id: `filing-${filing.id}`,
        title: `${TAX_TYPE_LABELS[filing.tax_type]} filing is ${filing.status}`,
        detail: formatPeriod(filing.period_start, filing.period_end) || 'Filing activity recorded.',
        dateLabel: formatDisplayDate(filing.submitted_at || filing.updated_at || filing.created_at),
        amountLabel: filing.amount_due ? formatNaira(filing.amount_due) : undefined,
        tone: filing.status === 'paid' ? 'success' : filing.status === 'overdue' ? 'danger' : 'info',
        sortValue: getTimestamp(filing.submitted_at || filing.updated_at || filing.created_at),
      })),
  ]
    .filter((item) => Number.isFinite(item.sortValue))
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, 6)
    .map(({ sortValue, ...item }) => item)

  return (
    <div className="space-y-4">
      <ComplianceKpiStrip items={kpiItems} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <ComplianceActionQueue items={queueItems} onNavigate={onNavigateSection} />
        <ComplianceRecentActivity items={recentActivityItems} />
      </div>

      {queueItems.length > 0 ? (
        <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 py-3 text-xs text-[hsl(var(--bd-text-muted))]">
          Action items route into the existing VAT, WHT Receipts, Filings, and Obligations workflows without creating any fake in-place actions.
        </div>
      ) : null}
    </div>
  )
}
