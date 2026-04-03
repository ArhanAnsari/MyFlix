"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-stone-300/60 bg-stone-50/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80 transition-colors">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Logo href="/dashboard" size="md" textClassName="text-slate-900 dark:text-white" />
          <nav className="flex items-center gap-1 rounded-xl border border-stone-300/60 bg-white/60 p-1 dark:border-slate-700/60 dark:bg-slate-800/60 backdrop-blur-sm transition-colors">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  pathname === item.href
                    ? "bg-slate-900 text-white shadow-lg dark:bg-orange-600 dark:text-white"
                    : "text-slate-700 hover:bg-orange-100/50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-stone-300/60 bg-white/60 px-3 py-1 text-xs text-slate-700 sm:inline dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 backdrop-blur-sm transition-colors">
              {authLoading ? "Loading" : user?.email}
            </span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={logout} className="border-stone-300/60 bg-white/60 text-slate-900 hover:bg-stone-200/50 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-700/70 transition-colors">
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
