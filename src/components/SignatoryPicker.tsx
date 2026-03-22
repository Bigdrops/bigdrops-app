import * as React from "react"
import { ChevronDown, UserSquare2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

type Signatory = {
  id: string
  name: string
  role?: string
  signatureUrl?: string
}

type InvoiceSignatoryPickerProps = {
  value?: string | null
  onChange?: (signatoryId: string | null) => void
  signatories?: Signatory[]
}

const PLACEHOLDER_SIGNATORIES: Signatory[] = [
  {
    id: "1",
    name: "Adewale Musa",
    role: "Finance Manager",
    signatureUrl: "https://via.placeholder.com/64x64.png?text=Sig",
  },
  {
    id: "2",
    name: "Chioma Okafor",
    role: "Director",
    signatureUrl: "https://via.placeholder.com/64x64.png?text=Sig",
  },
  {
    id: "3",
    name: "Emeka Nwosu",
    role: "Project Manager",
    signatureUrl: "https://via.placeholder.com/64x64.png?text=Sig",
  },
]

export function InvoiceSignatoryPicker({
  value = null,
  onChange,
  signatories,
}: InvoiceSignatoryPickerProps) {
  const items = signatories && signatories.length > 0 ? signatories : PLACEHOLDER_SIGNATORIES
  const [selectedId, setSelectedId] = React.useState<string | null>(value)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setSelectedId(value ?? null)
  }, [value])

  const selected = items.find((item) => item.id === selectedId) || null

  function handleSelect(id: string) {
    setSelectedId(id)
    onChange?.(id)
    setOpen(false)
  }

  function handleRemove() {
    setSelectedId(null)
    onChange?.(null)
  }

  return (
    <>
      <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-slate-900">
            Signature
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Assign one saved signatory to this invoice.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!selected ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    No signatory selected
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Pick a saved signatory to include a signature on this invoice.
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setOpen(true)}
                >
                  <span>Add Signatory</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50/40">
              <div className="px-3 py-3">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {selected.signatureUrl ? (
                      <img
                        src={selected.signatureUrl}
                        alt={`${selected.name} signature`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserSquare2 className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {selected.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {selected.role || "No role"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 justify-between"
                    onClick={() => setOpen(true)}
                  >
                    <span>Change Signatory</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleRemove}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SignatoryPickerSheet
        open={open}
        onOpenChange={setOpen}
        items={items}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
    </>
  )
}

type SignatoryPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Signatory[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function SignatoryPickerSheet({
  open,
  onOpenChange,
  items,
  selectedId,
  onSelect,
}: SignatoryPickerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Select Signatory</SheetTitle>
          <SheetDescription>
            Choose one saved signatory for this invoice.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2 pb-4">
          {items.map((item) => {
            const active = item.id === selectedId

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.name}</p>
                  </div>

                  {active ? (
                    <span className="text-xs font-medium text-slate-300">Selected</span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default InvoiceSignatoryPicker
