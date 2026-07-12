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

export type CreateOfflineCsrInput = {
  csr_number?: string | null;
  date: string;
  client_id?: string | null;
  client_name?: string | null;
  call_type?: string | null;
  service_basis?: string | null;
  system_down?: string | null;
  address?: string | null;
  problem_reported?: string | null;
  equipment_type?: string | null;
  equipment_location?: string | null;
  make?: string | null;
  model?: string | null;
  serial_no?: string | null;
  engine_no?: string | null;
  capacity?: string | null;
  voltage?: string | null;
  frequency?: string | null;
  battery?: string | null;
  temperature?: string | null;
  pressure?: string | null;
  hours?: string | null;
  materials_used?: string | null;
  service_rendered?: string | null;
  defects_found?: string | null;
  engineer_remarks?: string | null;
  status?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  customer_feedback?: string | null;
  acknowledgement_name?: string | null;
  technician_signatory_id?: string | null;
  linked_invoice_id?: string | null;
  show_po?: boolean | null;
  po_number?: string | null;
};

let csrOfflineBootstrapPromise: Promise<void> | null = null;

function assertNativeOfflineContext(): void {
  if (!canUseAndroidNativeSqlite()) {
    throw new Error("Offline CSR drafts are only available in the native Android app.");
  }
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-csr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDeviceCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

function getCsrCounterKey(deviceCode: string): string {
  return `csr_counter_${deviceCode}`;
}

function formatCsrNumber(deviceCode: string, nextSequence: number): string {
  return `SASCSR-${deviceCode}${String(nextSequence).padStart(3, "0")}`;
}

function parseSequenceFromCsrNumber(
  csrNumber: string,
  deviceCode: string,
): number | null {
  const prefix = `SASCSR-${deviceCode}`;
  if (!csrNumber.startsWith(prefix)) return null;

  const suffix = Number(csrNumber.slice(prefix.length));
  return Number.isFinite(suffix) && suffix > 0 ? suffix : null;
}

function isOfflineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function requireOfflineAccessWindow(): Promise<void> {
  const accessState = await getOfflineAccessState();

  if (!accessState.allowed) {
    throw new Error(
      "Offline access has expired on this device. Reconnect to the internet before creating a CSR.",
    );
  }
}

async function getAssignedDeviceCode(): Promise<string> {
  const assignment = await requireAndroidDeviceAssignment();
  const deviceCode = normalizeDeviceCode(assignment.deviceCode);
  if (!/^[A-Z]{2}$/.test(deviceCode)) {
    throw new Error(
      "No local device profile is available for offline CSR numbering. Sign in online first.",
    );
  }

  return deviceCode;
}

async function getCurrentCsrCounter(deviceCode: string): Promise<number> {
  const storedValue = await getAppMetaValue(getCsrCounterKey(deviceCode));
  const parsedValue = Number(storedValue || 0);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export async function bootstrapCsrOffline(): Promise<void> {
  if (!csrOfflineBootstrapPromise) {
    csrOfflineBootstrapPromise = bootstrapAppStorage().then(() =>
      executeSet([
        {
          statement: `
            CREATE TABLE IF NOT EXISTS csrs_local (
              id TEXT PRIMARY KEY NOT NULL,
              csr_number TEXT NOT NULL UNIQUE,
              date TEXT NOT NULL,
              client_id TEXT,
              client_name TEXT,
              call_type TEXT,
              service_basis TEXT,
              system_down TEXT,
              address TEXT,
              problem_reported TEXT,
              equipment_type TEXT,
              equipment_location TEXT,
              make TEXT,
              model TEXT,
              serial_no TEXT,
              engine_no TEXT,
              capacity TEXT,
              voltage TEXT,
              frequency TEXT,
              battery TEXT,
              temperature TEXT,
              pressure TEXT,
              hours TEXT,
              materials_used TEXT,
              service_rendered TEXT,
              defects_found TEXT,
              engineer_remarks TEXT,
              status TEXT,
              start_date TEXT,
              start_time TEXT,
              end_date TEXT,
              end_time TEXT,
              customer_feedback TEXT,
              acknowledgement_name TEXT,
              technician_signatory_id TEXT,
              linked_invoice_id TEXT,
              show_po INTEGER NOT NULL DEFAULT 0,
              po_number TEXT,
              created_offline INTEGER NOT NULL DEFAULT 1,
              sync_status TEXT NOT NULL DEFAULT 'pending',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
          `,
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_csrs_local_sync_status ON csrs_local (sync_status, created_at);",
        },
      ]),
    );
  }

  return csrOfflineBootstrapPromise;
}

export async function peekNextOfflineCsrNumber(): Promise<string> {
  assertNativeOfflineContext();
  await requireOfflineAccessWindow();
  await bootstrapCsrOffline();

  const deviceCode = await getAssignedDeviceCode();
  const currentSequence = await getCurrentCsrCounter(deviceCode);

  return formatCsrNumber(deviceCode, currentSequence + 1);
}

export async function createOfflineCsrDraft(
  input: CreateOfflineCsrInput,
): Promise<{
  id: string;
  csrNumber: string;
}> {
  assertNativeOfflineContext();

  if (!isOfflineNow()) {
    throw new Error("Offline CSR draft creation should only run when the device is offline.");
  }

  await requireOfflineAccessWindow();
  await bootstrapCsrOffline();

  const deviceCode = await getAssignedDeviceCode();
  const currentSequence = await getCurrentCsrCounter(deviceCode);
  const preferredSequence = parseSequenceFromCsrNumber(
    String(input.csr_number || ""),
    deviceCode,
  );
  const nextSequence =
    preferredSequence && preferredSequence > currentSequence
      ? preferredSequence
      : currentSequence + 1;
  const csrNumber = formatCsrNumber(deviceCode, nextSequence);
  const id = createLocalId();
  const now = new Date().toISOString();

  await run(
    `
      INSERT INTO csrs_local (
        id,
        csr_number,
        date,
        client_id,
        client_name,
        call_type,
        service_basis,
        system_down,
        address,
        problem_reported,
        equipment_type,
        equipment_location,
        make,
        model,
        serial_no,
        engine_no,
        capacity,
        voltage,
        frequency,
        battery,
        temperature,
        pressure,
        hours,
        materials_used,
        service_rendered,
        defects_found,
        engineer_remarks,
        status,
        start_date,
        start_time,
        end_date,
        end_time,
        customer_feedback,
        acknowledgement_name,
        technician_signatory_id,
        linked_invoice_id,
        show_po,
        po_number,
        created_offline,
        sync_status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?);
    `,
    [
      id,
      csrNumber,
      input.date,
      input.client_id ?? null,
      input.client_name ?? null,
      input.call_type ?? null,
      input.service_basis ?? null,
      input.system_down ?? null,
      input.address ?? null,
      input.problem_reported ?? null,
      input.equipment_type ?? null,
      input.equipment_location ?? null,
      input.make ?? null,
      input.model ?? null,
      input.serial_no ?? null,
      input.engine_no ?? null,
      input.capacity ?? null,
      input.voltage ?? null,
      input.frequency ?? null,
      input.battery ?? null,
      input.temperature ?? null,
      input.pressure ?? null,
      input.hours ?? null,
      input.materials_used ?? null,
      input.service_rendered ?? null,
      input.defects_found ?? null,
      input.engineer_remarks ?? null,
      input.status ?? null,
      input.start_date ?? null,
      input.start_time ?? null,
      input.end_date ?? null,
      input.end_time ?? null,
      input.customer_feedback ?? null,
      input.acknowledgement_name ?? null,
      input.technician_signatory_id ?? null,
      input.linked_invoice_id ?? null,
      input.show_po ? 1 : 0,
      input.po_number ?? null,
      now,
      now,
    ],
  );

  await setAppMetaValue(getCsrCounterKey(deviceCode), String(nextSequence));

  await enqueueSyncQueueItem(
    "csr.create",
    JSON.stringify({
      entity: "csr",
      action: "create",
      localId: id,
      csrNumber,
    }),
  );

  return { id, csrNumber };
}
