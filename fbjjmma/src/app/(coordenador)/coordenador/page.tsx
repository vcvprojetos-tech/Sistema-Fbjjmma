"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function CoordenadorEntradaPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/coordenador/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "PIN inválido.")
      } else {
        router.push(`/coordenador/${data.tatameId}`)
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  function handlePinInput(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4)
    setPin(digits)
    setError("")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Controle de Tatame</h1>
          {session?.user && (
            <p className="text-[#9ca3af] text-sm">Olá, {session.user.name?.split(" ")[0]}</p>
          )}
          <p className="text-[#6b7280] text-sm mt-2">
            Digite o PIN do tatame para iniciar o controle
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="PIN do tatame"
              value={pin}
              onChange={(e) => handlePinInput(e.target.value)}
              className="w-full text-center text-4xl font-mono tracking-[1rem] h-20 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              style={{
                backgroundColor: "#111",
                borderColor: error ? "#dc2626" : "#333",
                color: "#fbbf24",
              }}
              maxLength={4}
            />
            {error && <p className="text-[#dc2626] text-sm text-center">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full h-14 rounded-xl font-bold text-lg text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#dc2626" }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
