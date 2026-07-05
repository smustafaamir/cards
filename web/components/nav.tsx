"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Search" },
  { href: "/library", label: "Library" },
  { href: "/chat", label: "Chat" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[#e4e4e7] bg-[#fafafa]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/search" className="flex items-center">
          <Image
            src="/Vector.png"
            alt="Research Assistant"
            width={140}
            height={32}
            className="h-5 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white",
                pathname === link.href && "bg-white shadow-sm ring-1 ring-[#e4e4e7]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
