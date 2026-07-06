export interface UploadFileParams {
  chatId: string;
  threadId: number;
  fileName: string;
  fileBuffer: ArrayBuffer;
  mimeType: string;
  caption: string;
  botToken: string;
}

export interface UploadFileResult {
  messageId: number;
  fileId: string;
  fileUniqueId: string;
}

export interface EditCaptionParams {
  chatId: string;
  messageId: number;
  threadId?: number;
  caption: string;
  botToken: string;
}

export interface BuildPaymentCaptionParams {
  invoiceNumber: string;
  companyName: string;
  clientName: string;
  amount: number;
  method: string;
  paymentDate: string;
  recordedByEmail: string;
  isVoided?: boolean;
}

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

const TAG = "[TELEGRAM]";

function maskToken(token: string): string {
  if (!token || token.length < 10) return "???";
  return token.slice(0, 6) + "..." + token.slice(-4);
}

async function telegramFetch(
  botToken: string,
  method: string,
  body: FormData | Record<string, unknown>,
): Promise<Response> {
  const url = `${TELEGRAM_API_BASE}${botToken}/${method}`;
  const opts: RequestInit =
    body instanceof FormData
      ? { method: "POST", body }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  return fetch(url, opts);
}

export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  const masked = maskToken(params.botToken);
  console.log(`${TAG} uploadFile() token=${masked} chatId=${params.chatId} threadId=${params.threadId} fileName=${params.fileName}`);

  const formData = new FormData();
  formData.append("chat_id", params.chatId);
  formData.append("message_thread_id", String(params.threadId));
  formData.append("caption", params.caption);

  const blob = new Blob([params.fileBuffer], { type: params.mimeType });
  formData.append("document", blob, params.fileName);

  const res = await telegramFetch(params.botToken, "sendDocument", formData);

  if (!res.ok) {
    const body = await res.text();
    console.error(`${TAG} sendDocument FAILED status=${res.status} body=${body.slice(0, 500)}`);
    throw new Error(`Telegram upload failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const doc = json?.result?.document;
  if (!doc?.file_id) {
    console.error(`${TAG} sendDocument OK but missing file_id, result keys:`, Object.keys(json?.result || {}));
    throw new Error("Telegram response missing document file_id");
  }

  console.log(`${TAG} uploadFile OK message_id=${json.result.message_id} file_id=${doc.file_id.slice(0, 20)}...`);
  return {
    messageId: json.result.message_id,
    fileId: doc.file_id,
    fileUniqueId: doc.file_unique_id,
  };
}

export async function editCaption(params: EditCaptionParams): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      chat_id: params.chatId,
      message_id: params.messageId,
      caption: params.caption,
    };
    if (params.threadId !== undefined) {
      body.message_thread_id = params.threadId;
    }
    const res = await telegramFetch(params.botToken, "editMessageCaption", body);

    if (!res.ok) {
      const body = await res.text();
      console.error("Telegram editCaption failed:", res.status, body);
    }
  } catch (err) {
    console.error("Telegram editCaption error:", err);
  }
}

export function buildPaymentCaption(params: BuildPaymentCaptionParams): string {
  const lines: string[] = [];

  if (params.isVoided) {
    lines.push("🚫 VOIDED — This payment has been voided.");
    lines.push("");
  }

  lines.push("🧾 Payment Receipt — Full Settlement");
  lines.push(`📄 Invoice: ${params.invoiceNumber}`);
  lines.push(`🏢 Company: ${params.companyName}`);
  lines.push(`👤 Client: ${params.clientName}`);
  lines.push(`💰 Amount: ₦${params.amount.toLocaleString("en-US")}`);
  lines.push(`🏦 Method: ${params.method}`);
  lines.push(`📅 Payment Date: ${params.paymentDate}`);
  lines.push(`🕒 Uploaded: ${new Date().toISOString()}`);
  lines.push(`👤 Recorded by: ${params.recordedByEmail}`);

  const hashtagCompany = params.companyName.replace(/\s+/g, "").toUpperCase();
  lines.push(`#payment_receipt #full #${hashtagCompany} #${params.invoiceNumber}`);

  return lines.join("\n").slice(0, 1024);
}
