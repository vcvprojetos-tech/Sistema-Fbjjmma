"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ThemeLogo } from "@/components/ThemeLogo"

export default function CoordenadorLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  async function handleSair() {
    // Extrai tatameId da URL se estiver em /coordenador/[tatameId]
    const match = pathname.match(/\/coordenador\/([^/]+)/)
    const tatameId = match?.[1]
    if (tatameId) {
      const pin = sessionStorage.getItem(`tatame_pin_${tatameId}`) ?? ""
      if (pin) {
        // Encerra a operação do tatame antes de sair
        await fetch(`/api/coordenador/tatame/${tatameId}`, {
          method: "PATCH",
          headers: { "x-tatame-pin": pin },
        }).catch(() => {})
        sessionStorage.removeItem(`tatame_pin_${tatameId}`)
      }
    }
    router.push("/coordenador")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      <header
        className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 44, height: 44, overflow: "hidden", flexShrink: 0 }}>
            <ThemeLogo className="w-full h-full" />
          </div>
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
          <button
            onClick={handleSair}
            className="transition-colors hover:text-[#dc2626]"
            style={{ color: "var(--muted)" }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
