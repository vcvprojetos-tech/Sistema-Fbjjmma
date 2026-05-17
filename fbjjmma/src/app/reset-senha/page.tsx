"use client"

import { useState } from "react"

export default function ResetSenhaPage() {
  const [identifier, setIdentifier] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    const isCpf = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(identifier) || /^\d{11}$/.test(identifier.replace(/\D/g, ""))
    const body = isCpf
      ? { cpf: identifier, newPassword }
      : { email: identifier, newPassword }

    try {
      const res = await fetch("/api/temp-reset?secret=fbjjmma-reset-2026", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus("ok")
        setMessage(`Senha redefinida para: ${data.user?.name} (${data.user?.email})`)
      } else {
        setStatus("error")
        setMessage(data.error || "Erro desconhecido.")
      }
    } catch {
      setStatus("error")
      setMessage("Erro de conexão.")
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 32, width: 380, maxWidth: "90vw" }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Recuperar Acesso</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Redefina a senha de um usuário do sistema.</p>

        {status === "ok" ? (
          <div>
            <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{ color: "#4ade80", fontSize: 14, margin: 0 }}>✓ {message}</p>
            </div>
            <a href="/login" style={{ display: "block", textAlign: "center", background: "#3b82f6", color: "#fff", borderRadius: 8, padding: "10px 0", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
              Ir para o Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                E-MAIL OU CPF
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="email@exemplo.com ou 000.000.000-00"
                required
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                NOVA SENHA
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>

            {status === "error" && (
              <div style={{ background: "#1c0606", border: "1px solid #7f1d1d", borderRadius: 8, padding: 12 }}>
                <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 600, fontSize: 14, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}
            >
              {status === "loading" ? "Redefinindo..." : "Redefinir Senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
