"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeLogo } from "@/components/ThemeLogo"

export default function PremiacaoRedirectPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/premiacao/ativo")
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          router.replace(`/premiacao/${data.id}`)
        } else {
          setError("Nenhum evento ativo encontrado.")
        }
      })
      .catch(() => setError("Erro ao conectar com o servidor."))
  }, [router])

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--background)", gap: 16 }}>
      <ThemeLogo style={{ width: 260, height: "auto" }} />
      {error ? (
        <p style={{ color: "#dc2626", fontWeight: 600, fontSize: "1rem" }}>{error}</p>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Carregando premiação...</p>
      )}
    </div>
  )
}
