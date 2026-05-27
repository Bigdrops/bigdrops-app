import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface SelectableRowCardProps {
  id: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onNavigate: () => void;
  children: React.ReactNode;
}

/**
 * Wraps any row card with instant tap-to-select behavior.
 * In selection mode: single tap toggles selection.
 * Outside selection mode: single tap navigates.
 * No gesture hooks, no long-press — clean single-tap only.
 */
export default function SelectableRowCard({
  id,
  isSelectionMode,
  isSelected,
  onSelect,
  onNavigate,
  children,
}: SelectableRowCardProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (isSelectionMode) {
        onSelect(id);
      } else {
        onNavigate();
      }
    },
    [id, isSelectionMode, onSelect, onNavigate]
  );

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative flex items-center gap-2 transition-all",
        isSelectionMode && "cursor-pointer"
      )}
    >
      {/* Single checkbox indicator on left margin */}
      {isSelectionMode && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
              isSelected
                ? "border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))]"
                : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]"
            )}
          >
            {isSelected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
