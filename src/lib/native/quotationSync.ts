import { toDbItem } from "@/domain/invoice";
import { supabase } from "../../supabase";

import { bootstrapAppStorage } from "./appStorage";
import { canUseAndroidNativeSqlite } from "./capacitor";
import { bootstrapQuotationOffline } from "./quotationOffline";
import { getOfflineNumberConflictMessage } from "./syncErrors";
import { query, run } from "./sqlite";

type QuotationCreateQueuePayload = {
  entity?: string;
  action?: string;
  localId?: string;
  quotationNumber?: string;
  remoteQuotationId?: string;
  error?: string;
  failedAt?: string;
  syncedAt?: string;
};

type PendingQuotationQueueRow = {
  id: number;
  payload: string | null;
  status: string;
  attempts: number;
  created_at: string;
  updated_at: string;
};

type LocalQuotationRow = {
  id: string;
  quotation_number: string;
  po_number: string | null;
  quotation_title: string | null;
  client_id: string | null;
  client_name: string | null;
  project_id: string | null;
  issue_date: string | null;
  valid_until: string | null;
  status: string | null;
  notes: string | null;
  terms: string | null;
  workmanship: number | string | null;
  transportation: number | string | null;
  shipping: number | string | null;
  discount: number | string | null;
  vat: number | string | null;
  wht: number | string | null;
  subtotal: number | string | null;
  install_rate_total: number | string | null;
  total: number | string | null;
  amount_in_words: string | null;
  items_json: string;
  custom_fields: string | null;
  sync_status: string;
};

type LocalQuotationItem = {
  id?: string | null;
  item_id?: string | null;
  description?: string | null;
  sub_description?: string | null;
  make?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  amount?: number | string | null;
  install_rate?: number | string | null;
  install_rate_override?: boolean | null;
  vat_rate?: number | string | null;
  discount_rate?: number | string | null;
  row_type?: "standard" | "group_header" | string | null;
  group_id?: string | null;
  group_name?: string | null;
  sort_order?: number | string | null;
  image_url?: string | null;
  custom_data?: string | Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  _uiKey?: string;
};

type QuotationSyncResult = {
  status: "synced" | "skipped" | "failed";
  queueItemId?: string;
  localQuotationId?: string;
  remoteQuotationId?: string;
  error?: string;
};

export type QuotationCreateQueueItem = {
  id: string;
  status: "pending" | "failed";
  attempts: number;
  localQuotationId?: string;
  quotationNumber?: string;
  clientName?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function parseQueuePayload(payload: string | null): QuotationCreateQueuePayload {
  if (!payload) return {};

  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as QuotationCreateQueuePayload)
      : {};
  } catch {
    return {};
  }
}

function parseItemsJson(itemsJson: string): LocalQuotationItem[] {
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalQuotationItem[]) : [];
  } catch {
    return [];
  }
}

function toQuotationItemRow(item: LocalQuotationItem, quotationId: string, sortOrder: number) {
  const row = toDbItem(item as Parameters<typeof toDbItem>[0], quotationId, sortOrder) as Record<
    string,
    unknown
  >;
  delete row.invoice_id;
  return { ...row, quotation_id: quotationId };
}

async function updateLocalQuotationStatus(
  localQuotationId: string,
  syncStatus: "synced" | "failed",
): Promise<void> {
  await run(
    `
      UPDATE quotations_local
      SET sync_status = ?, updated_at = ?
      WHERE id = ?;
    `,
    [syncStatus, new Date().toISOString(), localQuotationId],
  );
}

async function updateQueueStatus(
  queueItemId: number,
  status: "synced" | "failed",
  payload: QuotationCreateQueuePayload,
  attempts: number,
): Promise<void> {
  await run(
    `
      UPDATE sync_queue
      SET status = ?, payload = ?, attempts = ?, updated_at = ?
      WHERE id = ?;
    `,
    [
      status,
      JSON.stringify(payload),
      attempts,
      new Date().toISOString(),
      queueItemId,
    ],
  );
}

