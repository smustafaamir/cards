import type { Metadata } from "next";
import localFont from "next/font/local";

import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Research Assistant",
  description: "Zero-cost RAG research assistant for personal literature review",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <Nav />
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl bg-[#fafafa] px-4 py-10">
          {children}
        </main>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
