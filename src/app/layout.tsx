import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneAtlas AI Pipeline",
  description:
    "Multi-stage AI generation pipeline — converts natural language into validated AppSpec",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-atlas-bg text-atlas-text antialiased">
        <header className="border-b border-atlas-border px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-atlas-accent pulse-dot" />
            <span className="text-sm font-mono font-semibold text-atlas-text">
              OneAtlas
            </span>
            <span className="text-xs text-atlas-text-dim font-mono">
              AI Pipeline v0.1
            </span>
          </div>
          <div className="ml-auto text-xs text-atlas-text-dim font-mono">
            intent → schema → appspec · groq/gemini/openai fallback chain
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
