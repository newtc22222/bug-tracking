import Link from "next/link";
import AdminNavLinks from "@/components/admin-nav-links";
import { BrandMarkIcon, LogOutIcon } from "@/components/ui-icons";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  let openCount = 0;
  try {
    openCount = await prisma.feedbackItem.count({
      where: { status: "open" },
    });
  } catch {
    openCount = 0;
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-full flex-1">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-950 transition hover:text-slate-700"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-950 text-white shadow-xs">
                <BrandMarkIcon className="h-3.5 w-3.5" />
              </span>
              <span>Bug Tracking</span>
            </Link>
            <span aria-hidden="true" className="h-4 w-px bg-slate-200" />
            <AdminNavLinks openCount={openCount} />
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
            >
              <LogOutIcon className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
