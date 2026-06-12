import { canUseAndroidNativeSqlite } from "./capacitor";
import {
  bootstrapAppStorage,
  enqueueSyncQueueItem,
  getAppMetaValue,
  setAppMetaValue,
} from "./appStorage";
import { requireAndroidDeviceAssignment } from "./deviceAssignment";
import { getOfflineAccessState } from "./offlineAccess";
import { executeSet, run } from "./sqlite";

export type OfflineWaybillType = "internal" | "external";
export type OfflineWaybillStatus = "draft" | "dispatched" | "delivered";

export type CreateOfflineWaybillInput = {
  waybill_number?: string | null;
  type: OfflineWaybillType;
  date: string;
  time?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  receiver_signature_url?: string | null;
  receiver_description?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  project_id?: string | null;
  invoice_id?: string | null;
  po_number?: string | null;
  vehicle_plate?: string | null;
  delivery_location?: string | null;
  items: unknown[];
  notes?: string | null;
  status: OfflineWaybillStatus;
  created_by?: string | null;
  custom_fields?: string | Record<string, unknown> | null;
};

let waybillOfflineBootstrapPromise: Promise<void> | null = null;

function assertNativeOfflineContext(): void {
  if (!canUseAndroidNativeSqlite()) {
    throw new Error("Offline waybill drafts are only available in the native Android app.");
  }
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-waybill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDeviceCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

function getWaybillCounterKey(deviceCode: string): string {
  return `waybill_counter_${deviceCode}`;
}

function formatWaybillNumber(deviceCode: string, nextSequence: number): string {
  return `SASWB-${deviceCode}${String(nextSequence).padStart(3, "0")}`;
}

function parseSequenceFromWaybillNumber(
  waybillNumber: string,
  deviceCode: string,
): number | null {
  const prefix = `SASWB-${deviceCode}`;
  if (!waybillNumber.startsWith(prefix)) return null;

  const suffix = Number(waybillNumber.slice(prefix.length));
  return Number.isFinite(suffix) && suffix > 0 ? suffix : null;
}

function serializeJsonValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? null);
}

function isOfflineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function requireOfflineAccessWindow(): Promise<void> {
  const accessState = await getOfflineAccessState();

  if (!accessState.allowed) {
    throw new Error(
      "Offline access has expired on this device. Reconnect to the internet before creating a waybill.",
    );
  }
}

async function getAssignedDeviceCode(): Promise<string> {
  const assignment = await requireAndroidDeviceAssignment();
  const deviceCode = normalizeDeviceCode(assignment.deviceCode);
  if (!/^[A-Z]{2}$/.test(deviceCode)) {
    throw new Error(
      "No local device profile is available for offline waybill numbering. Sign in online first.",
    );
  }

  return deviceCode;
}

async function getCurrentWaybillCounter(deviceCode: string): Promise<number> {
  const storedValue = await getAppMetaValue(getWaybillCounterKey(deviceCode));
  const parsedValue = Number(storedValue || 0);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export async function bootstrapWaybillOffline(): Promise<void> {
  if (!waybillOfflineBootstrapPromise) {
    waybillOfflineBootstrapPromise = bootstrapAppStorage().then(() =>
      executeSet([
        {
          statement: `
            CREATE TABLE IF NOT EXISTS waybills_local (
              id TEXT PRIMARY KEY NOT NULL,
              waybill_number TEXT NOT NULL UNIQUE,
              type TEXT NOT NULL,
              date TEXT NOT NULL,
              time TEXT,
              sender_name TEXT,
              receiver_name TEXT,
              receiver_signature_url TEXT,
              receiver_description TEXT,
              client_id TEXT,
              client_name TEXT,
              project_id TEXT,
              invoice_id TEXT,
              po_number TEXT,
              vehicle_plate TEXT,
              delivery_location TEXT,
              items TEXT NOT NULL,
              notes TEXT,
              status TEXT NOT NULL,
              created_by TEXT,
              custom_fields TEXT,
              created_offline INTEGER NOT NULL DEFAULT 1,
              sync_status TEXT NOT NULL DEFAULT 'pending',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
          `,
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_waybills_local_sync_status ON waybills_local (sync_status, created_at);",
        },
      ]),
    );
  }

  return waybillOfflineBootstrapPromise;
}

export async function peekNextOfflineWaybillNumber(): Promise<string> {
  assertNativeOfflineContext();
  await requireOfflineAccessWindow();
  await bootstrapWaybillOffline();

  const deviceCode = await getAssignedDeviceCode();
  const currentSequence = await getCurrentWaybillCounter(deviceCode);

  return formatWaybillNumber(deviceCode, currentSequence + 1);
}

export async function createOfflineWaybillDraft(
  input: CreateOfflineWaybillInput,
): Promise<{
  id: string;
  waybillNumber: string;
}> {
  assertNativeOfflineContext();

  if (!isOfflineNow()) {
    throw new Error("Offline waybill draft creation should only run when the device is offline.");
  }

  await requireOfflineAccessWindow();
  await bootstrapWaybillOffline();

  const deviceCode = await getAssignedDeviceCode();
  const currentSequence = await getCurrentWaybillCounter(deviceCode);
  const preferredSequence = parseSequenceFromWaybillNumber(
    String(input.waybill_number || ""),
    deviceCode,
  );
  const nextSequence =
    preferredSequence && preferredSequence > currentSequence
      ? preferredSequence
      : currentSequence + 1;
  const waybillNumber = formatWaybillNumber(deviceCode, nextSequence);
  const id = createLocalId();
  const now = new Date().toISOString();

  await run(
    `
      INSERT INTO waybills_local (
        id,
        waybill_number,
        type,
        date,
        time,
        sender_name,
        receiver_name,
        receiver_signature_url,
        receiver_description,
        client_id,
        client_name,
        project_id,
        invoice_id,
        po_number,
        vehicle_plate,
        delivery_location,
        items,
        notes,
        status,
        created_by,
        custom_fields,
        created_offline,
        sync_status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?);
    `,
    [
      id,
      waybillNumber,
      input.type,
      input.date,
      input.time ?? null,
      input.sender_name ?? null,
      input.receiver_name ?? null,
      input.receiver_signature_url ?? null,
      input.receiver_description ?? null,
      input.client_id ?? null,
      input.client_name ?? null,
      input.project_id ?? null,
      input.invoice_id ?? null,
      input.po_number ?? null,
      input.vehicle_plate ?? null,
      input.delivery_location ?? null,
      serializeJsonValue(input.items),
      input.notes ?? null,
      input.status,
      input.created_by ?? null,
      serializeJsonValue(input.custom_fields ?? null),
      now,
      now,
    ],
  );

  await setAppMetaValue(getWaybillCounterKey(deviceCode), String(nextSequence));

  await enqueueSyncQueueItem(
    "waybill.create",
    JSON.stringify({
      entity: "waybill",
      action: "create",
      localId: id,
      waybillNumber,
    }),
  );

  return { id, waybillNumber };
}
