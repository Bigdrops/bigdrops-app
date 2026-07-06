import { createClient } from "@supabase/supabase-js"

const VOID_PREFIX = "🚫 VOIDED — This payment has been voided.\n\n"

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const authHeader = req.headers["authorization"]
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ error: "Missing authorization header" })
  }

  const token = authHeader.replace(/^Bearer\s+/i, "")
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { paymentId, isVoided } = req.body || {}
  if (!paymentId) {
    return res.status(400).json({ error: "Missing paymentId" })
  }

  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID || ""
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ""

  if (!chatId || !botToken) {
    return res.status(500).json({ error: "Telegram not configured" })
  }

  const { data: payment, error: fetchError } = await adminClient
    .from("payments")
    .select("attachments")
    .eq("id", paymentId)
    .single()

  if (fetchError || !payment) {
    return res.status(404).json({ error: "Payment not found" })
  }

  const attachments: any[] = (payment.attachments as any[]) || []
  if (attachments.length === 0) {
    return res.status(200).json({ edited: 0 })
  }

  let edited = 0
  for (const att of attachments) {
    if (att.provider !== "telegram" || !att.providerMetadata?.messageId) continue
    try {
      const url = `https://api.telegram.org/bot${botToken}/editMessageCaption`
      const body = {
        chat_id: chatId,
        message_id: att.providerMetadata.messageId,
        caption: isVoided ? VOID_PREFIX : "",
      }
      const telegramRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!telegramRes.ok) {
        const text = await telegramRes.text()
        console.error(`Telegram editCaption failed for msg ${att.providerMetadata.messageId}:`, text)
      }
      edited++
    } catch (err) {
      console.error(`Failed to edit caption for attachment ${att.id}:`, err)
    }
  }

  return res.status(200).json({ edited, total: attachments.length })
}
