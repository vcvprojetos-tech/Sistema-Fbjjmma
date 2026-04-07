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

export default function AdminLayout({
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
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
        style={{ backgroundColor: "#0a0a0a", borderColor: "#1a1a1a" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "#1a1a1a" }}
        >
          <div
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            style={{
              clipPath:
                "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              backgroundColor: "#dc2626",
            }}
          >
            <span className="text-white font-black text-xs">FBJ</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">FBJJMMA</p>
            <p className="text-[#6b7280] text-xs leading-tight">Sistema de Gestão</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-[#dc2626] text-white"
                    : "text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info at bottom */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: "#1a1a1a" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
              style={{ backgroundColor: "#dc2626" }}
            >
              {session?.user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {session?.user?.name || "Usuário"}
              </p>
              <p className="text-[#6b7280] text-xs">
                {ROLE_LABELS[session?.user?.role || ""] || session?.user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 lg:px-6 h-14 border-b flex-shrink-0"
          style={{ backgroundColor: "#0a0a0a", borderColor: "#1a1a1a" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-[#6b7280] hover:text-white transition-colors p-1"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">
                {session?.user?.name || "Usuário"}
              </p>
              <p className="text-[#6b7280] text-xs">
                {ROLE_LABELS[session?.user?.role || ""] || session?.user?.role}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#dc2626] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
