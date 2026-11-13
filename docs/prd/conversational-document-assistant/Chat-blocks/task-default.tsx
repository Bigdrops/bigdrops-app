"use client";

import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
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
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

type Status = "running" | "error" | undefined;

const WORD = /\S+\s*/g;
const QUESTION = "Add Open Graph metadata to the home page.";
const ANSWER =
  "Added Open Graph defaults to app/layout.tsx and a title, description and image for the home page in app/page.tsx.";
const TASKS = [
  {
    id: "find",
    steps: [
      ["Searching for generateMetadata", "Searched for generateMetadata"],
      ["Reading app/layout.tsx", "Read app/layout.tsx"],
      ["Reading app/page.tsx", "Read app/page.tsx"],
    ],
    title: ["Finding the project files", "Found the project files"],
  },
  {
    id: "update",
    steps: [
      ["Editing app/layout.tsx", "Edited app/layout.tsx"],
      ["Editing app/page.tsx", "Edited app/page.tsx"],
    ],
    title: ["Updating the page metadata", "Updated the page metadata"],
  },
];

// The stream: each task is written again every 900 ms, with one more step
// done, until all of its steps are; then the answer, a word every 20 ms.
// Step n has the first n writes; after the last, the answer's words.
const WRITES = TASKS.flatMap((task, index) =>
  task.steps
    .map((_, done) => ({ done, index }))
    .concat({
      done: task.steps.length,
      index,
    })
);
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const STEPS = WRITES.length + ANSWER_WORDS.length;

const delayBefore = (step: number) => {
  if (step === 1) {
    return 0;
  }
  return step <= WRITES.length + 1 ? 900 : 20;
};

/** The tasks begun after the first `step` writes, each with how many of its steps are done. */
const tasksAt = (step: number) =>
  TASKS.map((task, index) => ({
    done:
      WRITES.slice(0, step).filter((write) => write.index === index).length - 1,
    task,
  })).filter((row) => row.done >= 0);

function StatusIcon({ status }: { status: Status }) {
  if (status === "running") {
    return (
      <LoaderCircleIcon
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
    );
  }

  return status === "error" ? (
    <CircleAlertIcon aria-hidden="true" />
  ) : (
    <CircleCheckIcon aria-hidden="true" />
  );
}

/** A task's status from its steps': failed once one fails, running while one runs. */
const statusOf = (steps: { status: Status }[]): Status => {
  if (steps.some((step) => step.status === "error")) {
    return "error";
  }
  if (steps.some((step) => step.status === "running")) {
    return "running";
  }
};

function TaskRow({
  done,
  streaming,
  task,
}: {
  done: number;
  streaming: boolean;
  task: (typeof TASKS)[number];
}) {
  // Undefined until the reader opens or closes it: till then, it follows the status.
  const [open, setOpen] = useState<boolean | undefined>(undefined);
  const live = streaming ? "running" : "error";
  const steps: { status: Status; title: string }[] = task.steps
    .slice(0, done + 1)
    .map(([running, finished], index) => ({
      status: index < done ? undefined : live,
      title: index < done ? finished : running,
    }));
  const status = statusOf(steps);

  return (
    <TraceCollapsible
      onOpenChange={setOpen}
      open={open === undefined ? status === "running" : open}
    >
      <TraceCollapsibleTrigger>
        <TraceLine status={status}>
          <TraceIcon>
            <StatusIcon status={status} />
          </TraceIcon>
          <TraceTitle>
            {task.title[done < task.steps.length ? 0 : 1]}
          </TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {steps.map((step) => (
            <TraceLine key={step.title} status={step.status}>
              <TraceTitle>{step.title}</TraceTitle>
            </TraceLine>
          ))}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

export function TaskDemo() {
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

  const tasks = tasksAt(step);
  const answer = ANSWER_WORDS.slice(0, Math.max(0, step - WRITES.length)).join(
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
              {tasks.map((row) => (
                <TaskRow
                  done={row.done}
                  key={row.task.id}
                  streaming={busy}
                  task={row.task}
                />
              ))}
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
