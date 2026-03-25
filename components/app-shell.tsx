"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useVideoStore } from "@/store/useVideoStore";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/client/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, authLoading, setAuthLoading } = useVideoStore();

  useEffect(() => {
    const bootstrap = async () => {
      setAuthLoading(true);
      try {
        const data = await apiRequest<{ user: { $id: string; name: string; email: string } }>("/api/auth/me", {
          cache: "no-store",
        });
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    void bootstrap();
  }, [setAuthLoading, setUser]);

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  };

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-stone-300/80 bg-stone-100/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-slate-900">
            MyFlix Studio
          </Link>
          <nav className="flex items-center gap-1 rounded-xl border border-stone-300 bg-white/75 p-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  pathname === item.href
                    ? "bg-slate-900 text-white shadow-[0_8px_20px_-14px_rgba(15,23,42,0.9)]"
                    : "text-slate-600 hover:bg-orange-100/70 hover:text-slate-900",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-stone-300 bg-white/75 px-3 py-1 text-xs text-slate-600 sm:inline">
              {authLoading ? "Loading" : user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
