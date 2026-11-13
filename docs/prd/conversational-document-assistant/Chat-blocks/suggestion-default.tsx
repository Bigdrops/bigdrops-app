"use client";

import { ArrowUpIcon } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Message, MessageContent } from "@/components/ui/message";

const suggestions = [
  "Add a dark mode toggle",
  "Fix the failing build",
  "Write tests for the form",
  "Upgrade to Next.js 16",
  "Add a loading state",
  "Find unused dependencies",
];

const replies: Record<string, string> = {
  "Add a dark mode toggle":
    "Added a ModeToggle to the site header. It calls setTheme from next-themes.",
  "Add a loading state":
    "Added a loading.tsx to the dashboard route. It shows skeletons while the data loads.",
  "Find unused dependencies":
    "Three packages are not imported anywhere: lodash, moment and classnames. Should I remove them?",
  "Fix the failing build":
    "The build failed on a missing import in app/page.tsx. I added it and the build passes.",
  "Upgrade to Next.js 16":
    "Ran the codemod and bumped next to 16. Two routes needed async params, so I updated them.",
  "Write tests for the form":
    "Added four tests in signup-form.test.tsx. They cover the empty, invalid and valid states.",
};

export function SuggestionDemo() {
  const [text, setText] = useState("");
  const [turn, setTurn] = useState<{ prompt: string; reply: string } | null>(
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const canSend = text.trim().length > 0;

  const send = (prompt: string) => {
    setTurn({
      prompt,
      reply:
        replies[prompt] ?? "This demo only knows the suggestions. Pick one.",
    });
    setText("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) {
      send(text.trim());
    }
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-6 py-6 text-sm">
      {turn ? (
        <div className="flex flex-col gap-4">
          <Message align="end">
            <MessageContent>
              <Bubble align="end" variant="muted">
                <BubbleContent>{turn.prompt}</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message>
            <MessageContent>
              <p>{turn.reply}</p>
            </MessageContent>
          </Message>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <div className="scrollbar-none scroll-fade-x flex gap-2 overflow-x-auto overscroll-x-contain">
          {suggestions.map((suggestion) => (
            <Button
              className="shrink-0"
              key={suggestion}
              onClick={() => send(suggestion)}
              size="sm"
              variant="outline"
            >
              {suggestion}
            </Button>
          ))}
        </div>
        <form onSubmit={handleSubmit} ref={formRef}>
          <InputGroup>
            <InputGroupTextarea
              aria-label="Message"
              className="p-3"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // An Enter that confirms an input method's word (Japanese,
                // Chinese, Korean) is not a send: Chrome marks it with
                // isComposing, Safari only with keyCode 229.
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229
                ) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              placeholder="Ask the agent to change your code..."
              value={text}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                aria-label="Send"
                className="ms-auto"
                disabled={!canSend}
                pill
                size="icon-sm"
                type="submit"
                variant="default"
              >
                <ArrowUpIcon aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </div>
  );
}
