"use client";

import {
  ArrowUpIcon,
  CircleCheckIcon,
  GlobeIcon,
  LoaderCircleIcon,
  MessageCircleDashedIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCwIcon,
  TelescopeIcon,
  TerminalIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";

/** A part of the agent's reply, the way the AI SDK's message parts give it. */
type ChatPart =
  | { type: "reasoning"; state: "done" | "streaming"; text: string }
  /** A command the agent runs: `stdout` once it has run. */
  | { type: "tool"; command: string; stdout?: string }
  | { type: "text"; text: string };

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; parts: ChatPart[] };

type ChatStatus = "ready" | "streaming" | "submitted";

/** What the agent does in a turn, in order, with the pauses between. */
type TurnEvent =
  | { kind: "reasoning" | "text"; text: string }
  | { kind: "sleep"; ms: number }
  | { kind: "tool"; command: string; ms: number; stdout: string };

/** The conversation the demo plays: each message, then the agent's turn. */
const script: { reply: TurnEvent[]; user: string }[] = [
  {
    reply: [
      {
        kind: "reasoning",
        text: "I need to know how themes are set up before I add a toggle. If next-themes is already in the layout, the toggle only has to call setTheme.",
      },
      { kind: "sleep", ms: 400 },
      {
        command: "rg -l ThemeProvider app",
        kind: "tool",
        ms: 800,
        stdout: "app/layout.tsx",
      },
      { kind: "sleep", ms: 500 },
      {
        kind: "text",
        text: `next-themes is already set up in \`app/layout.tsx\`, so the toggle only has to call \`setTheme\`.

**Changes**

- Added \`components/mode-toggle.tsx\` with a Light and Dark option.
- Put \`<ModeToggle />\` next to the Appearance heading in \`app/settings/page.tsx\`.

\`\`\`tsx
const { setTheme } = useTheme()
\`\`\`
`,
      },
    ],
    user: "Add a dark mode toggle to the settings page.",
  },
  {
    reply: [
      {
        kind: "reasoning",
        text: "The default theme lives on the ThemeProvider. I should check what it is set to now.",
      },
      { kind: "sleep", ms: 400 },
      {
        command: "rg -n defaultTheme app/layout.tsx",
        kind: "tool",
        ms: 800,
        stdout: '12:  <ThemeProvider attribute="class" defaultTheme="light">',
      },
      { kind: "sleep", ms: 500 },
      {
        kind: "text",
        text: `It was set to \`light\`. I updated the \`ThemeProvider\` in \`app/layout.tsx\`:

\`\`\`tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
\`\`\`

New visitors now get the theme from their OS. The toggle also has a **System** option, so anyone who picked Light or Dark can switch back.
`,
      },
    ],
    user: "Make it follow the system setting by default.",
  },
  {
    reply: [
      {
        command: "pnpm build",
        kind: "tool",
        ms: 1600,
        stdout:
          "▲ Next.js 16.0.0\n\n✓ Compiled successfully in 4.2s\n✓ Linting and checking validity of types\n✓ Generating static pages (12/12)",
      },
      { kind: "sleep", ms: 500 },
      {
        kind: "text",
        text: `The build passes, so it is ready to ship.

- Compiled in **4.2s**.
- No lint or type errors.
- Generated all **12** static pages.
`,
      },
    ],
    user: "Run the build before I ship it.",
  },
];

/** The reply to anything sent once the script has run out. */
const FALLBACK =
  "This demo only knows the scripted turns. Press reset to start over.";

/** The wait before a scripted turn starts, then the pause between words, in ms. */
const REPLY_DELAY = 600;
const WORD_DELAY = 16;

const WORD = /\S+\s*/g;

/** One moment of a streamed reply: its parts, and the wait before it. */
interface Frame {
  delay: number;
  parts: ChatPart[];
}

/**
 * A turn as the stream delivers it: reasoning and text a word at a time, a
 * command first running and then with its output, each event after its
 * pause. In an app, the AI SDK's `useChat` hands you these parts.
 */
