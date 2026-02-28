"use client";

import AuthGuard from "@/app/components/auth/AuthGuard";
import DashboardHeader from "@/app/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <DashboardHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
