"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

export default function PrivacyPage() {
  const router = useRouter();
  const [essential, setEssential] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [communication, setCommunication] = useState(true);
  const [scrolledPastAll, setScrolledPastAll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setScrolledPastAll(true);
      },
      { threshold: 0.5 }
    );
    const el = bottomRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAccept = () => {
    router.push("/onboarding/profile");
  };

  return (
    <Card>
      <CardHeader>Data & Privacy</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          We collect and use your data as described below. You can adjust your preferences.
        </p>
        <div className="mb-6 space-y-4">
          <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Essential Data</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Required for the service to function. Cannot be disabled.
                </p>
              </div>
              <input
                type="checkbox"
                checked={essential}
                disabled
                className="rounded border-[var(--surface-secondary)]"
              />
            </div>
          </div>
          <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Performance & Analytics</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Helps us improve the product.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="rounded border-[var(--surface-secondary)]"
              />
            </div>
          </div>
          <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Marketing Updates</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Product news and offers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="rounded border-[var(--surface-secondary)]"
              />
            </div>
          </div>
          <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Coach-Parent Communication</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Messaging between coaches and parents.
                </p>
              </div>
              <input
                type="checkbox"
                checked={communication}
                onChange={(e) => setCommunication(e.target.checked)}
                className="rounded border-[var(--surface-secondary)]"
              />
            </div>
          </div>
        </div>
        <p className="mb-6 text-xs text-[var(--text-secondary)]">
          <a href="#" className="text-[var(--primary)] hover:underline">Full Privacy Policy</a>
          {" · "}
          <a href="#" className="text-[var(--primary)] hover:underline">GDPR Rights</a>
          {" · "}
          <a href="#" className="text-[var(--primary)] hover:underline">Data Protection</a>
        </p>
        <div ref={bottomRef} className="h-1" aria-hidden="true" />
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={() => router.push("/onboarding/verify")}>
            Back
          </Button>
          <Button onClick={handleAccept} disabled={!scrolledPastAll}>
            Accept & Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
