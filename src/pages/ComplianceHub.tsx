import { Suspense, useEffect, useMemo, useState } from 'react'
import { 
  FileSpreadsheet, 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  History, 
  Settings2,
  AlertCircle,
  Bell
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
import TaxRemindersPanel from '@/components/compliance/TaxRemindersPanel'
import ComplianceSettingsPanel from '@/components/compliance/ComplianceSettingsPanel'

type ComplianceTab = 'overview' | 'wht' | 'vat' | 'filings' | 'settings' | 'reminders'

export default function ComplianceHub() {
  const [tab, setTab] = useState<ComplianceTab>('overview')
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [taxInputs, setTaxInputs] = useState<any[]>([])
  const [filings, setFilings] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [invoicesResult, paymentsResult, receiptsResult, taxInputsResult, filingsResult, remindersResult] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, client_name, issue_date, vat, wht, total, status')
            .neq('status', 'archived')
            .order('issue_date', { ascending: false }),
          supabase
            .from('payments')
            .select('*, invoices(invoice_number, client_name)')
            .is('voided_at', null)
            .order('date', { ascending: false }),
          supabase
            .from('wht_receipts')
            .select('*'),
          supabase
            .from('tax_input_entries')
            .select('*')
            .order('date', { ascending: false }),
          supabase
            .from('tax_filings')
            .select('*')
            .order('period_start', { ascending: false }),
          supabase
            .from('tax_reminders')
            .select('*')
            .order('due_date', { ascending: true })
        ])

        if (cancelled) return

        if (invoicesResult.error) throw invoicesResult.error
        if (paymentsResult.error) throw paymentsResult.error
        if (receiptsResult.error) throw receiptsResult.error
        if (taxInputsResult.error) throw taxInputsResult.error
        if (filingsResult.error) throw filingsResult.error
        if (remindersResult.error) throw remindersResult.error

        setInvoices(invoicesResult.data || [])
        setReceipts(receiptsResult.data || [])
        setTaxInputs(taxInputsResult.data || [])
        setFilings(filingsResult.data || [])
        setReminders(remindersResult.data || [])
        
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
    <Layout title="Compliance Hub" session={null} contentClassName="w-full max-w-none bg-[hsl(var(--bd-surface))] p-0 pb-24 md:px-4 md:pb-10">
      <div className="w-full py-4 max-w-5xl mx-auto px-4 md:px-0">
        <div className="space-y-6">
          {/* Operational Header */}
          <div className="rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-1.5">
                <div className="bg-[hsl(var(--bd-status-info-text))] rounded-full h-1.5 w-1.5 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-status-info-text))]">Tax & Compliance</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-[hsl(var(--bd-text))]">Compliance Hub</h1>
              <p className="mt-1 text-xs text-[hsl(var(--bd-text-muted))] leading-relaxed max-w-md">
                Operational workspace for tax obligations, VAT tracking, and withholding certificates.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-[var(--bd-radius-xl)] bg-[hsl(var(--bd-status-danger-bg))] border border-[hsl(var(--bd-status-danger-border))] p-4 text-[hsl(var(--bd-status-danger-text))] text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <Tabs value={tab} onValueChange={(value) => setTab(value as ComplianceTab)} className="w-full">
            <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-2 shadow-sm sticky top-4 z-40">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-max gap-2 bg-transparent p-0">
                  <TabsTrigger 
                    value="reminders" 
                    className="rounded-[var(--bd-radius-lg)] px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-md flex items-center gap-2"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Obligations
                  </TabsTrigger>
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-[var(--bd-radius-lg)] px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-md flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="wht" 
                    className="rounded-[var(--bd-radius-lg)] px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-md flex items-center gap-2"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    WHT Receipts
                  </TabsTrigger>
                  <TabsTrigger 
                    value="vat" 
                    className="rounded-[var(--bd-radius-lg)] px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-md flex items-center gap-2"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    VAT Inputs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="filings" 
                    className="rounded-[var(--bd-radius-lg)] px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-md flex items-center gap-2"
                  >
                    <History className="h-3.5 w-3.5" />
                    Filings
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="rounded-[var(--bd-radius-lg)] px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-md flex items-center gap-2"
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
                      receipts={receipts}
                      taxInputs={taxInputs}
                      filings={filings}
                      reminders={reminders}
                    />
                  </TabsContent>
                  <TabsContent value="wht" className="mt-0">
                    <WhtReceiptsPanel 
                      payments={payments} 
                      receipts={receipts}
                      loading={loading}
                      onReceiptsChanged={() => {
                        supabase.from('wht_receipts').select('*')
                          .then(({ data }) => { if (data) setReceipts(data) })
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="vat" className="mt-0">
                    <VatInputsPanel 
                      taxInputs={taxInputs} 
                      onInputsChanged={() => {
                        supabase.from('tax_input_entries').select('*').order('date', { ascending: false })
                          .then(({ data }) => { if (data) setTaxInputs(data) })
                      }} 
                    />
                  </TabsContent>
                  <TabsContent value="reminders" className="mt-0">
                    <TaxRemindersPanel
                      reminders={reminders}
                      filings={filings}
                      onRemindersChanged={() => {
                        supabase.from('tax_reminders').select('*').order('due_date', { ascending: true })
                          .then(({ data }) => { if (data) setReminders(data) })
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="filings" className="mt-0">
                    <TaxFilingsPanel
                      filings={filings}
                      onFilingsChanged={() => {
                        supabase.from('tax_filings').select('*').order('period_start', { ascending: false })
                          .then(({ data }) => { if (data) setFilings(data) })
                      }}
                    />
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
