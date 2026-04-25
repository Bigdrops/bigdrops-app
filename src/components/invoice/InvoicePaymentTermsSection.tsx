import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InvoicePaymentTermsSectionProps {
  invoice: {
    payment_terms?: string | null
    custom_payment_terms?: string | null
  }
  updateInvoice: (field: 'payment_terms' | 'custom_payment_terms', value: string) => void
}

export default function InvoicePaymentTermsSection({
  invoice,
  updateInvoice,
}: InvoicePaymentTermsSectionProps) {
  return (
    <Card className="mb-5 rounded-xl border border-border bg-card shadow-sm">
      <CardHeader className="space-y-1 px-6 pb-0 pt-6">
        <CardTitle className="text-sm font-medium text-foreground">Payment Terms</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-foreground">Payment Terms</Label>
            <Select
              value={invoice.payment_terms || ''}
              onValueChange={(value) => updateInvoice('payment_terms', value)}
            >
              <SelectTrigger className="mt-2 bg-background">
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={6} className="bg-background">
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                <SelectItem value="50% advance">50% advance</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {invoice.payment_terms === 'Custom' && (
            <div>
              <Label className="text-sm font-medium text-foreground">Specify Terms</Label>
              <Input
                className="mt-2"
                value={invoice.custom_payment_terms || ''}
                onChange={(e) => updateInvoice('custom_payment_terms', e.target.value)}
                placeholder="e.g. 60% downpayment, 40% on delivery"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
