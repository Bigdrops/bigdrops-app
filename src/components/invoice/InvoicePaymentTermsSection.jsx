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

export default function InvoicePaymentTermsSection({ invoice, updateInvoice }) {
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="text-base">Payment Terms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Payment Terms</Label>
            <Select
              value={invoice.payment_terms || ''}
              onValueChange={(value) => updateInvoice('payment_terms', value)}
            >
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={6} className="bg-white">
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
              <Label>Specify Terms</Label>
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
