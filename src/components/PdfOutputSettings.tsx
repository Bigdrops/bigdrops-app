import * as React from "react"
import { ChevronDown, ChevronUp, Landmark, FileText } from "lucide-react"

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
    showBankDetails: value?.showBankDetails ?? false,
    bankAccountId: value?.bankAccountId ?? defaultBank?.id ?? null,
    showFooter: value?.showFooter ?? true,
    showTagline: value?.showTagline ?? true,
  }
}

function OutputToggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
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
      <Card className="rounded-[24px] border-border shadow-sm">
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
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  <Landmark className="h-4 w-4" />
                  Selected Account
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Account Name</div>
                    <div className="mt-1 font-semibold text-foreground">{selectedBank.accountName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Account Number</div>
                    <div className="mt-1 font-mono font-semibold text-foreground">{selectedBank.accountNumber}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Bank</div>
                    <div className="mt-1 font-semibold text-foreground">{selectedBank.bankName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Sort Code</div>
                    <div className="mt-1 font-mono font-semibold text-foreground">{selectedBank.sortCode}</div>
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

export function PdfSupportingOptions({
  value,
  onChange,
  companyTagline = 'Reliable power for every site',
  footerText = 'Thank you for your business. Payment is due within 7 days unless otherwise agreed.',
}: Pick<PdfOutputSettingsProps, 'value' | 'onChange' | 'companyTagline' | 'footerText'>) {
  const state = mergeOutputState(value, null)

  function update(patch: Partial<PdfOutputSettingsValue>) {
    onChange?.({ ...state, ...patch })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-border bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">Letterhead Tagline</div>
          <OutputToggle checked={state.showTagline} onToggle={() => update({ showTagline: !state.showTagline })} />
        </div>
        {state.showTagline ? (
          <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            {companyTagline || 'No tagline'}
          </div>
        ) : null}
      </div>

      <div className="rounded-[20px] border border-border bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">Footer</div>
          <OutputToggle checked={state.showFooter} onToggle={() => update({ showFooter: !state.showFooter })} />
        </div>
        {state.showFooter ? (
          <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            {footerText || 'No footer'}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function PdfOutputSettings({
  value,
  onChange,
  bankAccounts,
  companyTagline = "Reliable power for every site",
  footerText = "Thank you for your business. Payment is due within 7 days unless otherwise agreed.",
}: PdfOutputSettingsProps) {
  const banks = resolveBanks(bankAccounts)
  const defaultBank = getDefaultBank(banks)

  const initialState = React.useMemo<PdfOutputSettingsValue>(() => {
    return mergeOutputState(value, defaultBank)
  }, [value?.showBankDetails, value?.bankAccountId, value?.showFooter, value?.showTagline, defaultBank?.id])

  const [state, setState] = React.useState<PdfOutputSettingsValue>(initialState)
  const [bankSheetOpen, setBankSheetOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)

  React.useEffect(() => {
    setState(initialState)
  }, [initialState])

  const selectedBank =
    banks.find((b) => b.id === state.bankAccountId) || defaultBank || null

  function update(patch: Partial<PdfOutputSettingsValue>) {
    setState((prev) => {
      const next = { ...prev, ...patch }
      onChange?.(next)
      return next
    })
  }

  return (
    <Card className="rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-4 text-left"
        >
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">Document Options</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Control what appears in the generated document.
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expanded ? (
          <div className="space-y-0 border-t border-border px-4 py-4">
            <div className="flex w-full items-center justify-between py-3 border-b border-border last:border-0">
              <span className="text-sm font-medium text-slate-700">Bank Details</span>
              <OutputToggle
                checked={state.showBankDetails}
                onToggle={() =>
                  update({
                    showBankDetails: !state.showBankDetails,
                    bankAccountId: !state.showBankDetails
                      ? state.bankAccountId || defaultBank?.id || null
                      : state.bankAccountId,
                  })
                }
              />
            </div>
            {state.showBankDetails && selectedBank ? (
              <div className="space-y-3 border-b border-border bg-emerald-50 px-3 py-3">
                <div className="rounded-md border-l-4 border-emerald-500 bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-md bg-emerald-100 p-1.5 text-emerald-700">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Selected Account</p>
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-700">
                    <div>
                      <span className="text-muted-foreground">Bank:</span>{" "}
                      <span className="font-medium text-foreground">{selectedBank.bankName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Name:</span>{" "}
                      <span className="text-foreground">{selectedBank.accountName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Number:</span>{" "}
                      <span className="font-mono text-foreground">{selectedBank.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sort Code:</span>{" "}
                      <span className="font-mono text-foreground">{selectedBank.sortCode}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between border-emerald-200 bg-card text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setBankSheetOpen(true)}
                >
                  <span>Select another account</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex w-full items-center justify-between py-3 border-b border-border last:border-0">
              <span className="text-sm font-medium text-slate-700">Show Tagline</span>
              <OutputToggle checked={state.showTagline} onToggle={() => update({ showTagline: !state.showTagline })} />
            </div>
            {state.showTagline ? (
              <div className="border-b border-border bg-blue-50 px-3 py-3">
                <div className="rounded-md border-l-4 border-blue-500 bg-card p-3">
                  <p className="mb-1 text-sm font-medium text-foreground">Tagline Preview</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {companyTagline || "No company tagline found."}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex w-full items-center justify-between py-3 border-b border-border last:border-0">
              <span className="text-sm font-medium text-slate-700">Show Footer</span>
              <OutputToggle checked={state.showFooter} onToggle={() => update({ showFooter: !state.showFooter })} />
            </div>
            {state.showFooter ? (
              <div className="bg-amber-50 px-3 py-3">
                <div className="rounded-md border-l-4 border-amber-500 bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-md bg-amber-100 p-1.5 text-amber-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Footer Preview</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{footerText || "No footer text found."}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

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
    </Card>
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
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Select Bank Account</SheetTitle>
          <SheetDescription>
            Choose which saved account should appear on the PDF.
          </SheetDescription>
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
                  "w-full rounded-xl border p-3 text-left transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-border bg-card text-foreground hover:bg-muted/50",
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
                              ? "border-slate-700 bg-slate-800 text-slate-200"
                              : "border-green-200 bg-green-50 text-green-700",
                          ].join(" ")}
                        >
                          DEFAULT
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={[
                        "mt-2 space-y-1 text-sm",
                        active ? "text-slate-200" : "text-muted-foreground",
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
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
