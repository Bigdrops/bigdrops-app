import { supabase } from "../../supabase";

import { canUseAndroidNativeSqlite } from "./capacitor";
import { setAppMetaValue } from "./appStorage";
import {
  ensureAndroidDeviceAssignment,
  getOrCreateInstallationId,
  seedOfflineCountersFromServer,
} from "./deviceAssignment";

const OFFLINE_ACCESS_WINDOW_MS = 48 * 60 * 60 * 1000;

export type HydrateDeviceProfileArgs = {
  userId: string;
};

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function getOfflineAccessExpiry(lastOnlineAt: Date): string {
  return new Date(lastOnlineAt.getTime() + OFFLINE_ACCESS_WINDOW_MS).toISOString();
}

export async function hydrateLocalDeviceProfile(
  args: HydrateDeviceProfileArgs,
): Promise<void> {
  if (!args.userId || !isOnline() || !canUseAndroidNativeSqlite()) {
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
  const installationId = await getOrCreateInstallationId();
  if (!installationId) {
    return;
  }

  const assignment = await ensureAndroidDeviceAssignment({
    installationId,
    userId: args.userId,
    deviceName: "Android Device",
  });
  await seedOfflineCountersFromServer(assignment);

  await setAppMetaValue("last_online_at", lastOnlineAt.toISOString());
  await setAppMetaValue(
    "offline_access_expires_at",
    getOfflineAccessExpiry(lastOnlineAt),
  );
}
