import { useCallback, useEffect, useState } from 'react'
import { useEntity } from '@/lib/tenant/contexts'

export function useInvoiceReferenceData() {
  const { tenantClient } = useEntity()
  const [signatories, setSignatories] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [settingsData, setSettingsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [signatoriesResult, bankAccountsResult, settingsResult] = await Promise.all([
        tenantClient.from('signatories').select('*').order('name'),
        tenantClient.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        tenantClient.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
      ])
      setSignatories(signatoriesResult.data || [])
      setBankAccounts(bankAccountsResult.data || [])
      setSettingsData(settingsResult.data || null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [tenantClient])

  useEffect(() => {
    if (tenantClient.isReady) void load()
  }, [load, tenantClient.isReady])

  return { signatories, bankAccounts, settingsData, loading, error, refresh: load }
}
