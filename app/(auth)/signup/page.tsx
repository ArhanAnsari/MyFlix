import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-amber-300/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-12 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl" />
      <AuthForm mode="signup" />
    </div>
  );
}
