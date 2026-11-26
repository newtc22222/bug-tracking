import type { FeedbackSource, FeedbackType } from "@prisma/client";

type IconProps = {
  className?: string;
};

export function BrandMarkIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="12" height="12" rx="3" />
      <path d="M5.5 6.5h5M5.5 9.5h3" />
    </svg>
  );
}

export function FeedbackTypeIcon({
  type,
  className = "h-3.5 w-3.5",
}: {
  type: FeedbackType;
  className?: string;
}) {
  switch (type) {
    case "bug":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M5.5 5.5V4.25a2.5 2.5 0 0 1 5 0V5.5" />
          <rect x="4.5" y="5.5" width="7" height="7" rx="3" />
          <path d="M2.5 7.5h2M11.5 7.5h2M2.5 10.5h2M11.5 10.5h2M8 5.5v7" />
        </svg>
      );
    case "improvement":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7" />
        </svg>
      );
    case "feature":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M8 2.25 9.4 6l3.85 1.4-3.85 1.4L8 12.65 6.6 8.8 2.75 7.4 6.6 6 8 2.25Z" />
        </svg>
      );
    case "question":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="8" cy="8" r="5.75" />
          <path d="M6.4 6.35a1.75 1.75 0 0 1 3.35.7c0 1.05-1.75 1.35-1.75 2.35" />
          <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function FeedbackSourceIcon({
  source,
  className = "h-3 w-3",
}: {
  source: FeedbackSource;
  className?: string;
}) {
  switch (source) {
    case "manual":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M11.2 2.8a1.7 1.7 0 0 1 2.4 2.4L5.5 13.3 2.5 14l.7-3L11.2 2.8Z" />
        </svg>
      );
    case "public_form":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5a8.2 8.2 0 0 1 0 11M8 2.5a8.2 8.2 0 0 0 0 11" />
        </svg>
      );
    case "extension":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M6 3.5a1.5 1.5 0 1 1 3 0V5h3v3h1.5a1.5 1.5 0 1 1 0 3H12v2.5H3.5V5H6V3.5Z" />
        </svg>
      );
    case "api":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3.5 7 12.5" />
        </svg>
      );
  }
}

export function SearchIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}

export function SlidersIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 4.5h11M2.5 11.5h11M6 2.5v4M10 9.5v4" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 2.5v7.5M5 7.5 8 10.5l3-3M2.5 12.5v1h11v-1" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.5 3.5H3.5v9h9v-3M9.5 2.5h4v4M13.5 2.5 7.5 8.5" />
    </svg>
  );
}

export function CheckIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m3.5 8.5 3 3 6-6.5" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M13 8H3.5M7 4 3 8l4 4" />
    </svg>
  );
}

export function LogOutIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 2.5H3.5v11H6M10.5 11l3-3-3-3M13.5 8H6" />
    </svg>
  );
}

export function PlusIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </svg>
  );
}

export function SparklesIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 2.25 8.15 5.6 11.5 6.75 8.15 7.9 7 11.25 5.85 7.9 2.5 6.75 5.85 5.6 7 2.25Z" />
      <path d="M12.25 10.25 12.75 11.75 14.25 12.25 12.75 12.75 12.25 14.25 11.75 12.75 10.25 12.25 11.75 11.75 12.25 10.25Z" />
    </svg>
  );
}

export function GitHubIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8 1.5a6.5 6.5 0 0 0-2.055 12.667c.325.06.444-.14.444-.313 0-.155-.006-.668-.009-1.212-1.807.392-2.188-.766-2.188-.766-.296-.75-.722-.95-.722-.95-.59-.403.045-.395.045-.395.652.046.996.67.996.67.58.993 1.52.706 1.891.54.059-.42.227-.707.412-.87-1.442-.164-2.958-.72-2.958-3.208 0-.709.253-1.288.668-1.742-.067-.164-.29-.824.063-1.718 0 0 .545-.174 1.787.666a6.22 6.22 0 0 1 3.255 0c1.241-.84 1.785-.666 1.785-.666.354.894.132 1.554.065 1.718.416.454.667 1.033.667 1.742 0 2.494-1.518 3.042-2.964 3.203.233.201.44.597.44 1.203 0 .87-.008 1.57-.008 1.784 0 .174.118.376.447.312A6.501 6.501 0 0 0 8 1.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function TrashIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
    </svg>
  );
}

export function MaximizeIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M10 2.5h3.5V6M6 13.5H2.5V10M13.5 2.5 9.5 6.5M2.5 13.5l4-4" />
    </svg>
  );
}

export function XIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function CopyIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.25" />
      <path d="M10.5 5.5V3.75A1.25 1.25 0 0 0 9.25 2.5h-5.5A1.25 1.25 0 0 0 2.5 3.75v5.5a1.25 1.25 0 0 0 1.25 1.25H5.5" />
    </svg>
  );
}

export function KeyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="5.5" cy="8.5" r="2.75" />
      <path d="M7.75 6.75 13 2m-1.75 1.75L13 5.5M9.75 5l1.25 1.25" />
    </svg>
  );
}

