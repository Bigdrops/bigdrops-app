import { createClient } from "@supabase/supabase-js"
import { uploadFile, buildPaymentCaption } from "../src/modules/invoices/services/telegramService"

interface AttachmentItem {
  id: string
  provider: "telegram"
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
  providerMetadata: {
    messageId: number
    fileId: string
    fileUniqueId: string
    threadId: number
  }
  uploadStatus: "uploaded"
}

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

  const { paymentId, fileBase64, fileName, mimeType, invoiceNumber, companyName, clientName, amount, method, paymentDate } = req.body || {}

  if (!paymentId || !fileBase64 || !fileName) {
    return res.status(400).json({ error: "Missing required fields: paymentId, fileBase64, fileName" })
  }

  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID || ""
  const threadId = Number(process.env.TELEGRAM_THREAD_ID || "5")
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ""

  if (!chatId || !botToken) {
    return res.status(500).json({ error: "Telegram not configured" })
  }

  const buffer = Buffer.from(fileBase64, "base64")

  const caption = buildPaymentCaption({
    invoiceNumber: invoiceNumber || "",
    companyName: companyName || "",
    clientName: clientName || "",
    amount: amount || 0,
    method: method || "",
    paymentDate: paymentDate || "",
    recordedByEmail: user.email || "",
  })

  try {
    const result = await uploadFile({
      chatId,
      threadId,
      fileName,
      fileBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      mimeType: mimeType || "application/octet-stream",
      caption,
      botToken,
    })

    const attachment: AttachmentItem = {
      id: crypto.randomUUID(),
      provider: "telegram",
      fileName,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: buffer.length,
      uploadedAt: new Date().toISOString(),
      providerMetadata: {
        messageId: result.messageId,
        fileId: result.fileId,
        fileUniqueId: result.fileUniqueId,
        threadId,
      },
      uploadStatus: "uploaded",
    }

    const { data: payment, error: fetchError } = await adminClient
      .from("payments")
      .select("attachments")
      .eq("id", paymentId)
      .single()

    if (fetchError) {
      return res.status(500).json({ error: "Failed to fetch payment" })
    }

    const existing: AttachmentItem[] = (payment?.attachments as AttachmentItem[]) || []
    existing.push(attachment)

    const { error: updateError } = await adminClient
      .from("payments")
      .update({ attachments: JSON.parse(JSON.stringify(existing)) })
      .eq("id", paymentId)

    if (updateError) {
      return res.status(500).json({ error: "Failed to update payment attachments" })
    }

    return res.status(200).json({ attachment })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Upload failed" })
  }
}
