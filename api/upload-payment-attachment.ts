import { createClient } from "@supabase/supabase-js"
import { uploadFile, buildPaymentCaption } from "../src/modules/invoices/services/telegramService"

const TAG = "[UPLOAD DEBUG]"

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

function stageError(stage: string, message: string, status = 500) {
  console.error(`${TAG} [${stage}] ${message}`)
  return Response.json({ success: false, stage, message }, { status })
}

export default async function(request: Request): Promise<Response> {
  console.log(`${TAG} [1] Request received`)

  if (request.method !== "POST") {
    return stageError("method", "Method not allowed", 405)
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return stageError("auth", "Missing authorization header", 401)
  }

  const token = authHeader.replace(/^Bearer\s+/i, "")
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  console.log(`${TAG} [config] SUPABASE_URL=${supabaseUrl ? "set" : "MISSING"} SERVICE_ROLE_KEY=${supabaseServiceKey ? "set" : "MISSING"}`)

  if (!supabaseUrl || !supabaseServiceKey) {
    return stageError("config", `Missing Supabase config: URL=${supabaseUrl ? "ok" : "MISSING"} SERVICE_KEY=${supabaseServiceKey ? "ok" : "MISSING"}`)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    console.error(`${TAG} [2] Auth failed:`, authError?.message)
    return stageError("auth", authError?.message || "Unauthorized", 401)
  }
  console.log(`${TAG} [2] Authenticated user: ${user.email}`)

  let form: FormData
  try {
    form = await request.formData()
  } catch (e) {
    return stageError("form-parse", "Invalid multipart/form-data", 400)
  }
  console.log(`${TAG} [3] FormData parsed`)

  const file = form.get("file") as File | null
  if (!file) {
    return stageError("file", "Missing file field", 400)
  }

  const fields = parseFormData(form)
  console.log(`${TAG} [4] File name: ${file.name}`)
  console.log(`${TAG} [5] File size: ${file.size} bytes`)
  console.log(`${TAG} [6] Mime type: ${file.type}`)

  if (!fields.paymentId) {
    return stageError("payment-id", "Missing paymentId", 400)
  }

  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID || ""
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ""
  console.log(`${TAG} [config] TELEGRAM_GROUP_CHAT_ID=${chatId ? "set" : "MISSING"} TELEGRAM_BOT_TOKEN=${botToken ? "set" : "MISSING"}`)

  if (!chatId || !botToken) {
    return stageError("telegram-config", `Telegram not configured: chatId=${chatId ? "ok" : "MISSING"} botToken=${botToken ? "ok" : "MISSING"}`)
  }

  console.log(`${TAG} [7] Thread lookup started`)
  const { data: topic, error: topicError } = await adminClient
    .from("telegram_topics")
    .select("thread_id")
    .eq("evidence_type", "payment_receipt")
    .maybeSingle()

  if (topicError) {
    console.error(`${TAG} [8] Thread lookup DB error:`, topicError.message)
    return stageError("thread-lookup", `telegram_topics query failed: ${topicError.message}`)
  }

  const threadId = topic?.thread_id ?? 5
  console.log(`${TAG} [8] Thread lookup result: thread_id=${threadId} (from DB: ${topic?.thread_id ?? "fallback"})`)

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

  console.log(`${TAG} [9] Calling telegramService.uploadFile()...`)
  let result
  try {
    result = await uploadFile({
      chatId,
      threadId,
      fileName: file.name,
      fileBuffer: arrayBuffer,
      mimeType: file.type || "application/octet-stream",
      caption,
      botToken,
    })
  } catch (e: any) {
    const msg = e?.message || String(e)
    console.error(`${TAG} [9] Telegram upload FAILED:`, msg)
    return stageError("telegram-upload", msg)
  }

  console.log(`${TAG} [10] Telegram response OK: message_id=${result.messageId} file_id=${result.fileId}`)

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

  console.log(`${TAG} [11] Database update started`)
  const { data: payment, error: fetchError } = await adminClient
    .from("payments")
    .select("attachments")
    .eq("id", fields.paymentId)
    .single()

  if (fetchError) {
    return stageError("db-fetch", `Failed to fetch payment: ${fetchError.message}`)
  }

  const existing: unknown[] = (payment?.attachments as unknown[]) || []
  existing.push(attachment)

  const { error: updateError } = await adminClient
    .from("payments")
    .update({ attachments: JSON.parse(JSON.stringify(existing)) })
    .eq("id", fields.paymentId)

  if (updateError) {
    return stageError("db-update", `Failed to update payment attachments: ${updateError.message}`)
  }

  console.log(`${TAG} [12] Success — attachment ${attachment.id} saved`)
  return Response.json({ attachment })
}
