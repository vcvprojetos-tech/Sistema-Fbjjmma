"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react"

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: "#0a0a0aee", borderColor: "#1a1a1a", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <div
                className="w-9 h-9 flex items-center justify-center"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  backgroundColor: "#dc2626",
                }}
              >
                <span className="text-white font-black text-xs">FBJ</span>
              </div>
              <span className="text-white font-bold text-sm leading-tight hidden sm:block">
                FBJJMMA
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? "text-white"
                      : "text-[#9ca3af] hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-3">
              {session ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: "#dc2626" }}
                    >
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="max-w-[120px] truncate">{session.user?.name}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-xl py-1 z-50"
                      style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                    >
                      <Link
                        href="/minha-conta"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] transition-colors"
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
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                        >
                          Painel Admin
                        </Link>
                      )}
                      <div style={{ borderTop: "1px solid #222222", margin: "4px 0" }} />
                      <button
                        onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/" }) }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#9ca3af] hover:text-[#dc2626] hover:bg-[#1a1a1a] transition-colors w-full"
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
                    className="text-sm text-[#9ca3af] hover:text-white transition-colors"
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

            {/* Mobile menu button */}
            <button
              className="md:hidden text-[#9ca3af] hover:text-white transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-4 py-4 space-y-3"
            style={{ backgroundColor: "#0a0a0a", borderColor: "#1a1a1a" }}
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-[#9ca3af] hover:text-white transition-colors py-1"
              >
                {l.label}
              </Link>
            ))}
            <div style={{ borderTop: "1px solid #222222", paddingTop: "12px" }}>
              {session ? (
                <>
                  <Link
                    href="/minha-conta"
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm text-[#9ca3af] hover:text-white py-1"
                  >
                    Minha Conta
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block text-sm text-[#9ca3af] hover:text-[#dc2626] py-1"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-[#9ca3af] hover:text-white"
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
        style={{ backgroundColor: "#0a0a0a", borderColor: "#1a1a1a" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 flex items-center justify-center"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  backgroundColor: "#dc2626",
                }}
              >
                <span className="text-white font-black text-xs">FBJ</span>
              </div>
              <span className="text-[#6b7280] text-sm">
                FBJJMMA — Federação Baiana de Jiu-Jitsu MMA
              </span>
            </div>
            <p className="text-[#6b7280] text-xs">
              © {new Date().getFullYear()} FBJJMMA. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
