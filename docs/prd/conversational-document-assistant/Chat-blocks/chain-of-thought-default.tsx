"use client";

import {
  ArrowUpRightIcon,
  CircleCheckIcon,
  GlobeIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  CodeBlock,
  CodeBlockContent,
} from "@/components/ui/code-block";
import { Message, MessageContent } from "@/components/ui/message";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

const WORD = /\S+\s*/g;
const QUESTION = "Why is the checkout deploy so slow?";
const LOG = "install    41s\ncompile    38s\nimages   3m 52s";
const RESULTS = [
  {
    title: "Image component | nextjs.org",
    url: "https://nextjs.org/docs/app/api-reference/components/image",
  },
  {
    title: "Build cache | vercel.com",
    url: "https://vercel.com/docs/deployments/troubleshoot-a-build",
  },
];
const FILES = ["next.config.ts", "scripts/optimize-images.ts"];
const ANSWER =
  "Image optimization takes almost four minutes because its cache key includes the commit hash. Key it on the image directory instead.";

// The stream: three tool calls, each answering 900 ms after it starts, the
// next one starting at once; then the answer, a word every 20 ms. Step 0 is
// the question alone; at step n (1 to 3) the nth call runs and the ones
// before it are done; at TOOLS_END all three are; after it, the answer.
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const TOOLS = 3;
const TOOLS_END = TOOLS + 1;
const STEPS = TOOLS_END + ANSWER_WORDS.length;

const delayBefore = (step: number) => {
  if (step === 1) {
    return 0;
  }
  return step <= TOOLS_END ? 900 : 20;
};

function StatusIcon({ running }: { running: boolean }) {
  if (running) {
    return (
      <LoaderCircleIcon
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
    );
  }

  return <CircleCheckIcon aria-hidden="true" />;
}

function Step({
  children,
  defaultOpen,
  done,
  title,
}: {
  children?: ReactNode;
  defaultOpen?: boolean;
  done: boolean;
  title: string;
}) {
  const line = (
    <TraceLine status={done ? undefined : "running"}>
      <TraceIcon>
        <StatusIcon running={!done} />
      </TraceIcon>
      <TraceTitle>{title}</TraceTitle>
    </TraceLine>
  );

  // A step has nothing to open until its output arrives.
  if (!done) {
    return line;
  }

  return (
    <TraceCollapsible defaultOpen={defaultOpen}>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>{children}</TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

function ChainOfThought({ running, step }: { running: boolean; step: number }) {
  // Undefined until the reader opens or closes the summary: till then, it
  // is open while the steps run.
  const [open, setOpen] = useState<boolean | undefined>(undefined);
  const steps = Math.min(step, TOOLS);

  return (
    <Trace>
      <TraceCollapsible
        onOpenChange={setOpen}
        open={open === undefined ? running : open}
      >
        <TraceCollapsibleTrigger>
          <TraceLine status={running ? "running" : undefined}>
            <TraceIcon>
              <StatusIcon running={running} />
            </TraceIcon>
            <TraceTitle>
              {running ? "Researching" : `Researched in ${steps} steps`}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent keepMounted>
          <Trace>
            <Step
              defaultOpen
              done={step > 1}
              title={`${step > 1 ? "Read" : "Reading"} the build log for dpl_8Kx2`}
            >
              <CodeBlock size="sm">
                <CodeBlockContent className="max-h-64" wrap>
                  {LOG}
                </CodeBlockContent>
              </CodeBlock>
            </Step>
            {step > 1 ? (
              <Step
                done={step > 2}
                title={`${step > 2 ? "Searched" : "Searching"} the web for next.js image cache key`}
              >
                <Trace>
                  {RESULTS.map((result) => (
                    <a
                      href={result.url}
                      key={result.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <TraceLine>
                        <TraceIcon>
                          <GlobeIcon aria-hidden="true" />
                        </TraceIcon>
                        <TraceTitle>
                          {result.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </TraceTitle>
                        <TraceIcon>
                          <ArrowUpRightIcon
                            aria-hidden="true"
                            className="rtl:-scale-x-100"
                          />
                        </TraceIcon>
                      </TraceLine>
                    </a>
                  ))}
                </Trace>
              </Step>
            ) : null}
            {step > 2 ? (
              <Step
                done={step > 3}
                title={`${step > 3 ? "Searched" : "Searching"} the code for cacheKey`}
              >
                <div className="flex flex-wrap gap-1.5">
                  {FILES.map((file) => (
                    <Badge className="font-mono" key={file} variant="secondary">
                      {file}
                    </Badge>
                  ))}
                </div>
              </Step>
            ) : null}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

export function ChainOfThoughtDemo() {
  // The whole turn at first; Replay streams it again from the start.
  const [step, setStep] = useState(STEPS);
  const busy = step < STEPS;

  useEffect(() => {
    if (step >= STEPS) {
      return;
    }
    const timer = setTimeout(() => setStep(step + 1), delayBefore(step + 1));
    return () => clearTimeout(timer);
  }, [step]);

  const answer = ANSWER_WORDS.slice(0, Math.max(0, step - TOOLS_END)).join("");

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
            <ChainOfThought running={busy && answer.length === 0} step={step} />
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
