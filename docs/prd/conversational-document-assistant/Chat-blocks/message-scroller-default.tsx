"use client";

import {
  ArrowUpIcon,
  GlobeIcon,
  ImageIcon,
  MessageCircleDashedIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCwIcon,
  TelescopeIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

type ChatStatus = "ready" | "streaming" | "submitted";

/** The conversation the demo plays: each user turn, then its reply. */
const script: ChatMessage[] = [
  {
    id: "demo-1",
    role: "user",
    text: "I'm building a chat for our app and the scroll behavior is driving me nuts. Every time the AI streams a reply, the whole thread jumps around.",
  },
  {
    id: "demo-2",
    role: "assistant",
    text: "That's the classic streaming scroll problem. Wrap your message list in `MessageScroller` and turn on `autoScroll`, and the viewport pins to the bottom as tokens arrive, so users always see the latest text land in place.\n\nThe important part: it only auto-scrolls while the reader is already at the bottom. The moment they scroll up to read something earlier, auto-scroll backs off and their position is preserved. You get smooth streaming without fighting the user's intent.",
  },
  {
    id: "demo-3",
    role: "user",
    text: "Okay, but when someone sends a new message the view still feels jarring, like the whole conversation reloads from the top.",
  },
  {
    id: "demo-4",
    role: "assistant",
    text: "MessageScrollerItem fixes that with turn anchoring. Set `scrollAnchor` on the turn that should settle near the top instead of blindly snapping to the document bottom.\n\nIt also leaves a small peek of the previous exchange visible above the anchor, so context isn't lost. The reply starts in view without that disorienting jump you get from a plain overflow container.",
  },
  {
    id: "demo-5",
    role: "user",
    text: "And if they've scrolled up to re-read an older answer? I don't want to yank them back down.",
  },
  {
    id: "demo-6",
    role: "assistant",
    text: "You won't. Auto-scroll only runs when the viewport is already pinned to the bottom, so scrolling up is a deliberate opt-out: their place in the thread stays put even as new tokens keep arriving below.\n\nWhen there is content they haven't seen yet, `MessageScrollerButton` appears at the bottom of the viewport. One tap jumps them back to the newest message and re-engages auto-scroll. Same pattern as Slack or iMessage: quiet when you're caught up, helpful when you're not.",
  },
  {
    id: "demo-7",
    role: "user",
    text: "Last one: does this work with assistive tech?",
  },
  {
    id: "demo-8",
    role: "assistant",
    text: '`MessageScrollerContent` sets `role="log"` and `aria-relevant="additions"` by default, so screen readers announce each message row as it is added, not every word streamed into it. While a reply streams, `aria-busy` marks the log as mid-update.\n\nThe scroll button is a real `<button>` with an sr-only label, and it\'s removed from the tab order when you\'re already at the bottom, so there are no ghost focus stops.',
  },
];

/** The wait before a reply starts, then the pause between its words, in ms. */
const REPLY_DELAY = 1000;
const WORD_DELAY = 20;

const WORD = /\S+\s*/g;
const PARAGRAPH_BREAK = /\n\s*\n/;

/** A message's paragraphs, each keyed by its message and its place. */
const paragraphs = (message: ChatMessage) =>
  message.text
    .split(PARAGRAPH_BREAK)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({ key: `${message.id}-${index}`, text }));

/**
 * Plays the script as a streamed chat: send adds the next user message, and
 * the reply starts a second later, a word at a time. In an app, your chat
 * hook (the AI SDK's `useChat`) gives you the same messages and status.
 */
