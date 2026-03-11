"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { registerSchema } from "@/app/lib/validators";
import { getPostAuthRoute, setAuthToken, setOnboardingComplete } from "@/app/lib/auth";
import { setMockUserFromApiUser } from "@/app/lib/mock-auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = registerSchema.safeParse({
      email,
      password,
      confirmPassword,
      acceptTerms: acceptTerms as true,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (!acceptTerms) {
      setError("You must accept the Terms and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: result.data.email,
          password: result.data.password,
          displayName: result.data.email.split("@")[0] || "User",
          role: "COACH",
          agreedToTerms: true,
          privacyPreferences: {
            performanceAnalytics: true,
            marketingCommunications: false,
            coachParentComms: true,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Registration failed");
        return;
      }
      setAuthToken((data as { accessToken: string }).accessToken);
      setMockUserFromApiUser((data as { user: { id: string; email: string; displayName?: string | null; role: string } }).user);
      setOnboardingComplete(false);
      router.push(getPostAuthRoute());
    } catch {
      setError("Registration failed");
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
          <CardHeader>Create Account</CardHeader>
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
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 rounded border-[var(--surface-secondary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  I accept the{" "}
                  <Link href="/onboarding/privacy" className="text-[var(--primary)] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/onboarding/privacy" className="text-[var(--primary)] hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {error && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!acceptTerms || loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
