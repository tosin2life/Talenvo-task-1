import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownProps = {
  value: string;
  className?: string;
};

export function MarkdownRenderer({ value, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        a: (props: any) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          />
        ),
        code: ({
          inline,
          className: codeClassName,
          children,
          ...props
        }: any) => {
          if (inline) {
            return (
              <code
                className={`rounded bg-slate-900/80 px-1.5 py-0.5 text-xs ${codeClassName ?? ""}`}
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <pre className="overflow-x-auto rounded-md bg-slate-900/80 p-3 text-xs">
              <code className={codeClassName} {...props}>
                {children}
              </code>
            </pre>
          );
        },
      }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}

