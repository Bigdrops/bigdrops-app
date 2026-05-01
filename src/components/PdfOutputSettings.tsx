import * as React from "react"
import { ChevronDown, ChevronUp, Landmark } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

type BankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  sortCode: string
  isDefault?: boolean
}

type PdfOutputSettingsValue = {
  showBankDetails: boolean
  bankAccountId: string | null
  showFooter: boolean
  showTagline: boolean
  showBalanceDue: boolean
  showAmountInWords: boolean
  showVatPercentage: boolean
  showWhtPercentage: boolean
  showDiscountPercentage: boolean
}

export type { PdfOutputSettingsValue }

type PdfOutputSettingsProps = {
  value?: Partial<PdfOutputSettingsValue>
  onChange?: (next: PdfOutputSettingsValue) => void

  /**
   * Optional real bank accounts from settings later.
   * Placeholder accounts are used if omitted.
   */
  bankAccounts?: BankAccount[]

  /**
   * Optional global settings display text only.
   * These are previews, not editable here.
   */
  companyTagline?: string
  footerText?: string
  showBalanceDueOption?: boolean
}

const PLACEHOLDER_BANKS: BankAccount[] = [
  {
    id: "zenith-default",
    bankName: "Zenith Bank",
    accountName: "GenGrid Power Solutions Ltd",
    accountNumber: "1234567890",
    sortCode: "057150013",
    isDefault: true,
  },
  {
    id: "gtb-1",
    bankName: "GTBank",
    accountName: "GenGrid Projects",
    accountNumber: "0123456789",
    sortCode: "058152036",
  },
  {
    id: "access-1",
    bankName: "Access Bank",
    accountName: "GenGrid Installations",
    accountNumber: "1029384756",
    sortCode: "044150149",
  },
]

function getDefaultBank(bankAccounts: BankAccount[]) {
  return bankAccounts.find((b) => b.isDefault) || bankAccounts[0] || null
}

function resolveBanks(bankAccounts?: BankAccount[]) {
  return bankAccounts && bankAccounts.length > 0 ? bankAccounts : PLACEHOLDER_BANKS
}

function mergeOutputState(value: Partial<PdfOutputSettingsValue> | undefined, defaultBank: BankAccount | null): PdfOutputSettingsValue {
  return {
    showBankDetails: value?.showBankDetails ?? true,
    bankAccountId: value?.bankAccountId ?? defaultBank?.id ?? null,
    showFooter: value?.showFooter ?? false,
    showTagline: value?.showTagline ?? false,
    showBalanceDue: value?.showBalanceDue ?? true,
    showAmountInWords: value?.showAmountInWords ?? true,
    showVatPercentage: value?.showVatPercentage ?? true,
    showWhtPercentage: value?.showWhtPercentage ?? true,
    showDiscountPercentage: value?.showDiscountPercentage ?? true,
  }
}

function OutputToggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[hsl(var(--bd-feedback-success))]' : 'bg-[hsl(var(--bd-border))]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-[hsl(var(--bd-surface))] shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function SettingsRow({
  label,
  control,
  children,
}: {
  label: string
  control: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="border-b border-border/80 py-2.5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[hsl(var(--bd-text))]">{label}</span>
        {control}
      </div>
      {children ? <div className="pt-2">{children}</div> : null}
    </div>
  )
}

export function PdfBankControls({
  value,
  onChange,
  bankAccounts,
}: Pick<PdfOutputSettingsProps, 'value' | 'onChange' | 'bankAccounts'>) {
  const banks = resolveBanks(bankAccounts)
  const defaultBank = getDefaultBank(banks)
  const state = mergeOutputState(value, defaultBank)
  const selectedBank = banks.find((b) => b.id === state.bankAccountId) || defaultBank || null
  const [bankSheetOpen, setBankSheetOpen] = React.useState(false)

  function update(patch: Partial<PdfOutputSettingsValue>) {
    onChange?.({ ...state, ...patch })
  }

  return (
    <>
      <Card className="rounded-[var(--bd-overlay-radius)] border-border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold tracking-[-0.02em] text-foreground">Bank Details</div>
            <OutputToggle
              checked={state.showBankDetails}
              onToggle={() =>
                update({
                  showBankDetails: !state.showBankDetails,
                  bankAccountId: state.bankAccountId || defaultBank?.id || null,
                })
              }
            />
          </div>

          {state.showBankDetails && selectedBank ? (
            <div className="space-y-3">
              <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted))] p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">
                  <Landmark className="h-4 w-4" />
                  Selected Account
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted)/0.7)]">Account Name</div>
                    <div className="mt-1 font-semibold text-[hsl(var(--bd-text))]">{selectedBank.accountName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted)/0.7)]">Account Number</div>
                    <div className="mt-1 font-mono font-semibold text-[hsl(var(--bd-text))]">{selectedBank.accountNumber}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted)/0.7)]">Bank</div>
                    <div className="mt-1 font-semibold text-[hsl(var(--bd-text))]">{selectedBank.bankName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted)/0.7)]">Sort Code</div>
                    <div className="mt-1 font-mono font-semibold text-[hsl(var(--bd-text))]">{selectedBank.sortCode}</div>
                  </div>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setBankSheetOpen(true)}>
                <span>Switch Account</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <BankAccountPickerSheet
        open={bankSheetOpen}
        onOpenChange={setBankSheetOpen}
        bankAccounts={banks}
        selectedBankId={state.bankAccountId}
        onSelect={(bankId) => {
          update({ bankAccountId: bankId, showBankDetails: true })
          setBankSheetOpen(false)
        }}
      />
    </>
  )
}

