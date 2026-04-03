"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { apiRequest } from "@/lib/client/api";

type Mode = "login" | "signup";

type AuthFormProps = {
  mode: Mode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiRequest(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-stone-300 bg-[linear-gradient(150deg,#fffdf8_0%,#f2e7d7_100%)]">
      <CardHeader>
        <div className="mb-2">
          <Logo href="/" size="sm" textClassName="text-orange-700" />
        </div>
        <CardTitle className="text-2xl">{isSignup ? "Create your studio account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSignup
            ? "Upload, process, and stream your personal video library from one place."
            : "Sign in to manage your private streaming workspace."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {isSignup && (
            <div className="space-y-2">
              <label className="text-sm text-slate-700" htmlFor="name">
                Name
              </label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-orange-700 hover:text-orange-600">
            {isSignup ? "Login" : "Sign up"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
