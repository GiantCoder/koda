"use client";

import Link from "next/link";

interface HeaderProps {
  userName?: string;
  role?: "PLAYER" | "PARENT" | "COACH" | "ADMIN";
}

const roleLinks: Record<NonNullable<HeaderProps["role"]>, { href: string; label: string }[]> = {
  PLAYER: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/upload", label: "Upload" },
    { href: "/progress", label: "Progress" },
    { href: "/messages", label: "Messages" },
  ],
  PARENT: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/messages", label: "Messages" },
    { href: "/settings", label: "Settings" },
  ],
  COACH: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/team", label: "Team" },
    { href: "/messages", label: "Messages" },
    { href: "/settings", label: "Settings" },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/team", label: "Team" },
    { href: "/settings", label: "Settings" },
  ],
};

export default function Header({ userName = "User", role = "PLAYER" }: HeaderProps) {
  const links = roleLinks[role];

  return (
    <header className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-5 w-5 rounded-sm bg-red-600" />
            <span>Koda Cricket</span>
          </Link>
          <nav className="hidden items-center gap-3 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-neutral-700 dark:text-neutral-200">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search..."
            className="hidden rounded-md border border-neutral-300 px-2 py-1 text-sm md:block dark:border-neutral-700 dark:bg-neutral-900"
          />
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">0</span>
          <span className="text-sm">{userName}</span>
        </div>
      </div>
    </header>
  );
}
