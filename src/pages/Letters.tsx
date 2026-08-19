import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FileText } from "lucide-react"
import Layout from "../components/Layout"
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from "@/components/layout/ModuleShell"
import ModuleRowCard from "@/components/layout/ModuleRowCard"
import { listLetters } from "@/domain/correspondence/letter/letterRepository"
import type { LetterDocument } from "@/domain/correspondence/letter/types"
import { useEntity } from "@/lib/tenant/contexts"

export default function Letters() {
  const [search, setSearch] = useState("")
  const [letters, setLetters] = useState<LetterDocument[]>([])
  const navigate = useNavigate()
  const { tenantClient } = useEntity()

  useEffect(() => {
    if (!tenantClient.isReady) return
    listLetters(tenantClient).then(setLetters).catch(() => {})
  }, [tenantClient])

  const filtered = letters.filter(
    (l) =>
      !search ||
      l.subject.toLowerCase().includes(search.toLowerCase()) ||
      l.recipient.companyName.toLowerCase().includes(search.toLowerCase()) ||
      l.identity.documentNumber.toLowerCase().includes(search.toLowerCase()),
  )

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
      approved: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      issued: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
      archived: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
      cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    }
    return map[status] ?? "bg-gray-50 text-gray-700"
  }

  return (
    <Layout title="Official Letters" hidePageHeader>
      <ModuleShell
        eyebrow="Correspondence"
        title="Official Letters"
        summary={`${letters.length} letter${letters.length !== 1 ? "s" : ""}`}
        tone="violet"
        primaryActionLabel="New Letter"
        onPrimaryAction={() => navigate('/letters/new')}
        searchValue={search}
        onSearchChange={(v) => setSearch(v as string)}
        searchPlaceholder="Search by number, recipient or subject..."
        records={filtered}
        renderRow={(letter: LetterDocument) => (
          <ModuleRowCard
            key={letter.identity.id}
            title={letter.subject}
            subtitle={letter.recipient.companyName}
            tertiary={letter.identity.documentNumber}
            statusLabel={letter.status.toUpperCase()}
            statusClassName={statusColor(letter.status)}
            onClick={() => navigate(`/letters/${letter.identity.id}`)}
          />
        )}
        emptyState={
          <div className="rounded-[24px] border border-dashed border-bd-border bg-bd-surface/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
              <FileText className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-bold text-bd-text">No Letters Found</div>
            <div className="mt-1 text-xs text-bd-text-muted max-w-[280px] mx-auto">
              Create your first official letter to get started.
            </div>
          </div>
        }
      />
      <MobileFab onClick={() => navigate('/letters/new')} ariaLabel="Create letter" />
    </Layout>
  )
}