const toFrames = (events: TurnEvent[]) => {
  const frames: Frame[] = [];
  let parts: ChatPart[] = [];
  let wait = 0;
  const show = (part: ChatPart, replace = false) => {
    parts = [...(replace ? parts.slice(0, -1) : parts), part];
    frames.push({ delay: wait, parts });
    wait = 0;
  };
  for (const event of events) {
    if (event.kind === "sleep") {
      wait += event.ms;
    } else if (event.kind === "tool") {
      show({ command: event.command, type: "tool" });
      wait += event.ms;
      show(
        { command: event.command, stdout: event.stdout, type: "tool" },
        true
      );
    } else if (event.kind === "reasoning") {
      const words = event.text.match(WORD) ?? [];
      show({ state: "streaming", text: "", type: "reasoning" });
      for (const [index] of words.entries()) {
        wait += WORD_DELAY;
        show(
          {
            state: "streaming",
            text: words.slice(0, index + 1).join(""),
            type: "reasoning",
          },
          true
        );
      }
      show({ state: "done", text: event.text, type: "reasoning" }, true);
    } else {
      const words = event.text.match(WORD) ?? [];
      show({ text: "", type: "text" });
      for (const [index] of words.entries()) {
        wait += WORD_DELAY;
        show({ text: words.slice(0, index + 1).join(""), type: "text" }, true);
      }
    }
  }
  return frames;
};

const SCRIPT_FRAMES = script.map((turn) => toFrames(turn.reply));
const FALLBACK_FRAMES = toFrames([{ kind: "text", text: FALLBACK }]);

/**
 * Plays the script as a streamed chat. Each send gets the next scripted
 * turn, whatever it says, and the fallback once the script runs out; the
 * field offers the next scripted message. In an app, your chat hook (the
 * AI SDK's `useChat`) gives you the same messages and status.
 */
const useScriptedChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [played, setPlayed] = useState(0);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [turn, setTurn] = useState<{
    frames: Frame[];
    id: string;
    wait: number;
  } | null>(null);
  const [frame, setFrame] = useState(-1);

  useEffect(() => {
    if (!turn) {
      return;
    }
    const next = frame + 1;
    if (next >= turn.frames.length) {
      setMessages((list) => [
        ...list,
        {
          id: turn.id,
          parts: turn.frames[frame]?.parts ?? [],
          role: "assistant",
        },
      ]);
      setTurn(null);
      setFrame(-1);
      setStatus("ready");
      return;
    }
    const timer = setTimeout(
      () => {
        setFrame(next);
        setStatus("streaming");
      },
      (frame < 0 ? turn.wait : 0) + (turn.frames[next]?.delay ?? 0)
    );
    return () => clearTimeout(timer);
  }, [turn, frame]);

  const streamed: ChatMessage | null =
    turn && frame >= 0
      ? {
          id: turn.id,
          parts: turn.frames[frame]?.parts ?? [],
          role: "assistant",
        }
      : null;

  const send = (text: string) => {
    if (status !== "ready") {
      return;
    }
    const scripted = played < script.length;
    setMessages([
      ...messages,
      { id: `user-${messages.length}`, role: "user", text },
    ]);
    setTurn({
      frames: SCRIPT_FRAMES[played] ?? FALLBACK_FRAMES,
      id: `assistant-${messages.length + 1}`,
      wait: scripted ? REPLY_DELAY : 0,
    });
    setFrame(-1);
    setPlayed(scripted ? played + 1 : played);
    setStatus("submitted");
  };

  const reset = () => {
    setMessages([]);
    setPlayed(0);
    setTurn(null);
    setFrame(-1);
    setStatus("ready");
  };

  return {
    messages: streamed ? [...messages, streamed] : messages,
    nextMessage: script[played]?.user,
    reset,
    send,
    status,
  };
};

