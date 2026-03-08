"use client";

import AuthGuard from "@/app/components/auth/AuthGuard";
import Sidebar from "@/app/components/Sidebar";
import TopHeader from "@/app/components/TopHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[var(--background)]">
        <Sidebar />
        <div className="flex flex-1 flex-col transition-all duration-300 ml-20">
          <TopHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
