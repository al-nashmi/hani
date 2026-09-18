"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "الرئيسية", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/customers", label: "العملاء", icon: UsersIcon, match: (p: string) => p.startsWith("/customers") },
  { href: "/pledges/new", label: "إضافة", icon: PlusIcon, match: (p: string) => p === "/pledges/new" },
  { href: "/reports", label: "التقارير", icon: ChartIcon, match: (p: string) => p.startsWith("/reports") },
] as const;

export default function BottomNav({
  onMoreClick,
  moreActive,
}: {
  onMoreClick: () => void;
  moreActive: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="print:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
            >
              <Icon className={`h-6 w-6 ${active ? "text-teal-700" : "text-slate-400"}`} filled={active} />
              <span className={active ? "font-semibold text-teal-700" : "text-slate-500"}>{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
        >
          <MoreIcon className={`h-6 w-6 ${moreActive ? "text-teal-700" : "text-slate-400"}`} filled={moreActive} />
          <span className={moreActive ? "font-semibold text-teal-700" : "text-slate-500"}>المزيد</span>
        </button>
      </div>
    </nav>
  );
}

type IconProps = { className?: string; filled?: boolean };

function HomeIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} className={className}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.6" opacity={0.85} />
      <path d="M15.5 14.3c2.5.4 4.5 2.6 4.5 5.7" strokeLinecap="round" opacity={0.85} />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} className={className}>
      <rect x="4" y="13" width="3.5" height="7" rx="1" />
      <rect x="10.2" y="9" width="3.5" height="11" rx="1" />
      <rect x="16.4" y="4" width="3.5" height="16" rx="1" />
    </svg>
  );
}

function MoreIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}