export function ChatDemo() {
  const { messages, nextMessage, reset, send, status } = useScriptedChat();
  const [draft, setDraft] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const text = draft ?? nextMessage ?? "";
  const canSend = text.trim().length > 0 && !busy;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) {
      send(text.trim());
      setDraft(null);
    }
  };

  return (
    <MessageScrollerProvider>
      <div className="mx-auto flex h-160 w-full max-w-xl flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="font-medium">New Thread</div>
            <div className="text-muted-foreground text-sm">
              Ask the agent to change your code.
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Reset conversation"
                  disabled={busy}
                  onClick={() => {
                    reset();
                    setDraft(null);
                  }}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <RotateCwIcon aria-hidden="true" className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="min-h-0 flex-1">
          {messages.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircleDashedIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>What should we build?</EmptyTitle>
                <EmptyDescription>
                  The agent can read your code, run commands and make changes.
                  Press send to start.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={busy} className="gap-6">
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <MessageScrollerItem
                        className="fade-in slide-in-from-bottom-[10px] animate-in duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor
                      >
                        <Message align="end">
                          <MessageContent>
                            <Bubble align="end" variant="muted">
                              <BubbleContent>{message.text}</BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ) : (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                      >
                        <AgentTurn
                          parts={message.parts}
                          streaming={busy && message === messages.at(-1)}
                        />
                      </MessageScrollerItem>
                    )
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          )}
        </div>
        <form className="w-full" onSubmit={handleSubmit} ref={formRef}>
          <InputGroup>
            <InputGroupTextarea
              aria-label="Message"
              className="min-h-14"
              onChange={(event) => setDraft(event.target.value)}
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
              placeholder="Ask the agent..."
              value={text}
            />
            <InputGroupAddon align="block-end" className="pt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <InputGroupButton
                    aria-label="Add context"
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  >
                    <PlusIcon aria-hidden="true" />
                  </InputGroupButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44" side="top">
                  <DropdownMenuItem>
                    <PaperclipIcon aria-hidden="true" />
                    Add Photos & Files
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <TelescopeIcon aria-hidden="true" />
                    Deep Research
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <GlobeIcon aria-hidden="true" />
                    Web Search
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <InputGroupButton
                className="ms-auto"
                disabled={!canSend}
                size="icon-sm"
                type="submit"
                variant="default"
              >
                <ArrowUpIcon aria-hidden="true" />
                <span className="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </MessageScrollerProvider>
  );
}

/** The agent's turn: its steps as a Trace, then the reply as markdown. */
function AgentTurn({
  parts,
  streaming,
}: {
  parts: ChatPart[];
  streaming: boolean;
}) {
  const steps = parts.filter(
    (part): part is Exclude<ChatPart, { type: "text" }> => part.type !== "text"
  );
  const reply = parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  return (
    <Message>
      <MessageContent className="gap-3">
        {steps.length > 0 ? (
          <Trace>
            {steps.map((part, index) =>
              part.type === "reasoning" ? (
                <ReasoningRow
                  // biome-ignore lint/suspicious/noArrayIndexKey: a step is its place in the turn.
                  key={index}
                  running={part.state === "streaming"}
                  text={part.text}
                />
              ) : (
                <ToolRow
                  command={part.command}
                  // biome-ignore lint/suspicious/noArrayIndexKey: a step is its place in the turn.
                  key={index}
                  stdout={part.stdout}
                  streaming={streaming}
                />
              )
            )}
          </Trace>
        ) : null}
        {reply ? <Markdown streaming={streaming} text={reply} /> : null}
      </MessageContent>
    </Message>
  );
}

