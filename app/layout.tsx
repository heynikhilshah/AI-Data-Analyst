import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsightPulse BI - Conversational AI Data Analyst",
  description:
    "Full-stack Conversational Business Intelligence Dashboard powered by Next.js 14, LangGraph.js, Gemini 1.5 Flash, and SQLite.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
