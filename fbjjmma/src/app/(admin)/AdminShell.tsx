"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Shield,
  Weight,
  UserCog,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ThemeLogo } from "@/components/ThemeLogo"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/atletas", label: "Atletas", icon: Users },
  { href: "/admin/equipes", label: "Equipes", icon: Shield },
  { href: "/admin/tabelas-peso", label: "Tabelas de Peso", icon: Weight },
  { href: "/admin/usuarios", label: "Usuários", icon: UserCog },
]

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE: "Presidente",
  COORDENADOR_GERAL: "Coord. Geral",
  COORDENADOR_TATAME: "Coord. Tatame",
  ATLETA: "Atleta",
  CUSTOM: "Personalizado",
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "var(--sidebar-surface)", borderColor: "var(--border)" }}
      >
        {/* Acento vermelho no topo */}
        <div style={{ height: 3, backgroundColor: "#dc2626", flexShrink: 0 }} />

        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#dc262618", border: "1px solid #dc262630" }}>
            <ThemeLogo className="w-6 h-6 object-contain" />
          </div>
          <div>
            <p className="font-black text-sm leading-tight tracking-tight" style={{ color: "var(--foreground)" }}>FBJJMMA</p>
            <p className="text-[10px] leading-tight font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>Sistema de Gestão</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          <p className="admin-nav-label">Menu</p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold transition-all",
                    active
                      ? "text-white"
                      : "hover:text-white hover:bg-[#ffffff08]"
                  )}
                  style={active
                    ? { backgroundColor: "#dc2626", color: "#ffffff" }
                    : { color: "var(--muted-foreground)" }
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div
          className="px-3 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg" style={{ backgroundColor: "var(--card-alt)" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: "#dc2626" }}
            >
              {session?.user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                {session?.user?.name || "Usuário"}
              </p>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                {ROLE_LABELS[session?.user?.role || ""] || session?.user?.role}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-shrink-0 transition-colors hover:text-[#f87171]"
              style={{ color: "var(--muted)" }}
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 lg:px-6 h-12 border-b flex-shrink-0"
          style={{ backgroundColor: "var(--sidebar-surface)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden transition-colors p-1 rounded"
            style={{ color: "var(--muted)" }}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--background)" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
