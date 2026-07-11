import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Layout from "../components/Layout"
import ClientSelector from "@/components/ClientSelector"
import LetterBodyEditor, { bodyBlocksToText } from "@/components/correspondence/LetterBodyEditor"
import { useLetterSave } from "@/hooks/useLetterSave"
import type { LetterFormFields } from "@/hooks/useLetterSave"
import { getLetter } from "@/domain/correspondence/letter/letterRepository"
import type { LetterDocument } from "@/domain/correspondence/letter/types"

export default function EditLetter() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [letter, setLetter] = useState<LetterDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [fields, setFields] = useState<LetterFormFields>({
    subject: "",
    date: "",
    recipientId: "",
    recipientName: "",
    senderName: "",
    bodyText: "",
  })

  useEffect(() => {
    if (!id) return
    getLetter(id)
      .then((doc) => {
        if (!doc) { navigate("/letters", { replace: true }); return }
        setLetter(doc)
        setFields({
          subject: doc.subject,
          date: doc.date,
          recipientId: doc.recipient.clientId ?? "",
          recipientName: doc.recipient.companyName,
          senderName: doc.sender.companyName,
          bodyText: bodyBlocksToText(doc.body),
        })
      })
      .catch(() => navigate("/letters", { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const { saving, save } = useLetterSave({
    fields,
    isCreate: false,
    isEdit: true,
    id,
    navigate,
  })

  const update = (key: keyof LetterFormFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  if (loading) {
    return (
      <Layout title="Edit Letter" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
        <div className="px-4 py-20 text-center text-sm text-bd-text-muted">Loading...</div>
      </Layout>
    )
  }

  if (!letter) return null

  const isDraft = letter.status === "draft"

  return (
    <Layout title="Edit Letter" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-lg font-bold text-bd-text">Edit Letter</h1>
          <p className="text-xs text-bd-text-muted">
            {letter.identity.documentNumber}
            {!isDraft && " \u2014 read-only fields locked"}
          </p>
        </div>

        {isDraft ? (
          <ClientSelector
            clientId={fields.recipientId}
            clientName={fields.recipientName}
            onClientChange={(id, name) => {
              update("recipientId", id)
              update("recipientName", name)
            }}
          />
        ) : (
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Recipient</label>
            <div className="h-12 w-full rounded-xl border border-bd-border bg-bd-surface-muted px-4 text-sm text-bd-text-muted flex items-center">
              {letter.recipient.companyName}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Subject</label>
          <input
            type="text"
            value={fields.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Letter subject..."
            className="h-12 w-full rounded-xl border border-bd-border bg-bd-surface px-4 text-sm text-bd-text placeholder:text-bd-text-muted focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Date</label>
          <input
            type="date"
            value={fields.date}
            onChange={(e) => update("date", e.target.value)}
            className="h-12 w-full rounded-xl border border-bd-border bg-bd-surface px-4 text-sm text-bd-text focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">From (Company Name)</label>
          <input
            type="text"
            value={fields.senderName}
            onChange={(e) => update("senderName", e.target.value)}
            placeholder="Your company name..."
            className="h-12 w-full rounded-xl border border-bd-border bg-bd-surface px-4 text-sm text-bd-text placeholder:text-bd-text-muted focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Body</label>
          <LetterBodyEditor
            value={fields.bodyText}
            onChange={(v) => update("bodyText", v)}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/letters/${id}`)}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-bd-border text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !isDraft}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-bd-button-primary-bg text-sm font-bold text-bd-button-primary-text transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Layout>
  )
}
