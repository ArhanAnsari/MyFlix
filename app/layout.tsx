import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppWrapper } from "@/components/app-wrapper";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyFlix - Personal Video Cloud",
  description: "Private video storage, processing, and streaming with resume playback.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="page-ambient min-h-full flex flex-col text-slate-900 dark:text-slate-100 transition-colors" suppressHydrationWarning>
        <AppWrapper>
          <div className="relative z-10 flex min-h-full flex-col">{children}</div>
        </AppWrapper>
      </body>
    </html>
  );
}
