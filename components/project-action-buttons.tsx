"use client";

import { PlusIcon } from "@/components/ui-icons";
import { useWorkspace } from "@/components/workspace-provider";

export function NewProjectButton({ label = "New Project" }: { label?: string }) {
  const { openNewProject } = useWorkspace();
  return (
    <button
      type="button"
      onClick={openNewProject}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function NewFeedbackButton({
  projectId,
  label = "New Ticket",
}: {
  projectId?: string;
  label?: string;
}) {
  const { openNewFeedback } = useWorkspace();
  return (
    <button
      type="button"
      onClick={() => openNewFeedback(projectId)}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
