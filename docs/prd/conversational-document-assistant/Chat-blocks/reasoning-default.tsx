"use client";

import { useEffect, useState } from "react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Message, MessageContent } from "@/components/ui/message";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

const WORD = /\S+\s*/g;
const QUESTION = "Why is the checkout deploy so slow?";
const REASONING =
  "The deploy log has three phases. Install takes 38s and next build takes 52s, both normal for this repo.\n\nImage optimization takes 3m 50s. It reruns on every deploy because its cache key includes the commit hash, so the cache never hits.";
const ANSWER =
  "Image optimization is the bottleneck. Key its cache on the lockfile and the image directory instead of the commit hash, and the deploy should take under two minutes.";

// The stream, a word at a time: the reasoning every 40 ms, a 400 ms pause,
// then the answer every 20 ms. Step 0 is the question alone; from step 1
// the reply is there, with the first step - 1 words of its reasoning; at
// REASONING_END the reasoning is done; after it, the answer's words.
const REASONING_WORDS = REASONING.match(WORD) ?? [REASONING];
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const REASONING_END = REASONING_WORDS.length + 1;
const STEPS = REASONING_END + ANSWER_WORDS.length;

const delayBefore = (step: number) => {
  if (step === 1) {
    return 0;
  }
  if (step <= REASONING_END) {
    return 40;
  }
  return step === REASONING_END + 1 ? 420 : 20;
};

function ReasoningRow({
  defaultOpen,
  running,
  text,
}: {
  defaultOpen?: boolean;
  running: boolean;
  text: string;
}) {
  // Undefined until the reader opens or closes it: till then, it follows `running`.
  const [open, setOpen] = useState<boolean | undefined>(defaultOpen);

  const line = (
    <TraceLine status={running ? "running" : undefined}>
      <TraceTitle>{running ? "Thinking" : "Thought"}</TraceTitle>
    </TraceLine>
  );

  if (text.length === 0) {
    return line;
  }

  return (
    <TraceCollapsible
      onOpenChange={setOpen}
      open={open === undefined ? running : open}
    >
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">
        {text}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

export function ReasoningDemo() {
  // The whole turn at first, its reasoning open; Replay streams it again.
  const [step, setStep] = useState(STEPS);
  const busy = step < STEPS;

  useEffect(() => {
    if (step >= STEPS) {
      return;
    }
    const timer = setTimeout(() => setStep(step + 1), delayBefore(step + 1));
    return () => clearTimeout(timer);
  }, [step]);

  const reasoning = REASONING_WORDS.slice(0, Math.max(0, step - 1)).join("");
  const answer = ANSWER_WORDS.slice(0, Math.max(0, step - REASONING_END)).join(
    ""
  );

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
              <ReasoningRow
                defaultOpen={busy ? undefined : true}
                running={busy && step < REASONING_END}
                text={reasoning}
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
