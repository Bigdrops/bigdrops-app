import { useState } from "react";
import { Check, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/supabase";
import { feedback } from "@/lib/feedback";

export type BatchAction = {
  key: string;
  label: string;
  variant?: "default" | "destructive";
  mutation: (ids: string[]) => Promise<void>;
};

interface BatchActionFooterProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onSuccess: () => void;
  actions: BatchAction[];
}

export default function BatchActionFooter({
  selectedIds,
  onClear,
  onSuccess,
  actions,
}: BatchActionFooterProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (selectedIds.size === 0) return null;

  const handleAction = async (action: BatchAction) => {
    setLoading(action.key);
    try {
      await action.mutation(Array.from(selectedIds));
      feedback.success(`${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""} updated`);
      onSuccess();
    } catch (err: any) {
      feedback.error(err?.message || "Batch action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900 px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3 shadow-2xl rounded-t-xl animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between gap-3">
        {/* Left: counter + cancel */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Cancel selection"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-white">
            {selectedIds.size} selected
          </span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const isLoading = loading === action.key;
            const isDisabled = loading !== null;
            return (
              <button
                key={action.key}
                type="button"
                disabled={isDisabled}
                onClick={() => handleAction(action)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold uppercase tracking-wider transition-all",
                  action.variant === "destructive"
                    ? "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-800"
                    : "bg-white text-slate-900 hover:bg-slate-100 disabled:bg-slate-600 disabled:text-slate-300"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : action.variant === "destructive" ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PRE-BUILT BATCH MUTATIONS ───────────────────────────────────────────

export function createInvoiceBatchActions(
  onRefresh: () => void
): BatchAction[] {
  return [
    {
      key: "mark-paid",
      label: "Mark Paid",
      mutation: async (ids) => {
        const { error } = await supabase
          .from("invoices")
          .update({ status: "paid" })
          .in("id", ids);
        if (error) throw error;
      },
    },
    {
      key: "mark-unpaid",
      label: "Mark Unpaid",
      mutation: async (ids) => {
        const { error } = await supabase
          .from("invoices")
          .update({ status: "unpaid" })
          .in("id", ids);
        if (error) throw error;
      },
    },
  ];
}

export function createArchiveBatchAction(
  table: string
): BatchAction {
  return {
    key: "archive",
    label: "Archive",
    variant: "destructive",
    mutation: async (ids) => {
      const { error } = await supabase
        .from(table)
        .update({ archived_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
  };
}
