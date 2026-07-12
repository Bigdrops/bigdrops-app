import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Layout from "../components/Layout"
import ClientSelector from "@/components/ClientSelector"
import LetterBodyEditor from "@/components/correspondence/LetterBodyEditor"
import { useLetterSave } from "@/hooks/useLetterSave"
import { useSettings } from "@/hooks/useSettings"
import type { LetterFormFields } from "@/hooks/useLetterSave"

const inputClass = "h-12 w-full rounded-xl border border-bd-border bg-bd-surface px-4 text-sm text-bd-text placeholder:text-bd-text-muted focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg"

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div className="flex rounded-xl border border-bd-border bg-bd-surface p-0.5">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)} className={`flex-1 rounded-[10px] px-3 py-2 text-xs font-bold transition-colors ${value === o.key ? "bg-bd-button-primary-bg text-bd-button-primary-text shadow-sm" : "text-bd-text-muted hover:text-bd-text"}`}>{o.label}</button>
      ))}
    </div>
  )
}

export default function NewLetter() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [fields, setFields] = useState<LetterFormFields>({
    subject: "",
    date: new Date().toISOString().slice(0, 10),
    recipientType: "client",
    recipientId: "",
    recipientName: "",
    recipientAddress: "",
    recipientEmail: "",
    recipientPhone: "",
    senderType: settings ? "profile" : "manual",
    senderName: settings?.company_name || "",
    senderAddress: settings?.company_address || "",
    senderEmail: settings?.company_email || "",
    senderPhone: settings?.company_phone || "",
    bodyText: "",
  })

  useEffect(() => {
    if (settings) {
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
    }
  }, [settings])

  const { saving, save } = useLetterSave({ fields, isCreate: true, isEdit: false, navigate })

  const update = (key: keyof LetterFormFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  return (
    <Layout title="New Letter" hidePageHeader immersive contentClassName="px-0 pb-24 pt-0">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-lg font-bold text-bd-text">New Letter</h1>
          <p className="text-xs text-bd-text-muted">Create a new official letter</p>
        </div>

        <div key="recipient-section" className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Recipient</label>
          <Toggle value={fields.recipientType} onChange={(v) => update("recipientType", v)} options={[{ key: "client", label: "Existing Client" }, { key: "manual", label: "Manual" }]} />
          {fields.recipientType === "client" ? (
            <ClientSelector key="client-selector" clientId={fields.recipientId} clientName={fields.recipientName} onClientChange={(id, name, client) => {
              update("recipientId", id)
              update("recipientName", name)
              if (client) {
                update("recipientAddress", [client.address, client.city, client.state].filter(Boolean).join(", "))
                update("recipientEmail", client.email || "")
                update("recipientPhone", client.phone || "")
              }
            }} />
          ) : (
            <div key="manual-recipient" className="space-y-3">
              <input key="recipientName" type="text" value={fields.recipientName} onChange={(e) => update("recipientName", e.target.value)} placeholder="Company name..." className={inputClass} />
              <input key="recipientAddress" type="text" value={fields.recipientAddress} onChange={(e) => update("recipientAddress", e.target.value)} placeholder="Address..." className={inputClass} />
              <input key="recipientEmail" type="email" value={fields.recipientEmail} onChange={(e) => update("recipientEmail", e.target.value)} placeholder="Email..." className={inputClass} />
              <input key="recipientPhone" type="tel" value={fields.recipientPhone} onChange={(e) => update("recipientPhone", e.target.value)} placeholder="Phone..." className={inputClass} />
            </div>
          )}
        </div>

        <div key="subject-section" className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Subject</label>
          <input type="text" value={fields.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Letter subject..." className={inputClass} />
        </div>

        <div key="date-section" className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Date</label>
          <input type="date" value={fields.date} onChange={(e) => update("date", e.target.value)} className={inputClass} />
        </div>

        <div key="sender-section" className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Sender</label>
          <Toggle value={fields.senderType} onChange={(v) => {
            update("senderType", v)
            if (v === "profile" && settings) {
              update("senderName", settings.company_name || "")
              update("senderAddress", settings.company_address || "")
              update("senderEmail", settings.company_email || "")
              update("senderPhone", settings.company_phone || "")
            }
          }} options={[{ key: "profile", label: "Company Profile" }, { key: "manual", label: "Manual" }]} />
          {fields.senderType === "profile" && fields.senderName && (
            <div key="sender-profile" className="rounded-xl border border-bd-border bg-bd-surface-muted/30 p-4">
              <div className="text-sm font-bold text-bd-text">{fields.senderName}</div>
              <div className="mt-1 text-xs text-bd-text-muted">{[fields.senderAddress, fields.senderEmail, fields.senderPhone].filter(Boolean).join(" · ")}</div>
            </div>
          )}
          {fields.senderType === "manual" && (
            <div key="manual-sender" className="space-y-3">
              <input key="senderName" type="text" value={fields.senderName} onChange={(e) => update("senderName", e.target.value)} placeholder="Company name..." className={inputClass} />
              <input key="senderAddress" type="text" value={fields.senderAddress} onChange={(e) => update("senderAddress", e.target.value)} placeholder="Address..." className={inputClass} />
              <input key="senderEmail" type="email" value={fields.senderEmail} onChange={(e) => update("senderEmail", e.target.value)} placeholder="Email..." className={inputClass} />
              <input key="senderPhone" type="tel" value={fields.senderPhone} onChange={(e) => update("senderPhone", e.target.value)} placeholder="Phone..." className={inputClass} />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Body</label>
          <LetterBodyEditor value={fields.bodyText} onChange={(v) => update("bodyText", v)} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => navigate("/letters")} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-bd-border text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted">Cancel</button>
          <button type="button" onClick={() => save("draft")} disabled={saving} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-bd-button-primary-bg text-sm font-bold text-bd-button-primary-text transition-opacity hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : "Save Draft"}</button>
        </div>
      </div>
    </Layout>
  )
}
