import { useEffect } from 'react'
import { useEntity } from '@/lib/tenant/contexts'

const POLL_INTERVAL_MS = 3000

export default function ProvisioningProgress() {
  const entityCtx = useEntity()

  useEffect(() => {
    const id = setInterval(() => {
      entityCtx.refresh()
      entityCtx.recheckProvisioning()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [entityCtx])

  return null
}
