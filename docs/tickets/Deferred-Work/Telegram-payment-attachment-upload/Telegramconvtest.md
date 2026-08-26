Bro let's test again

This time let's actually capture the response so we get the `message_id`, `file_id` and all the fields. Run this:

```powershell
$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot8722546948:AAGn0_CBi_XouBWjqVxsLaI__VZKi1VzAqU/sendDocument" -Method Post -Form @{
  chat_id           = "-1004468858017"
  message_thread_id = "5"
  document          = Get-Item "C:\Users\DELL\Desktop\wark xl\quotation-sasq-0010qk245-sunandshield-power-solutions-lorem-ipsum.pdf"
  caption           = "🧾 Payment Receipt — Full Settlement`n📄 Invoice: SASINV055`n🏢 Tenant: Sun and Shield Power Solutions`n👤 Client: Lorem Ipsum Ltd`n💰 Amount: ₦1,284,256,400`n🏦 Method: Transfer`n📅 Payment Date: 5 Jul 2026, 07:19`n🕒 Uploaded: 5 Jul 2026, 14:30`n👤 Recorded by: jaiyewisdom@gmail.com`n#payment_receipt #full #TENANT0001 #SASINV055"
}
$response | ConvertTo-Json -Depth 10
```

The `ConvertTo-Json -Depth 10` at the end prints the full response so we can capture every field. Paste what comes back.


🧾 Payment Receipt — Full Settlement
📄 Invoice: SASINV055
🏢 Tenant: Sun and Shield Power Solutions
👤 Client: Lorem Ipsum Ltd
💰 Amount: ₦1,284,256,400
🏦 Method: Transfer
📅 Payment Date: 5 Jul 2026, 07:19
🕒 Uploaded: 5 Jul 2026, 14:30
👤 Recorded by: jaiyewisdom@gmail.com
#payment_receipt #full #TENANT0001 #SASINV055

That's the caption rendering in Telegram — good, but I need the **PowerShell terminal output**, not the Telegram message. The `$response | ConvertTo-Json -Depth 10` should have printed a JSON blob in your PowerShell window that looks something like this:

```json
{
  "ok": true,
  "result": {
    "message_id": 12345,
    "document": {
      "file_id": "BQACAgIAAxk...",
      "file_unique_id": "AgAD...",
      ...
    }
  }
}
```

Scroll up in your PowerShell window and paste what's there — that's what we need to capture.


That's everything we needed. Here are the key fields to update the report with:

```
message_id:       10
message_thread_id: 5  ✅ correct topic confirmed
is_topic_message: true

document.file_id:        BQACAgQAAyEGAAMBCl1coQADCmpL7J1sqpXFabwUhOd9O2eWw-djAALTHQACl55hUuKj-3pSbCHhPAQ
document.file_unique_id: AgAD0x0AApeeYVI
document.file_name:      quotation_sasq_0010qk245_sunandshield_power_solutions_lorem_ipsu.pdf
document.mime_type:      application/pdf
document.file_size:      198087 bytes (~193KB)

chat.id:    -1004468858017
chat.title: BIGDROPS-ERP — Evidence Vault
chat.type:  supergroup (is_forum: true)

topic name: TENANT-0001 — Payment Receipts (from reply_to_message.forum_topic_created.name)
```

**Two things worth noting for the implementation:**

1. **Filename gets sanitized** — Telegram replaced spaces and special chars with underscores and truncated it. Don't rely on `document.file_name` for display — store the original filename separately in the `attachments` JSONB.

2. **Email auto-detected** — Telegram flagged `jaiyewisdom@gmail.com` as a `caption_entity` of type `email`. Harmless, but the agent should be aware captions are parsed for entities automatically.

The `⚠️ Not captured` flags in the report are now resolved. You're fully verified — hand it to OpenCode.