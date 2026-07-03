import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useInvoiceReferenceData() {
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
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
      ])
      setSignatories(signatoriesResult.data || [])
      setBankAccounts(bankAccountsResult.data || [])
      setSettingsData(settingsResult.data || null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { signatories, bankAccounts, settingsData, loading, error, refresh: load }
}
