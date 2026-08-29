import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck, Smartphone, AlertTriangle } from "lucide-react";
import {
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  checkBiometricAvailability,
  type BiometricAvailability,
} from "@/lib/native/biometric";
import { isNativePlatform } from "@/lib/native/capacitor";
import { SettingsSummaryCard, SettingsSummaryRow } from "@/components/settings/SettingsSummaryCard";
import { feedback } from "@/lib/feedback";

export function SecuritySettingsSection() {
  const [enabled, setEnabled] = useState(false);
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEnabled(isBiometricLockEnabled());

    if (!isNativePlatform()) {
      setAvailability({ available: false, reason: "not_native" });
      setLoading(false);
      return;
    }

    checkBiometricAvailability()
      .then(setAvailability)
      .catch(() => {
        setAvailability({ available: false, reason: "check_failed" });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = () => {
    if (!availability?.available) return;

    const next = !enabled;
    setEnabled(next);
    setBiometricLockEnabled(next);
    feedback.success(next ? "App lock enabled" : "App lock disabled");
  };

  const canToggle = isNativePlatform() && availability?.available === true;
  const showUnavailable = isNativePlatform() && !loading && !availability?.available;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Security
          </p>
        </div>
      </div>

      <SettingsSummaryCard
        title="App Lock"
        description="Require fingerprint or face verification when you open the app or return from background."
      >
        <div className="px-5 py-4">
          {/* Toggle row */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={!canToggle}
            className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
              enabled
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted)/0.1)]"
            } ${!canToggle ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  enabled
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Fingerprint size={20} />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-foreground">
                  Biometric App Lock
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {enabled ? "Active — app locked on launch and resume" : "Disabled"}
                </div>
              </div>
            </div>

            {/* Toggle indicator */}
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  enabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>

          {/* Unavailable notice */}
          {showUnavailable && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                {availability && !availability.available && "reason" in availability && availability.reason === "not_native"
                  ? "App lock is only available on the installed Android or iOS app."
                  : "No biometric hardware found or no fingerprints/face enrolled. Add a fingerprint or face unlock in your device settings first."}
              </div>
            </div>
          )}

          {/* Active info */}
          {enabled && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              <div className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                You will be prompted for biometric verification on app launch and
                when returning from background. If verification fails, you will be
                signed out and must log in again.
              </div>
            </div>
          )}
        </div>
      </SettingsSummaryCard>

      <SettingsSummaryCard
        title="How It Works"
        description="App lock protects access to your financial data on this device."
      >
        <SettingsSummaryRow
          label="Trigger"
          value="Cold launch and background resume"
          icon={<Smartphone size={16} />}
        />
        <SettingsSummaryRow
          label="Verification"
          value="Fingerprint, face, or iris — whatever the device supports"
          icon={<Fingerprint size={16} />}
        />
      </SettingsSummaryCard>
    </div>
  );
}
