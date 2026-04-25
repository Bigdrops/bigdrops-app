import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import React from 'react'

interface CustomField {
  id: string
  text: string
}

interface InvoiceCustomBottomFieldsSectionProps {
  bottomFields: CustomField[]
  setBottomFields: React.Dispatch<React.SetStateAction<CustomField[]>>
  emptyStateText: string
  placeholder: string
}

export default function InvoiceCustomBottomFieldsSection({
  bottomFields,
  setBottomFields,
  emptyStateText,
  placeholder,
}: InvoiceCustomBottomFieldsSectionProps) {
  const addField = () =>
    setBottomFields((fields) => [
      ...fields,
      { id: 'bottom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), text: '' },
    ])

  const updateField = (id: string, text: string) =>
    setBottomFields((fields) =>
      fields.map((field) => (field.id === id ? { ...field, text } : field)),
    )

  const removeField = (id: string) =>
    setBottomFields((fields) => fields.filter((field) => field.id !== id))

  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Custom Fields</CardTitle>
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-sm font-bold text-indigo-500"
            onClick={addField}
          >
            + Add Custom Field
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bottomFields.length === 0 && (
          <div className="text-sm italic text-muted-foreground">{emptyStateText}</div>
        )}
        {bottomFields.map((field) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              className="flex-1"
              value={field.text}
              onChange={(e) => updateField(field.id, e.target.value)}
              placeholder={placeholder}
            />
            <Button
              type="button"
              onClick={() => removeField(field.id)}
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
