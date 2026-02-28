"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/images", label: "Images" },
  { href: "/analysis", label: "Analysis" },
  { href: "/map", label: "Map" },
  { href: "/expedition", label: "Expedition Plan" },
  { href: "/employees", label: "Employees" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Cleanly
        </Link>
        <div className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors hover:text-blue-600 ${
                pathname === l.href
                  ? "font-medium text-blue-600"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
