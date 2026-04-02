import type { OfflineAccessState } from "../../lib/native/offlineAccess";

type OfflineAccessBlockedProps = {
  accessState: Extract<OfflineAccessState, { allowed: false }>;
};

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;

  const parsedDate = new Date(expiresAt);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate.toLocaleString();
}

export default function OfflineAccessBlocked({
  accessState,
}: OfflineAccessBlockedProps) {
  const formattedExpiry = formatExpiry(accessState.expiresAt);
  const message =
    accessState.reason === "missing_window"
      ? "Connect to the internet to complete your first online login on this device."
      : "Your 48-hour offline access window has expired. Reconnect to the internet to continue.";

  return (
    <div className="min-h-screen bg-background px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-muted-foreground">
          Offline access paused
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
          Internet connection required
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>

        {formattedExpiry ? (
          <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Offline window expired at {formattedExpiry}
          </p>
        ) : null}
      </div>
    </div>
  );
}
