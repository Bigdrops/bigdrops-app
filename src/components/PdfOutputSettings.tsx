import * as React from "react"
import { ChevronDown, ChevronUp, Landmark, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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

export function PdfOutputSettings({
  value,
  onChange,
  bankAccounts,
  companyTagline = "Reliable power for every site",
  footerText = "Thank you for your business. Payment is due within 7 days unless otherwise agreed.",
}: PdfOutputSettingsProps) {
  const banks = bankAccounts && bankAccounts.length > 0 ? bankAccounts : PLACEHOLDER_BANKS
  const defaultBank = getDefaultBank(banks)

  const initialState = React.useMemo<PdfOutputSettingsValue>(() => {
    return {
      showBankDetails: value?.showBankDetails ?? false,
      bankAccountId: value?.bankAccountId ?? defaultBank?.id ?? null,
      showFooter: value?.showFooter ?? true,
      showTagline: value?.showTagline ?? true,
    }
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

  function handleToggleBankDetails(checked: boolean) {
    update({
      showBankDetails: checked,
      bankAccountId: checked
        ? state.bankAccountId || defaultBank?.id || null
        : state.bankAccountId,
    })
  }

  function ToggleRow({
    label,
    checked,
    onCheckedChange,
    children,
  }: {
    label: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    children?: React.ReactNode
  }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900">{label}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {checked ? "ON" : "OFF"}
            </div>
          </div>
          <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
        </div>
        {children}
      </div>
    )
  }

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        >
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-900">Document Options</div>
            <div className="mt-1 text-xs text-slate-500">
              Control what appears in the generated document.
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>

        {expanded ? (
          <div className="space-y-3 border-t border-slate-100 px-4 py-4">
            <ToggleRow
              label="Show Tagline"
              checked={state.showTagline}
              onCheckedChange={(checked) => update({ showTagline: checked })}
            >
              {state.showTagline ? (
                <div className="px-3 pb-3">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-sm font-medium text-slate-900">Tagline Preview</p>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {companyTagline || "No company tagline found."}
                    </p>
                  </div>
                </div>
              ) : null}
            </ToggleRow>

            <ToggleRow
              label="Show Footer"
              checked={state.showFooter}
              onCheckedChange={(checked) => update({ showFooter: checked })}
            >
              {state.showFooter ? (
                <div className="px-3 pb-3">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <p className="text-sm font-medium text-slate-900">Footer Preview</p>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-600">{footerText || "No footer text found."}</p>
                  </div>
                </div>
              ) : null}
            </ToggleRow>

            <ToggleRow
              label="Bank Details"
              checked={state.showBankDetails}
              onCheckedChange={handleToggleBankDetails}
            >
              {state.showBankDetails && selectedBank ? (
                <div className="space-y-3 px-3 pb-3">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-slate-500" />
                      <p className="text-sm font-medium text-slate-900">Selected Account</p>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-700">
                      <div>
                        <span className="text-slate-500">Bank:</span>{" "}
                        <span className="font-medium text-slate-900">{selectedBank.bankName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Account Name:</span>{" "}
                        <span className="text-slate-900">{selectedBank.accountName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Account Number:</span>{" "}
                        <span className="font-mono text-slate-900">{selectedBank.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Sort Code:</span>{" "}
                        <span className="font-mono text-slate-900">{selectedBank.sortCode}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setBankSheetOpen(true)}
                  >
                    <span>Select another account</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </ToggleRow>
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
                    : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
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
                        active ? "text-slate-200" : "text-slate-600",
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
                      <ChevronDown className="h-4 w-4 text-slate-400" />
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
