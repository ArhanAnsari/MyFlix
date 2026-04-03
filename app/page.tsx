import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default async function Home() {
  const user = await getCurrentUser();

  // Redirect authenticated users to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col bg-linear-to-b from-background to-surface">
      {/* Navigation */}
      <nav className="border-b border-line/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo href="/" size="md" textClassName="text-accent" />
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline" size="default">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="default">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
              Your Personal Video Cloud
            </h1>
            <p className="text-xl text-foreground/70">
              Store, organize, and stream all your personal videos in one private, secure place. Resume playback exactly where you left off.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/signup" className="flex-1 sm:flex-none">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/login" className="flex-1 sm:flex-none">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                I Already Have an Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-surface/50 border-t border-line/30 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Features
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Upload Videos
              </h3>
              <p className="text-foreground/60">
                Upload your personal videos with ease. Support for multiple formats and high-quality storage.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-2xl">📺</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Stream Anywhere
              </h3>
              <p className="text-foreground/60">
                Watch your videos on any device. Resume playback exactly where you left off with instant resumption.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Secure & Private
              </h3>
              <p className="text-foreground/60">
                Your videos are yours alone. All data is securely stored and encrypted with full privacy protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-linear-to-r from-accent/10 to-accent-soft/10 border-t border-line/30 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to get started?
          </h2>
          <p className="text-lg text-foreground/60">
            Join thousands of users who trust MyFlix with their personal video collection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="flex-1 sm:flex-none">
              <Button size="lg" className="w-full sm:w-auto">
                Create Your Account
              </Button>
            </Link>
            <Link href="/login" className="flex-1 sm:flex-none">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
