import { buttonVariants } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface Source {
  description: string;
  title: string;
  url: string;
}

const sources = {
  chunked: {
    description: "Send a response as a series of chunks.",
    title: "Transfer-Encoding",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Transfer-Encoding",
  },
  loading: {
    description: "Show an instant loading state for a route segment.",
    title: "loading.js",
    url: "https://nextjs.org/docs/app/api-reference/file-conventions/loading",
  },
  serverComponents: {
    description: "Components that render ahead of time, on the server.",
    title: "Server Components",
    url: "https://react.dev/reference/rsc/server-components",
  },
  streaming: {
    description: "How the App Router streams a route to the browser.",
    title: "Linking and Navigating",
    url: "https://nextjs.org/docs/app/getting-started/linking-and-navigating#streaming",
  },
  suspense: {
    description: "Display a fallback until its children have finished loading.",
    title: "<Suspense>",
    url: "https://react.dev/reference/react/Suspense",
  },
} satisfies Record<string, Source>;

const WWW = /^www\./;

function hostname(url: string) {
  return new URL(url).hostname.replace(WWW, "");
}

function Citation({ source }: { source: Source }) {
  const host = hostname(source.url);

  return (
    <HoverCard closeDelay={100} openDelay={10}>
      {/* The chip is the link, so a keyboard, a tap or a screen reader can
          follow it: the card is a preview that hover and focus open. */}
      <HoverCardTrigger asChild>
        <a
          className={buttonVariants({ size: "xs", variant: "secondary" })}
          href={source.url}
          rel="noreferrer"
          target="_blank"
        >
          {host}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="flex w-64 flex-col gap-1">
        <div className="font-medium">{source.title}</div>
        <p className="text-muted-foreground">{source.description}</p>
        <a
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          href={source.url}
          rel="noreferrer"
          target="_blank"
        >
          {host}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </HoverCardContent>
    </HoverCard>
  );
}

export function InlineCitationDemo() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3 py-6 text-sm leading-relaxed">
      <p>
        Next.js streams a route in chunks, so the page shows up before every
        request finishes. <Citation source={sources.streaming} />
      </p>
      <p>
        Wrap a slow part of the page in a Suspense boundary and React sends the
        fallback first. When the data resolves, the finished HTML streams into
        the same response and replaces the fallback, with no extra request from
        the browser. <Citation source={sources.suspense} /> Server Components
        help here, because their code never ships to the browser.{" "}
        <Citation source={sources.serverComponents} />
      </p>
      <p>
        A loading.tsx file does the same for a whole route segment.{" "}
        <Citation source={sources.loading} /> It all runs over chunked transfer
        encoding, so there is nothing extra to set up.{" "}
        <Citation source={sources.chunked} />
      </p>
    </div>
  );
}
