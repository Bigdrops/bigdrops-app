import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";

const usage = {
  input: 8420,
  limit: 128_000,
  output: 2240,
  reasoning: 980,
};

// Counted the AI SDK's way: `output` already includes the `reasoning`
// tokens, so the total leaves them out.
const used = usage.input + usage.output;
const percent = Math.round((used / usage.limit) * 100);

const TRAILING_ZERO = /\.0$/;

function formatTokens(value: number) {
  if (value < 1000) {
    return String(value);
  }

  return `${(value / 1000).toFixed(1).replace(TRAILING_ZERO, "")}k`;
}

const rows = [
  { label: "Input", value: usage.input },
  { label: "Output", value: usage.output },
  // A part of Output, so it sits under it rather than beside it.
  { inset: true, label: "Reasoning", value: usage.reasoning },
];

export function ContextDemo() {
  return (
    <div className="flex justify-center py-12">
      <HoverCard closeDelay={100} openDelay={10}>
        <HoverCardTrigger asChild>
          <Button size="sm" variant="outline">
            {percent}% context
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="flex w-64 flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Context</span>
            <span className="text-muted-foreground">
              {formatTokens(used)} / {formatTokens(usage.limit)}
            </span>
          </div>
          <Progress aria-label="Context used" value={percent} />
          <div className="flex flex-col gap-1 text-sm">
            {rows.map((row) => (
              <div className="flex justify-between gap-3" key={row.label}>
                <span
                  className={
                    row.inset
                      ? "ps-3 text-muted-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {row.label}
                </span>
                <span>{formatTokens(row.value)}</span>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
