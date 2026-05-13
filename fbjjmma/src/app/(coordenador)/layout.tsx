"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ThemeLogo } from "@/components/ThemeLogo"

export default function CoordenadorLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      <header
        className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
        style={{ backgroundColor: "#0a0a0a", borderColor: "#222222" }}
      >
        <div className="flex items-center gap-2">
          <ThemeLogo className="w-8 h-8 object-contain flex-shrink-0" />
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: "#ffffff" }}>FBJJMMA</p>
            <p className="text-xs leading-tight" style={{ color: "#6b7280" }}>Controle de Chaves</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <span className="text-sm hidden sm:inline" style={{ color: "#9ca3af" }}>
              {session.user.name}
            </span>
          )}
          <ThemeToggle />
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="transition-colors hover:text-[#dc2626]"
              style={{ color: "#6b7280" }}
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
