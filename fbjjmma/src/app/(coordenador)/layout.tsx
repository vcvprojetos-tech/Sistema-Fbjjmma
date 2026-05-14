"use client"

import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function CoordenadorLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const logoSrc = mounted && resolvedTheme === "light" ? "/logo-color.png" : "/logo2.png"

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      <header
        className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <img src={logoSrc} alt="FBJJMMA" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: "var(--foreground)" }}>FBJJMMA</p>
            <p className="text-xs leading-tight" style={{ color: "var(--muted)" }}>Controle de Chaves</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <span className="text-sm hidden sm:inline" style={{ color: "var(--muted-foreground)" }}>
              {session.user.name}
            </span>
          )}
          <ThemeToggle />
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="transition-colors hover:text-[#dc2626]"
              style={{ color: "var(--muted)" }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
