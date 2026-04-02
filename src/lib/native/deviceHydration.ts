import { supabase } from "../../supabase";

import { canUseNativeSqlite, isAndroidNative } from "./capacitor";
import { setAppMetaValue, upsertDeviceProfile } from "./appStorage";

const OFFLINE_ACCESS_WINDOW_MS = 48 * 60 * 60 * 1000;

export type HydrateDeviceProfileArgs = {
  userId: string;
};

type RemoteDeviceAssignment = {
  device_code: string;
  user_id: string | null;
};

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function getOfflineAccessExpiry(lastOnlineAt: Date): string {
  return new Date(lastOnlineAt.getTime() + OFFLINE_ACCESS_WINDOW_MS).toISOString();
}

async function fetchAssignedDevice(
  userId: string,
): Promise<RemoteDeviceAssignment | null> {
  // Assumption: one active row in `devices` is assigned to the current user via `user_id`.
  const { data, error } = await supabase
    .from("devices")
    .select("device_code,user_id")
    .eq("user_id", userId)
    .order("device_code", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function hydrateLocalDeviceProfile(
  args: HydrateDeviceProfileArgs,
): Promise<void> {
  if (!args.userId || !isOnline() || !canUseNativeSqlite()) {
    return;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (session?.user?.id !== args.userId) {
    return;
  }

  const lastOnlineAt = new Date();
  const assignedDevice = await fetchAssignedDevice(args.userId);

  await upsertDeviceProfile({
    id: args.userId,
    deviceId: assignedDevice?.device_code ?? null,
    platform: isAndroidNative() ? "android" : "native",
    appVersion: null,
    lastSeenAt: lastOnlineAt.toISOString(),
  });

  await setAppMetaValue("last_online_at", lastOnlineAt.toISOString());
  await setAppMetaValue(
    "offline_access_expires_at",
    getOfflineAccessExpiry(lastOnlineAt),
  );
}
