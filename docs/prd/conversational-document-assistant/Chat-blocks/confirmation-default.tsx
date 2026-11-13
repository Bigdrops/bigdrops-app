"use client";

import { CircleCheckIcon, LoaderCircleIcon, TerminalIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
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
const QUESTION = "Clean up the build folder.";
const REASONING =
  "The build output lives in dist. Deleting it cannot be undone, so I should ask before I run the command.";
const COMMAND = "rm -rf dist";
const ANSWERS = {
  approved: "Removed the dist folder.",
  denied: "Okay, I left the dist folder in place.",
};

// The stream: 600 ms after the question, the reasoning a word every 20 ms,
// then 400 ms, then the approval request, where it stops for an answer.
// After the answer, the call resolves, and 600 ms later the reply streams a
// word every 20 ms. Step n has the first n words of the reasoning; at
// REASONING_END it's done; at ASK the request shows; at RESOLVED the call
// has run or been denied; after it, the reply's words.
const REASONING_WORDS = REASONING.match(WORD) ?? [REASONING];
const REASONING_END = REASONING_WORDS.length + 1;
const ASK = REASONING_END + 1;
const RESOLVED = ASK + 1;

const delayBefore = (step: number) => {
  if (step === 1) {
    return 620;
  }
  if (step < REASONING_END) {
    return 20;
  }
  if (step === REASONING_END) {
    return 0;
  }
  if (step === ASK) {
    return 400;
  }
  return step === RESOLVED + 1 ? 620 : 20;
};

function ReasoningRow({ running, text }: { running: boolean; text: string }) {
  // Undefined until the reader opens or closes it: till then, it follows `running`.
  const [open, setOpen] = useState<boolean | undefined>(undefined);

  return (
    <TraceCollapsible
      onOpenChange={setOpen}
      open={open === undefined ? running : open}
    >
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>
            {running ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <CircleCheckIcon aria-hidden="true" />
            )}
          </TraceIcon>
          <TraceTitle>{running ? "Thinking" : "Thought"}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">
        {text}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

/** The question while the call waits for an answer. */
function ApprovalRequest({
  onAnswer,
}: {
  onAnswer: (approved: boolean) => void;
}) {
  const titleId = useId();
  const denyRef = useRef<HTMLButtonElement>(null);

  // The agent is stopped until the reader answers, so the question takes
  // focus when it appears: Deny, the answer that runs nothing, after a screen
  // reader has read the group's name, the question itself.
  useEffect(() => {
    denyRef.current?.focus();
  }, []);

  return (
    <Item aria-labelledby={titleId} role="group" size="sm" variant="outline">
      <ItemMedia variant="icon">
        <TerminalIcon aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle id={titleId}>Run {COMMAND}?</ItemTitle>
        <ItemDescription>The command runs in this project.</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          onClick={() => onAnswer(false)}
          ref={denyRef}
          size="sm"
          variant="outline"
        >
          Deny
        </Button>
        <Button onClick={() => onAnswer(true)} size="sm">
          Approve
        </Button>
      </ItemActions>
    </Item>
  );
}

/** The call once answered: running, then ran, or denied. */
function CommandLine({ approved, done }: { approved: boolean; done: boolean }) {
  const running = approved && !done;
  let label = "Denied";
  if (approved) {
    label = done ? "Ran" : "Running";
  }

  return (
    <Trace>
      <TraceLine status={running ? "running" : undefined}>
        <TraceIcon>
          <TerminalIcon aria-hidden="true" />
        </TraceIcon>
        <TraceTitle>
          {label} {COMMAND}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}

export function ConfirmationDemo() {
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);
  const [approved, setApproved] = useState<boolean | null>(null);
  const answer = approved ? ANSWERS.approved : ANSWERS.denied;
  const answerWords = answer.match(WORD) ?? [answer];
  // The stream stops at the request until the reader answers it.
  const end = approved === null ? ASK : RESOLVED + answerWords.length;
  const busy = sent && step < end;
  const resetRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sent || step >= end) {
      return;
    }
    const timer = setTimeout(() => setStep(step + 1), delayBefore(step + 1));
    return () => clearTimeout(timer);
  }, [end, sent, step]);

  // Answering removes the question, and the focused button with it. Once the
  // reply is in, Reset takes focus, where your app would focus its message
  // input, unless the reader has moved focus somewhere since.
  useEffect(() => {
    if (
      !busy &&
      approved !== null &&
      document.activeElement === document.body
    ) {
      resetRef.current?.focus();
    }
  }, [approved, busy]);

  const reasoning = REASONING_WORDS.slice(0, step).join("");
  const reply = answerWords.slice(0, Math.max(0, step - RESOLVED)).join("");

  return (
    <div className="flex min-h-72 w-full max-w-sm flex-col gap-4 py-6 text-sm">
      {sent ? (
        <Message align="end">
          <MessageContent>
            <Bubble align="end" variant="muted">
              <BubbleContent>{QUESTION}</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      ) : null}
      {sent && step > 0 ? (
        <Message>
          <MessageContent className="gap-4">
            <Trace>
              <ReasoningRow running={step < REASONING_END} text={reasoning} />
            </Trace>
            {/* A pending approval is a prompt, not activity, so it sits outside Trace. */}
            {step >= ASK && approved === null ? (
              <ApprovalRequest onAnswer={setApproved} />
            ) : null}
            {approved === null ? null : (
              <CommandLine approved={approved} done={step >= RESOLVED} />
            )}
            {reply.length > 0 ? <p>{reply}</p> : null}
          </MessageContent>
        </Message>
      ) : null}
      {busy ? null : (
        <Button
          className="mt-auto self-start"
          onClick={() => {
            setStep(0);
            setApproved(null);
            setSent(!sent);
          }}
          ref={resetRef}
          size="sm"
          variant="outline"
        >
          {sent ? "Reset" : "Send message"}
        </Button>
      )}
    </div>
  );
}