const useScriptedChat = (initialCount: number) => {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [words, setWords] = useState(0);
  const reply = status === "ready" ? undefined : script[count];
  const replyWords = reply?.text.match(WORD) ?? [];
  const total = replyWords.length;

  useEffect(() => {
    if (status === "ready") {
      return;
    }
    const timer = setTimeout(
      () => {
        if (status === "submitted") {
          setStatus("streaming");
        } else if (words + 1 < total) {
          setWords(words + 1);
        } else {
          setCount((value) => value + 1);
          setWords(0);
          setStatus("ready");
        }
      },
      status === "submitted" ? REPLY_DELAY : WORD_DELAY
    );
    return () => clearTimeout(timer);
  }, [status, words, total]);

  const shown = script.slice(0, count);
  const messages =
    reply && words > 0
      ? [...shown, { ...reply, text: replyWords.slice(0, words).join("") }]
      : shown;
  const next = script[status === "ready" ? count : count + 1];
  const nextMessage = next?.role === "user" ? next : undefined;

  const send = () => {
    if (status === "ready" && nextMessage) {
      setCount(count + 1);
      setStatus("submitted");
    }
  };

  const reset = () => {
    setCount(initialCount);
    setWords(0);
    setStatus("ready");
  };

  return { messages, nextMessage, reset, send, status };
};

const MessageScrollerDemo = () => {
  const { messages, nextMessage, reset, send, status } = useScriptedChat(0);
  const isBusy = status !== "ready";

  return (
    <MessageScrollerProvider>
      <div className="relative flex w-full flex-col gap-4">
        <Card className="mx-auto h-140 w-full max-w-sm gap-0">
          <CardHeader className="gap-1 border-b">
            <CardTitle>New Chat</CardTitle>
            <CardDescription>How can I help you today?</CardDescription>
            <CardAction>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="Reset conversation"
                      disabled={isBusy}
                      onClick={reset}
                      size="icon-md"
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  <RotateCwIcon aria-hidden="true" className="size-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset</p>
                </TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
            {messages.length === 0 ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageCircleDashedIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Morning, shadcn!</EmptyTitle>
                  <EmptyDescription>
                    What are we working on today? Press send to start a new
                    conversation
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={isBusy}
                    className="p-(--card-spacing)"
                  >
                    {messages.map((message) => (
                      <ChatRow key={message.id} message={message} />
                    ))}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <form
              className="w-full"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <InputGroup>
                <div className="h-14 w-full px-3 py-2.5">
                  <span
                    className="line-clamp-2 opacity-60 data-[status=ready]:opacity-100"
                    data-status={status}
                  >
                    {nextMessage ? (
                      nextMessage.text
                    ) : (
                      <span className="text-muted-foreground">
                        No messages queued. Reset the conversation.
                      </span>
                    )}
                  </span>
                </div>
                <InputGroupAddon align="block-end" className="pt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <InputGroupButton
                          aria-label="Add files"
                          size="icon-sm"
                          variant="outline"
                        />
                      }
                    >
                      <PlusIcon aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-44"
                      side="top"
                    >
                      <DropdownMenuItem>
                        <PaperclipIcon aria-hidden="true" />
                        Add Photos & Files
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <ImageIcon aria-hidden="true" />
                        Create Image
                      </DropdownMenuItem>
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
                    disabled={!nextMessage || isBusy}
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
          </CardFooter>
        </Card>
        <div className="px-0.5 text-center text-muted-foreground text-xs">
          Demo is read only. Press send to send messages.
        </div>
      </div>
    </MessageScrollerProvider>
  );
};

/**
 * One transcript row. A user message is the turn's anchor and rises into
 * place as it's sent (transform and opacity only, so the row's measured
 * height never changes); the reply streams into a plain row below it.
 */
const ChatRow = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  return (
    <MessageScrollerItem
      className={
        isUser
          ? "fade-in slide-in-from-bottom-[10px] animate-in duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
          : undefined
      }
      messageId={message.id}
      scrollAnchor={isUser}
    >
      <Message align={isUser ? "end" : "start"}>
        <MessageContent>
          <Bubble variant={isUser ? "muted" : "ghost"}>
            <BubbleContent className="flex flex-col gap-2">
              {paragraphs(message).map((paragraph) => (
                <p className="whitespace-pre-wrap" key={paragraph.key}>
                  {paragraph.text}
                </p>
              ))}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
};
