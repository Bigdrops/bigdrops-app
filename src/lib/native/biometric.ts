import { isNativePlatform } from "./capacitor";

const BIOMETRIC_PREF_KEY = "bigdrops_biometric_lock";

// ---------------------------------------------------------------------------
// Preference helpers
// ---------------------------------------------------------------------------

export function isBiometricLockEnabled(): boolean {
  if (!isNativePlatform()) return false;
  try {
    return localStorage.getItem(BIOMETRIC_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

export function setBiometricLockEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(BIOMETRIC_PREF_KEY, "true");
    } else {
      localStorage.removeItem(BIOMETRIC_PREF_KEY);
    }
  } catch {
    // Storage unavailable — degrade silently.
  }
}

// ---------------------------------------------------------------------------
// Capability check
// ---------------------------------------------------------------------------

export type BiometricAvailability =
  | { available: true; biometryType: string }
  | { available: false; reason: string };

let cachedAvailability: BiometricAvailability | null = null;

/**
 * Check whether the device has biometric hardware and enrolled credentials.
 * Caches the result for the session lifetime — hardware state does not change
 * while the app is running.
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (cachedAvailability) return cachedAvailability;
  if (!isNativePlatform()) {
    cachedAvailability = { available: false, reason: "not_native" };
    return cachedAvailability;
  }

  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    const result = await NativeBiometric.isAvailable();

    if (result.isAvailable) {
      cachedAvailability = {
        available: true,
        biometryType: String(result.biometryType) ?? "unknown",
      };
    } else {
      cachedAvailability = {
        available: false,
        reason: String(result.biometryType) ?? "unavailable",
      };
    }
  } catch (error) {
    cachedAvailability = {
      available: false,
      reason: error instanceof Error ? error.message : "plugin_error",
    };
  }

  return cachedAvailability;
}

/**
 * Reset the cached availability. Call after enrollment state may have changed
 * (e.g. on app foreground after settings change).
 */
export function resetBiometricCache(): void {
  cachedAvailability = null;
}

// ---------------------------------------------------------------------------
// Identity verification
// ---------------------------------------------------------------------------

export type BiometricVerifyResult =
  | { success: true }
  | { success: false; canceled: boolean; error?: string };

/**
 * Prompt the user for biometric authentication.
 * Returns whether the verification succeeded.
 */
export async function verifyBiometricIdentity(): Promise<BiometricVerifyResult> {
  if (!isNativePlatform()) {
    return { success: false, canceled: true, error: "not_native" };
  }

  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({
      title: "BigDrops",
      subtitle: "Verify your identity to continue",
      reason: "Unlock BigDrops",
      negativeButtonText: "Cancel",
    });
    return { success: true };
  } catch (error: unknown) {
    // The plugin throws on cancel, lockout, and failure.
    const code = (error as { code?: number })?.code;
    const message = (error as { message?: string })?.message ?? "unknown";

    // Codes 11 (APP_CANCEL), 15 (SYSTEM_CANCEL), 16 (USER_CANCEL),
    // 17 (USER_FALLBACK) — treat as explicit cancel.
    const canceled = code === 11 || code === 15 || code === 16 || code === 17;

    return { success: false, canceled, error: message };
  }
}
