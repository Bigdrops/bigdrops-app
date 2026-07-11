import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Layout from "../components/Layout"
import ClientSelector from "@/components/ClientSelector"
import LetterBodyEditor from "@/components/correspondence/LetterBodyEditor"
import { useLetterSave } from "@/hooks/useLetterSave"
import type { LetterFormFields } from "@/hooks/useLetterSave"

export default function NewLetter() {
  const navigate = useNavigate()
  const [fields, setFields] = useState<LetterFormFields>({
    subject: "",
    date: new Date().toISOString().slice(0, 10),
    recipientId: "",
    recipientName: "",
    senderName: "",
    bodyText: "",
  })

  const { saving, save } = useLetterSave({
    fields,
    isCreate: true,
    isEdit: false,
    navigate,
  })

  const update = (key: keyof LetterFormFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  return (
    <Layout title="New Letter" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-lg font-bold text-bd-text">New Letter</h1>
          <p className="text-xs text-bd-text-muted">Create a new official letter</p>
        </div>

        <ClientSelector
          clientId={fields.recipientId}
          clientName={fields.recipientName}
          onClientChange={(id, name) => {
            update("recipientId", id)
            update("recipientName", name)
          }}
        />

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
            onClick={() => navigate("/letters")}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-bd-border text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-bd-button-primary-bg text-sm font-bold text-bd-button-primary-text transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>
    </Layout>
  )
}
