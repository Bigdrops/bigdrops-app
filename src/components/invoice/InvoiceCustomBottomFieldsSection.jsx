import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function InvoiceCustomBottomFieldsSection({
  bottomFields,
  setBottomFields,
  emptyStateText,
  placeholder,
}) {
  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Custom Fields</CardTitle>
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-sm font-bold text-indigo-500"
            onClick={() => setBottomFields((f) => [...f, { text: '' }])}
          >
            + Add Custom Field
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bottomFields.length === 0 && (
          <div className="text-sm italic text-slate-400">{emptyStateText}</div>
        )}
        {bottomFields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              value={field.text}
              onChange={(e) => {
                const u = [...bottomFields]
                u[i] = { text: e.target.value }
                setBottomFields(u)
              }}
              placeholder={placeholder}
            />
            <Button
              type="button"
              onClick={() => setBottomFields(bottomFields.filter((_, j) => j !== i))}
              variant="ghost"
              className="h-9 px-2 text-xl text-red-700"
            >
              ×
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