export function InboxIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 9.5h3l1.25 1.75h2.5L10.5 9.5h3" />
      <path d="M3.5 3h9l1 6.5v3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-3L3.5 3Z" />
    </svg>
  );
}

export function FolderIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 4.25A1.25 1.25 0 0 1 3.75 3H6.5l1.5 1.5h4.25A1.25 1.25 0 0 1 13.5 5.75v6A1.25 1.25 0 0 1 12.25 13h-8.5A1.25 1.25 0 0 1 2.5 11.75v-7.5Z" />
    </svg>
  );
}

export function EyeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M1.75 8s2.25-4 6.25-4 6.25 4 6.25 4-2.25 4-6.25 4-6.25-4-6.25-4Z" />
      <circle cx="8" cy="8" r="1.75" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m2.5 2.5 11 11M6.4 6.5a2 2 0 0 0 3.1 3.1M4.3 4.8C2.7 5.8 1.75 8 1.75 8s2.25 4 6.25 4c1.25 0 2.35-.4 3.25-.95M7.2 4.05c.26-.03.53-.05.8-.05 4 0 6.25 4 6.25 4s-.65 1.15-1.75 2.15" />
    </svg>
  );
}

export function ClockIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3l2 1.25" />
    </svg>
  );
}

export function DashboardIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.25" y="2.25" width="4.75" height="5.5" rx="1" />
      <rect x="9" y="2.25" width="4.75" height="3.5" rx="1" />
      <rect x="9" y="7.75" width="4.75" height="6" rx="1" />
      <rect x="2.25" y="9.75" width="4.75" height="4" rx="1" />
    </svg>
  );
}

export function SettingsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.75 3.75l1.05 1.05M11.2 11.2l1.05 1.05M12.25 3.75l-1.05 1.05M4.8 11.2l-1.05 1.05" />
    </svg>
  );
}

export function BookOpenIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.25 3.5h3.5A2.25 2.25 0 0 1 8 5.75v7.5a1.75 1.75 0 0 0-1.75-1.75h-4v-8Z" />
      <path d="M13.75 3.5h-3.5A2.25 2.25 0 0 0 8 5.75v7.5a1.75 1.75 0 0 1 1.75-1.75h4v-8Z" />
    </svg>
  );
}

export function PanelLeftIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.25" y="2.5" width="11.5" height="11" rx="1.5" />
      <path d="M6 2.5v11" />
    </svg>
  );
}

export function KanbanIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2.5" width="3.25" height="9" rx="0.75" />
      <rect x="6.4" y="2.5" width="3.25" height="6" rx="0.75" />
      <rect x="10.75" y="2.5" width="3.25" height="11" rx="0.75" />
    </svg>
  );
}

export function ListIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5" />
    </svg>
  );
}

export function GridIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.25" y="2.25" width="4.75" height="4.75" rx="1" />
      <rect x="9" y="2.25" width="4.75" height="4.75" rx="1" />
      <rect x="2.25" y="9" width="4.75" height="4.75" rx="1" />
      <rect x="9" y="9" width="4.75" height="4.75" rx="1" />
    </svg>
  );
}

export function LinkChainIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.75 9.25 9.25 6.75" />
      <path d="M5.5 10.5 4.25 11.75a2.12 2.12 0 1 1-3-3L2.5 7.5" />
      <path d="M10.5 5.5 11.75 4.25a2.12 2.12 0 1 1 3 3L13.5 8.5" />
    </svg>
  );
}

export function GitBranchIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="4.5" cy="3.5" r="1.5" />
      <circle cx="4.5" cy="12.5" r="1.5" />
      <circle cx="11.5" cy="6" r="1.5" />
      <path d="M4.5 5v6M11.5 7.5c0 2.5-7 1.5-7 3.5" />
    </svg>
  );
}

export function WorkflowIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2.5" width="4" height="3.5" rx="0.75" />
      <rect x="10" y="2.5" width="4" height="3.5" rx="0.75" />
      <rect x="6" y="10" width="4" height="3.5" rx="0.75" />
      <path d="M6 4.25h4M12 6v1.5a1 1 0 0 1-1 1H8v1.5" />
    </svg>
  );
}

export function RefreshIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M13 8a5 5 0 1 1-1.4-3.45M13 3v2.5h-2.5" />
    </svg>
  );
}

export function MenuIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 4.25h11M2.5 8h11M2.5 11.75h11" />
    </svg>
  );
}

export function BotIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.5" y="4.5" width="11" height="8.5" rx="2" />
      <path d="M8 2.25v2.25M5.75 8.5h.01M10.25 8.5h.01M6 10.75h4" />
    </svg>
  );
}

export function HelpCircleIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="8" cy="8" r="5.75" />
      <path d="M6.4 6.25a1.65 1.65 0 0 1 3.15.65c0 1-1.55 1.25-1.55 2.15" />
      <circle cx="8" cy="11.4" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
