import {
  Agent,
  AgentContent,
  AgentHeader,
  AgentInstructions,
  AgentOutput,
  AgentTool,
  AgentTools,
} from "@/components/ui/agent";

const tools = [
  {
    description: "Search the web for current information",
    jsonSchema: {
      properties: {
        limit: { description: "Max results to return", type: "number" },
        query: { description: "The search query", type: "string" },
      },
      required: ["query"],
      type: "object",
    },
  },
  {
    description: "Read a file from the filesystem",
    jsonSchema: {
      properties: {
        path: { description: "File path to read", type: "string" },
      },
      required: ["path"],
      type: "object",
    },
  },
];

const outputSchema = `interface ResearchResult {
  answer: string;
  sources: string[];
  confidence: number;
}`;

export function AgentDemo() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-lg py-8">
      <Agent>
        <AgentHeader model="claude-3-opus" name="Research Assistant" />
        <AgentContent>
          <AgentInstructions>
            You are a helpful research assistant. Search the web for information
            and provide accurate, well-sourced answers.
          </AgentInstructions>
          <AgentTools>
            {tools.map((tool, index) => (
              <AgentTool
                key={tool.description}
                tool={tool}
                value={`tool-${index}`}
              />
            ))}
          </AgentTools>
          <AgentOutput schema={outputSchema} />
        </AgentContent>
      </Agent>
    </div>
  );
}
