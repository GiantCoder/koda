"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";

interface PageWrapperProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

export default function PageWrapper({ children, isAuthenticated = true }: PageWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Header />
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
