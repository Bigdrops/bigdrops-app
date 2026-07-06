import { createClient } from "@supabase/supabase-js"
import { editCaption } from "../src/modules/invoices/services/telegramService"
import type { PaymentAttachment } from "../src/lib/attachmentTypes"

const VOID_PREFIX = "\u{1F6AB} VOIDED — This payment has been voided.\n\n"

export default async function (request: Request): Promise<Response> {
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

  let body: { paymentId?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  if (!body.paymentId) {
    return new Response(JSON.stringify({ error: "Missing paymentId" }), { status: 400 })
  }

  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID || ""
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ""
  if (!chatId || !botToken) {
    return new Response(JSON.stringify({ error: "Telegram not configured" }), { status: 500 })
  }

  const { data: payment, error: fetchError } = await adminClient
    .from("payments")
    .select("attachments")
    .eq("id", body.paymentId)
    .single()

  if (fetchError || !payment) {
    return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 })
  }

  const attachments = (payment.attachments as unknown) as PaymentAttachment[] | null
  if (!attachments?.length) {
    return new Response(JSON.stringify({ ok: true, edited: 0 }), { status: 200 })
  }

  let edited = 0
  for (const att of attachments) {
    if (att.provider !== "telegram" || !att.providerMetadata?.messageId) continue
    await editCaption({
      chatId,
      messageId: att.providerMetadata.messageId,
      threadId: att.providerMetadata.threadId,
      caption: VOID_PREFIX,
      botToken,
    })
    edited++
  }

  return new Response(JSON.stringify({ ok: true, edited }), { status: 200 })
}
