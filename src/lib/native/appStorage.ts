import { executeSet, initDatabase, query, run } from "./sqlite";

export type DeviceProfileRecord = {
  id: string;
  device_id: string | null;
  platform: string | null;
  app_version: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeviceProfileInput = {
  id?: string;
  deviceId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  lastSeenAt?: string | null;
};

export type SyncQueueRecord = {
  id: number;
  queue_key: string;
  payload: string | null;
  status: string;
  attempts: number;
  created_at: string;
  updated_at: string;
};

const DEFAULT_DEVICE_PROFILE_ID = "local_device";

let bootstrapPromise: Promise<void> | null = null;

function toIsoTimestamp(value?: string | null): string {
  return value ?? new Date().toISOString();
}

export async function bootstrapAppStorage(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = initDatabase().then(() =>
      executeSet([
        {
          statement: `
            CREATE TABLE IF NOT EXISTS app_meta (
              key TEXT PRIMARY KEY NOT NULL,
              value TEXT
            );
          `,
        },
        {
          statement: `
            CREATE TABLE IF NOT EXISTS device_profile (
              id TEXT PRIMARY KEY NOT NULL,
              device_id TEXT,
              platform TEXT,
              app_version TEXT,
              last_seen_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
          `,
        },
        {
          statement: `
            CREATE TABLE IF NOT EXISTS sync_queue (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              queue_key TEXT NOT NULL,
              payload TEXT,
              status TEXT NOT NULL DEFAULT 'pending',
              attempts INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
          `,
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created_at ON sync_queue (status, created_at);",
        },
      ]),
    );
  }

  return bootstrapPromise;
}

export async function setAppMetaValue(
  key: string,
  value: string | null,
): Promise<void> {
  await bootstrapAppStorage();
  await run(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    [key, value],
  );
}

export async function getAppMetaValue(key: string): Promise<string | null> {
  await bootstrapAppStorage();

  const rows = await query<{ value: string | null }>(
    "SELECT value FROM app_meta WHERE key = ? LIMIT 1;",
    [key],
  );

  return rows[0]?.value ?? null;
}

export async function upsertDeviceProfile(
  input: DeviceProfileInput = {},
): Promise<void> {
  await bootstrapAppStorage();

  const profileId = input.id ?? DEFAULT_DEVICE_PROFILE_ID;
  const existingRows = await query<
    Pick<DeviceProfileRecord, "created_at">
  >("SELECT created_at FROM device_profile WHERE id = ? LIMIT 1;", [
    profileId,
  ]);

  const now = new Date().toISOString();
  const createdAt = existingRows[0]?.created_at ?? now;

  await run(
    `
      INSERT INTO device_profile (
        id,
        device_id,
        platform,
        app_version,
        last_seen_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        device_id = excluded.device_id,
        platform = excluded.platform,
        app_version = excluded.app_version,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at;
    `,
    [
      profileId,
      input.deviceId ?? null,
      input.platform ?? null,
      input.appVersion ?? null,
      toIsoTimestamp(input.lastSeenAt),
      createdAt,
      now,
    ],
  );
}

export async function getDeviceProfile(
  id: string = DEFAULT_DEVICE_PROFILE_ID,
): Promise<DeviceProfileRecord | null> {
  await bootstrapAppStorage();

  const rows = await query<DeviceProfileRecord>(
    "SELECT * FROM device_profile WHERE id = ? LIMIT 1;",
    [id],
  );

  return rows[0] ?? null;
}

export async function enqueueSyncQueueItem(
  queueKey: string,
  payload: string | null = null,
): Promise<void> {
  await bootstrapAppStorage();

  const now = new Date().toISOString();

  await run(
    `
      INSERT INTO sync_queue (
        queue_key,
        payload,
        status,
        attempts,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'pending', 0, ?, ?);
    `,
    [queueKey, payload, now, now],
  );
}

export async function listPendingSyncQueueItems(): Promise<SyncQueueRecord[]> {
  await bootstrapAppStorage();

  return query<SyncQueueRecord>(
    `
      SELECT *
      FROM sync_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC, id ASC;
    `,
  );
}