async function processQuotationCreateQueueRow(
  queueRow: PendingQuotationQueueRow,
): Promise<QuotationSyncResult> {
  const queuePayload = parseQueuePayload(queueRow.payload);
  const localQuotationId = queuePayload.localId;

  if (!localQuotationId) {
    const error = "Queue payload is missing localId for quotation.create.";
    await updateQueueStatus(
      queueRow.id,
      "failed",
      { ...queuePayload, error, failedAt: new Date().toISOString() },
      queueRow.attempts + 1,
    );
    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      error,
    };
  }

  const quotationRows = await query<LocalQuotationRow>(
    "SELECT * FROM quotations_local WHERE id = ? LIMIT 1;",
    [localQuotationId],
  );
  const localQuotation = quotationRows[0];

  if (!localQuotation) {
    const error = `Local quotation ${localQuotationId} was not found.`;
    await updateQueueStatus(
      queueRow.id,
      "failed",
      {
        ...queuePayload,
        localId: localQuotationId,
        error,
        failedAt: new Date().toISOString(),
      },
      queueRow.attempts + 1,
    );
    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      localQuotationId,
      error,
    };
  }

  try {
    const { data, error } = await supabase
      .from("quotations")
      .insert([
        {
          quotation_number: localQuotation.quotation_number,
          po_number: localQuotation.po_number,
          quotation_title: localQuotation.quotation_title,
          client_id: localQuotation.client_id,
          client_name: localQuotation.client_name,
          project_id: localQuotation.project_id,
          issue_date: localQuotation.issue_date,
          valid_until: localQuotation.valid_until,
          status: localQuotation.status || "draft",
          notes: localQuotation.notes,
          terms: localQuotation.terms,
          workmanship: Number(localQuotation.workmanship || 0),
          transportation: Number(localQuotation.transportation || 0),
          shipping: Number(localQuotation.shipping || 0),
          discount: Number(localQuotation.discount || 0),
          vat: Number(localQuotation.vat || 0),
          wht: Number(localQuotation.wht || 0),
          subtotal: Number(localQuotation.subtotal || 0),
          install_rate_total: Number(localQuotation.install_rate_total || 0),
          total: Number(localQuotation.total || 0),
          amount_in_words: localQuotation.amount_in_words,
          custom_fields: localQuotation.custom_fields,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;

    const remoteQuotationId = String(data?.id || "");
    const itemRows = parseItemsJson(localQuotation.items_json).map((item, index) =>
      toQuotationItemRow(item, remoteQuotationId, index),
    );

    if (itemRows.length > 0) {
      const { error: itemError } = await supabase
        .from("quotation_items")
        .insert(itemRows);

      if (itemError) {
        await supabase.from("quotations").delete().eq("id", remoteQuotationId);
        throw itemError;
      }
    }

    await updateLocalQuotationStatus(localQuotationId, "synced");
    await updateQueueStatus(
      queueRow.id,
      "synced",
      {
        ...queuePayload,
        localId: localQuotationId,
        quotationNumber: localQuotation.quotation_number,
        remoteQuotationId,
        syncedAt: new Date().toISOString(),
        error: undefined,
        failedAt: undefined,
      },
      queueRow.attempts,
    );

    return {
      status: "synced",
      queueItemId: String(queueRow.id),
      localQuotationId,
      remoteQuotationId,
    };
  } catch (syncError) {
    const conflictError = getOfflineNumberConflictMessage({
      error: syncError,
      documentLabel: "Quotation",
      numberValue: localQuotation.quotation_number,
    });
    const error =
      conflictError ||
      (syncError instanceof Error
        ? syncError.message
        : "Quotation sync failed for an unknown reason.");

    await updateLocalQuotationStatus(localQuotationId, "failed");
    await updateQueueStatus(
      queueRow.id,
      "failed",
      {
        ...queuePayload,
        localId: localQuotationId,
        quotationNumber: localQuotation.quotation_number,
        error,
        failedAt: new Date().toISOString(),
      },
      queueRow.attempts + 1,
    );

    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      localQuotationId,
      error,
    };
  }
}

export async function processNextPendingQuotationCreate(): Promise<QuotationSyncResult> {
  if (!canUseAndroidNativeSqlite() || !isOnline()) {
    return { status: "skipped" };
  }

  await bootstrapAppStorage();
  await bootstrapQuotationOffline();

  const queueRows = await query<PendingQuotationQueueRow>(
    `
      SELECT id, payload, status, attempts, created_at, updated_at
      FROM sync_queue
      WHERE status = 'pending' AND queue_key = 'quotation.create'
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    `,
  );

  const queueRow = queueRows[0];
  if (!queueRow) {
    return { status: "skipped" };
  }

  return processQuotationCreateQueueRow(queueRow);
}

export async function processQuotationCreateQueueItem(
  queueItemId: string,
): Promise<{
  status: "synced" | "failed" | "skipped";
  queueItemId: string;
  localQuotationId?: string;
  remoteQuotationId?: string;
  error?: string;
}> {
  if (!canUseAndroidNativeSqlite() || !isOnline()) {
    return { status: "skipped", queueItemId };
  }

  await bootstrapAppStorage();
  await bootstrapQuotationOffline();

  const queueRows = await query<PendingQuotationQueueRow>(
    `
      SELECT id, payload, status, attempts, created_at, updated_at
      FROM sync_queue
      WHERE id = ?
        AND queue_key = 'quotation.create'
        AND status IN ('pending', 'failed')
      LIMIT 1;
    `,
    [Number(queueItemId)],
  );

  const queueRow = queueRows[0];
  if (!queueRow) {
    return { status: "skipped", queueItemId };
  }

  return {
    queueItemId,
    ...(await processQuotationCreateQueueRow(queueRow)),
  };
}

export async function listPendingOrFailedQuotationCreateQueueItems(): Promise<
  QuotationCreateQueueItem[]
> {
  if (!canUseAndroidNativeSqlite()) {
    return [];
  }

  await bootstrapAppStorage();
  await bootstrapQuotationOffline();

  const queueRows = await query<PendingQuotationQueueRow>(
    `
      SELECT id, payload, status, attempts, created_at, updated_at
      FROM sync_queue
      WHERE queue_key = 'quotation.create'
        AND status IN ('pending', 'failed')
      ORDER BY updated_at DESC, id DESC;
    `,
  );

  if (queueRows.length === 0) {
    return [];
  }

  const parsedRows = queueRows.map((queueRow) => ({
    queueRow,
    payload: parseQueuePayload(queueRow.payload),
  }));
  const localIds = parsedRows
    .map((entry) => entry.payload.localId)
    .filter((localId): localId is string => Boolean(localId));

  const quotationRows = localIds.length
    ? await query<Pick<LocalQuotationRow, "id" | "quotation_number" | "client_name">>(
        `
          SELECT id, quotation_number, client_name
          FROM quotations_local
          WHERE id IN (${localIds.map(() => "?").join(", ")});
        `,
        localIds,
      )
    : [];
  const quotationLookup = new Map(
    quotationRows.map((quotationRow) => [quotationRow.id, quotationRow]),
  );

  return parsedRows.map(({ queueRow, payload }) => {
    const localQuotation = payload.localId
      ? quotationLookup.get(payload.localId)
      : null;

    return {
      id: String(queueRow.id),
      status: queueRow.status === "failed" ? "failed" : "pending",
      attempts: queueRow.attempts,
      localQuotationId: payload.localId,
      quotationNumber:
        localQuotation?.quotation_number || payload.quotationNumber || undefined,
      clientName: localQuotation?.client_name || undefined,
      error: payload.error || undefined,
      createdAt: queueRow.created_at,
      updatedAt: queueRow.updated_at,
    };
  });
}
