"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, Cpu, Layout, BatteryCharging, Brain, BookOpen, FileText, Sliders, Activity, Zap, Terminal, ChevronDown, User, LogOut } from "lucide-react";
import { useCircuitStore } from "../store/circuitStore";
import { useAuthStore } from "../store/authStore";
import { useEffect, useState } from "react";
 
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useCircuitStore();
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
 
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
 
  useEffect(() => {
    // Initial theme sync
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);
 
  const primaryItems = [
    { name: "Circuit Studio", href: "/studio", icon: Layout },
    { name: "Power Systems", href: "/power-systems", icon: Zap },
    { name: "Machines", href: "/machines", icon: Cpu },
    { name: "Power Electronics", href: "/power-electronics", icon: BatteryCharging },
    { name: "Control Systems", href: "/control-systems", icon: Sliders }
  ];

  const secondaryItems = [
    { name: "Signal Lab", href: "/fourier-lab", icon: Activity },
    { name: "PLC & SCADA", href: "/plc-scada", icon: Terminal },
    { name: "Analog & Digital", href: "/analog-digital", icon: Cpu },
    { name: "Motor Drive", href: "/motor-drive", icon: Sliders },
    { name: "AI Assistant", href: "/ai-assistant", icon: Brain },
    { name: "Library", href: "/library", icon: BookOpen },
    { name: "Reports", href: "/reports", icon: FileText }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md transition-colors duration-200">
      <div className="w-full px-6">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Cpu className="h-5 w-5 animate-pulse" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-950 dark:text-white whitespace-nowrap">
                Electra<span className="text-blue-600">Sim</span> AI
              </span>
            </Link>
          </div>
 
          {/* Nav Links */}
          <div className="hidden md:flex flex-1 justify-evenly items-center mx-6 max-w-full relative">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-2 xl:px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-slate-900 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* More Labs Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center space-x-1 px-2 xl:px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-950 dark:hover:text-white`}
              >
                <span>More Labs</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-lg z-50">
                  {secondaryItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                          isActive
                            ? "bg-blue-50 text-blue-600 dark:bg-slate-900 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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

            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all text-xs font-bold"
                >
                  <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] uppercase">
                    {user.name.slice(0, 2)}
                  </div>
                  <span className="max-w-[100px] truncate hidden md:inline">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-lg z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-900 mb-1">
                      <p className="font-bold text-slate-950 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 uppercase">
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        router.push("/login");
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all font-semibold"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
