import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Layout from "../components/Layout"
import ClientSelector from "@/components/ClientSelector"
import LetterBodyEditor, { bodyBlocksToText } from "@/components/correspondence/LetterBodyEditor"
import { useLetterSave } from "@/hooks/useLetterSave"
import { useSettings } from "@/hooks/useSettings"
import { getLetter } from "@/domain/correspondence/letter/letterRepository"
import type { LetterDocument } from "@/domain/correspondence/letter/types"
import type { LetterFormFields } from "@/hooks/useLetterSave"

const inputClass = "h-12 w-full rounded-xl border border-bd-border bg-bd-surface px-4 text-sm text-bd-text placeholder:text-bd-text-muted focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg disabled:opacity-50 disabled:cursor-not-allowed"

function Toggle({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[]; disabled?: boolean }) {
  return (
    <div className="flex rounded-xl border border-bd-border bg-bd-surface p-0.5">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)} disabled={disabled} className={`flex-1 rounded-[10px] px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${value === o.key ? "bg-bd-button-primary-bg text-bd-button-primary-text shadow-sm" : "text-bd-text-muted hover:text-bd-text"}`}>{o.label}</button>
      ))}
    </div>
  )
}

interface LetterFormPageProps {
  mode: 'create' | 'edit'
}

export default function LetterFormPage({ mode }: LetterFormPageProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { settings } = useSettings()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const [letter, setLetter] = useState<LetterDocument | null>(null)
  const [loading, setLoading] = useState(isEdit)

  const [fields, setFields] = useState<LetterFormFields>({
    subject: "",
    date: new Date().toISOString().slice(0, 10),
    recipientType: "client",
    recipientId: "",
    recipientName: "",
    recipientAddress: "",
    recipientEmail: "",
    recipientPhone: "",
    senderType: "profile",
    senderName: settings?.company_name || "",
    senderAddress: settings?.company_address || "",
    senderEmail: settings?.company_email || "",
    senderPhone: settings?.company_phone || "",
    bodyText: "",
  })

  /* ── Create-mode: prefill from settings ── */
  useEffect(() => {
    if (!isCreate || !settings) return
    setFields((prev) => {
      if (prev.senderName) return prev
      return {
        ...prev,
        senderType: "profile",
        senderName: settings.company_name || "",
        senderAddress: settings.company_address || "",
        senderEmail: settings.company_email || "",
        senderPhone: settings.company_phone || "",
      }
    })
  }, [isCreate, settings])

  /* ── Edit-mode: load from DB ── */
  useEffect(() => {
    if (!isEdit || !id) return
    getLetter(id)
      .then((doc) => {
        if (!doc) { navigate("/letters", { replace: true }); return }
        setLetter(doc)
        setFields({
          subject: doc.subject,
          date: doc.date,
          recipientType: doc.recipient.clientId ? "client" : "manual",
          recipientId: doc.recipient.clientId ?? "",
          recipientName: doc.recipient.companyName,
          recipientAddress: doc.recipient.address ?? "",
          recipientEmail: doc.recipient.email ?? "",
          recipientPhone: doc.recipient.phone ?? "",
          senderType: "manual",
          senderName: doc.sender.companyName,
          senderAddress: doc.sender.address ?? "",
          senderEmail: doc.sender.email ?? "",
          senderPhone: doc.sender.phone ?? "",
          bodyText: bodyBlocksToText(doc.body),
        })
      })
      .catch(() => navigate("/letters", { replace: true }))
      .finally(() => setLoading(false))
  }, [isEdit, id, navigate])

  const { saving, save } = useLetterSave({
    fields,
    isCreate,
    isEdit,
    id,
    navigate,
  })

  const update = (key: keyof LetterFormFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  /* ── Render ── */
  if (isEdit && loading) {
    return (
      <Layout title="Edit Letter" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
        <div className="px-4 py-20 text-center text-sm text-bd-text-muted">Loading...</div>
      </Layout>
    )
  }

  if (isEdit && !letter) return null

  const isDraft = isCreate || letter?.status === "draft"
  const title = isCreate ? "New Letter" : "Edit Letter"
  const subtitle = isCreate ? "Create a new official letter" : `${letter!.identity.documentNumber}${!isDraft ? " — read-only fields locked" : ""}`

  return (
    <Layout title={title} hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-lg font-bold text-bd-text">{title}</h1>
          <p className="text-xs text-bd-text-muted">{subtitle}</p>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Recipient</label>
          {isDraft ? (
            <>
              <Toggle value={fields.recipientType} onChange={(v) => update("recipientType", v)} options={[{ key: "client", label: "Existing Client" }, { key: "manual", label: "Manual" }]} />
              {fields.recipientType === "client" ? (
                <ClientSelector clientId={fields.recipientId} clientName={fields.recipientName} onClientChange={(id, name, client) => {
                  update("recipientId", id)
                  update("recipientName", name)
                  if (client) {
                    update("recipientAddress", [client.address, client.city, client.state].filter(Boolean).join(", "))
                    update("recipientEmail", client.email || "")
                    update("recipientPhone", client.phone || "")
                  }
                }} />
              ) : (
                <div className="space-y-3">
                  <input type="text" value={fields.recipientName} onChange={(e) => update("recipientName", e.target.value)} placeholder="Company name..." className={inputClass} />
                  <input type="text" value={fields.recipientAddress} onChange={(e) => update("recipientAddress", e.target.value)} placeholder="Address..." className={inputClass} />
                  <input type="email" value={fields.recipientEmail} onChange={(e) => update("recipientEmail", e.target.value)} placeholder="Email..." className={inputClass} />
                  <input type="tel" value={fields.recipientPhone} onChange={(e) => update("recipientPhone", e.target.value)} placeholder="Phone..." className={inputClass} />
                </div>
              )}
            </>
          ) : (
            <div className="h-12 w-full rounded-xl border border-bd-border bg-bd-surface-muted px-4 text-sm text-bd-text-muted flex items-center">
              {letter!.recipient.companyName}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Subject</label>
          <input type="text" value={fields.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Letter subject..." className={inputClass} disabled={!isDraft} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Date</label>
          <input type="date" value={fields.date} onChange={(e) => update("date", e.target.value)} className={inputClass} disabled={!isDraft} />
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Sender</label>
          {isDraft ? (
            <>
              <Toggle value={fields.senderType} onChange={(v) => {
                update("senderType", v)
                if (v === "profile" && settings) {
                  update("senderName", settings.company_name || "")
                  update("senderAddress", settings.company_address || "")
                  update("senderEmail", settings.company_email || "")
                  update("senderPhone", settings.company_phone || "")
                }
              }} options={[{ key: "profile", label: "Company Profile" }, { key: "manual", label: "Manual" }]} />
              {fields.senderType === "profile" && fields.senderName ? (
                <div className="rounded-xl border border-bd-border bg-bd-surface-muted/30 p-4">
                  <div className="text-sm font-bold text-bd-text">{fields.senderName}</div>
                  <div className="mt-1 text-xs text-bd-text-muted">{[fields.senderAddress, fields.senderEmail, fields.senderPhone].filter(Boolean).join(" · ")}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input type="text" value={fields.senderName} onChange={(e) => update("senderName", e.target.value)} placeholder="Company name..." className={inputClass} />
                  <input type="text" value={fields.senderAddress} onChange={(e) => update("senderAddress", e.target.value)} placeholder="Address..." className={inputClass} />
                  <input type="email" value={fields.senderEmail} onChange={(e) => update("senderEmail", e.target.value)} placeholder="Email..." className={inputClass} />
                  <input type="tel" value={fields.senderPhone} onChange={(e) => update("senderPhone", e.target.value)} placeholder="Phone..." className={inputClass} />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-bd-border bg-bd-surface-muted/30 px-4 py-3">
              <div className="text-sm font-bold text-bd-text">{fields.senderName}</div>
              <div className="mt-1 text-xs text-bd-text-muted">{[fields.senderAddress, fields.senderEmail, fields.senderPhone].filter(Boolean).join(" · ")}</div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Body</label>
          <LetterBodyEditor
            value={fields.bodyText}
            onChange={(v) => update("bodyText", v)}
            disabled={!isDraft}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(isCreate ? "/letters" : `/letters/${id}`)}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-bd-border text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving || (isEdit && !isDraft)}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-bd-button-primary-bg text-sm font-bold text-bd-button-primary-text transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : isCreate ? "Save Draft" : "Save Changes"}
          </button>
        </div>
      </div>
    </Layout>
  )
}
