declare const Deno: any;

import {
  buildDocumentEmailHtml,
  type DocumentEmailTemplateProps,
} from "../../../src/domain/documentShare/documentEmailHtml";

// Cross-runtime loaders (compatible with both Supabase Edge Function Deno runtime and Bun/Node test runner)
async function getSupabaseCreateClient(): Promise<any> {
  try {
    // @ts-ignore
    const mod = await import("https://esm.sh/@supabase/supabase-js@2.42.0");
    if (typeof mod.createClient === "function") return mod.createClient;
  } catch {}
  try {
    const mod = await import("@supabase/supabase-js");
    return mod.createClient;
  } catch {}
  return null;
}

async function getResendClass(): Promise<any> {
  try {
    // @ts-ignore
    const mod = await import("npm:resend@6.37.0");
    if (typeof mod.Resend === "function") return mod.Resend;
  } catch {}
  try {
    const mod = await import("resend");
    return mod.Resend;
  } catch {}
  return null;
}

function getEnvVar(key: string): string {
  if (typeof Deno !== "undefined" && Deno.env && typeof Deno.env.get === "function") {
    return Deno.env.get(key) || "";
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || "";
  }
  return "";
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const SAFE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/;
export const SAFE_OPERATION_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
export const SAFE_PDF_PATH_PATTERN = /^[a-zA-Z0-9_-]{16,64}\.pdf$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Standard PDF Magic Bytes (%PDF-)
 * Standard PDF files must begin with '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D).
 */
export const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d];

/** Maximum allowed raw PDF attachment size: 10 MB (within Resend's 40 MB total payload limit) */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface SendEmailPayload {
  token: string;
  recipientEmail: string;
  subject: string;
  message?: string;
  operationId?: string;
}

export interface SendDocumentEmailDeps {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  resendApiKey?: string;
  documentEmailFrom?: string;
  appPublicUrl?: string;
  adminClient?: any;
  resendClient?: any;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  return btoa(chunks.join(""));
}

/**
 * Validates and extracts a trusted reply-to email address.
 */
