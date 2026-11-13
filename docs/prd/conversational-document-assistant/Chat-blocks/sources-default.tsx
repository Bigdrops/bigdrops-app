"use client";

import { ArrowUpRightIcon, GlobeIcon } from "lucide-react";
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

interface Source {
  title?: string;
  url: string;
}

const WORD = /\S+\s*/g;
const QUESTION = "How do I start an Astro project with pnpm?";
const ANSWER =
  "Run pnpm create astro@latest and follow the prompts. It scaffolds the project and installs the dependencies.";
/** The reply's sources as the agent cited them: the Astro docs twice. */
const CITED: Source[] = [
  {
    title: "Install Astro | docs.astro.build",
    url: "https://docs.astro.build/en/install-and-setup/",
  },
  {
    title: "create-astro | npmjs.com",
    url: "https://www.npmjs.com/package/create-astro",
  },
  {
    title: "Install Astro | docs.astro.build",
    url: "https://docs.astro.build/en/install-and-setup/",
  },
  {
    title: "pnpm create | pnpm.io",
    url: "https://pnpm.io/cli/create",
  },
];
/** Each page once. */
const SOURCES = CITED.filter(
  (source, index, all) =>
    all.findIndex((other) => other.url === source.url) === index
);

// The stream: the answer comes a word every 20 ms, and its sources with
// the last word. Step n has the first n words.
const ANSWER_WORDS = ANSWER.match(WORD) ?? [ANSWER];
const STEPS = ANSWER_WORDS.length;

function Sources({ sources }: { sources: Source[] }) {
  return (
    <Trace>
      <TraceCollapsible defaultOpen>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <GlobeIcon aria-hidden="true" />
            </TraceIcon>
            <TraceTitle>
              Used {sources.length}{" "}
              {sources.length === 1 ? "source" : "sources"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {sources.map((source) => (
              <a
                href={source.url}
                key={source.url}
                rel="noreferrer"
                target="_blank"
              >
                <TraceLine>
                  <TraceTitle>
                    {source.title ?? new URL(source.url).hostname}
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
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

export function SourcesDemo() {
  const [step, setStep] = useState(STEPS);
  const busy = step < STEPS;

  useEffect(() => {
    if (step >= STEPS) {
      return;
    }
    const timer = setTimeout(() => setStep(step + 1), 20);
    return () => clearTimeout(timer);
  }, [step]);

  const answer = ANSWER_WORDS.slice(0, step).join("");

  return (
    <div className="flex min-h-72 w-full max-w-sm flex-col gap-4 py-6 text-sm">
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>{QUESTION}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      {answer.length > 0 ? (
        <Message>
          <MessageContent className="gap-4">
            <p>{answer}</p>
            {busy ? null : <Sources sources={SOURCES} />}
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
