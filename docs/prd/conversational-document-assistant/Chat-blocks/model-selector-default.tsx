"use client";

import { ArrowUpIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import { type FormEvent, Fragment, useRef, useState } from "react";
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

export function ModelSelectorDemo() {
  const [text, setText] = useState("");
  const [model, setModel] = useState(models[0].id);
  const [effort, setEffort] = useState(efforts[1].id);
  const formRef = useRef<HTMLFormElement>(null);
  const currentModel = models.find((item) => item.id === model) ?? models[0];
  const currentEffort =
    efforts.find((item) => item.id === effort) ?? efforts[1];
  const canSend = text.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) {
      setText("");
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg py-6">
      <form onSubmit={handleSubmit} ref={formRef}>
        <InputGroup>
          <InputGroupTextarea
            aria-label="Message"
            className="p-3"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder="Ask the agent to change your code..."
            value={text}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              aria-label="Attach files"
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
              aria-label="Send"
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
  );
}
