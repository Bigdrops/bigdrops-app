import { supabase } from "../../supabase";

import {
  DeviceProfileRecord,
  getAppMetaValue,
  getDeviceProfile,
  setAppMetaValue,
  upsertDeviceProfile,
} from "./appStorage";
import { canUseAndroidNativeSqlite } from "./capacitor";

const INSTALLATION_ID_KEY = "installation_id";
const DEVICE_CODE_FORMAT = /^[A-Z]{2}$/;
const DEFAULT_DEVICE_NAME = "Android Device";

export type DeviceAssignmentRecord = {
  assignmentId: string;
  installationId: string;
  userId: string;
  platform: string;
  deviceCode: string;
  deviceName: string;
  active: boolean;
  assignedAt: string | null;
  assignedAutomatically: boolean;
  assignedBy: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

type EnsureAndroidDeviceAssignmentResponse = {
  id?: string | null;
  assignment_id?: string | null;
  installation_id?: string | null;
  user_id?: string | null;
  platform?: string | null;
  device_code?: string | null;
  device_name?: string | null;
  active?: boolean | null;
  assigned_at?: string | null;
  assigned_automatically?: boolean | null;
  assigned_by?: string | null;
  last_seen_at?: string | null;
  revoked_at?: string | null;
};

type CounterSeedRow = {
  device_code?: string | null;
  csr_max?: number | null;
  quotation_max?: number | null;
  waybill_max?: number | null;
};

function createInstallationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `android-installation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDeviceCode(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase();
}

function normalizeAssignment(
  raw: EnsureAndroidDeviceAssignmentResponse | null | undefined,
): DeviceAssignmentRecord | null {
  if (!raw) return null;

  const deviceCode = normalizeDeviceCode(raw.device_code);
  const installationId = String(raw.installation_id || "").trim();
  const userId = String(raw.user_id || "").trim();
  const assignmentId = String(raw.id || raw.assignment_id || "").trim();

  if (
    !assignmentId ||
    !installationId ||
    !userId ||
    !DEVICE_CODE_FORMAT.test(deviceCode)
  ) {
    return null;
  }

  return {
    assignmentId,
    installationId,
    userId,
    platform: String(raw.platform || "android").trim() || "android",
    deviceCode,
    deviceName: String(raw.device_name || DEFAULT_DEVICE_NAME).trim() || DEFAULT_DEVICE_NAME,
    active: raw.active !== false,
    assignedAt: raw.assigned_at ?? null,
    assignedAutomatically: raw.assigned_automatically !== false,
    assignedBy: raw.assigned_by ?? null,
    lastSeenAt: raw.last_seen_at ?? null,
    revokedAt: raw.revoked_at ?? null,
  };
}

function toDeviceAssignment(profile: DeviceProfileRecord | null): DeviceAssignmentRecord | null {
  if (!profile) return null;

  const deviceCode = normalizeDeviceCode(profile.device_code || profile.device_id);
  const installationId = String(profile.installation_id || "").trim();
  const userId = String(profile.user_id || "").trim();
  const assignmentId = String(profile.assignment_id || "").trim();

  if (
    !assignmentId ||
    !installationId ||
    !userId ||
    !profile.active ||
    !DEVICE_CODE_FORMAT.test(deviceCode)
  ) {
    return null;
  }

  return {
    assignmentId,
    installationId,
    userId,
    platform: String(profile.platform || "android").trim() || "android",
    deviceCode,
    deviceName: String(profile.device_name || DEFAULT_DEVICE_NAME).trim() || DEFAULT_DEVICE_NAME,
    active: Boolean(profile.active),
    assignedAt: profile.created_at ?? null,
    assignedAutomatically: true,
    assignedBy: null,
    lastSeenAt: profile.last_seen_at ?? null,
    revokedAt: null,
  };
}

export async function getOrCreateInstallationId(): Promise<string | null> {
  if (!canUseAndroidNativeSqlite()) {
    return null;
  }

  const existing = String((await getAppMetaValue(INSTALLATION_ID_KEY)) || "").trim();
  if (existing) {
    return existing;
  }

  const created = createInstallationId();
  await setAppMetaValue(INSTALLATION_ID_KEY, created);
  return created;
}

export async function getCachedDeviceAssignment(): Promise<DeviceAssignmentRecord | null> {
  if (!canUseAndroidNativeSqlite()) {
    return null;
  }

  return toDeviceAssignment(await getDeviceProfile());
}

export async function cacheDeviceAssignment(
  assignment: DeviceAssignmentRecord,
): Promise<void> {
  await upsertDeviceProfile({
    assignmentId: assignment.assignmentId,
    installationId: assignment.installationId,
    userId: assignment.userId,
    deviceId: assignment.deviceCode,
    deviceCode: assignment.deviceCode,
    deviceName: assignment.deviceName,
    active: assignment.active,
    platform: assignment.platform || "android",
    lastSeenAt: assignment.lastSeenAt ?? new Date().toISOString(),
  });
}

export async function requireAndroidDeviceAssignment(
  currentUserId?: string | null,
): Promise<DeviceAssignmentRecord> {
  if (!canUseAndroidNativeSqlite()) {
    throw new Error(
      "Offline document numbering is only available in the native Android app.",
    );
  }

  const assignment = await getCachedDeviceAssignment();

  if (!assignment || !assignment.active) {
    throw new Error(
      "No active Android device assignment is cached on this installation. Sign in online first.",
    );
  }

  if (currentUserId && assignment.userId !== currentUserId) {
    throw new Error(
      "This Android installation is assigned to a different user. Reconnect online and sign in again.",
    );
  }

  return assignment;
}

export async function ensureAndroidDeviceAssignment(args: {
  installationId: string;
  userId: string;
  deviceName?: string | null;
}): Promise<DeviceAssignmentRecord> {
  const { data, error } = await supabase.rpc("ensure_android_device_assignment", {
    p_installation_id: args.installationId,
    p_user_id: args.userId,
    p_device_name: args.deviceName || DEFAULT_DEVICE_NAME,
  });

  if (error) {
    throw error;
  }

  const normalized = normalizeAssignment(
    Array.isArray(data) ? (data[0] as EnsureAndroidDeviceAssignmentResponse) : (data as EnsureAndroidDeviceAssignmentResponse),
  );

  if (!normalized) {
    throw new Error("Backend returned an invalid Android device assignment.");
  }

  await cacheDeviceAssignment({
    ...normalized,
    lastSeenAt: new Date().toISOString(),
  });

  return {
    ...normalized,
    lastSeenAt: new Date().toISOString(),
  };
}

export async function seedOfflineCountersFromServer(
  assignment: DeviceAssignmentRecord,
): Promise<void> {
  try {
    const { data, error } = await supabase.rpc("get_device_code_counter_seeds", {
      p_installation_id: assignment.installationId,
      p_device_code: assignment.deviceCode,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as CounterSeedRow | undefined;
    if (!row) {
      return;
    }

    const updates: Array<Promise<void>> = [];
    const counters = [
      { key: `csr_counter_${assignment.deviceCode}`, value: Number(row.csr_max || 0) },
      {
        key: `quotation_counter_${assignment.deviceCode}`,
        value: Number(row.quotation_max || 0),
      },
      { key: `waybill_counter_${assignment.deviceCode}`, value: Number(row.waybill_max || 0) },
    ];

    for (const counter of counters) {
      const existing = Number((await getAppMetaValue(counter.key)) || 0);
      const nextValue = Math.max(existing, Number.isFinite(counter.value) ? counter.value : 0);
      updates.push(setAppMetaValue(counter.key, String(nextValue)));
    }

    await Promise.all(updates);
  } catch {
    // Counter seeding is best-effort only.
  }
}
