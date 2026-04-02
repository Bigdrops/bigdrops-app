import { canUseNativeSqlite } from "./capacitor";
import { getAppMetaValue } from "./appStorage";
import { query } from "./sqlite";

export type OfflineAccessState =
  | {
      allowed: true;
      expiresAt: string | null;
      reason: "online" | "within_window" | "not_native";
    }
  | {
      allowed: false;
      expiresAt: string | null;
      reason: "expired_offline_window" | "missing_window";
    };

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function isValidFutureExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return false;

  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;

  return expiresAtMs > Date.now();
}

function isValidExpiryValue(expiresAt: string | null): boolean {
  return Boolean(expiresAt) && !Number.isNaN(Date.parse(String(expiresAt)));
}

async function hasLocalDeviceProfile(): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM device_profile ORDER BY updated_at DESC LIMIT 1;",
  );

  return Boolean(rows[0]?.id);
}

export async function getOfflineAccessState(): Promise<OfflineAccessState> {
  if (!canUseNativeSqlite()) {
    return {
      allowed: true,
      expiresAt: null,
      reason: "not_native",
    };
  }

  const expiresAt = await getAppMetaValue("offline_access_expires_at");

  if (isOnline()) {
    return {
      allowed: true,
      expiresAt,
      reason: "online",
    };
  }

  const hasProfile = await hasLocalDeviceProfile();
  if (!hasProfile || !isValidExpiryValue(expiresAt)) {
    return {
      allowed: false,
      expiresAt: expiresAt ?? null,
      reason: "missing_window",
    };
  }

  if (!isValidFutureExpiry(expiresAt)) {
    return {
      allowed: false,
      expiresAt,
      reason: "expired_offline_window",
    };
  }

  return {
    allowed: true,
    expiresAt,
    reason: "within_window",
  };
}
