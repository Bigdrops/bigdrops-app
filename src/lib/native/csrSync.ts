import { supabase } from "../../supabase";

import { bootstrapAppStorage } from "./appStorage";
import { canUseAndroidNativeSqlite } from "./capacitor";
import { bootstrapCsrOffline } from "./csrOffline";
import { getOfflineNumberConflictMessage } from "./syncErrors";
import { query, run } from "./sqlite";

type CsrCreateQueuePayload = {
  entity?: string;
  action?: string;
  localId?: string;
  csrNumber?: string;
  remoteCsrId?: string;
  error?: string;
  failedAt?: string;
  syncedAt?: string;
};

type PendingCsrQueueRow = {
  id: number;
  payload: string | null;
  status: string;
  attempts: number;
  created_at: string;
  updated_at: string;
};

type LocalCsrRow = {
  id: string;
  csr_number: string;
  date: string;
  client_id: string | null;
  client_name: string | null;
  call_type: string | null;
  system_down: string | null;
  address: string | null;
  problem_reported: string | null;
  equipment_type: string | null;
  equipment_location: string | null;
  make: string | null;
  model: string | null;
  serial_no: string | null;
  engine_no: string | null;
  capacity: string | null;
  voltage: string | null;
  frequency: string | null;
  battery: string | null;
  temperature: string | null;
  pressure: string | null;
  hours: string | null;
  materials_used: string | null;
  service_rendered: string | null;
  defects_found: string | null;
  engineer_remarks: string | null;
  status: string | null;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  customer_feedback: string | null;
  acknowledgement_name: string | null;
  technician_signatory_id: string | null;
  linked_invoice_id: string | null;
  show_po: number | null;
  po_number: string | null;
  sync_status: string;
};

type CsrSyncResult = {
  status: "synced" | "skipped" | "failed";
  queueItemId?: string;
  localCsrId?: string;
  remoteCsrId?: string;
  error?: string;
};

export type CsrCreateQueueItem = {
  id: string;
  status: "pending" | "failed";
  attempts: number;
  localCsrId?: string;
  csrNumber?: string;
  clientName?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function parseQueuePayload(payload: string | null): CsrCreateQueuePayload {
  if (!payload) return {};

  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as CsrCreateQueuePayload)
      : {};
  } catch {
    return {};
  }
}

async function updateLocalCsrStatus(
  localCsrId: string,
  syncStatus: "synced" | "failed",
): Promise<void> {
  await run(
    `
      UPDATE csrs_local
      SET sync_status = ?, updated_at = ?
      WHERE id = ?;
    `,
    [syncStatus, new Date().toISOString(), localCsrId],
  );
}

