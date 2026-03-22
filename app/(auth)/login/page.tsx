import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.2),transparent_60%),linear-gradient(180deg,#08090b_0%,#111217_100%)] px-4">
      <AuthForm mode="login" />
    </div>
  );
}
