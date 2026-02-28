"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/images", label: "Images" },
  { href: "/analysis", label: "Analysis" },
  { href: "/map", label: "Map" },
  { href: "/expedition", label: "Expedition Plan" },
  { href: "/employees", label: "Team" },
];

function WaveIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2C12 2 4 9.5 4 15a8 8 0 0 0 16 0C20 9.5 12 2 12 2Z"
        fill="url(#drop-gradient)"
      />
      <defs>
        <linearGradient id="drop-gradient" x1="4" y1="2" x2="20" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00b4d8" />
          <stop offset="1" stopColor="#48cae4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-navy shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <WaveIcon />
          <span className="text-lg font-bold tracking-tight text-ocean-light">
            Cleanly
          </span>
        </Link>
        <div className="flex flex-1 flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                pathname === l.href
                  ? "bg-ocean text-white shadow-sm"
                  : "text-ocean-light/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
