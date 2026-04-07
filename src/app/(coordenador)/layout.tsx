"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function CoordenadorLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
      <header
        className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
        style={{ backgroundColor: "#0a0a0a", borderColor: "#1a1a1a" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 flex items-center justify-center flex-shrink-0"
            style={{
              clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              backgroundColor: "#dc2626",
            }}
          >
            <span className="text-white font-black text-xs">FBJ</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">FBJJMMA</p>
            <p className="text-[#6b7280] text-xs leading-tight">Controle de Chaves</p>
          </div>
        </div>
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-[#9ca3af] text-sm hidden sm:inline">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-[#6b7280] hover:text-[#dc2626] transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
