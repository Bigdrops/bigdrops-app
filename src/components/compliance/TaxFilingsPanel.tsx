import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, History } from 'lucide-react'

export default function TaxFilingsPanel() {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-100 bg-emerald-50/20">
        <CardHeader className="pb-3 border-b border-emerald-50">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
            <ClipboardList className="h-4 w-4" />
            Tax Filing Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
            <History className="h-10 w-10 text-slate-200 mx-auto mb-4" />
            <div className="text-sm font-bold text-slate-800">No Filings Found</div>
            <div className="text-xs text-muted-foreground mt-2 max-w-[300px] mx-auto px-4">
              Historical filing records and submission documents will appear here once tax filing features are enabled in Phase 2.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-sm font-black tracking-tight leading-tight uppercase text-emerald-700 mb-2">Phase 2 Goal</div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
            Our goal is to simplify VAT and WHT filing, helping you stay compliant with taxing authorities through a streamlined digital workspace.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 opacity-5">
          <ClipboardList className="h-48 w-48" />
        </div>
      </div>
    </div>
  )
}