function ReasoningRow({ running, text }: { running: boolean; text: string }) {
  // Undefined until the reader opens or closes it: till then, it follows `running`.
  const [open, setOpen] = useState<boolean | undefined>(undefined);

  return (
    <TraceCollapsible onOpenChange={setOpen} open={open ?? running}>
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

function ToolRow({
  command,
  stdout,
  streaming,
}: {
  command: string;
  stdout?: string;
  streaming: boolean;
}) {
  if (stdout === undefined) {
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

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceIcon>
            <TerminalIcon aria-hidden="true" />
          </TraceIcon>
          <TraceTitle>Ran {command}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <CodeBlock size="sm">
          <CodeBlockContent className="max-h-64" wrap>
            {stdout}
          </CodeBlockContent>
        </CodeBlock>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

const FENCE = /^```/m;
const PARAGRAPH_BREAK = /\n\s*\n/;
const LIST_ITEM = /^[-*] /;
const TRAILING_NEWLINE = /\n$/;
// Bold and code, closed or still streaming at the end of the text.
const INLINE = /(\*\*[^*]+(?:\*\*|$)|`[^`]+(?:`|$))/;
const BOLD_END = /\*\*$/;
const CODE_END = /`$/;

type Block =
  | { code: string; key: string; kind: "code"; language: string; open: boolean }
  | { items: { key: string; text: string }[]; key: string; kind: "list" }
  | { key: string; kind: "paragraph"; text: string };

/** Prose between fences: paragraphs, and lists of `- ` lines. */
const toProse = (prose: string, at: number): Block[] =>
  prose
    .split(PARAGRAPH_BREAK)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const key = `block-${at}-${index}`;
      const lines = chunk.split("\n");
      return lines.every((line) => LIST_ITEM.test(line))
        ? {
            items: lines.map((line, item) => ({
              key: `${key}-${item}`,
              text: line.slice(2),
            })),
            key,
            kind: "list",
          }
        : { key, kind: "paragraph", text: chunk };
    });

/**
 * The markdown the replies use: paragraphs, lists, bold, inline code and
 * fenced code, the last of which may still be open while the reply streams.
 * Split on the fences, the pieces alternate prose and code. In an app,
 * render with your markdown renderer (Streamdown) and send fenced code to
 * Code Block, as here.
 */
const toBlocks = (markdown: string) => {
  const pieces = markdown.split(FENCE);
  return pieces.flatMap((piece, at): Block[] => {
    if (at % 2 === 0) {
      return toProse(piece, at);
    }
    const [language = "", ...code] = piece.split("\n");
    return [
      {
        code: code.join("\n").replace(TRAILING_NEWLINE, ""),
        key: `block-${at}`,
        kind: "code",
        language: language.trim(),
        open: at === pieces.length - 1,
      },
    ];
  });
};

/** A line's runs of plain text, bold and inline code. */
const toRuns = (text: string) =>
  text
    .split(INLINE)
    .filter(Boolean)
    .map((value, index) => {
      if (value.startsWith("**") && value.length > 2) {
        return {
          key: `run-${index}`,
          kind: "strong",
          text: value.slice(2).replace(BOLD_END, ""),
        };
      }
      if (value.startsWith("`") && value.length > 1) {
        return {
          key: `run-${index}`,
          kind: "code",
          text: value.slice(1).replace(CODE_END, ""),
        };
      }
      return { key: `run-${index}`, kind: "text", text: value };
    });

function Markdown({ streaming, text }: { streaming: boolean; text: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {toBlocks(text).map((block) => {
        if (block.kind === "code") {
          return (
            <MarkdownCodeBlock
              code={block.code}
              incomplete={streaming && block.open}
              key={block.key}
              language={block.language}
            />
          );
        }
        if (block.kind === "list") {
          return (
            <ul className="flex list-disc flex-col gap-1 ps-4" key={block.key}>
              {block.items.map((item) => (
                <li key={item.key}>
                  <Inline text={item.text} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={block.key}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {toRuns(text).map((run) => {
        if (run.kind === "strong") {
          return (
            <strong className="font-semibold" key={run.key}>
              {run.text}
            </strong>
          );
        }
        if (run.kind === "code") {
          return (
            <code
              className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]"
              key={run.key}
            >
              {run.text}
            </code>
          );
        }
        return run.text;
      })}
    </>
  );
}

function MarkdownCodeBlock({
  code,
  incomplete,
  language,
}: {
  code: string;
  incomplete: boolean;
  language: string;
}) {
  const lines = useHighlightedCode(code, language);

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{language || "text"}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton disabled={incomplete} value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a line is its place in the code.
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}
