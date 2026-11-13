"use client";

import {
  CopyIcon,
  DownloadIcon,
  PlayIcon,
  RefreshCwIcon,
  ShareIcon,
} from "lucide-react";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ui/artifact";
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockLine,
} from "@/components/ui/code-block";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";

const code = `# Dijkstra's Algorithm implementation
import heapq

def dijkstra(graph, start):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    heap = [(0, start)]
    visited = set()

    while heap:
        current_distance, current_node = heapq.heappop(heap)
        if current_node in visited:
            continue
        visited.add(current_node)

        for neighbor, weight in graph[current_node].items():
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(heap, (distance, neighbor))

    return distances`;

const ArtifactDemo = () => {
  const lines = useHighlightedCode(code, "python");

  return (
    <Artifact className="h-96 w-full max-w-2xl">
      <ArtifactHeader>
        <div className="min-w-0">
          <ArtifactTitle>Dijkstra's Algorithm</ArtifactTitle>
          <ArtifactDescription>Updated 1 minute ago</ArtifactDescription>
        </div>
        <ArtifactActions>
          <ArtifactAction icon={PlayIcon} tooltip="Run code" />
          <ArtifactAction icon={CopyIcon} tooltip="Copy to clipboard" />
          <ArtifactAction icon={RefreshCwIcon} tooltip="Regenerate" />
          <ArtifactAction icon={DownloadIcon} tooltip="Download" />
          <ArtifactAction icon={ShareIcon} tooltip="Share" />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <CodeBlock className="rounded-none border-0">
          <CodeBlockContent lineNumbers>
            {lines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a line is its place in the code.
              <CodeBlockLine key={index}>{line}</CodeBlockLine>
            ))}
          </CodeBlockContent>
        </CodeBlock>
      </ArtifactContent>
    </Artifact>
  );
};
