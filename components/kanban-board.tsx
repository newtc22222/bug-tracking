"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { FeedbackStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FeedbackListItem } from "@/components/feedback-list-view";
import { FeedbackTypeIcon, PlusIcon } from "@/components/ui-icons";
import { useWorkspace } from "@/components/workspace-provider";
import {
  priorityBadgeClass,
  priorityLabels,
  statusColumnAccentClass,
  statusLabels,
  statusOptions,
  typeAccentClass,
} from "@/lib/feedback-display";
import { canTransitionStatus, getTransitionErrorMessage } from "@/lib/workflow";

type KanbanBoardProps = {
  items: FeedbackListItem[];
  projectId?: string;
};

export default function KanbanBoard({ items, projectId }: KanbanBoardProps) {
  const router = useRouter();
  const { openTicket, openNewFeedback } = useWorkspace();
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, FeedbackStatus>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(true);
  const [toastError, setToastError] = useState("");

  const boardItems = useMemo(
    () =>
      items.map((item) =>
        optimisticStatus[item.id] ? { ...item, status: optimisticStatus[item.id] } : item,
      ),
    [items, optimisticStatus],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeItem = activeId ? boardItems.find((i) => i.id === activeId) ?? null : null;
  const visibleStatuses = showClosed
    ? statusOptions
    : statusOptions.filter((s) => s !== "closed");

  function handleDragStart(event: DragStartEvent) {
    setToastError("");
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const draggedId = String(event.active.id);
    const overColumn = event.over?.id ? (String(event.over.id) as FeedbackStatus) : null;
    setActiveId(null);

    if (!overColumn) return;
    const item = boardItems.find((i) => i.id === draggedId);
    if (!item || item.status === overColumn) return;

    if (!canTransitionStatus(item.status, overColumn)) {
      setToastError(getTransitionErrorMessage(item.status, overColumn));
      return;
    }

    setOptimisticStatus((prev) => ({ ...prev, [draggedId]: overColumn }));

    try {
      const res = await fetch(`/api/feedback/${draggedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: overColumn }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Transition failed.");
      }
      router.refresh();
    } catch (err) {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[draggedId];
        return next;
      });
      setToastError(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          Drag cards across columns.{" "}
          <span className="font-medium text-slate-700">Strict workflow enabled:</span> valid next
          columns highlight while dragging.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-slate-600 select-none">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="rounded border-slate-300"
          />
          <span>Show Closed column</span>
        </label>
      </div>

      {toastError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800"
        >
          <span>{toastError}</span>
          <button
            type="button"
            onClick={() => setToastError("")}
            className="underline hover:text-rose-950"
          >
            Dismiss
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="bt-scroller flex gap-3.5 overflow-x-auto pb-4">
          {visibleStatuses.map((status) => {
            const colItems = boardItems.filter((item) => item.status === status);
            const isDragging = Boolean(activeItem);
            const isValidTarget =
              !activeItem || activeItem.status === status || canTransitionStatus(activeItem.status, status);

            return (
              <KanbanColumn
                key={status}
                status={status}
                items={colItems}
                isDragging={isDragging}
                isValidTarget={isValidTarget}
                onOpenTicket={openTicket}
                onAddTicket={() => openNewFeedback(projectId)}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="w-[272px] rotate-1 rounded-xl border border-slate-900 bg-white p-3.5 shadow-xl">
              <KanbanCardBody item={activeItem} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  status,
  items,
  isDragging,
  isValidTarget,
  onOpenTicket,
  onAddTicket,
}: {
  status: FeedbackStatus;
  items: FeedbackListItem[];
  isDragging: boolean;
  isValidTarget: boolean;
  onOpenTicket: (id: string) => void;
  onAddTicket: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !isValidTarget,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 flex-col rounded-xl border transition ${
        isDragging && !isValidTarget
          ? "border-dashed border-slate-200 bg-slate-100/50 opacity-45"
          : isOver && isValidTarget
            ? "border-slate-900 bg-slate-100/80 ring-2 ring-slate-900/15"
            : isDragging && isValidTarget
              ? "border-emerald-300 bg-emerald-50/20"
              : "border-slate-200/80 bg-slate-100/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusColumnAccentClass(status)}`} />
          <h3 className="truncate text-xs font-semibold text-slate-900">{statusLabels[status]}</h3>
          <span className="rounded-full bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 tabular-nums">
            {items.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isDragging && !isValidTarget && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              Locked
            </span>
          )}
          {(status === "open" || status === "todo") && (
            <button
              type="button"
              onClick={onAddTicket}
              title={`Add ticket in ${statusLabels[status]}`}
              className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-slate-900"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="bt-scroller flex max-h-[calc(100vh-290px)] min-h-[240px] flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200/90 px-3 py-8 text-center text-[11px] text-slate-400">
            {isDragging && isValidTarget ? "Drop here" : "No tickets"}
          </div>
        ) : (
          items.map((item) => (
            <DraggableKanbanCard key={item.id} item={item} onOpenTicket={onOpenTicket} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableKanbanCard({
  item,
  onOpenTicket,
}: {
  item: FeedbackListItem;
  onOpenTicket: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-400 active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <KanbanCardBody item={item} onClickTitle={() => onOpenTicket(item.id)} />
    </article>
  );
}

function KanbanCardBody({
  item,
  onClickTitle,
}: {
  item: FeedbackListItem;
  onClickTitle?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-slate-500">
          {item.ticketKey || item.id.slice(0, 8)}
        </span>
        {item.priority && (
          <span className={priorityBadgeClass(item.priority)}>
            {priorityLabels[item.priority]}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClickTitle?.();
        }}
        className="block w-full text-left text-xs font-semibold leading-snug text-slate-950 hover:underline underline-offset-2 line-clamp-2"
      >
        {item.title}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
        <span className={`inline-flex items-center gap-1 font-medium ${typeAccentClass(item.type)}`}>
          <FeedbackTypeIcon type={item.type} className="h-3 w-3" />
          <span className="capitalize">{item.type}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {item.project && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              {item.project.slug}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