type PdfDocumentOptionsCardProps = Pick<
  PdfOutputSettingsProps,
  'value' | 'onChange' | 'companyTagline' | 'footerText' | 'showBalanceDueOption'
> & {
  defaultOpen?: boolean
}

export function PdfDocumentOptionsCard({
  value,
  onChange,
  companyTagline = 'Reliable power for every site',
  footerText = 'Thank you for your business. Payment is due within 7 days unless otherwise agreed.',
  showBalanceDueOption = false,
  defaultOpen = false,
}: PdfDocumentOptionsCardProps) {
  const state = mergeOutputState(value, null)
  const [open, setOpen] = React.useState(defaultOpen)

  function update(patch: Partial<PdfOutputSettingsValue>) {
    onChange?.({ ...state, ...patch })
  }

  return (
    <Card className="rounded-[var(--bd-overlay-radius)] border-border shadow-sm">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        >
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-[-0.02em] text-foreground">Document options</div>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[hsl(var(--bd-text-muted))]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--bd-text-muted))]" />
          )}
        </button>

        {open ? (
          <div className="border-t border-border px-4 py-2.5">
            <SettingsRow
              label="Tagline"
              control={<OutputToggle checked={state.showTagline} onToggle={() => update({ showTagline: !state.showTagline })} />}
            >
              {state.showTagline ? (
                <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted))] px-3 py-3 text-sm text-[hsl(var(--bd-text))]">
                  {companyTagline || 'No tagline'}
                </div>
              ) : null}
            </SettingsRow>

            <SettingsRow
              label="Footer"
              control={<OutputToggle checked={state.showFooter} onToggle={() => update({ showFooter: !state.showFooter })} />}
            >
              {state.showFooter ? (
                <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted))] px-3 py-3 text-sm text-[hsl(var(--bd-text))]">
                  {footerText || 'No footer text'}
                </div>
              ) : null}
            </SettingsRow>

            {showBalanceDueOption ? (
              <SettingsRow
                label="Show balance due"
                control={<OutputToggle checked={state.showBalanceDue} onToggle={() => update({ showBalanceDue: !state.showBalanceDue })} />}
              />
            ) : null}

            <SettingsRow
              label="Show amount in words"
              control={<OutputToggle checked={state.showAmountInWords} onToggle={() => update({ showAmountInWords: !state.showAmountInWords })} />}
            />

            <SettingsRow
              label="Show VAT % in brackets"
              control={<OutputToggle checked={state.showVatPercentage} onToggle={() => update({ showVatPercentage: !state.showVatPercentage })} />}
            />

            <SettingsRow
              label="Show WHT % in brackets"
              control={<OutputToggle checked={state.showWhtPercentage} onToggle={() => update({ showWhtPercentage: !state.showWhtPercentage })} />}
            />

            <SettingsRow
              label="Show discount % in brackets"
              control={
                <OutputToggle
                  checked={state.showDiscountPercentage}
                  onToggle={() => update({ showDiscountPercentage: !state.showDiscountPercentage })}
                />
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function PdfSupportingOptions(props: Pick<PdfOutputSettingsProps, 'value' | 'onChange' | 'companyTagline' | 'footerText' | 'showBalanceDueOption'>) {
  return <PdfDocumentOptionsCard {...props} defaultOpen />
}

export function PdfOutputSettings({
  value,
  onChange,
  bankAccounts,
  companyTagline = "Reliable power for every site",
  footerText = "Thank you for your business. Payment is due within 7 days unless otherwise agreed.",
  showBalanceDueOption = false,
}: PdfOutputSettingsProps) {
  return (
    <div className="space-y-3">
      <PdfBankControls value={value} onChange={onChange} bankAccounts={bankAccounts} />
      <PdfDocumentOptionsCard
        value={value}
        onChange={onChange}
        companyTagline={companyTagline}
        footerText={footerText}
        showBalanceDueOption={showBalanceDueOption}
      />
    </div>
  )
}

type BankAccountPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bankAccounts: BankAccount[]
  selectedBankId: string | null
  onSelect: (bankId: string) => void
}

function BankAccountPickerSheet({
  open,
  onOpenChange,
  bankAccounts,
  selectedBankId,
  onSelect,
}: BankAccountPickerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[var(--bd-overlay-radius)]">
        <SheetHeader className="text-left">
          <SheetTitle>Select Bank Account</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 pb-4">
          {bankAccounts.map((bank) => {
            const active = bank.id === selectedBankId

            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => onSelect(bank.id)}
                className={[
                  "w-full rounded-[var(--bd-radius-lg)] border p-3 text-left transition",
                  active
                    ? "border-[hsl(var(--bd-border-strong))] bg-[hsl(var(--bd-border-strong))] text-[hsl(var(--bd-surface))]"
                    : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{bank.bankName}</p>
                      {bank.isDefault ? (
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            active
                              ? "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-border-strong)/0.1)] text-[hsl(var(--bd-surface))]"
                              : "border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]",
                          ].join(" ")}
                        >
                          DEFAULT
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={[
                        "mt-2 space-y-1 text-sm",
                        active ? "text-[hsl(var(--bd-surface)/0.8)]" : "text-[hsl(var(--bd-text-muted))]",
                      ].join(" ")}
                    >
                      <p>{bank.accountName}</p>
                      <p className="font-mono">{bank.accountNumber}</p>
                      <p className="font-mono">{bank.sortCode}</p>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    {active ? (
                      <ChevronUp className="h-4 w-4 opacity-90" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[hsl(var(--bd-text-muted))]" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
