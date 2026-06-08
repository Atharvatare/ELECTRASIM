"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Key, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, error, clearError, isLoading, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // If already authenticated, redirect to studio
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/studio");
    }
  }, [isAuthenticated, router]);

  // Clean error states on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    // Simple validations
    if (!email || !password) {
      setFormError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    const success = await login(email, password);
    if (success) {
      router.push("/studio");
    }
  };

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-8 overflow-hidden min-h-[calc(100vh-4rem)]">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[400px] h-[400px] bg-blue-600/10 dark:bg-blue-500/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 w-[300px] h-[300px] bg-indigo-600/10 dark:bg-indigo-500/10 rounded-full blur-[60px]" />

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 bg-blue-600/10 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
            <Key className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Welcome Back, Engineer
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your electrical simulation workspaces.
          </p>
        </div>

        {/* Login form card */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Errors */}
            {(formError || error) && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError || error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md hover:shadow-blue-500/20 disabled:bg-blue-600/70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Unlock Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-6 border-t border-slate-200 dark:border-slate-850 pt-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New to ElectraSim?{" "}
              <Link
                href="/register"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-0.5"
              >
                <span>Create an Account</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
