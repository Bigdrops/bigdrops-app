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

export type OfflineQuotationStatus = "draft" | "sent" | "accepted" | "rejected";

export type CreateOfflineQuotationInput = {
  quotation_number?: string | null;
  po_number?: string | null;
  quotation_title?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  project_id?: string | null;
  issue_date?: string | null;
  valid_until?: string | null;
  status?: OfflineQuotationStatus | string | null;
  notes?: string | null;
  terms?: string | null;
  workmanship?: number | string | null;
  transportation?: number | string | null;
  shipping?: number | string | null;
  discount?: number | string | null;
  vat?: number | string | null;
  wht?: number | string | null;
  subtotal?: number | string | null;
  install_rate_total?: number | string | null;
  total?: number | string | null;
  amount_in_words?: string | null;
  custom_fields?: string | Record<string, unknown> | null;
  items: unknown[];
};

let quotationOfflineBootstrapPromise: Promise<void> | null = null;

function assertNativeOfflineContext(): void {
  if (!canUseAndroidNativeSqlite()) {
    throw new Error("Offline quotation drafts are only available in the native Android app.");
  }
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-quotation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDeviceCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

function getQuotationCounterKey(deviceCode: string): string {
  return `quotation_counter_${deviceCode}`;
}

function formatQuotationNumber(deviceCode: string, nextSequence: number): string {
  return `SASQUO-${deviceCode}${String(nextSequence).padStart(3, "0")}`;
}

function parseSequenceFromQuotationNumber(
  quotationNumber: string,
  deviceCode: string,
): number | null {
  const prefix = `SASQUO-${deviceCode}`;
  if (!quotationNumber.startsWith(prefix)) return null;

  const suffix = Number(quotationNumber.slice(prefix.length));
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
      "Offline access has expired on this device. Reconnect to the internet before creating a quotation.",
    );
  }
}

async function getAssignedDeviceCode(): Promise<string> {
  const assignment = await requireAndroidDeviceAssignment();
  const deviceCode = normalizeDeviceCode(assignment.deviceCode);
  if (!/^[A-Z]{2}$/.test(deviceCode)) {
    throw new Error(
      "No local device profile is available for offline quotation numbering. Sign in online first.",
    );
  }

  return deviceCode;
}

async function getCurrentQuotationCounter(deviceCode: string): Promise<number> {
  const storedValue = await getAppMetaValue(getQuotationCounterKey(deviceCode));
  const parsedValue = Number(storedValue || 0);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export async function bootstrapQuotationOffline(): Promise<void> {
  if (!quotationOfflineBootstrapPromise) {
    quotationOfflineBootstrapPromise = bootstrapAppStorage().then(() =>
      executeSet([
        {
          statement: `
            CREATE TABLE IF NOT EXISTS quotations_local (
              id TEXT PRIMARY KEY NOT NULL,
              quotation_number TEXT NOT NULL UNIQUE,
              po_number TEXT,
              quotation_title TEXT,
              client_id TEXT,
              client_name TEXT,
              project_id TEXT,
              issue_date TEXT,
              valid_until TEXT,
              status TEXT NOT NULL DEFAULT 'draft',
              notes TEXT,
              terms TEXT,
              workmanship REAL NOT NULL DEFAULT 0,
              transportation REAL NOT NULL DEFAULT 0,
              shipping REAL NOT NULL DEFAULT 0,
              discount REAL NOT NULL DEFAULT 0,
              vat REAL NOT NULL DEFAULT 0,
              wht REAL NOT NULL DEFAULT 0,
              subtotal REAL NOT NULL DEFAULT 0,
              install_rate_total REAL NOT NULL DEFAULT 0,
              total REAL NOT NULL DEFAULT 0,
              amount_in_words TEXT,
              items_json TEXT NOT NULL,
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
            "CREATE INDEX IF NOT EXISTS idx_quotations_local_sync_status ON quotations_local (sync_status, created_at);",
        },
      ]),
    );
  }

  return quotationOfflineBootstrapPromise;
}

export async function peekNextOfflineQuotationNumber(): Promise<string> {
  assertNativeOfflineContext();
  await requireOfflineAccessWindow();
  await bootstrapQuotationOffline();

  const deviceCode = await getAssignedDeviceCode();
  const currentSequence = await getCurrentQuotationCounter(deviceCode);

  return formatQuotationNumber(deviceCode, currentSequence + 1);
}

export async function createOfflineQuotationDraft(
  input: CreateOfflineQuotationInput,
): Promise<{
  id: string;
  quotationNumber: string;
}> {
  assertNativeOfflineContext();

  if (!isOfflineNow()) {
    throw new Error("Offline quotation draft creation should only run when the device is offline.");
  }

  await requireOfflineAccessWindow();
  await bootstrapQuotationOffline();

  const deviceCode = await getAssignedDeviceCode();
  const currentSequence = await getCurrentQuotationCounter(deviceCode);
  const preferredSequence = parseSequenceFromQuotationNumber(
    String(input.quotation_number || ""),
    deviceCode,
  );
  const nextSequence =
    preferredSequence && preferredSequence > currentSequence
      ? preferredSequence
      : currentSequence + 1;
  const quotationNumber = formatQuotationNumber(deviceCode, nextSequence);
  const id = createLocalId();
  const now = new Date().toISOString();

  await run(
    `
      INSERT INTO quotations_local (
        id,
        quotation_number,
        po_number,
        quotation_title,
        client_id,
        client_name,
        project_id,
        issue_date,
        valid_until,
        status,
        notes,
        terms,
        workmanship,
        transportation,
        shipping,
        discount,
        vat,
        wht,
        subtotal,
        install_rate_total,
        total,
        amount_in_words,
        items_json,
        custom_fields,
        created_offline,
        sync_status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?);
    `,
    [
      id,
      quotationNumber,
      input.po_number ?? null,
      input.quotation_title ?? null,
      input.client_id ?? null,
      input.client_name ?? null,
      input.project_id ?? null,
      input.issue_date ?? null,
      input.valid_until ?? null,
      input.status || "draft",
      input.notes ?? null,
      input.terms ?? null,
      Number(input.workmanship || 0),
      Number(input.transportation || 0),
      Number(input.shipping || 0),
      Number(input.discount || 0),
      Number(input.vat || 0),
      Number(input.wht || 0),
      Number(input.subtotal || 0),
      Number(input.install_rate_total || 0),
      Number(input.total || 0),
      input.amount_in_words ?? null,
      serializeJsonValue(input.items),
      serializeJsonValue(input.custom_fields ?? null),
      now,
      now,
    ],
  );

  await setAppMetaValue(getQuotationCounterKey(deviceCode), String(nextSequence));

  await enqueueSyncQueueItem(
    "quotation.create",
    JSON.stringify({
      entity: "quotation",
      action: "create",
      localId: id,
      quotationNumber,
    }),
  );

  return { id, quotationNumber };
}
