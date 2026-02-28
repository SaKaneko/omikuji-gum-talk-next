"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { SessionUser } from "@/lib/auth";

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "ホーム", icon: "🏠" },
    { href: "/themes", label: "お題一覧", icon: "📋" },
    { href: "/post", label: "投稿", icon: "✏️" },
    ...(user.permissions.includes("draw_omikuji")
      ? [{ href: "/draw", label: "くじ引き", icon: "🎰" }]
      : []),
    ...(user.roleName === "admin"
      ? [{ href: "/admin", label: "管理", icon: "⚙️" }]
      : []),
  ];

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent"
          >
            {process.env.NEXT_PUBLIC_APP_NAME ?? "おだいボックス"}
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              👤 {user.name}
              {user.roleName === "admin" && (
                <span className="ml-1 badge bg-purple-100 text-purple-700">Admin</span>
              )}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 pb-2 -mx-4 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                pathname === item.href
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
