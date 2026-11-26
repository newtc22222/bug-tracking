"use client";

import type { FeedbackStatus } from "@prisma/client";
import { getAllowedNextStatuses, type WorkflowNodeMeta } from "@/lib/workflow";

type WorkflowGraphProps = {
  currentStatus?: FeedbackStatus;
  onSelectStatus?: (next: FeedbackStatus) => void;
  disabled?: boolean;
  compact?: boolean;
};

type LinearNode = {
  status: FeedbackStatus;
  label: string;
  shortDescription: string;
  x: number;
  y: number;
  tone: WorkflowNodeMeta["tone"];
};

const NODE_W = 114;
const NODE_H = 40;

const LINEAR_NODES: readonly LinearNode[] = [
  { status: "open", label: "Open", shortDescription: "New untriaged report", x: 92, y: 140, tone: "blue" },
  { status: "todo", label: "To Do", shortDescription: "Queued for work", x: 274, y: 140, tone: "indigo" },
  { status: "in_progress", label: "In Progress", shortDescription: "Actively being fixed", x: 468, y: 140, tone: "amber" },
  { status: "resolved", label: "Resolved", shortDescription: "Fix shipped", x: 662, y: 140, tone: "emerald" },
  { status: "closed", label: "Closed", shortDescription: "Verified or dismissed", x: 848, y: 140, tone: "slate" },
  { status: "blocked", label: "Blocked", shortDescription: "Waiting on dependency", x: 468, y: 246, tone: "rose" },
];

type OrthogonalEdge = {
  from: FeedbackStatus;
  to: FeedbackStatus;
  points: string;
  dashed?: boolean;
  label?: string;
  labelPos?: [number, number];
};

// Every connector is a crisp linear / orthogonal polyline (no tangled bezier curves)
const ORTHOGONAL_EDGES: readonly OrthogonalEdge[] = [
  // Primary linear spine (left -> right)
  { from: "open", to: "todo", points: "149,140 215,140" },
  { from: "todo", to: "in_progress", points: "331,140 409,140" },
  { from: "in_progress", to: "resolved", points: "525,140 603,140" },
  { from: "resolved", to: "closed", points: "719,140 789,140" },

  // Express forward rails (top)
  { from: "open", to: "in_progress", points: "110,120 110,64 452,64 452,118", label: "Start fast", labelPos: [280, 58] },
  { from: "open", to: "closed", points: "74,120 74,22 864,22 864,118", label: "Dismiss / Duplicate", labelPos: [468, 16] },
  { from: "todo", to: "closed", points: "274,120 274,42 832,42 832,118" },

  // Backtrack / reopen rails (dashed linear lines)
  { from: "todo", to: "open", points: "256,120 256,94 128,94 128,118", dashed: true },
  { from: "in_progress", to: "todo", points: "436,120 436,94 294,94 294,118", dashed: true },
  { from: "resolved", to: "in_progress", points: "662,120 662,84 486,84 486,118", dashed: true, label: "Reopen fix", labelPos: [574, 78] },
  { from: "closed", to: "open", points: "864,160 864,306 74,306 74,162", dashed: true, label: "Reopen", labelPos: [468, 300] },

  // Blocked vertical & lower linear lanes
  { from: "in_progress", to: "blocked", points: "484,160 484,224" },
  { from: "blocked", to: "in_progress", points: "452,226 452,162", dashed: true },
  { from: "open", to: "blocked", points: "106,160 106,256 409,256" },
  { from: "todo", to: "blocked", points: "290,160 290,236 409,236" },
  { from: "blocked", to: "todo", points: "411,246 258,246 258,162", dashed: true },
  { from: "blocked", to: "closed", points: "525,246 832,246 832,162" },
];

const TONE_STYLES: Record<
  WorkflowNodeMeta["tone"],
  { fill: string; stroke: string; text: string; activeFill: string }
