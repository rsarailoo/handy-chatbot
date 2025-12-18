import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTheme } from "./theme-provider";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const { theme } = useTheme();

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }} dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;
            
            if (isInline) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground break-words"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match[1] || "text"} theme={theme}>
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            );
          },
          pre({ children }) {
            // Pre is handled by code component, but we need to handle it for proper rendering
            return <>{children}</>;
          },
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt}
                className="rounded-lg my-3 max-w-full h-auto"
                loading="lazy"
              />
            );
          },
          hr() {
            return <hr className="my-4 border-border" />;
          },
          strong({ children }) {
            return <strong className="font-semibold break-words">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic break-words">{children}</em>;
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-3 list-disc pr-6 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 list-decimal pr-6 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-2 mt-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-r-4 border-primary/30 pr-4 my-3 text-muted-foreground italic">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 border border-border rounded-lg">
                <table className="min-w-full divide-y divide-border">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-border">{children}</tbody>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-right font-semibold text-foreground">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 text-foreground">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps {
  children: string;
  language: string;
  theme: "light" | "dark";
}

function CodeBlock({ children, language, theme }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-muted/80 backdrop-blur-sm px-3 py-1.5 text-xs">
        <span className="text-muted-foreground font-mono font-body">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 hover:bg-background/50"
          data-testid="button-copy-code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 ml-1.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-body">کپی شد</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 ml-1.5" />
              <span className="text-xs font-body">کپی</span>
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        style={theme === "dark" ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.875rem",
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
