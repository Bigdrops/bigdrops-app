import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";

interface SelectableRowCardProps {
  id: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onNavigate: () => void;
  children: React.ReactNode;
}

/**
 * Wraps any row card with long-press-to-select and tap-to-toggle behavior.
 * In selection mode: tap toggles selection.
 * Outside selection mode: tap navigates, long-press activates selection.
 */
export default function SelectableRowCard({
  id,
  isSelectionMode,
  isSelected,
  onSelect,
  onNavigate,
  children,
}: SelectableRowCardProps) {
  const handleLongPress = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  const handleClick = useCallback(() => {
    if (isSelectionMode) {
      onSelect(id);
    } else {
      onNavigate();
    }
  }, [id, isSelectionMode, onSelect, onNavigate]);

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delay: 500,
  });

  return (
    <div
      {...longPressHandlers}
      className={cn(
        "relative transition-all select-none",
        isSelectionMode && "pl-8"
      )}
    >
      {/* Selection checkbox indicator */}
      {isSelectionMode && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
              isSelected
                ? "border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))]"
                : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]"
            )}
          >
            {isSelected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
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
      {children}
    </div>
  );
}
