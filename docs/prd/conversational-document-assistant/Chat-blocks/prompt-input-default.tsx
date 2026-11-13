"use client";

import {
  ArrowUpIcon,
  ChevronDownIcon,
  FileTextIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  Fragment,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

interface AttachmentFile {
  id: string;
  name: string;
}

const providers = [
  {
    models: [
      { id: "gpt-5", name: "GPT-5" },
      { id: "gpt-5-mini", name: "GPT-5 mini" },
    ],
    name: "OpenAI",
  },
  {
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
    ],
    name: "Anthropic",
  },
];

const models = providers.flatMap((provider) => provider.models);

const efforts = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
];

/** How long the simulated reply streams before the field is ready again. */
const REPLY_MS = 2000;

export function PromptInputDemo() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const [model, setModel] = useState(models[0].id);
  const [effort, setEffort] = useState(efforts[1].id);
  const [streaming, setStreaming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentModel = models.find((item) => item.id === model) ?? models[0];
  const currentEffort =
    efforts.find((item) => item.id === effort) ?? efforts[1];
  const canSend = text.trim().length > 0 && !streaming;

  // The reply "streams" for a moment, then the field is ready for the next message.
  useEffect(() => {
    if (!streaming) {
      return;
    }
    const timer = setTimeout(() => setStreaming(false), REPLY_MS);
    return () => clearTimeout(timer);
  }, [streaming]);

  // While a reply streams, the one submit button is the stop button. It
  // stays type="submit": a type that flips during its own click lets that
  // click submit the form, sending whatever was typed meanwhile.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (streaming) {
      setStreaming(false);
      return;
    }
    if (!canSend) {
      return;
    }
    setText("");
    setFiles([]);
    setStreaming(true);
  };

  const handleAttach = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles((current) => [
      ...current,
      ...selected.map((file) => ({ id: crypto.randomUUID(), name: file.name })),
    ]);
    event.target.value = "";
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg py-6">
      <form onSubmit={handleSubmit} ref={formRef}>
        <input
          hidden
          multiple
          onChange={handleAttach}
          ref={inputRef}
          type="file"
        />
        <InputGroup>
          {files.length > 0 ? (
            <InputGroupAddon align="block-start" className="flex-wrap">
              {files.map((file) => (
                <Attachment key={file.id} size="sm">
                  <AttachmentMedia>
                    <FileTextIcon aria-hidden="true" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((item) => item.id !== file.id)
                        )
                      }
                    >
                      <XIcon aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </InputGroupAddon>
          ) : null}
          <InputGroupTextarea
            aria-label="Message"
            className="p-3"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // An Enter that confirms an input method's word (Japanese,
              // Chinese, Korean) is not a send: Chrome marks it with
              // isComposing, Safari only with keyCode 229. Mid-reply, Enter
              // doesn't submit, since that would stop the reply.
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault();
                if (!streaming) {
                  formRef.current?.requestSubmit();
                }
              }
            }}
            placeholder="Ask the agent to change your code..."
            value={text}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              aria-label="Attach files"
              onClick={() => inputRef.current?.click()}
              pill
              size="icon-sm"
              variant="outline"
            >
              <PlusIcon aria-hidden="true" />
            </InputGroupButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  aria-label={`Model: ${currentModel.name}`}
                  className="ms-auto"
                  size="sm"
                  variant="outline"
                >
                  {currentModel.name}
                  <ChevronDownIcon aria-hidden="true" />
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuRadioGroup onValueChange={setModel} value={model}>
                  {providers.map((provider, index) => (
                    <Fragment key={provider.name}>
                      {index > 0 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{provider.name}</DropdownMenuLabel>
                        {provider.models.map((item) => (
                          <DropdownMenuRadioItem key={item.id} value={item.id}>
                            {item.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuGroup>
                    </Fragment>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  aria-label={`Effort: ${currentEffort.name}`}
                  size="sm"
                  variant="outline"
                >
                  <span className="text-muted-foreground">Effort</span>
                  {currentEffort.name}
                  <ChevronDownIcon aria-hidden="true" />
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Effort</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    onValueChange={setEffort}
                    value={effort}
                  >
                    {efforts.map((item) => (
                      <DropdownMenuRadioItem key={item.id} value={item.id}>
                        {item.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupButton
              aria-label={streaming ? "Stop" : "Send"}
              disabled={!(streaming || canSend)}
              pill
              size="icon-sm"
              type="submit"
              variant="default"
            >
              {streaming ? (
                <SquareIcon
                  aria-hidden="true"
                  className="size-3 fill-current"
                />
              ) : (
                <ArrowUpIcon aria-hidden="true" />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
}
