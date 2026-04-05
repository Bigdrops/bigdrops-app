import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

export default function VatInputsPanel() {
  return (
    <div className="space-y-4">
      <Card className="border-amber-100 bg-amber-50/20">
        <CardHeader className="pb-3 border-b border-amber-50">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600" />
            VAT Inputs (Recoverable)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="text-sm font-bold text-slate-800">No VAT Inputs Recorded</div>
            <div className="text-xs text-muted-foreground mt-2 max-w-[280px] mx-auto">
              Recoverable VAT from your business purchases and expenses will be tracked here once expense management is enabled.
            </div>
            <div className="mt-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                Phase 2 Feature
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg overflow-hidden relative">
        <div className="relative z-10">
          <div className="text-lg font-black tracking-tight">Understanding VAT Inputs</div>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            VAT inputs are the taxes you pay on business-related purchases. In many jurisdictions, you can deduct these from the VAT you collect (VAT Output) to arrive at your net VAT payable.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 opacity-10">
          <Info className="h-48 w-48" />
        </div>
      </div>
    </div>
  )
}
