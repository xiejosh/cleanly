"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const html = document.documentElement;
    const next = !html.classList.contains("dark");
    html.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark mode"
      className="ml-auto rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-base text-white transition-all hover:border-ocean/50 hover:bg-ocean/20"
    >
      {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
