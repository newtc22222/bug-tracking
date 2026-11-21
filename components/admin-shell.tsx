import Link from "next/link";
import { signOut } from "@/lib/auth";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-full flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-5">
            <Link href="/projects" className="text-sm font-semibold text-slate-950">
              Bug Tracking
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/feedback"
                className="text-slate-600 transition hover:text-slate-950"
              >
                Inbox
              </Link>
              <Link
                href="/projects"
                className="text-slate-600 transition hover:text-slate-950"
              >
                Projects
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-slate-500 transition hover:text-slate-950"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
