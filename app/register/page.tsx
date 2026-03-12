"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { registerSchema } from "@/app/lib/validators";
import { getPostAuthRoute, setAuthToken, setOnboardingComplete } from "@/app/lib/auth";
import { setMockUserFromApiUser } from "@/app/lib/mock-auth";

interface InvitePrefill {
  firstName: string;
  lastName: string;
  playCricketPersonId: string;
  importId: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitePrefill, setInvitePrefill] = useState<InvitePrefill | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (!invite || invite.length !== 64) return;
    setInviteToken(invite);
    let cancelled = false;
    fetch(`/api/auth/invite/${invite}`)
      .then((res) => {
        if (cancelled) return res.json().catch(() => ({}));
        if (res.status === 404 || res.status === 410) {
          setInviteError(res.status === 410 ? "This invite has expired or already been used." : "Invalid invite link.");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data?.valid) return;
        setInvitePrefill({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          playCricketPersonId: data.playCricketPersonId ?? "",
          importId: data.importId ?? "",
        });
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
      })
      .catch(() => {
        if (!cancelled) setInviteError("Could not load invite.");
      });
    return () => { cancelled = true; };
  }, [searchParams]);

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
          displayName: [firstName || result.data.email.split("@")[0], lastName].filter(Boolean).join(" ") || result.data.email.split("@")[0] || "User",
          role: "COACH",
          agreedToTerms: true,
          privacyPreferences: {
            performanceAnalytics: true,
            marketingCommunications: false,
            coachParentComms: true,
          },
          ...(inviteToken ? { inviteToken, firstName: firstName || undefined, lastName: lastName || undefined } : {}),
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
            {inviteError && (
              <p className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                {inviteError} You can still register without the invite.
              </p>
            )}
            {invitePrefill && !inviteError && (
              <p className="mb-4 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-3 py-2 text-sm text-[var(--text-primary)]">
                You&apos;ve been invited to join Koda Cricket by your coach. Your Play-Cricket stats will be linked to your account.
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {invitePrefill && (
                <>
                  <Input
                    label="First name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                  <Input
                    label="Last name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </>
              )}
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
