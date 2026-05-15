"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Shield,
  Weight,
  UserCog,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect } from "react"
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
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    const role = session?.user?.role
    if (!role || (role !== "PRESIDENTE" && role !== "COORDENADOR_GERAL")) {
      router.replace("/login")
    }
  }, [session, status, router])

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--background)" }}>

      {/* Overlay escuro quando gaveta aberta */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Gaveta lateral */}
      <aside
        className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r"
        style={{
          backgroundColor: "var(--sidebar-surface)",
          borderColor: "var(--border)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
          boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.18)" : "none",
        }}
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

        {/* Usuário no rodapé */}
        <div
          className="px-3 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg" style={{ backgroundColor: "var(--card-alt)" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
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

      {/* Lingueta — fica na borda esquerda, acompanha a gaveta */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
        style={{
          position: "fixed",
          left: sidebarOpen ? 256 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          backgroundColor: "#dc2626",
          color: "#ffffff",
          border: "none",
          borderRadius: "0 8px 8px 0",
          width: 22,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "left 220ms cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.25)",
          padding: 0,
        }}
      >
        <ChevronRight
          size={14}
          style={{
            color: "#ffffff",
            transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
            transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)",
            strokeWidth: 3,
          }}
        />
      </button>

      {/* Conteúdo principal — ocupa toda a largura */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 h-12 border-b flex-shrink-0"
          style={{ backgroundColor: "var(--sidebar-surface)", borderColor: "var(--border)" }}
        >
          {/* Esquerda: logo + nome da federação */}
          <div className="flex items-center gap-2">
            <div style={{ width: 38, height: 38, overflow: "hidden", flexShrink: 0 }}>
              <ThemeLogo className="w-full h-full" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: "var(--foreground)" }}>FBJJMMA</p>
              <p className="text-[10px] leading-tight" style={{ color: "var(--muted)" }}>Painel Administrativo</p>
            </div>
          </div>
          {/* Direita: nome do operador + tema */}
          <div className="flex items-center gap-2">
            {session?.user && (
              <span className="text-xs hidden sm:inline" style={{ color: "var(--muted-foreground)" }}>
                {session.user.name}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--background)" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
