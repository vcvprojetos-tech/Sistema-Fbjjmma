"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CoordenadorEntradaPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState("")
  const [tatameNum, setTatameNum] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function formatCPF(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cpf || !tatameNum) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/coordenador/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ""), tatameNum }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao entrar.")
      } else {
        sessionStorage.setItem(`tatame_pin_${data.tatameId}`, data.pin)
        router.push(`/coordenador/${data.tatameId}`)
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <img src="/logo.png" alt="FBJJMMA" style={{ width: 56, height: 56, objectFit: "contain", display: "block", margin: "0 auto 1rem" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Controle de Tatame
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Informe seu CPF e o número do tatame
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              CPF
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => { setCpf(formatCPF(e.target.value)); setError("") }}
              placeholder="000.000.000-00"
              className="w-full h-12 rounded-lg border px-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              style={{
                backgroundColor: "var(--input)",
                borderColor: error ? "#dc2626" : "var(--border-alt)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Tatame
            </label>
            <select
              value={tatameNum}
              onChange={(e) => { setTatameNum(e.target.value); setError("") }}
              className="w-full h-12 rounded-lg border px-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              style={{
                backgroundColor: "var(--input)",
                borderColor: error ? "#dc2626" : "var(--border-alt)",
                color: tatameNum ? "#fbbf24" : "var(--muted)",
              }}
            >
              <option value="">Selecione o tatame</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={String(n)}>Tatame {n}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-[#dc2626] text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !cpf || !tatameNum}
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
