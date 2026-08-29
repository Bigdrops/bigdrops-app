import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  isBiometricLockEnabled,
  checkBiometricAvailability,
  verifyBiometricIdentity,
  resetBiometricCache,
} from "@/lib/native/biometric";
import { isNativePlatform } from "@/lib/native/capacitor";
import PageLoader from "@/components/app/PageLoader";

interface BiometricGateProps {
  /** When true, the gate is active and blocks children until biometric succeeds. */
  enabled: boolean;
  children: React.ReactNode;
  /** Called when biometric fails or user cancels — the parent should sign out. */
  onAuthFailure: () => void;
}

/**
 * BiometricGate
 *
 * Renders a loading state and prompts for biometric verification when:
 * - The app cold-launches with the lock enabled.
 * - The app resumes from background with the lock enabled.
 *
 * On biometric success, children render normally.
 * On biometric failure/cancel, calls onAuthFailure so the parent can sign out
 * and redirect to the login flow.
 */
export default function BiometricGate({
  enabled,
  children,
  onAuthFailure,
}: BiometricGateProps) {
  const [gated, setGated] = useState(true);
  const wasInBackground = useRef(false);
  const verifying = useRef(false);

  const runVerification = useCallback(
    async (reason: "launch" | "resume") => {
      if (verifying.current) return;
      verifying.current = true;

      try {
        // Re-check availability — user may have enrolled/removed biometrics
        // while in the background.
        resetBiometricCache();
        const availability = await checkBiometricAvailability();

        if (!availability.available) {
          // No biometric hardware or enrollment — fail through to login.
          onAuthFailure();
          return;
        }

        const result = await verifyBiometricIdentity();

        if (result.success) {
          setGated(false);
        } else {
          // Both cancel and genuine failure lead to sign-out.
          onAuthFailure();
        }
      } catch (error) {
        console.error("[BiometricGate] verification error:", error);
        onAuthFailure();
      } finally {
        verifying.current = false;
      }
    },
    [onAuthFailure],
  );

  // Cold launch verification
  useEffect(() => {
    if (!enabled || !isNativePlatform()) {
      setGated(false);
      return;
    }

    void runVerification("launch");
  }, [enabled, runVerification]);

  // Resume-from-background listener
  useEffect(() => {
    if (!enabled || !isNativePlatform()) return undefined;

    let cancelled = false;
    let listener: PluginListenerHandle | null = null;

    const setup = async () => {
      listener = await CapacitorApp.addListener(
        "appStateChange",
        async ({ isActive }) => {
          if (cancelled) return;

          if (!isActive) {
            // App going to background — mark it.
            wasInBackground.current = true;
            return;
          }

          // App coming to foreground.
          if (wasInBackground.current) {
            wasInBackground.current = false;
            setGated(true);
            await runVerification("resume");
          }
        },
      );
    };

    void setup();

    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [enabled, runVerification]);

  // Lock is disabled — render children immediately.
  if (!enabled) return <>{children}</>;

  // Gate is active — show loader until biometric succeeds.
  if (gated) return <PageLoader />;

  return <>{children}</>;
}
