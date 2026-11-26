"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type MarkdownViewProps = {
  content: string;
  className?: string;
};

export default function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  return (
    <div className={`bt-prose break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
