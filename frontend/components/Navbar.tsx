"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Cpu, Layout, BatteryCharging, Brain, BookOpen, FileText } from "lucide-react";
import { useCircuitStore } from "../store/circuitStore";
import { useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useCircuitStore();

  useEffect(() => {
    // Initial theme sync
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const navItems = [
    { name: "Circuit Studio", href: "/studio", icon: Layout },
    { name: "Machines", href: "/machines", icon: Cpu },
    { name: "Power Electronics", href: "/power-electronics", icon: BatteryCharging },
    { name: "AI Assistant", href: "/ai-assistant", icon: Brain },
    { name: "Library", href: "/library", icon: BookOpen },
    { name: "Reports", href: "/reports", icon: FileText }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Cpu className="h-5 w-5 animate-pulse" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-950 dark:text-white">
                Electra<span className="text-blue-600">Sim</span> AI
              </span>
            </Link>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex space-x-1 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-slate-900 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-600" />
              )}
            </button>

            {/* Login / Auth Placeholder */}
            <Link
              href="/studio"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm hover:shadow transition-all duration-200"
            >
              Start Designing
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
