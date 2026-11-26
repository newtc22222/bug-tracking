"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "@/components/ui-icons";

export default function PublicSubmitLink({ slug }: { slug: string }) {
  const path = `/submit/${slug}`;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function copyUrl() {
    const publicUrl = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Public feedback form
        </h2>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-950"
        >
          <span>Open</span>
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 p-1.5 pl-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{path}</code>
        <button
          type="button"
          onClick={copyUrl}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:text-slate-950"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Public feedback URL copied to clipboard." : ""}
      </span>
    </section>
  );
}