export function sanitizeReplyTo(candidate?: string | null): string | null {
  if (!candidate || typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (
    trimmed.length > 0 &&
    trimmed.length <= 254 &&
    !/[\r\n]/.test(trimmed) &&
    EMAIL_REGEX.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

/**
 * Core HTTP Request Handler for send-document-email.
 * Exported to allow direct, deterministic behavioral testing.
 */
export async function handleSendDocumentEmail(
  req: Request,
  deps: SendDocumentEmailDeps = {},
): Promise<Response> {
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

  const supabaseUrl = deps.supabaseUrl || getEnvVar("SUPABASE_URL");
  const serviceRoleKey = deps.serviceRoleKey || getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = deps.resendApiKey || getEnvVar("RESEND_API_KEY");
  const documentEmailFrom =
    deps.documentEmailFrom || getEnvVar("DOCUMENT_EMAIL_FROM") || "BOURXE Documents <notifications@bourxe.com>";
  const appPublicUrl = deps.appPublicUrl || getEnvVar("APP_PUBLIC_URL") || "https://bouxre.com";

  let adminClient = deps.adminClient;
  if (!adminClient) {
    const createClientFn = await getSupabaseCreateClient();
    if (createClientFn && supabaseUrl && serviceRoleKey) {
      adminClient = createClientFn(supabaseUrl, serviceRoleKey);
    }
  }

  if (!adminClient) {
    console.error("[send-document-email] Supabase service client could not be configured");
    return new Response(JSON.stringify({ error: "Internal server configuration error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

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
  const operationId = typeof payload.operationId === "string" ? payload.operationId.trim() : "";

  // Validate token structure
  if (!token || !SAFE_TOKEN_PATTERN.test(token)) {
    return new Response(JSON.stringify({ error: "Invalid document share token format" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate operation ID for server and provider idempotency
  if (!operationId || !SAFE_OPERATION_ID_PATTERN.test(operationId)) {
    return new Response(JSON.stringify({ error: "Missing or invalid operation identifier for idempotency" }), {
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
    return new Response(
      JSON.stringify({ error: "Invalid subject: Must be non-empty, max 200 characters, without line breaks" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
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

    // 6. Enforce current tenant & workspace authorization
    // In accordance with FIND-04: Original creator status CANNOT bypass active workspace membership.
    if (!share.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Share record lacks verified tenant association" }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const { data: entityData, error: entityError } = await adminClient
      .from("entities")
      .select("workspace_id")
      .eq("id", share.tenant_id)
      .maybeSingle();

    if (entityError || !entityData?.workspace_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Tenant entity or workspace not found" }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const { data: isMember, error: memberError } = await adminClient.rpc("is_workspace_member", {
      p_workspace_id: entityData.workspace_id,
      p_user_id: callerUser.id,
    });

    if (memberError || !Boolean(isMember)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You are not an active member of this document's workspace" }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
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

    // 10. Validate attachment size does not exceed email limits (FIND-06)
    if (fileBlob.size > MAX_ATTACHMENT_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Document PDF (${(fileBlob.size / 1024 / 1024).toFixed(
            1,
          )} MB) exceeds maximum email attachment limit (10 MB). Please share via Direct Link.`,
        }),
        {
          status: 413,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // 11. Check Resend configuration
    if (!resendApiKey && !deps.resendClient) {
      console.error("[send-document-email] RESEND_API_KEY is not configured in Edge Function secrets");
      return new Response(
        JSON.stringify({
          error: "Transactional email service is not configured (RESEND_API_KEY missing in server secrets). Please contact system administrator or use native email client.",
          ambiguous: false,
        }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // 12. Derive trusted reply-to address (FIND-05)
    const metadata = (share.metadata || {}) as Record<string, any>;
    let trustedReplyTo: string | null = sanitizeReplyTo(metadata.issuerEmail);

    if (!trustedReplyTo && share.created_by) {
      const { data: creatorProfile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("id", share.created_by)
        .maybeSingle();

      trustedReplyTo = sanitizeReplyTo(creatorProfile?.email);
    }

    // 13. Build trusted document metadata & HTML using the single authoritative template builder (FIND-03)
    const sanitizedFileName = (metadata.fileName || `${share.document_number || "Document"}.pdf`).replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const shareUrl = `${appPublicUrl.replace(/\/$/, "")}/shared/${token}`;

    const emailHtml = buildDocumentEmailHtml({
      documentType: share.document_type || "Document",
      documentNumber: share.document_number || "DOC-001",
      documentTitle: share.document_title || undefined,
      issuerName: metadata.issuerName || "BOURXE",
      issuerEmail: trustedReplyTo || undefined,
      recipientName: metadata.recipientName || undefined,
      totalFormatted: metadata.totalFormatted || undefined,
      issueDate: metadata.issueDate || undefined,
      dueDate: metadata.dueDate || undefined,
      validUntil: metadata.validUntil || undefined,
      paymentStatus: metadata.paymentStatus || undefined,
      shareUrl,
      message: userMessage,
      fileName: sanitizedFileName,
      replyTo: trustedReplyTo,
    });

    // 14. Convert PDF binary to Base64 for Resend attachment
    const pdfBuffer = await fileBlob.arrayBuffer();
    const pdfBase64 = uint8ArrayToBase64(new Uint8Array(pdfBuffer));

    // 15. Single Transport Resend Dispatch with Operation-Level Idempotency (FIND-01 & FIND-02)
    let resend = deps.resendClient;
    if (!resend) {
      const ResendClass = await getResendClass();
      if (!ResendClass) {
        console.error("[send-document-email] Resend SDK module could not be loaded");
        return new Response(
          JSON.stringify({
            error: "Transactional email module could not be initialized on server.",
            ambiguous: false,
            operationId,
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      try {
        resend = new ResendClass(resendApiKey);
      } catch (sdkInitErr) {
        console.error("[send-document-email] Resend SDK client initialization failed:", sdkInitErr);
        return new Response(
          JSON.stringify({
            error: "Transactional email service failed to initialize on server. Please use client fallback.",
            ambiguous: false,
            operationId,
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
    }

    let resendRes: any;
    try {
      resendRes = await resend.emails.send(
        {
          from: documentEmailFrom,
          to: [recipientEmail],
          subject,
          html: emailHtml,
          replyTo: trustedReplyTo ? [trustedReplyTo] : undefined,
          attachments: [
            {
              filename: sanitizedFileName,
              content: pdfBase64,
            },
          ],
        },
        {
          idempotencyKey: operationId,
        },
      );
    } catch (networkDispatchErr) {
      // In-flight network error (timeout, connection reset, TLS abort).
      // Acceptance by provider is UNKNOWN. DO NOT attempt a second POST.
      console.error("[send-document-email] In-flight network error during Resend dispatch:", networkDispatchErr);
      return new Response(
        JSON.stringify({
          error: "Network timeout or connection reset during email transmission. Provider acceptance could not be confirmed.",
          ambiguous: true,
          operationId,
        }),
        {
          status: 504,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (resendRes?.error) {
      console.error("[send-document-email] Resend provider confirmed rejection:", resendRes.error);
      return new Response(
        JSON.stringify({
          error: `Email transmission rejected by provider: ${resendRes.error.message || "Unknown delivery error"}`,
          ambiguous: false,
          operationId,
        }),
        {
          status: 422,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const messageId = resendRes?.data?.id;
    if (!messageId) {
      console.error("[send-document-email] Provider response omitted message ID:", resendRes);
      return new Response(
        JSON.stringify({
          error: "Provider did not return a valid transmission reference.",
          ambiguous: true,
          operationId,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // 16. Return structured success
    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        operationId,
        recipient: recipientEmail,
        fileName: sanitizedFileName,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[send-document-email] Unhandled server error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error occurred while processing document email",
        ambiguous: false,
        operationId,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
}

// Serve HTTP in Supabase Deno runtime
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve((req: Request) => handleSendDocumentEmail(req));
}
