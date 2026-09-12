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
import LoadingTips from "@/components/loading/LoadingTips";

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
  // Mount-scoped guard: cold-launch verification runs exactly once per
  // enablement, regardless of parent re-renders or callback identity churn.
  const didLaunchVerification = useRef(false);

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

  // Latest-callback ref so effects below never depend on callback identity.
  // Parent re-renders must not retrigger verification on their own.
  const runVerificationRef = useRef(runVerification);
  runVerificationRef.current = runVerification;

  // Cold launch verification — explicitly one-shot per enablement.
  useEffect(() => {
    if (!enabled || !isNativePlatform()) {
      setGated(false);
      didLaunchVerification.current = false;
      return;
    }

    if (didLaunchVerification.current) return;
    didLaunchVerification.current = true;

    void runVerificationRef.current("launch");
  }, [enabled]);

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

          // Lifecycle events fired while our own verification prompt is on
          // screen belong to the native biometric sheet, not to the user
          // backgrounding the app. Ignore them so a successful scan cannot
          // relock the gate it just unlocked.
          if (verifying.current) return;

          if (!isActive) {
            // App going to background — mark it.
            wasInBackground.current = true;
            return;
          }

          // App coming to foreground.
          if (wasInBackground.current) {
            wasInBackground.current = false;
            setGated(true);
            await runVerificationRef.current("resume");
          }
        },
      );
    };

    void setup();

    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [enabled]);

  // Lock is disabled — render children immediately.
  if (!enabled) return <>{children}</>;

  // Gate is active — show loader until biometric succeeds. The native
  // sheet is system UI; the app background shares session guidance.
  if (gated)
    return (
      <PageLoader>
        <LoadingTips
          pathname={typeof window !== "undefined" ? window.location.pathname : "/"}
          active
        />
      </PageLoader>
    );

  return <>{children}</>;
}
