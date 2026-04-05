import { supabase } from "../../supabase";

import { canUseAndroidNativeSqlite } from "./capacitor";
import { getAppMetaValue } from "./appStorage";
import { getCachedDeviceAssignment, getOrCreateInstallationId } from "./deviceAssignment";

export type OfflineAccessState =
  | {
      allowed: true;
      expiresAt: string | null;
      reason: "online" | "within_window" | "not_native";
    }
  | {
      allowed: false;
      expiresAt: string | null;
      reason:
        | "expired_offline_window"
        | "missing_window"
        | "missing_assignment"
        | "user_mismatch";
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

export async function getOfflineAccessState(): Promise<OfflineAccessState> {
  if (!canUseAndroidNativeSqlite()) {
    return {
      allowed: true,
      expiresAt: null,
      reason: "not_native",
    };
  }

  const expiresAt = await getAppMetaValue("offline_access_expires_at");
  const installationId = await getOrCreateInstallationId();
  const assignment = await getCachedDeviceAssignment();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = String(session?.user?.id || "").trim();

  if (!installationId || !assignment || !assignment.active) {
    return {
      allowed: false,
      expiresAt: expiresAt ?? null,
      reason: "missing_assignment",
    };
  }

  if (currentUserId && assignment.userId !== currentUserId) {
    return {
      allowed: false,
      expiresAt: expiresAt ?? null,
      reason: "user_mismatch",
    };
  }

  if (isOnline()) {
    return {
      allowed: true,
      expiresAt,
      reason: "online",
    };
  }

  if (!isValidExpiryValue(expiresAt)) {
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
