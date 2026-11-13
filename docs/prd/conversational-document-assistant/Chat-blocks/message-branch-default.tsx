import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageBranch,
  MessageBranchContent,
  MessageBranchItem,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
} from "@/components/ui/message-branch";

const versions = [
  {
    id: "docs",
    text: "Start with the official documentation at react.dev. Its tutorial builds a small game step by step and teaches components, props and state on the way.",
  },
  {
    id: "project",
    text: "Pick a small app you would use yourself and build it while you learn. Start a Vite project, then add one feature at a time: you learn fastest by solving real problems.",
  },
  {
    id: "course",
    text: "Take a structured course with exercises, then build something of your own beside it to make what you learn stick.",
  },
];

export function MessageBranchDemo() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-md flex-col gap-6 py-6 text-sm">
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>What's the best way to learn React?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <MessageBranch>
        <MessageBranchContent>
          {versions.map((version) => (
            <MessageBranchItem key={version.id}>
              <Message>
                <MessageContent>
                  <p>{version.text}</p>
                </MessageContent>
              </Message>
            </MessageBranchItem>
          ))}
        </MessageBranchContent>
        <MessageBranchSelector from="assistant">
          <MessageBranchPrevious />
          <MessageBranchPage />
          <MessageBranchNext />
        </MessageBranchSelector>
      </MessageBranch>
    </div>
  );
}
