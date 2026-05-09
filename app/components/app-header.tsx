"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Brain,
  History,
  Home,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type AppHeaderSection = "home" | "replies" | "analytics" | "activity" | "memory" | "settings" | "admin";

const navItems: Array<{ href: string; label: string; section: AppHeaderSection; icon: LucideIcon }> = [
  { href: "/home", label: "Home", section: "home", icon: Home },
  { href: "/app", label: "Replies", section: "replies", icon: Mail },
  { href: "/analytics", label: "Analytics", section: "analytics", icon: BarChart3 },
  { href: "/activity", label: "Activity", section: "activity", icon: History },
  { href: "/memory", label: "Memory", section: "memory", icon: Brain },
  { href: "/settings", label: "Settings", section: "settings", icon: Settings },
  { href: "/admin", label: "Admin", section: "admin", icon: ShieldCheck },
];

export function AppHeader({
  active,
  userEmail,
  onSignOut,
}: {
  active: AppHeaderSection;
  userEmail: string;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/home" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-900/10">
          <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-10 w-10 rounded-xl shadow-md shadow-slate-300/60" />
          <div>
            <p className="text-lg font-black">Gibraltar</p>
            <p className="text-sm text-slate-500">{userEmail}</p>
          </div>
        </Link>
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.section === active
                    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173c27] px-4 text-sm font-black text-[#f7fbf1] shadow-sm shadow-slate-200/60"
                    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-green-900/30 hover:text-slate-950"
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-200 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
