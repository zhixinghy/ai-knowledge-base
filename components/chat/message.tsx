import { Logo } from "../icons";
import { Markdown } from "./markdown";
import { Sources } from "./sources";
import { ToolCallList } from "./tool-call";
import type { ChatMessage } from "@/lib/types";

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-user-bubble px-4 py-2.5 text-user-bubble-fg">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  const showCaret = message.streaming;
  const hasText = message.content.length > 0;

  return (
    <div className="animate-fade-up flex gap-3.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
        <Logo className="h-7 w-7" />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallList calls={message.toolCalls} />
        )}

        <div className="leading-relaxed text-text/90">
          {hasText && <Markdown content={message.content} />}
          {showCaret &&
            (hasText ? (
              <span className="caret" />
            ) : (
              <ThinkingDots />
            ))}
        </div>

        {!message.streaming && message.sources && message.sources.length > 0 && (
          <Sources sources={message.sources} />
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle text-faint">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}
