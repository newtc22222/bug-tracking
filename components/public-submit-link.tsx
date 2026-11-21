"use client";

import { useState } from "react";

export default function PublicSubmitLink({ slug }: { slug: string }) {
  const path = `/submit/${slug}`;
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    const publicUrl = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-6 rounded-md border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Public feedback link</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-sm text-slate-700">{path}</code>
        <button
          type="button"
          onClick={copyUrl}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
