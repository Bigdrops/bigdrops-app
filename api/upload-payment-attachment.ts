import { createClient } from "@supabase/supabase-js"
import { uploadFile, buildPaymentCaption } from "../src/modules/invoices/services/telegramService"

interface FormFields {
  paymentId: string
  invoiceNumber: string
  companyName: string
  clientName: string
  amount: number
  method: string
  paymentDate: string
}

function parseFormData(form: FormData): FormFields {
  const raw = (name: string) => (form.get(name) as string) || ""
  return {
    paymentId: raw("paymentId"),
    invoiceNumber: raw("invoiceNumber"),
    companyName: raw("companyName"),
    clientName: raw("clientName"),
    amount: Number(raw("amount") || 0),
    method: raw("method"),
    paymentDate: raw("paymentDate"),
  }
}

export default async function(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 })
  }

  const token = authHeader.replace(/^Bearer\s+/i, "")
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid multipart/form-data" }), { status: 400 })
  }

  const file = form.get("file") as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: "Missing file field" }), { status: 400 })
  }

  const fields = parseFormData(form)
  if (!fields.paymentId) {
    return new Response(JSON.stringify({ error: "Missing paymentId" }), { status: 400 })
  }

  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID || ""
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ""
  if (!chatId || !botToken) {
    return new Response(JSON.stringify({ error: "Telegram not configured" }), { status: 500 })
  }

  const { data: topic } = await adminClient
    .from("telegram_topics")
    .select("thread_id")
    .eq("evidence_type", "payment_receipt")
    .maybeSingle()
  const threadId = topic?.thread_id ?? 5

  const arrayBuffer = await file.arrayBuffer()

  const caption = buildPaymentCaption({
    invoiceNumber: fields.invoiceNumber,
    companyName: fields.companyName,
    clientName: fields.clientName,
    amount: fields.amount,
    method: fields.method,
    paymentDate: fields.paymentDate,
    recordedByEmail: user.email || "",
  })

  try {
    const result = await uploadFile({
      chatId,
      threadId,
      fileName: file.name,
      fileBuffer: arrayBuffer,
      mimeType: file.type || "application/octet-stream",
      caption,
      botToken,
    })

    const attachment = {
      id: crypto.randomUUID(),
      provider: "telegram" as const,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      providerMetadata: {
        messageId: result.messageId,
        fileId: result.fileId,
        fileUniqueId: result.fileUniqueId,
        threadId,
      },
      uploadStatus: "uploaded" as const,
    }

    const { data: payment, error: fetchError } = await adminClient
      .from("payments")
      .select("attachments")
      .eq("id", fields.paymentId)
      .single()

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), { status: 500 })
    }

    const existing: unknown[] = (payment?.attachments as unknown[]) || []
    existing.push(attachment)

    const { error: updateError } = await adminClient
      .from("payments")
      .update({ attachments: JSON.parse(JSON.stringify(existing)) })
      .eq("id", fields.paymentId)

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update payment attachments" }), { status: 500 })
    }

    return new Response(JSON.stringify({ attachment }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Upload failed" }), { status: 500 })
  }
}
