"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { TrashIcon, XIcon } from "@/components/ui-icons";

type ConfirmDangerModalProps = {
  open: boolean;
  title: string;
  description: string;
  consequences?: string[];
  confirmPhrase: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export default function ConfirmDangerModal({
  open,
  title,
  description,
  consequences = [],
  confirmPhrase,
  confirmLabel = "Permanently Delete",
  busy = false,
  error = "",
  onConfirm,
  onClose,
}: ConfirmDangerModalProps) {
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      setTyped("");
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!open) return null;

  const matches = typed.trim() === confirmPhrase;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!matches || busy) return;
    await onConfirm();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="bt-surface-dialog m-auto w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-xl border border-red-200 bg-white p-0 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-red-200/80 bg-red-50/70 px-5 py-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
            <TrashIcon className="h-3.5 w-3.5" />
          </span>
          <div>
            <h1 id={titleId} className="text-sm font-semibold text-slate-950">
              {title}
            </h1>
            <p id={descId} className="mt-0.5 text-xs text-slate-600">
              {description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close confirmation"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
        {consequences.length > 0 && (
          <ul className="list-disc space-y-1 rounded-lg border border-red-200/70 bg-red-50/40 py-2.5 pr-3 pl-7 text-xs text-red-700">
            {consequences.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        )}

        <div>
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-700">
            Type{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-950 select-all">
              {confirmPhrase}
            </code>{" "}
            to confirm:
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          {/* Safe action receives autofocus per modern-web-guidance: dialog */}
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!matches || busy}
            className="h-9 rounded-md bg-red-600 px-3.5 text-xs font-medium text-white shadow-2xs transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
