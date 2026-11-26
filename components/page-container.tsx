"use client";

import { useWorkspace } from "@/components/workspace-provider";
import { layoutWidthClass } from "@/lib/feedback-display";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  forceFull?: boolean;
};

export default function PageContainer({
  children,
  className = "",
  forceFull = false,
}: PageContainerProps) {
  const { settings } = useWorkspace();
  const widthClass = forceFull ? "w-full max-w-none" : layoutWidthClass(settings.layoutWidth);

  return (
    <main className={`${widthClass} px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </main>
  );
}
