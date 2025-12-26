"use client";

import { LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";

const navItems = [{ name: "Dashboard", href: "/", icon: LayoutDashboard }];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-base-100 border-r border-base-200 flex flex-col shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">ChatDash</div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {pathname.startsWith("/imports/") ? (
          <>
            <div className="text-xs font-semibold text-base-content/70 px-2 mb-2 mt-4 uppercase tracking-wider">
              Analysis
            </div>
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-base-content/80 hover:bg-base-200 hover:text-base-content"
              )}
            >
              <LayoutDashboard size={18} />
              Back to Home
            </Link>
            {/* We can add anchor links to sections if we want, or just let them scroll on the single page dashboard */}
            {/* Since the dashboard is a single page with sections, maybe we don't need sub-links yet unless we split it */}
          </>
        ) : (
          <>
            <div className="text-xs font-semibold text-base-content/70 px-2 mb-2 uppercase tracking-wider">
              Workspace
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-base-content/80 hover:bg-base-200 hover:text-base-content"
                  )}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-base-200">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-base-content/80 hover:text-base-content transition-colors w-full"
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
