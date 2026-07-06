/**
 * Diagnostic script for Phase 2.6B upload pipeline forensics.
 *
 * Bypasses the browser entirely. Tests direct Telegram API upload.
 * Does NOT modify production data.
 *
 * Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_GROUP_CHAT_ID=-100... bun run scripts/test-upload-pipeline.ts
 */

import { uploadFile } from "../src/modules/invoices/services/telegramService"

async function main() {
  console.log("=".repeat(60))
  console.log("UPLOAD PIPELINE DIAGNOSTIC SCRIPT")
  console.log("=".repeat(60))

  // Stage: Environment
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ""
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID || ""
  console.log("\n[ENV] TELEGRAM_BOT_TOKEN present:", !!botToken)
  console.log("[ENV] TELEGRAM_GROUP_CHAT_ID:", chatId)
  console.log("[ENV] SUPABASE_URL present:", !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL))
  console.log("[ENV] SUPABASE_SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!botToken || !chatId) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_CHAT_ID must be set")
    process.exit(1)
  }

  // Create a small in-memory test file (a tiny text file)
  const testContent = `BIGDROPS UPLOAD PIPELINE TEST
  Timestamp: ${new Date().toISOString()}
  This is a diagnostic file — no payment data.`
  const fileBuffer = new TextEncoder().encode(testContent).buffer as ArrayBuffer
  const fileName = `diagnostic-test-${Date.now()}.txt`
  const mimeType = "text/plain"

  console.log("\n[TEST FILE] name:", fileName)
  console.log("[TEST FILE] size:", fileBuffer.byteLength, "bytes")
  console.log("[TEST FILE] mime:", mimeType)

  // Build a diagnostic caption
  const caption = [
    "🧪 DIAGNOSTIC TEST — No payment data",
    `File: ${fileName}`,
    `Size: ${fileBuffer.byteLength} bytes`,
    `Timestamp: ${new Date().toISOString()}`,
    "#diagnostic #pipeline_test",
  ].join("\n")

  console.log("\n[CAPTION] length:", caption.length)
  console.log("[CAPTION] content:")
  console.log(caption)

  // Stage: Direct Telegram upload
  console.log("\n--- SENDING TO TELEGRAM ---")
  const threadId = 5  // Default thread_id used in the API route

  try {
    const result = await uploadFile({
      chatId,
      threadId,
      fileName,
      fileBuffer,
      mimeType,
      caption,
      botToken,
    })

    console.log("\n✅ TELEGRAM UPLOAD SUCCEEDED")
    console.log("Result:", JSON.stringify(result, null, 2))
    console.log("\nPipeline stage 11 (telegramService) PASS — the Telegram API is reachable and accepts uploads.")
  } catch (err) {
    console.log("\n❌ TELEGRAM UPLOAD FAILED")
    console.log("Error:", err instanceof Error ? err.message : String(err))
    console.log("\nPipeline stage 11 (telegramService) FAIL — the Telegram API rejected the upload.")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err)
  process.exit(1)
})
