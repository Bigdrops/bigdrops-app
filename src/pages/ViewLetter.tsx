import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Pencil } from "lucide-react"
import DocumentPage from "@/components/document-view/shared/DocumentPage"
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav"
import { getLetter } from "@/domain/correspondence/letter/letterRepository"
import type { LetterDocument, LetterBodyBlock } from "@/domain/correspondence/letter/types"

function renderBlock(block: LetterBodyBlock, idx: number) {
  switch (block.type) {
    case "heading":
      const level = Math.min(block.level ?? 1, 6)
      const tag = `h${level}`
      return <div key={idx} className={`font-bold text-bd-text mt-4 mb-1 ${tag === "h1" ? "text-lg" : tag === "h2" ? "text-base" : "text-sm"}`}>{block.text}</div>
    case "paragraph":
      return <p key={idx} className="text-sm text-bd-text leading-relaxed">{block.text}</p>
    case "list":
      const ListTag = block.variant === "ordered" ? "ol" : "ul"
      return (
        <ListTag key={idx} className="list-inside list-disc text-sm text-bd-text space-y-1">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ListTag>
      )
    case "quote":
      return (
        <blockquote key={idx} className="border-l-4 border-bd-border pl-4 text-sm italic text-bd-text-muted">
          <p>{block.text}</p>
          {block.attribution && <footer className="mt-1 text-xs">— {block.attribution}</footer>}
        </blockquote>
      )
    case "divider":
      return <hr key={idx} className="my-4 border-bd-border" />
    case "signature":
      return (
        <div key={idx} className="mt-6">
          <p className="text-sm font-bold text-bd-text">{block.name}</p>
          {block.title && <p className="text-xs text-bd-text-muted">{block.title}</p>}
        </div>
      )
    case "image":
      return (
        <figure key={idx} className="my-4">
          <img src={block.url} alt={block.alt} className="max-w-full rounded-lg" />
          {block.caption && <figcaption className="mt-1 text-xs text-bd-text-muted">{block.caption}</figcaption>}
        </figure>
      )
    default:
      return null
  }
}

export default function ViewLetter() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [letter, setLetter] = useState<LetterDocument | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getLetter(id)
      .then((doc) => {
        if (!doc) { navigate("/letters", { replace: true }); return }
        setLetter(doc)
      })
      .catch(() => navigate("/letters", { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400",
      approved: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400",
      issued: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400",
      archived: "bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400",
    }
    return map[status] ?? "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <DocumentPage
        topNav={<DocumentTopNav title="Opening Letter..." subtitle="Loading letter content" onBack={() => navigate("/letters")} />}
      >
        <div className="px-4 py-20 text-center text-sm text-bd-text-muted">Loading letter...</div>
      </DocumentPage>
    )
  }

  if (!letter) return null

  return (
    <DocumentPage
      topNav={
        <DocumentTopNav
          title="Official Letter"
          subtitle={letter.identity.documentNumber}
          onBack={() => navigate("/letters")}
        />
      }
      actionRow={
        <div className="flex items-center justify-between px-4 py-2">
          <span className={`inline-flex h-6 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-wider ${statusColor(letter.status)}`}>
            {letter.status}
          </span>
          {letter.status === "draft" && (
            <button
              type="button"
              onClick={() => navigate(`/letters/edit/${letter.identity.id}`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-bd-button-primary-bg px-3 text-xs font-bold text-bd-button-primary-text"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      }
      hero={
        <div className="border-b border-bd-border px-4 py-4">
          <h1 className="text-xl font-bold text-bd-text">{letter.subject}</h1>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">To</span>
              <p className="mt-0.5 font-medium text-bd-text">{letter.recipient.companyName}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">From</span>
              <p className="mt-0.5 font-medium text-bd-text">{letter.sender.companyName}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Date</span>
              <p className="mt-0.5 text-bd-text">{letter.date}</p>
            </div>
            {letter.referenceNumber && (
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Reference</span>
                <p className="mt-0.5 text-bd-text">{letter.referenceNumber}</p>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-1">
        {letter.body.blocks.map((block, idx) => renderBlock(block, idx))}
      </div>
    </DocumentPage>
  )
}