async function updateQueueStatus(
  queueItemId: number,
  status: "synced" | "failed",
  payload: CsrCreateQueuePayload,
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

async function processCsrCreateQueueRow(
  queueRow: PendingCsrQueueRow,
): Promise<CsrSyncResult> {
  const queuePayload = parseQueuePayload(queueRow.payload);
  const localCsrId = queuePayload.localId;

  if (!localCsrId) {
    const error = "Queue payload is missing localId for csr.create.";
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

  const csrRows = await query<LocalCsrRow>(
    "SELECT * FROM csrs_local WHERE id = ? LIMIT 1;",
    [localCsrId],
  );
  const localCsr = csrRows[0];

  if (!localCsr) {
    const error = `Local CSR ${localCsrId} was not found.`;
    await updateQueueStatus(
      queueRow.id,
      "failed",
      {
        ...queuePayload,
        localId: localCsrId,
        error,
        failedAt: new Date().toISOString(),
      },
      queueRow.attempts + 1,
    );
    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      localCsrId,
      error,
    };
  }

  try {
    const { data, error } = await supabase
      .from("csrs")
      .insert([
        {
          csr_number: localCsr.csr_number,
          date: localCsr.date,
          client_id: localCsr.client_id,
          client_name: localCsr.client_name,
          call_type: localCsr.call_type,
          system_down: localCsr.system_down,
          address: localCsr.address,
          problem_reported: localCsr.problem_reported,
          equipment_type: localCsr.equipment_type,
          equipment_location: localCsr.equipment_location,
          make: localCsr.make,
          model: localCsr.model,
          serial_no: localCsr.serial_no,
          engine_no: localCsr.engine_no,
          capacity: localCsr.capacity,
          voltage: localCsr.voltage,
          frequency: localCsr.frequency,
          battery: localCsr.battery,
          temperature: localCsr.temperature,
          pressure: localCsr.pressure,
          hours: localCsr.hours,
          materials_used: localCsr.materials_used,
          service_rendered: localCsr.service_rendered,
          defects_found: localCsr.defects_found,
          engineer_remarks: localCsr.engineer_remarks,
          status: localCsr.status,
          start_date: localCsr.start_date,
          start_time: localCsr.start_time,
          end_date: localCsr.end_date,
          end_time: localCsr.end_time,
          customer_feedback: localCsr.customer_feedback,
          acknowledgement_name: localCsr.acknowledgement_name,
          technician_signatory_id: localCsr.technician_signatory_id,
          linked_invoice_id: localCsr.linked_invoice_id,
          show_po: Boolean(localCsr.show_po),
          po_number: localCsr.po_number,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;

    const remoteCsrId = String(data?.id || "");

    await updateLocalCsrStatus(localCsrId, "synced");
    await updateQueueStatus(
      queueRow.id,
      "synced",
      {
        ...queuePayload,
        localId: localCsrId,
        csrNumber: localCsr.csr_number,
        remoteCsrId,
        syncedAt: new Date().toISOString(),
        error: undefined,
        failedAt: undefined,
      },
      queueRow.attempts,
    );

    return {
      status: "synced",
      queueItemId: String(queueRow.id),
      localCsrId,
      remoteCsrId,
    };
  } catch (syncError) {
    const conflictError = getOfflineNumberConflictMessage({
      error: syncError,
      documentLabel: "CSR",
      numberValue: localCsr.csr_number,
    });
    const error =
      conflictError ||
      (syncError instanceof Error
        ? syncError.message
        : "CSR sync failed for an unknown reason.");

    await updateLocalCsrStatus(localCsrId, "failed");
    await updateQueueStatus(
      queueRow.id,
      "failed",
      {
        ...queuePayload,
        localId: localCsrId,
        csrNumber: localCsr.csr_number,
        error,
        failedAt: new Date().toISOString(),
      },
      queueRow.attempts + 1,
    );

    return {
      status: "failed",
      queueItemId: String(queueRow.id),
      localCsrId,
      error,
    };
  }
}

export async function processNextPendingCsrCreate(): Promise<CsrSyncResult> {
  if (!canUseAndroidNativeSqlite() || !isOnline()) {
    return { status: "skipped" };
  }

  await bootstrapAppStorage();
  await bootstrapCsrOffline();

  const queueRows = await query<PendingCsrQueueRow>(
    `
      SELECT id, payload, status, attempts, created_at, updated_at
      FROM sync_queue
      WHERE status = 'pending' AND queue_key = 'csr.create'
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    `,
  );

  const queueRow = queueRows[0];
  if (!queueRow) {
    return { status: "skipped" };
  }

  return processCsrCreateQueueRow(queueRow);
}

export async function processCsrCreateQueueItem(
  queueItemId: string,
): Promise<{
  status: "synced" | "failed" | "skipped";
  queueItemId: string;
  localCsrId?: string;
  remoteCsrId?: string;
  error?: string;
}> {
  if (!canUseAndroidNativeSqlite() || !isOnline()) {
    return { status: "skipped", queueItemId };
  }

  await bootstrapAppStorage();
  await bootstrapCsrOffline();

  const queueRows = await query<PendingCsrQueueRow>(
    `
      SELECT id, payload, status, attempts, created_at, updated_at
      FROM sync_queue
      WHERE id = ?
        AND queue_key = 'csr.create'
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
    ...(await processCsrCreateQueueRow(queueRow)),
  };
}

export async function listPendingOrFailedCsrCreateQueueItems(): Promise<
  CsrCreateQueueItem[]
> {
  if (!canUseAndroidNativeSqlite()) {
    return [];
  }

  await bootstrapAppStorage();
  await bootstrapCsrOffline();

  const queueRows = await query<PendingCsrQueueRow>(
    `
      SELECT id, payload, status, attempts, created_at, updated_at
      FROM sync_queue
      WHERE queue_key = 'csr.create'
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

  const csrRows = localIds.length
    ? await query<Pick<LocalCsrRow, "id" | "csr_number" | "client_name">>(
        `
          SELECT id, csr_number, client_name
          FROM csrs_local
          WHERE id IN (${localIds.map(() => "?").join(", ")});
        `,
        localIds,
      )
    : [];
  const csrLookup = new Map(csrRows.map((csrRow) => [csrRow.id, csrRow]));

  return parsedRows.map(({ queueRow, payload }) => {
    const localCsr = payload.localId ? csrLookup.get(payload.localId) : null;

    return {
      id: String(queueRow.id),
      status: queueRow.status === "failed" ? "failed" : "pending",
      attempts: queueRow.attempts,
      localCsrId: payload.localId,
      csrNumber: localCsr?.csr_number || payload.csrNumber || undefined,
      clientName: localCsr?.client_name || undefined,
      error: payload.error || undefined,
      createdAt: queueRow.created_at,
      updatedAt: queueRow.updated_at,
    };
  });
}
