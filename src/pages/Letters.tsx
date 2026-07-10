import { Mail } from "lucide-react"
import Layout from "../components/Layout"
import ModuleShell from "@/components/layout/ModuleShell"

import { useState } from "react"

export default function Letters() {
  const [search, setSearch] = useState("")
  return (
    <Layout title="Official Letters" hidePageHeader>
      <ModuleShell
        eyebrow="Correspondence"
        title="Official Letters"
        summary="0 letters"
        tone="violet"
        searchValue={search}
        onSearchChange={(v) => setSearch(v as string)}
        records={[]}
        renderRow={() => null}
        emptyState={(
          <div className="rounded-[24px] border border-dashed border-bd-border bg-bd-surface/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
              <Mail className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-bold text-bd-text">Coming Soon</div>
            <div className="mt-1 text-xs text-bd-text-muted max-w-[280px] mx-auto">
              Official Letters module is under development.
            </div>
          </div>
        )}
      />
    </Layout>
  )
}
