import { useCallback, useRef } from "react";
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
 * Row card wrapper with 400ms touch-hold to activate selection.
 * In selection mode: instant single tap toggles selection.
 * Outside selection mode: tap navigates, hold activates selection.
 * Single clean checkbox on left rail — no duplicates.
 */
export default function SelectableRowCard({
  id,
  isSelectionMode,
  isSelected,
  onSelect,
  onNavigate,
  children,
}: SelectableRowCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHold = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSelectionMode) return; // In selection mode, use click instead
      didHold.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        didHold.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(25);
        }
        onSelect(id);
      }, 400);
    },
    [id, isSelectionMode, onSelect]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > 8 || dy > 8) clearTimer();
  }, []);

  const handlePointerUp = useCallback(() => {
    clearTimer();
    if (isSelectionMode) return; // handled by onClick
    if (!didHold.current) {
      onNavigate();
    }
    startPos.current = null;
  }, [isSelectionMode, onNavigate]);

  const handlePointerCancel = useCallback(() => {
    clearTimer();
    startPos.current = null;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelectionMode) {
        e.preventDefault();
        return; // pointer handlers manage navigation
      }
      e.stopPropagation();
      onSelect(id);
    },
    [id, isSelectionMode, onSelect]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      className="relative flex items-center gap-0 cursor-pointer select-none touch-none"
    >
      {/* Single checkbox — 44px touch zone, only in selection mode */}
      {isSelectionMode && (
        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-200",
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
