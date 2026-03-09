import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f3f1f0] font-sans text-[#1b2433]">
      <section className="relative overflow-hidden bg-[#151f35] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(230,57,70,0.22),transparent_42%),radial-gradient(circle_at_20%_100%,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(10,16,30,0.78),rgba(10,16,30,0.92))]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <Image src="/koda.svg" alt="Koda Cricket" width={26} height={26} />
            <span className="text-sm font-semibold tracking-wide">Koda Cricket</span>
          </div>
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            Sign in
          </Link>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-8 text-center">
          <div className="inline-block rounded-full bg-[#e63946]/15 px-4 py-1 text-xs font-semibold tracking-wide text-[#ff7f8a]">
            Ages 7-18 · Built for families
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            Welcome to
            <span className="block text-[#e63946]">Koda Cricket</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80 md:text-base">
            The complete junior cricket development platform connecting coaches,
            parents, and young athletes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="flex h-11 items-center justify-center rounded-lg bg-[#e63946] px-6 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(230,57,70,0.38)] transition hover:bg-[#c1121f]"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-lg border border-white/30 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-[#1b2433]">
          Built for the Cricket Community
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#5b6475]">
          Empowering coaches, parents, and young athletes with the tools they need
          to succeed.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-[#e9e7e5] bg-white p-6 shadow-[0_12px_28px_rgba(15,20,34,0.08)]">
            <div className="mb-4 inline-flex rounded-md bg-[#fff1f3] px-2 py-1 text-xs font-semibold text-[#e63946]">
              For Coaches
            </div>
            <p className="mb-4 text-sm text-[#5b6475]">
              Streamline your coaching workflow and maximize player development.
            </p>
            <ul className="space-y-2 text-sm text-[#2c3548]">
              <li>• Create personalized training plans for each player</li>
              <li>• Track progress with detailed performance analytics</li>
              <li>• Communicate directly with parents and players</li>
              <li>• Manage sessions, attendance, and team logistics</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[#e9e7e5] bg-white p-6 shadow-[0_12px_28px_rgba(15,20,34,0.08)]">
            <div className="mb-4 inline-flex rounded-md bg-[#fff1f3] px-2 py-1 text-xs font-semibold text-[#e63946]">
              For Parents
            </div>
            <p className="mb-4 text-sm text-[#5b6475]">
              Stay connected with your child&apos;s cricket journey every step of the way.
            </p>
            <ul className="space-y-2 text-sm text-[#2c3548]">
              <li>• Monitor your child&apos;s development and achievements</li>
              <li>• Receive updates on training sessions and matches</li>
              <li>• Review coaching feedback and progress data</li>
              <li>• Safe, age-appropriate platform with parent controls</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-[#151f35] px-6 py-14">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
          <h3 className="text-2xl font-bold">Safe &amp; Age-Appropriate Experience</h3>
          <p className="mt-3 text-sm text-white/80">
            Koda Cricket is designed specifically for junior development with robust
            safety measures and transparent communication between coaches, players,
            and families.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xl font-bold text-[#e63946]">100%</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/70">Parental controls</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#e63946]">GDPR</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/70">Compliant</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#e63946]">7-18</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/70">Age range</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 text-center">
        <h3 className="text-4xl font-bold text-[#1b2433]">Ready to Get Started?</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[#5b6475]">
          Join the Koda Cricket community today and take the first step towards
          excellence in junior cricket development.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="flex h-11 items-center justify-center rounded-lg bg-[#e63946] px-6 text-sm font-semibold text-white transition hover:bg-[#c1121f]"
          >
            Get Started Now
          </Link>
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-lg bg-[#1b2433] px-6 text-sm font-semibold text-white transition hover:bg-[#111827]"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-6 text-xs text-[#7b8292]">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </section>

      <footer className="bg-[#121c30] px-6 py-10 text-white/85">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/koda.svg" alt="Koda Cricket" width={20} height={20} />
              <span className="text-sm font-semibold">Koda Cricket</span>
            </div>
            <p className="mt-3 text-xs text-white/60">
              Empowering young cricket development worldwide.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Features</li>
              <li>Pricing</li>
              <li>FAQ</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>About us</li>
              <li>Contact</li>
              <li>Careers</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
