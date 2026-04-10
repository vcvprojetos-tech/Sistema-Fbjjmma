"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function CoordenadorEntradaPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tatameNum, setTatameNum] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tatameNum) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/coordenador/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tatameNum }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao entrar.")
      } else {
        router.push(`/coordenador/${data.tatameId}`)
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Controle de Tatame</h1>
          {session?.user && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Olá, {session.user.name?.split(" ")[0]}</p>
          )}
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            Selecione o número do tatame que você está operando
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={tatameNum}
            onChange={(e) => { setTatameNum(e.target.value); setError("") }}
            className="w-full h-16 rounded-xl border text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
            style={{
              backgroundColor: "var(--card)",
              borderColor: error ? "#dc2626" : "var(--border-alt)",
              color: tatameNum ? "#fbbf24" : "var(--muted)",
            }}
          >
            <option value="">Selecione o tatame</option>
            {[1,2,3,4,5,6,7,8].map(n => (
              <option key={n} value={String(n)}>Tatame {n}</option>
            ))}
          </select>

          {error && <p className="text-[#dc2626] text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !tatameNum}
            className="w-full h-14 rounded-xl font-bold text-lg text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#dc2626" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
