import AdminShell from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
