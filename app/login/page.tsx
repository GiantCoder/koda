"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { loginSchema } from "@/app/lib/validators";
import { getPostAuthRoute, setAuthToken } from "@/app/lib/auth";
import { setMockUserFromApiUser } from "@/app/lib/mock-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: result.data.email, password: result.data.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Sign in failed");
        return;
      }
      setAuthToken((data as { accessToken: string }).accessToken);
      setMockUserFromApiUser((data as { user: { id: string; email: string; displayName?: string | null; role: string } }).user);
      router.push(getPostAuthRoute());
    } catch {
      setError("Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-[var(--primary)]">
            Koda Cricket
          </Link>
        </div>
        <Card>
          <CardHeader>Sign In</CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {error && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-[var(--primary)] hover:underline">
                Create Account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
