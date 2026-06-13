"use client";

import { memo, useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckIcon, CopyIcon } from "../icons";

const SHIKI_THEMES = { light: "github-light", dark: "github-dark" } as const;

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  // Highlighted result is tagged with the exact code it was produced from, so
  // we only ever show it when it matches the *current* code. While streaming,
  // `code` keeps changing → we show the plain (always-current) text instead,
  // and (debounced) re-run Shiki once the stream settles.
  const [hl, setHl] = useState<{ code: string; html: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { codeToHtml } = await import("shiki");
      const render = (language: string) =>
        codeToHtml(code, {
          lang: language,
          themes: SHIKI_THEMES,
          defaultColor: "light",
        });
      try {
        const html = await render(lang || "text");
        if (!cancelled) setHl({ code, html });
      } catch {
        try {
          const html = await render("text");
          if (!cancelled) setHl({ code, html });
        } catch {}
      }
    }, 140);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, lang]);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const showHighlighted = hl?.code === code;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-surface-2/50">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
          {lang || "text"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          {copied ? (
            <CheckIcon width={13} height={13} className="text-accent" />
          ) : (
            <CopyIcon width={13} height={13} />
          )}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {showHighlighted ? (
        <div dangerouslySetInnerHTML={{ __html: hl.html }} />
      ) : (
        <pre className="overflow-x-auto px-[0.9rem] py-3.5 font-mono text-[13px] leading-[1.6] text-text/90">
          <code className="whitespace-pre">{code}</code>
        </pre>
      )}
    </div>
  );
}

const components: Components = {
  // unwrap <pre>; CodeBlock renders shiki's own <pre>
  pre: ({ children }) => <>{children}</>,
  code({ className, children, node: _node, ...rest }) {
    const text = String(children).replace(/\n$/, "");
    const match = /language-(\w+)/.exec(className || "");
    const isBlock = !!match || text.includes("\n");
    if (!isBlock) {
      return (
        <code
          className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-text"
          {...rest}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock code={text} lang={match?.[1]} />;
  },
  a: ({ children, ...props }) => (
    <a
      className="text-accent underline underline-offset-2 transition-colors hover:text-accent-hover"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  p: ({ children }) => (
    <p className="my-2.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 ml-5 list-disc space-y-1.5 marker:text-faint">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-5 list-decimal space-y-1.5 marker:text-faint">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 text-xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-base font-semibold first:mt-0">{children}</h3>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-border-strong pl-3 text-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-surface-2 px-3 py-1.5 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-1.5">{children}</td>
  ),
};

function MarkdownImpl({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

// memoized so only the streaming message re-parses on each token
export const Markdown = memo(MarkdownImpl);