> = {
  blue: { fill: "#eff6ff", stroke: "#2563eb", text: "#1d4ed8", activeFill: "#2563eb" },
  indigo: { fill: "#eef2ff", stroke: "#4f46e5", text: "#4338ca", activeFill: "#4f46e5" },
  amber: { fill: "#fffbeb", stroke: "#d97706", text: "#b45309", activeFill: "#d97706" },
  rose: { fill: "#fff1f2", stroke: "#e11d48", text: "#be123c", activeFill: "#e11d48" },
  emerald: { fill: "#ecfdf5", stroke: "#059669", text: "#047857", activeFill: "#059669" },
  slate: { fill: "#f1f5f9", stroke: "#475569", text: "#334155", activeFill: "#334155" },
};

export default function WorkflowGraph({
  currentStatus,
  onSelectStatus,
  disabled = false,
  compact = false,
}: WorkflowGraphProps) {
  const allowedNext = currentStatus ? getAllowedNextStatuses(currentStatus) : [];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 940 326"
        className={`w-full ${compact ? "min-w-[460px]" : "min-w-[700px]"} h-auto select-none`}
        role="img"
        aria-label="Strict ticket status workflow diagram with linear connectors"
      >
        <defs>
          <marker
            id="wf-lin-arrow"
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto"
          >
            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#94a3b8" />
          </marker>
          <marker
            id="wf-lin-arrow-active"
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* Orthogonal linear connectors */}
        {ORTHOGONAL_EDGES.map((edge) => {
          const isActiveEdge = currentStatus === edge.from;
          return (
            <g key={`${edge.from}->${edge.to}`}>
              <polyline
                points={edge.points}
                fill="none"
                stroke={isActiveEdge ? "#2563eb" : "#94a3b8"}
                strokeWidth={isActiveEdge ? 2.1 : 1.35}
                strokeLinejoin="round"
                strokeDasharray={edge.dashed ? "4 3" : undefined}
                markerEnd={isActiveEdge ? "url(#wf-lin-arrow-active)" : "url(#wf-lin-arrow)"}
                opacity={currentStatus ? (isActiveEdge ? 1 : 0.25) : 0.72}
              />
              {!compact && edge.label && edge.labelPos && (!currentStatus || isActiveEdge) && (
                <text
                  x={edge.labelPos[0]}
                  y={edge.labelPos[1]}
                  textAnchor="middle"
                  fill={isActiveEdge ? "#2563eb" : "#64748b"}
                  fontSize={10}
                  fontWeight={500}
                  fontFamily="var(--font-mono)"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Status Nodes */}
        {LINEAR_NODES.map((node) => {
          const style = TONE_STYLES[node.tone];
          const isCurrent = currentStatus === node.status;
          const isReachable = allowedNext.includes(node.status);
          const isClickable = Boolean(onSelectStatus && isReachable && !disabled);
          const isDimmed = Boolean(currentStatus && !isCurrent && !isReachable);

          return (
            <g
              key={node.status}
              transform={`translate(${node.x - NODE_W / 2}, ${node.y - NODE_H / 2})`}
              onClick={() => {
                if (isClickable && onSelectStatus) {
                  onSelectStatus(node.status);
                }
              }}
              className={isClickable ? "cursor-pointer" : undefined}
              opacity={isDimmed ? 0.35 : 1}
            >
              <title>
                {node.label}: {node.shortDescription}
                {isCurrent
                  ? " (Current status)"
                  : isReachable
                    ? " (Click to transition)"
                    : currentStatus
                      ? " (Not reachable from current status)"
                      : ""}
              </title>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={isCurrent ? style.activeFill : style.fill}
                stroke={isReachable ? "#2563eb" : style.stroke}
                strokeWidth={isCurrent || isReachable ? 2 : 1.5}
              />
              <text
                x={NODE_W / 2}
                y={NODE_H / 2 + 4}
                textAnchor="middle"
                fill={isCurrent ? "#ffffff" : style.text}
                fontSize={12.5}
                fontWeight={600}
                fontFamily="var(--font-sans)"
              >
                {node.label}
              </text>
              {isReachable && onSelectStatus && (
                <circle cx={NODE_W - 10} cy={10} r={3.5} fill="#2563eb" />
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {currentStatus && onSelectStatus
            ? "Strict workflow active: click any highlighted next state to transition immediately."
            : "Strict workflow: solid linear lines = forward / active transitions · dashed = reopen / backtrack."}
        </span>
      </div>
    </div>
  );
}
