import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { Resend } from "npm:resend@6.37.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const DOCUMENT_EMAIL_FROM = Deno.env.get("DOCUMENT_EMAIL_FROM") || "BOURXE Documents <notifications@bourxe.com>";
const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") || "https://bouxre.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/;
const SAFE_PDF_PATH_PATTERN = /^[a-zA-Z0-9_-]{16,64}\.pdf$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Standard PDF Magic Bytes (%PDF-)
 * Standard PDF files must begin with '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D).
 */
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d];

/** Maximum allowed PDF attachment size for direct email delivery: 10 MB */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface SendEmailPayload {
  token: string;
  recipientEmail: string;
  subject: string;
  message?: string;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  return btoa(chunks.join(""));
}

/**
 * Generates executive BOURXE branded email HTML identical to DocumentEmailTemplate.tsx.
 */
function buildDocumentEmailHtml(props: {
  documentType: string;
  documentNumber: string;
  documentTitle?: string;
  issuerName: string;
  recipientName?: string;
  totalFormatted?: string;
  issueDate?: string;
  dueDate?: string;
  validUntil?: string;
  shareUrl: string;
  message?: string;
  fileName: string;
}): string {
  const docHeading = props.documentTitle || `${props.documentType.charAt(0).toUpperCase() + props.documentType.slice(1)} ${props.documentNumber}`;
  const previewText = `${docHeading} from ${props.issuerName}`;
  const typeUpper = props.documentType.toUpperCase();

  const recipientHtml = props.recipientName
    ? `<p style="font-size: 13px; color: #635d55; margin: 0 0 18px 0;">Prepared for: <strong>${escapeHtml(props.recipientName)}</strong></p>`
    : "";

  const messageHtml = props.message && props.message.trim()
    ? `<div style="background-color: #faf9f7; border-left: 3px solid #2b2621; padding: 12px 16px; margin: 16px 0 20px 0; border-radius: 4px;">
        <p style="font-size: 14px; line-height: 1.5; color: #2b2621; margin: 0; white-space: pre-wrap;">${escapeHtml(props.message.trim())}</p>
      </div>`
    : `<p style="font-size: 14px; line-height: 1.5; color: #3d3832; margin: 0 0 16px 0;">
        Please find your official ${escapeHtml(props.documentType.toLowerCase())} attached to this email. You can also view and download it online at any time.
      </p>`;

  const rows: string[] = [
    `<tr style="padding: 4px 0;">
      <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Document No:</td>
      <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(props.documentNumber)}</td>
    </tr>`,
  ];

  if (props.issuerName) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Issued By:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(props.issuerName)}</td>
      </tr>`
    );
  }

  if (props.issueDate) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Date:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(props.issueDate)}</td>
      </tr>`
    );
  }

  if (props.dueDate) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Due Date:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(props.dueDate)}</td>
      </tr>`
    );
  }

  if (props.validUntil) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Valid Until:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(props.validUntil)}</td>
      </tr>`
    );
  }

  if (props.totalFormatted) {
    rows.push(
      `<tr style="padding-top: 8px; border-top: 1px dashed #dcd8cf;">
        <td style="font-size: 14px; font-weight: 700; color: #1a1815; width: 40%; padding: 8px 0 4px 0;">Total Amount:</td>
        <td style="font-size: 16px; font-weight: 800; color: #1a1815; text-align: right; font-family: monospace, sans-serif; padding: 8px 0 4px 0;">${escapeHtml(props.totalFormatted)}</td>
      </tr>`
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(previewText)}</title>
</head>
<body style="background-color: #f6f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px 0;">
  <div style="background-color: #ffffff; margin: 0 auto; padding: 36px 32px; max-width: 580px; border-radius: 12px; border: 1px solid #e7e5e0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
    <!-- Header -->
    <table style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: middle;">
          <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #1a1815; margin: 0;">BOURXE</div>
          <div style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: #8c857b; margin: 2px 0 0 0;">Business Management Suite</div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #5c4813; background-color: #fbf3db; border: 1px solid #eedda6; padding: 4px 10px; border-radius: 9999px;">${escapeHtml(typeUpper)}</span>
        </td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #ebe8e1; margin: 20px 0;" />

    <!-- Document Info -->
    <div style="margin: 16px 0;">
      <h1 style="font-size: 22px; font-weight: 700; color: #1a1815; margin: 0 0 8px 0; letter-spacing: -0.3px;">${escapeHtml(docHeading)}</h1>
      ${recipientHtml}
      ${messageHtml}

      <!-- Key Document Details -->
      <div style="background-color: #faf9f6; border-radius: 8px; padding: 14px 18px; border: 1px solid #eeebe3; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          ${rows.join("\n")}
        </table>
      </div>

      <!-- Primary Action CTA -->
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${escapeHtml(props.shareUrl)}" style="background-color: #1f1c19; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block;">View Document Online</a>
      </div>

      <!-- Attachment Notice -->
      <div style="background-color: #f2f7f4; border: 1px solid #d4e7db; border-radius: 8px; padding: 10px 14px; margin: 18px 0 8px 0;">
        <p style="font-size: 12px; color: #1a4e2d; margin: 0;">
          📎 <strong>Attachment:</strong> ${escapeHtml(props.fileName)} is attached to this email for your records.
        </p>
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #ebe8e1; margin: 20px 0;" />

    <!-- Footer -->
    <div style="margin-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #8c857b; margin: 0 0 6px 0;">
        Sent via <strong>BOURXE</strong> — Enterprise financial and workflow management for SMEs.
      </p>
      <p style="font-size: 11px; color: #a39c91; margin: 0; line-height: 1.4;">
        If you have any questions regarding this document, please reply directly to this email or contact ${escapeHtml(props.issuerName)}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // 1. Explicitly accept POST and OPTIONS only; reject others with 405
  if (req.method !== "POST" && req.method !== "OPTIONS") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  // Pre-flight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 2. Authenticate caller via Supabase JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Missing authentication token" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[send-document-email] Supabase service environment is not configured");
    return new Response(JSON.stringify({ error: "Internal server configuration error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Validate caller identity
  const { data: authData, error: authError } = await adminClient.auth.getUser(jwt);
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired session" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const callerUser = authData.user;

  // 3. Parse and validate request payload
  let payload: SendEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON request body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const recipientEmail = typeof payload.recipientEmail === "string" ? payload.recipientEmail.trim() : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const userMessage = typeof payload.message === "string" ? payload.message.trim() : "";

  // Validate token structure
  if (!token || !SAFE_TOKEN_PATTERN.test(token)) {
    return new Response(JSON.stringify({ error: "Invalid document share token format" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate recipient email
  if (!recipientEmail || recipientEmail.length > 254 || !EMAIL_REGEX.test(recipientEmail)) {
    return new Response(JSON.stringify({ error: "Invalid recipient email address" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate subject (prevent email header injection via CRLF)
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) {
    return new Response(JSON.stringify({ error: "Invalid subject: Must be non-empty, max 200 characters, without line breaks" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate personalized message length
  if (userMessage.length > 2000) {
    return new Response(JSON.stringify({ error: "Message too long: Max 2000 characters allowed" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // 4. Retrieve trusted document share record from database
    const { data: share, error: shareError } = await adminClient
      .from("document_shares")
      .select("id, token, document_type, document_id, document_number, document_title, pdf_path, tenant_id, created_by, is_revoked, expires_at, metadata")
      .eq("token", token)
      .maybeSingle();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Document share not found or unavailable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 5. Verify share active status and expiry
    if (share.is_revoked) {
      return new Response(JSON.stringify({ error: "This document share link has been revoked" }), {
        status: 410,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: "This document share link has expired" }), {
        status: 410,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 6. Enforce tenant & document authorization
    let isAuthorized = share.created_by === callerUser.id;

    if (!isAuthorized && share.tenant_id) {
      // Validate caller belongs to the tenant workspace
      const { data: entityData } = await adminClient
        .from("entities")
        .select("workspace_id")
        .eq("id", share.tenant_id)
        .maybeSingle();

      if (entityData?.workspace_id) {
        const { data: isMember, error: memberError } = await adminClient.rpc("is_workspace_member", {
          p_workspace_id: entityData.workspace_id,
          p_user_id: callerUser.id,
        });

        if (!memberError && Boolean(isMember)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden: You are not authorized to email this document" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 7. Validate storage path strictly matches <token>.pdf
    if (!share.pdf_path || !SAFE_PDF_PATH_PATTERN.test(share.pdf_path) || share.pdf_path !== `${token}.pdf`) {
      console.error("[send-document-email] Storage path mismatch detected:", share.pdf_path);
      return new Response(JSON.stringify({ error: "Document storage record is corrupted or untrusted" }), {
        status: 422,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 8. Fetch authoritative PDF binary from private 'document-shares' storage bucket
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from("document-shares")
      .download(share.pdf_path);

    if (downloadError || !fileBlob || fileBlob.size < 5) {
      console.error("[send-document-email] Storage download failed:", downloadError);
      return new Response(JSON.stringify({ error: "Authoritative document PDF not found in storage" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 9. Validate PDF magic bytes (%PDF-)
    const headerBuffer = await fileBlob.slice(0, 5).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const isPdfSignature = PDF_MAGIC_BYTES.every((byte, index) => headerBytes[index] === byte);

    if (!isPdfSignature) {
      console.error("[send-document-email] Retrieved file fails %PDF- magic signature verification");
      return new Response(JSON.stringify({ error: "Retrieved file is not a valid PDF document" }), {
        status: 422,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 10. Validate attachment size does not exceed email limits
    if (fileBlob.size > MAX_ATTACHMENT_BYTES) {
      return new Response(JSON.stringify({
        error: `Document PDF (${(fileBlob.size / 1024 / 1024).toFixed(1)} MB) exceeds maximum email attachment limit (10 MB). Please share via Direct Link.`,
      }), {
        status: 413,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 11. Check Resend configuration
    if (!RESEND_API_KEY) {
      console.error("[send-document-email] RESEND_API_KEY is not configured in Edge Function secrets");
      return new Response(JSON.stringify({
        error: "Transactional email service is not configured (RESEND_API_KEY missing in server secrets). Please contact system administrator or use native email client.",
      }), {
        status: 503,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 12. Build trusted document metadata & HTML
    const metadata = (share.metadata || {}) as Record<string, any>;
    const sanitizedFileName = (metadata.fileName || `${share.document_number || "Document"}.pdf`)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const shareUrl = `${APP_PUBLIC_URL.replace(/\/$/, "")}/shared/${token}`;

    const emailHtml = buildDocumentEmailHtml({
      documentType: share.document_type || "Document",
      documentNumber: share.document_number || "DOC-001",
      documentTitle: share.document_title || undefined,
      issuerName: metadata.issuerName || "BOURXE",
      recipientName: metadata.recipientName || undefined,
      totalFormatted: metadata.totalFormatted || undefined,
      issueDate: metadata.issueDate || undefined,
      dueDate: metadata.dueDate || undefined,
      validUntil: metadata.validUntil || undefined,
      shareUrl,
      message: userMessage,
      fileName: sanitizedFileName,
    });

    // 13. Convert PDF binary to Base64 for Resend attachment
    const pdfBuffer = await fileBlob.arrayBuffer();
    const pdfBase64 = uint8ArrayToBase64(new Uint8Array(pdfBuffer));

    // 14. Dispatch email via Resend SDK (with direct REST API fallback)
    let messageId: string | null = null;
    let resendErrorMsg: string | null = null;

    try {
      const resend = new Resend(RESEND_API_KEY);
      const resendRes = await resend.emails.send({
        from: DOCUMENT_EMAIL_FROM,
        to: [recipientEmail],
        subject,
        html: emailHtml,
        attachments: [
          {
            filename: sanitizedFileName,
            content: pdfBase64,
          },
        ],
      });

      if (resendRes.error) {
        resendErrorMsg = resendRes.error.message || "Resend API error";
      } else if (resendRes.data?.id) {
        messageId = resendRes.data.id;
      }
    } catch (sdkErr) {
      console.warn("[send-document-email] Resend SDK invocation failed, trying direct REST API fallback:", sdkErr);

      // Direct REST fallback to api.resend.com
      try {
        const restRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: DOCUMENT_EMAIL_FROM,
            to: [recipientEmail],
            subject,
            html: emailHtml,
            attachments: [
              {
                filename: sanitizedFileName,
                content: pdfBase64,
              },
            ],
          }),
        });

        const restData = await restRes.json();
        if (restRes.ok && restData?.id) {
          messageId = restData.id;
          resendErrorMsg = null;
        } else {
          resendErrorMsg = restData?.message || restData?.error?.message || `HTTP ${restRes.status}`;
        }
      } catch (restErr) {
        resendErrorMsg = restErr instanceof Error ? restErr.message : "Network failure contacting Resend";
      }
    }

    if (!messageId || resendErrorMsg) {
      console.error("[send-document-email] Resend transmission failure:", resendErrorMsg);
      return new Response(JSON.stringify({
        error: `Email transmission rejected by provider: ${resendErrorMsg || "Unknown delivery error"}`,
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 15. Return structured success
    return new Response(JSON.stringify({
      success: true,
      messageId,
      recipient: recipientEmail,
      fileName: sanitizedFileName,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-document-email] Unhandled server error:", err);
    return new Response(JSON.stringify({
      error: "Internal server error occurred while processing document email",
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
