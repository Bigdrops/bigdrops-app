import { supabase } from "../../supabase";

import { canUseNativeSqlite } from "./capacitor";
import { bootstrapAppStorage } from "./appStorage";
import { bootstrapWaybillOffline } from "./waybillOffline";
import { query, run } from "./sqlite";

type WaybillCreateQueuePayload = {
  entity?: string;
  action?: string;
  localId?: string;
  waybillNumber?: string;
  remoteWaybillId?: string;
  error?: string;
  failedAt?: string;
  syncedAt?: string;
};

type PendingWaybillQueueRow = {
  id: number;
  payload: string | null;
  attempts: number;
};

type LocalWaybillRow = {
  id: string;
  waybill_number: string;
  type: string;
  date: string;
  time: string | null;
  sender_name: string | null;
  receiver_name: string | null;
  receiver_signature_url: string | null;
  receiver_description: string | null;
  client_id: string | null;
  client_name: string | null;
  project_id: string | null;
  invoice_id: string | null;
  po_number: string | null;
  vehicle_plate: string | null;
  delivery_location: string | null;
  items_json: string;
  notes: string | null;
  status: string;
  created_by: string | null;
  custom_fields: string | null;
  sync_status: string;
};

type WaybillSyncResult = {
  status: "synced" | "skipped" | "failed";
  queueItemId?: string;
  localWaybillId?: string;
  remoteWaybillId?: string;
  error?: string;
};

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function parseQueuePayload(payload: string | null): WaybillCreateQueuePayload {
  if (!payload) return {};

  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as WaybillCreateQueuePayload)
      : {};
  } catch {
    return {};
  }
}

function parseItemsJson(itemsJson: string): unknown[] {
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function updateQueueStatus(
  queueItemId: number,
  status: "synced" | "failed",
  payload: WaybillCreateQueuePayload,
  attempts: number,
): Promise<void> {
  await run(
    `
      UPDATE sync_queue
      SET status = ?, payload = ?, attempts = ?, updated_at = ?
      WHERE id = ?;
    `,
    [status, JSON.stringify(payload), attempts, new Date().toISOString(), queueItemId],
  );
}

async function updateLocalWaybillStatus(
  localWaybillId: string,
  syncStatus: "synced" | "failed",
): Promise<void> {
  await run(
    `
      UPDATE waybills_local
      SET sync_status = ?, updated_at = ?
      WHERE id = ?;
    `,
    [syncStatus, new Date().toISOString(), localWaybillId],
  );
}

export async function processNextPendingWaybillCreate(): Promise<WaybillSyncResult> {
  if (!canUseNativeSqlite() || !isOnline()) {
    return { status: "skipped" };
  }

  await bootstrapAppStorage();
  await bootstrapWaybillOffline();

  const queueRows = await query<PendingWaybillQueueRow>(
    `
      SELECT id, payload, attempts
      FROM sync_queue
      WHERE status = 'pending' AND queue_key = 'waybill.create'
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    `,
  );

  const queueRow = queueRows[0];
  if (!queueRow) {
    return { status: "skipped" };
  }

  const queuePayload = parseQueuePayload(queueRow.payload);
  const localWaybillId = queuePayload.localId;

  if (!localWaybillId) {
    const error = "Queue payload is missing localId for waybill.create.";
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

  const waybillRows = await query<LocalWaybillRow>(
    "SELECT * FROM waybills_local WHERE id = ? LIMIT 1;",
    [localWaybillId],
  );
  const localWaybill = waybillRows[0];

  if (!localWaybill) {
    const error = `Local waybill ${localWaybillId} was not found.`;
    await updateQueueStatus(
      queueRow.id,
      "failed",
      {
        ...queuePayload,
        localId: localWaybillId,
        error,
        failedAt: new Date().toISOString(),
      },
      queueRow.attempts + 1,
    );
    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      localWaybillId,
      error,
    };
  }

  try {
    const { data, error } = await supabase
      .from("waybills")
      .insert([
        {
          waybill_number: localWaybill.waybill_number,
          type: localWaybill.type,
          date: localWaybill.date,
          time: localWaybill.time,
          sender_name: localWaybill.sender_name,
          receiver_name: localWaybill.receiver_name,
          receiver_signature_url: localWaybill.receiver_signature_url,
          receiver_description: localWaybill.receiver_description,
          client_id: localWaybill.client_id,
          client_name: localWaybill.client_name,
          project_id: localWaybill.project_id,
          invoice_id: localWaybill.invoice_id,
          po_number: localWaybill.po_number,
          vehicle_plate: localWaybill.vehicle_plate,
          delivery_location: localWaybill.delivery_location,
          items: parseItemsJson(localWaybill.items_json),
          notes: localWaybill.notes,
          status: localWaybill.status,
          created_by: localWaybill.created_by,
          custom_fields: localWaybill.custom_fields,
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const remoteWaybillId = String(data?.id || "");

    await updateLocalWaybillStatus(localWaybillId, "synced");
    await updateQueueStatus(
      queueRow.id,
      "synced",
      {
        ...queuePayload,
        localId: localWaybillId,
        waybillNumber: localWaybill.waybill_number,
        remoteWaybillId,
        syncedAt: new Date().toISOString(),
        error: undefined,
        failedAt: undefined,
      },
      queueRow.attempts,
    );

    return {
      status: "synced",
      queueItemId: String(queueRow.id),
      localWaybillId,
      remoteWaybillId,
    };
  } catch (syncError) {
    const error =
      syncError instanceof Error
        ? syncError.message
        : "Waybill sync failed for an unknown reason.";

    await updateLocalWaybillStatus(localWaybillId, "failed");
    await updateQueueStatus(
      queueRow.id,
      "failed",
      {
        ...queuePayload,
        localId: localWaybillId,
        waybillNumber: localWaybill.waybill_number,
        error,
        failedAt: new Date().toISOString(),
      },
      queueRow.attempts + 1,
    );

    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      localWaybillId,
      error,
    };
  }
}
