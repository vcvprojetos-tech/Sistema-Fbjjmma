"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: "https://fbjjmma.com.br/", label: "Início" },
    { href: "/chaves", label: "Chaves" },
    { href: "https://fbjjmma.com.br/#eventos", label: "Eventos" },
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
            <Link href="https://fbjjmma.com.br/" className="flex items-center gap-3 flex-shrink-0">
              <img src="/logo-color-crop.png" alt="FBJJMMA" className="w-9 h-9 object-contain" />
              <span className="font-bold text-sm leading-tight" style={{ color: "var(--foreground)" }}>
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

            {/* Mobile: menu button */}
            <div className="md:hidden flex items-center">
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
              <img src="/logo-color-crop.png" alt="FBJJMMA" className="w-7 h-7 object-contain" />
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
