"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { ExternalLinkIcon, XIcon } from "@/components/ui-icons";

type SurfaceShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  fullPageHref?: string;
  headerActions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
};

function useNativeDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

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
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback light-dismiss for browsers without native <dialog closedby="any">
    let cleanupFallback: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutside = (event: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (event: PointerEvent) => {
        pressedOutside = isOutside(event);
      };
      const onPointerUp = (event: PointerEvent) => {
        if (pressedOutside && isOutside(event)) {
          dialog.close();
        }
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  return dialogRef;
}

export function ModalShell({
  open,
  title,
  subtitle,
  fullPageHref,
  headerActions,
  onClose,
  children,
  size = "lg",
}: SurfaceShellProps) {
  const titleId = useId();
  const dialogRef = useNativeDialog(open, onClose);

  const widthMap = {
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      className={`bt-surface-dialog m-auto max-h-[90vh] w-[calc(100vw-2rem)] ${widthMap[size]} overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0 shadow-2xl`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
        <div className="min-w-0">
          <h1 id={titleId} className="truncate text-base font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {fullPageHref && (
            <Link
              href={fullPageHref}
              onClick={onClose}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <span>Full page</span>
              <ExternalLinkIcon className="h-3 w-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bt-scroller flex-1 overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}

export function DrawerShell({
  open,
  title,
  subtitle,
  fullPageHref,
  headerActions,
  onClose,
  children,
  size = "lg",
}: SurfaceShellProps) {
  const titleId = useId();
  const dialogRef = useNativeDialog(open, onClose);

  const widthMap = {
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      className={`bt-surface-dialog m-0 ml-auto h-full max-h-none w-full ${widthMap[size]} overflow-hidden border-l border-slate-200 bg-slate-50 p-0 shadow-2xl`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
        <div className="min-w-0">
          <h1 id={titleId} className="truncate text-base font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {fullPageHref && (
            <Link
              href={fullPageHref}
              onClick={onClose}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <span>Full page</span>
              <ExternalLinkIcon className="h-3 w-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close drawer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bt-scroller flex-1 overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
