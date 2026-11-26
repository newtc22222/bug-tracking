import AdminSidebar from "@/components/admin-sidebar";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceSettings } from "@/lib/workspace-settings";

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const [settings, openCount, rawProjects, labels, rawViews] = await Promise.all([
    getWorkspaceSettings(),
    prisma.feedbackItem.count({ where: { status: "open" } }).catch(() => 0),
    prisma.project
      .findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          keyPrefix: true,
          _count: {
            select: {
              feedbackItems: {
                where: { status: "open" },
              },
            },
          },
        },
      })
      .catch(() => []),
    prisma.label
      .findMany({
        orderBy: [{ projectId: "asc" }, { name: "asc" }],
        select: { id: true, name: true, color: true, projectId: true },
      })
      .catch(() => []),
    prisma.savedView
      .findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, projectId: true, filters: true },
      })
      .catch(() => []),
  ]);

  const projects = rawProjects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    keyPrefix: p.keyPrefix,
    openCount: p._count.feedbackItems,
  }));

  const savedViews = rawViews.map((v) => ({
    id: v.id,
    name: v.name,
    projectId: v.projectId,
    filters: (v.filters && typeof v.filters === "object" && !Array.isArray(v.filters)
      ? v.filters
      : {}) as Record<string, string | undefined>,
  }));

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <WorkspaceProvider
      initialSettings={settings}
      projects={projects}
      initialLabels={labels}
      initialSavedViews={savedViews}
      openCount={openCount}
    >
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <AdminSidebar logoutAction={logout} />
        <div className="min-w-0 flex-1 bg-background">{children}</div>
      </div>
    </WorkspaceProvider>
  );
}
