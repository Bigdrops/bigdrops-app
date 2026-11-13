"use client";

import {
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  ListChecksIcon,
  ListTodoIcon,
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

type TodoStatus = "pending" | "in_progress" | "completed";

const WORD = /\S+\s*/g;
const QUESTION = "Add dark mode to the settings page.";
const TODOS = [
  "Add a dark variant to the theme tokens",
  "Read the theme from a cookie",
  "Add a toggle to the settings page",
  "Check contrast on the charts",
];
const ANSWER = "Dark mode is in. The toggle is under Settings, Appearance.";

// The stream: the agent writes its whole todo list, then writes it again
// every 1.4 s with one more todo done; then the answer, a word every 20 ms.
// Step 0 is the question alone; at step n (1 to 5) n - 1 todos are done and
// the next is in progress; after TODOS_END, the answer's words.
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const TODOS_END = TODOS.length + 1;
const STEPS = TODOS_END + ANSWER_WORDS.length;

const delayBefore = (step: number) => {
  if (step === 1) {
    return 0;
  }
  return step <= TODOS_END ? 1400 : 20;
};

/** The list as the agent writes it when `current` todos are done. */
const todosAt = (current: number) =>
  TODOS.map((content, index) => {
    let status: TodoStatus = "pending";
    if (index < current) {
      status = "completed";
    } else if (index === current) {
      status = "in_progress";
    }
    return { content, status };
  });

function TodoIcon({ status }: { status: TodoStatus }) {
  if (status === "completed") {
    return <CircleCheckIcon aria-hidden="true" />;
  }
  if (status === "in_progress") {
    return <CircleDotIcon aria-hidden="true" />;
  }
  return <CircleIcon aria-hidden="true" />;
}

function TodoLine({
  content,
  status,
  streaming,
}: {
  content: string;
  status: TodoStatus;
  streaming: boolean;
}) {
  return (
    <TraceLine
      status={streaming && status === "in_progress" ? "running" : undefined}
    >
      <TraceIcon>
        <TodoIcon status={status} />
      </TraceIcon>
      <TraceTitle>
        {/* Its section says done or to do; the dot icon is hidden from
            screen readers, so the item in progress says so in words. */}
        {status === "in_progress" ? (
          <span className="sr-only">In progress: </span>
        ) : null}
        {content}
      </TraceTitle>
    </TraceLine>
  );
}

function TodoQueue({
  current,
  streaming,
}: {
  current: number;
  streaming: boolean;
}) {
  const todos = todosAt(current);
  const pending = todos.filter((todo) => todo.status !== "completed");
  const completed = todos.filter((todo) => todo.status === "completed");

  return (
    <Trace>
      {pending.length > 0 ? (
        <TraceCollapsible defaultOpen>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <ListTodoIcon aria-hidden="true" />
              </TraceIcon>
              <TraceTitle>{pending.length} to do</TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            <Trace>
              {pending.map((todo) => (
                <TodoLine
                  content={todo.content}
                  key={todo.content}
                  status={todo.status}
                  streaming={streaming}
                />
              ))}
            </Trace>
          </TraceCollapsibleContent>
        </TraceCollapsible>
      ) : null}
      {completed.length > 0 ? (
        <TraceCollapsible defaultOpen>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <ListChecksIcon aria-hidden="true" />
              </TraceIcon>
              <TraceTitle>{completed.length} completed</TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            <Trace>
              {completed.map((todo) => (
                <TodoLine
                  content={todo.content}
                  key={todo.content}
                  status={todo.status}
                  streaming={streaming}
                />
              ))}
            </Trace>
          </TraceCollapsibleContent>
        </TraceCollapsible>
      ) : null}
    </Trace>
  );
}

export function QueueDemo() {
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

  const answer = ANSWER_WORDS.slice(0, Math.max(0, step - TODOS_END)).join("");

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
            <TodoQueue
              current={Math.min(step - 1, TODOS.length)}
              streaming={busy}
            />
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
