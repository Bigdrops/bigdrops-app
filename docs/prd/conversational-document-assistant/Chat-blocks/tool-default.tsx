"use client";

import { TerminalIcon } from "lucide-react";
import { useEffect, useState } from "react";

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
const QUESTION = "Which package managers are installed?";
const ANSWER = "Node 24 and npm 11 are installed. pnpm is not.";
const TOOLS = [
  { command: "node --version", failed: false, output: "v24.18.0" },
  { command: "npm --version", failed: false, output: "11.6.2" },
  {
    command: "pnpm --version",
    failed: true,
    output: "command not found: pnpm",
  },
];

// The stream: each command answers 900 ms after it starts, the next one
// starts at once, then the answer comes a word every 20 ms. Step n has the
// first n commands answered; after the last, the answer's words.
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const STEPS = TOOLS.length + ANSWER_WORDS.length;

const delayBefore = (step: number) => (step <= TOOLS.length ? 900 : 20);

function ToolRow({
  command,
  defaultOpen,
  done,
  failed,
  output,
  streaming,
}: {
  command: string;
  defaultOpen?: boolean;
  done: boolean;
  failed: boolean;
  output: string;
  streaming: boolean;
}) {
  if (done) {
    return (
      <TraceCollapsible defaultOpen={defaultOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={failed ? "error" : undefined}>
            <TraceIcon>
              <TerminalIcon aria-hidden="true" />
            </TraceIcon>
            <TraceTitle>
              {failed ? "Failed to run" : "Ran"} {command}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <CodeBlock size="sm">
            <CodeBlockContent className="max-h-64" wrap>
              {output}
            </CodeBlockContent>
          </CodeBlock>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    );
  }

  return (
    <TraceLine status={streaming ? "running" : "error"}>
      <TraceIcon>
        <TerminalIcon aria-hidden="true" />
      </TraceIcon>
      <TraceTitle>
        {streaming ? "Running" : "Failed to run"} {command}
      </TraceTitle>
    </TraceLine>
  );
}

export function ToolDemo() {
  // The whole turn at first; Replay streams it again from the start.
  const [step, setStep] = useState(STEPS);
  const [replayed, setReplayed] = useState(false);
  const busy = step < STEPS;

  useEffect(() => {
    if (step >= STEPS) {
      return;
    }
    const timer = setTimeout(() => setStep(step + 1), delayBefore(step + 1));
    return () => clearTimeout(timer);
  }, [step]);

  const tools = TOOLS.slice(0, Math.min(step + 1, TOOLS.length));
  const answer = ANSWER_WORDS.slice(0, Math.max(0, step - TOOLS.length)).join(
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
      <Message>
        <MessageContent className="gap-4">
          <Trace>
            {tools.map((tool, index) => (
              <ToolRow
                command={tool.command}
                // In the first transcript, the failed call starts open; in a
                // replay, each call starts closed, as it mounts mid-stream.
                defaultOpen={replayed ? undefined : tool.failed}
                done={index < step}
                failed={tool.failed}
                key={tool.command}
                output={tool.output}
                streaming={busy}
              />
            ))}
          </Trace>
          {answer.length > 0 ? <p>{answer}</p> : null}
        </MessageContent>
      </Message>
      {busy ? null : (
        <Button
          className="mt-auto self-start"
          onClick={() => {
            setReplayed(true);
            setStep(0);
          }}
          size="sm"
          variant="outline"
        >
          Replay
        </Button>
      )}
    </div>
  );
}
