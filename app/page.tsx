import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] font-sans">
      <header className="flex items-center justify-between p-6">
        <span className="text-xl font-bold text-[var(--primary)]">Koda Cricket</span>
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
        >
          Sign In
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <h1 className="max-w-2xl text-center text-4xl font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          Welcome to Koda Cricket
        </h1>
        <p className="mt-4 max-w-xl text-center text-lg text-[var(--text-secondary)]">
          AI-powered video analysis for cricket coaches, parents, and young players aged 7–18.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-lg bg-[var(--primary)] px-6 font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-6 font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-secondary)]"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
