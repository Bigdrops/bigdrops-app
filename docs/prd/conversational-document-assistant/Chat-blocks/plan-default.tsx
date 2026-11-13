"use client";

import {
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  RouteIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Message, MessageContent } from "@/components/ui/message";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

const WORD = /\S+\s*/g;
const QUESTION = "Migrate the dialog components to Base UI.";
const TITLE = "Plan: migrate to Base UI";
const STEPS = [
  "Install @base-ui/react",
  "Replace the Radix imports",
  "Rename asChild to render",
  "Run the type checker",
];
const ANSWER = "Migrated Dialog and AlertDialog. The type checker passes.";

// The stream: the plan, then the same plan again every 1.2 s with one more
// step done; then the answer, a word every 20 ms. Step 0 is the question
// alone; at step n (1 to 5) the plan has n - 1 steps done, the next one
// running; after PLAN_END, the answer's words.
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const PLAN_END = STEPS.length + 1;
const END = PLAN_END + ANSWER_WORDS.length;

const delayBefore = (step: number) => {
  if (step === 1) {
    return 0;
  }
  return step <= PLAN_END ? 1200 : 20;
};

/** A step's line status: pending until it starts, running while it streams. */
const stepStatus = (index: number, done: number, streaming: boolean) => {
  if (index > done) {
    return "pending";
  }
  return streaming && index === done ? "running" : undefined;
};

function StepIcon({ done, index }: { done: number; index: number }) {
  if (index < done) {
    return <CircleCheckIcon aria-hidden="true" />;
  }
  if (index === done) {
    return <CircleDotIcon aria-hidden="true" />;
  }
  return <CircleIcon aria-hidden="true" />;
}

/** The icon's state in words: TraceIcon hides the icon from screen readers. */
function StepState({ done, index }: { done: number; index: number }) {
  if (index < done) {
    return <span className="sr-only">Done: </span>;
  }
  if (index === done) {
    return <span className="sr-only">In progress: </span>;
  }
  return <span className="sr-only">Not started: </span>;
}

function PlanRow({ done, streaming }: { done: number; streaming: boolean }) {
  const running = streaming && done < STEPS.length;

  return (
    <TraceCollapsible defaultOpen>
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>
            <RouteIcon aria-hidden="true" />
          </TraceIcon>
          <TraceTitle>{TITLE}</TraceTitle>
          <TraceDescription>
            {done} of {STEPS.length} done
          </TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {STEPS.map((title, index) => (
            <TraceLine key={title} status={stepStatus(index, done, streaming)}>
              <TraceIcon>
                <StepIcon done={done} index={index} />
              </TraceIcon>
              <TraceTitle>
                <StepState done={done} index={index} />
                {title}
              </TraceTitle>
            </TraceLine>
          ))}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

export function PlanDemo() {
  // The whole turn at first; Replay streams it again from the start.
  const [step, setStep] = useState(END);
  const busy = step < END;

  useEffect(() => {
    if (step >= END) {
      return;
    }
    const timer = setTimeout(() => setStep(step + 1), delayBefore(step + 1));
    return () => clearTimeout(timer);
  }, [step]);

  const answer = ANSWER_WORDS.slice(0, Math.max(0, step - PLAN_END)).join("");

  return (
    <div className="flex min-h-72 w-full max-w-sm flex-col gap-4 py-6 text-sm">
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>{QUESTION}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      {step > 0 ? (
        <Message>
          <MessageContent className="gap-4">
            <Trace>
              <PlanRow
                done={Math.min(step - 1, STEPS.length)}
                streaming={busy}
              />
            </Trace>
            {answer.length > 0 ? <p>{answer}</p> : null}
          </MessageContent>
        </Message>
      ) : null}
      {busy ? null : (
        <Button
          className="mt-auto self-start"
          onClick={() => setStep(0)}
          size="sm"
          variant="outline"
        >
          Replay
        </Button>
      )}
    </div>
  );
}
