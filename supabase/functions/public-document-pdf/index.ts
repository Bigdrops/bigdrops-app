import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SAFE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/;
const SAFE_PDF_PATH_PATTERN = /^[a-zA-Z0-9_-]{16,64}\.pdf$/;

/**
 * PDF Magic Bytes (%PDF-)
 * Standard PDF files must begin with '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D).
 */
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d];

/**
 * Abuse Protection Note:
 * Edge functions run statelessly across distributed edge worker nodes.
 * An in-memory token/IP rate limiter is fragmented and easily bypassed across instances.
 * Authoritative abuse protection relies on:
 *   1. Supabase / Cloudflare Edge Gateway rate limits and DDoS shields.
 *   2. Cryptographically strong 192-bit unguessable tokens (prevents enumeration).
 *   3. Uniform 404 responses for invalid, expired, or revoked tokens (prevents timing oracles).
 */

Deno.serve(async (req) => {
  // 1. Explicitly accept GET and OPTIONS only; reject all other HTTP methods with 405
  if (req.method !== "GET" && req.method !== "OPTIONS") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Allow": "GET, OPTIONS",
      },
    });
  }

  // Handle pre-flight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() || "";

  // 2. Validate token format before any database access (fail closed with uniform 404)
  if (!token || !SAFE_TOKEN_PATTERN.test(token)) {
    return new Response(JSON.stringify({ error: "Document unavailable" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // 3. Validate existence, revocation, and expiry on every request using service-role credentials
    const { data: share, error: shareError } = await supabase
      .from("document_shares")
      .select("token, pdf_path, is_revoked, expires_at, document_number")
      .eq("token", token)
      .maybeSingle();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Document unavailable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 4. Uniform unavailable response for revoked or expired shares (prevents token-state discovery)
    if (
      share.is_revoked ||
      (share.expires_at && new Date(share.expires_at).getTime() <= Date.now())
    ) {
      return new Response(JSON.stringify({ error: "Document unavailable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 5. Validate stored pdf_path against permitted layout: must be <token>.pdf
    // Completely prevents path traversal (e.g., ../) and unauthorized object references
    if (
      !share.pdf_path ||
      !SAFE_PDF_PATH_PATTERN.test(share.pdf_path) ||
      share.pdf_path !== `${token}.pdf`
    ) {
      console.error("[public-document-pdf] Invalid storage path detected:", share.pdf_path);
      return new Response(JSON.stringify({ error: "Document unavailable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 6. Retrieve PDF from private 'document-shares' bucket
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("document-shares")
      .download(share.pdf_path);

    if (downloadError || !fileBlob || fileBlob.size < 5) {
      console.error("[public-document-pdf] Storage retrieval failed:", downloadError);
      return new Response(JSON.stringify({ error: "Document unavailable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 7. Validate PDF magic signature (%PDF-)
    const headerBuffer = await fileBlob.slice(0, 5).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const isPdfSignature = PDF_MAGIC_BYTES.every(
      (byte, index) => headerBytes[index] === byte
    );

    if (!isPdfSignature) {
      console.error("[public-document-pdf] Retrieved object fails %PDF- magic signature verification");
      return new Response(JSON.stringify({ error: "Document unavailable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 8. Forward upstream response stream directly (no buffering) with non-caching security headers
    const sanitizedDocNum = (share.document_number || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
    return new Response(fileBlob.stream(), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${sanitizedDocNum}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (err) {
    console.error("[public-document-pdf] Internal retrieval failure:", err);
    return new Response(JSON.stringify({ error: "Document unavailable" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
