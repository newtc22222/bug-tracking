import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-slate-500">Bug Tracking</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
        Keep project feedback organized.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
        Manage the repositories and projects that feed into your private bug tracking workflow.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/feedback"
          className="inline-flex rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Feedback Inbox
        </Link>
        <Link
          href="/projects"
          className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
        >
          View Projects
        </Link>
      </div>
    </main>
  );
}
