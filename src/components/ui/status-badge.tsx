"use client";

import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge";
import { cn } from "@/lib/utils";

export type StatusBadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusBadgeTone = StatusBadgeVariant;

interface StatusBadgeProps {
  variant?: StatusBadgeVariant | StatusBadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  intensity?: "soft" | "solid";
  className?: string;
}

const PULSE_ENABLED_STATUSES = [
  "overdue",
  "failed",
  "missing",
  "untracked",
  "critical",
  "error",
  "rejected",
  "cancelled",
  "live",
  "syncing",
];

const variantToUnlumen: Record<StatusBadgeVariant, string> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

const variantTokenMap: Record<StatusBadgeVariant, { bg: string; text: string; border: string }> = {
  neutral: {
    bg: "hsl(var(--bd-surface-muted))",
    text: "hsl(var(--bd-text-muted))",
    border: "hsl(var(--bd-border))",
  },
  info: {
    bg: "hsl(var(--bd-status-info-bg))",
    text: "hsl(var(--bd-status-info-text))",
    border: "hsl(var(--bd-status-info-border))",
  },
  success: {
    bg: "hsl(var(--bd-status-success-bg))",
    text: "hsl(var(--bd-status-success-text))",
    border: "hsl(var(--bd-status-success-border))",
  },
  warning: {
    bg: "hsl(var(--bd-status-warning-bg))",
    text: "hsl(var(--bd-status-warning-text))",
    border: "hsl(var(--bd-status-warning-border))",
  },
  danger: {
    bg: "hsl(var(--bd-status-danger-bg))",
    text: "hsl(var(--bd-status-danger-text))",
    border: "hsl(var(--bd-status-danger-border))",
  },
};

function StatusBadge({
  variant = "neutral",
  children,
  dot = true,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const statusText = typeof children === "string" ? children.toLowerCase().trim() : "";
  const shouldPulse = PULSE_ENABLED_STATUSES.some(
    (status) => status === statusText || (status === "live" && statusText.includes("live"))
  ) || pulse;

  const normalizedVariant: StatusBadgeVariant = variant === "neutral" || variant === "info" || variant === "success" || variant === "warning" || variant === "danger" 
    ? variant 
    : "neutral";
  
const tokens = variantTokenMap[normalizedVariant];

  const badgeStyle: React.CSSProperties = {
    backgroundColor: tokens.bg,
    color: tokens.text,
    borderColor: tokens.border,
    borderWidth: "1px",
    borderStyle: "solid",
  };

  return (
    <GlowingBadge
      variant={variantToUnlumen[normalizedVariant] as "default" | "success" | "warning" | "error" | "info" | "neutral"}
      pulse={shouldPulse}
      dot={dot}
      className={cn("border", className)}
      style={badgeStyle}
    >
      {children}
    </GlowingBadge>
  );
}

export { StatusBadge };
export type { StatusBadgeProps };