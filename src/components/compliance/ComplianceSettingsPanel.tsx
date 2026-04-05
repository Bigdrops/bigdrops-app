import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings2, Building, HelpCircle } from 'lucide-react'

export default function ComplianceSettingsPanel() {
  return (
    <div className="space-y-4 pb-20">
      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader className="pb-3 border-b border-white">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-600" />
            Entity Tax Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5">TIN (Tax ID Number)</div>
                <div className="text-sm font-bold text-slate-800 italic opacity-50">Not set</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5">VAT Status</div>
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Phase 2</Badge>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5">WHT Rate (Services)</div>
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Phase 2</Badge>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5">Filing Frequency</div>
                <div className="text-sm font-bold text-slate-800 italic opacity-50">Not configured</div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Settings2 className="h-4 w-4" />
                <span>Feature Toggle (Phase 2)</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 opacity-40 grayscale">
                  <span className="text-sm font-medium text-slate-700">WHT calculation on invoices</span>
                  <div className="h-5 w-8 bg-slate-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 opacity-40 grayscale">
                  <span className="text-sm font-medium text-slate-700">VAT calculation on invoices</span>
                  <div className="h-5 w-8 bg-slate-200 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-blue-50/20">
        <CardContent className="p-4 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-[11px] text-blue-800 leading-relaxed">
            <span className="font-bold text-blue-900">Note:</span> These settings are currently read-only. We are working on a tax configuration module that will allow you to define jurisdictions and custom rates.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
