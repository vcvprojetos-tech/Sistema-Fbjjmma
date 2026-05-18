"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/eventos", label: "Eventos" },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <img src="/logo.png" alt="FBJJMMA" className="w-9 h-9 object-contain" />
              <span className="font-bold text-sm leading-tight hidden sm:block" style={{ color: "var(--foreground)" }}>
                FBJJMMA
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium transition-colors"
                  style={{ color: pathname === l.href ? "var(--foreground)" : "var(--muted-foreground)" }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Auth buttons + toggle */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {session ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: "#dc2626", color: "var(--foreground)" }}
                    >
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="max-w-[120px] truncate">{session.user?.name}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-xl py-1 z-50"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <Link
                        href="/minha-conta"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--card-alt)]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <User className="h-4 w-4" />
                        Minha Conta
                      </Link>
                      {(session.user?.role === "PRESIDENTE" ||
                        session.user?.role === "COORDENADOR_GERAL" ||
                        session.user?.role === "COORDENADOR_TATAME") && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--card-alt)]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Painel Admin
                        </Link>
                      )}
                      <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                      <button
                        onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/" }) }}
                        className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--card-alt)] hover:text-[#dc2626] w-full"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="text-sm font-medium px-4 py-2 rounded-md transition-colors"
                    style={{ backgroundColor: "#dc2626", color: "white" }}
                  >
                    Cadastrar-se
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: toggle + menu button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                className="transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-4 py-4 space-y-3"
            style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium transition-colors py-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              {session ? (
                <>
                  <Link
                    href="/minha-conta"
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm py-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Minha Conta
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block text-sm py-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-medium px-4 py-1.5 rounded-md"
                    style={{ backgroundColor: "#dc2626", color: "white" }}
                  >
                    Cadastrar-se
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="border-t mt-16 py-8"
        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="FBJJMMA" className="w-7 h-7 object-contain" />
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                FBJJMMA — Federação Baiana de Jiu-Jitsu MMA
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              © {new Date().getFullYear()} FBJJMMA. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
