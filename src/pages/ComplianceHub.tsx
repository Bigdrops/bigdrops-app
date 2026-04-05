import { Suspense, useEffect, useMemo, useState } from 'react'
import { 
  FileSpreadsheet, 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  History, 
  Settings2,
  AlertCircle
} from 'lucide-react'

import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageLoader from '@/components/app/PageLoader'

// Sub-components
import ComplianceOverview from '@/components/compliance/ComplianceOverview'
import WhtReceiptsPanel from '@/components/compliance/WhtReceiptsPanel'
import VatInputsPanel from '@/components/compliance/VatInputsPanel'
import TaxFilingsPanel from '@/components/compliance/TaxFilingsPanel'
import ComplianceSettingsPanel from '@/components/compliance/ComplianceSettingsPanel'

type ComplianceTab = 'overview' | 'wht' | 'vat' | 'filings' | 'settings'

export default function ComplianceHub() {
  const [tab, setTab] = useState<ComplianceTab>('overview')
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [invoicesResult, paymentsResult] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, client_name, issue_date, vat, wht, total, status')
            .not('status', 'in', '("draft","cancelled","archived")')
            .order('issue_date', { ascending: false }),
          supabase
            .from('payments')
            .select('*, invoices(invoice_number, client_name)')
            .is('voided_at', null)
            .order('date', { ascending: false })
        ])

        if (cancelled) return

        if (invoicesResult.error) throw invoicesResult.error
        if (paymentsResult.error) throw paymentsResult.error

        setInvoices(invoicesResult.data || [])
        
        // Flatten payments with joined records
        const flattenedPayments = (paymentsResult.data || []).map(p => {
          const joinedInvoice = Array.isArray(p.invoices) ? p.invoices[0] : p.invoices
          return {
            ...p,
            invoice_number: joinedInvoice?.invoice_number || '—',
            client_name: joinedInvoice?.client_name || '—'
          }
        })
        setPayments(flattenedPayments)

      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load compliance data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const taxMetrics = useMemo(() => {
    const vatCharged = invoices.reduce((sum, row) => sum + Number(row.vat || 0), 0)
    const whtDeducted = payments.reduce((sum, row) => sum + Number(row.wht_amount || 0), 0)
    const netPosition = vatCharged - whtDeducted

    return { vatCharged, whtDeducted, netPosition }
  }, [invoices, payments])

  return (
    <Layout title="Compliance Hub" session={null} contentClassName="w-full max-w-none bg-slate-50 p-0 pb-24 md:px-4 md:pb-10">
      <div className="w-full py-4 max-w-5xl mx-auto px-4 md:px-0">
        <div className="space-y-6">
          {/* Section Header */}
          <div className="rounded-3xl border border-slate-900 bg-[#0F172A] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Phase 1: Operational Area</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight">Compliance Hub</h1>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-md">
                Dedicated operational area for tax compliance, VAT tracking, and withholding certificates.
              </p>
            </div>
            <FileSpreadsheet className="absolute top-1/2 right-10 -translate-y-1/2 h-32 w-32 text-slate-800 opacity-40 -rotate-12" />
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-700 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <Tabs value={tab} onValueChange={(value) => setTab(value as ComplianceTab)} className="w-full">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sticky top-4 z-40">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-max gap-2 bg-transparent p-0">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[#0F172A] data-[state=active]:text-white flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="wht" 
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[#0F172A] data-[state=active]:text-white flex items-center gap-2"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    WHT Receipts
                  </TabsTrigger>
                  <TabsTrigger 
                    value="vat" 
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[#0F172A] data-[state=active]:text-white flex items-center gap-2"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    VAT Inputs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="filings" 
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[#0F172A] data-[state=active]:text-white flex items-center gap-2"
                  >
                    <History className="h-3.5 w-3.5" />
                    Filings
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[#0F172A] data-[state=active]:text-white flex items-center gap-2"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="mt-8">
              {loading ? (
                <div className="py-20">
                  <PageLoader />
                </div>
              ) : (
                <Suspense fallback={<PageLoader />}>
                  <TabsContent value="overview" className="mt-0">
                    <ComplianceOverview 
                      vatCharged={taxMetrics.vatCharged}
                      whtDeducted={taxMetrics.whtDeducted}
                      netPosition={taxMetrics.netPosition}
                      recentInvoices={invoices}
                      recentPayments={payments}
                    />
                  </TabsContent>
                  <TabsContent value="wht" className="mt-0">
                    <WhtReceiptsPanel payments={payments} loading={loading} />
                  </TabsContent>
                  <TabsContent value="vat" className="mt-0">
                    <VatInputsPanel />
                  </TabsContent>
                  <TabsContent value="filings" className="mt-0">
                    <TaxFilingsPanel />
                  </TabsContent>
                  <TabsContent value="settings" className="mt-0">
                    <ComplianceSettingsPanel />
                  </TabsContent>
                </Suspense>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
