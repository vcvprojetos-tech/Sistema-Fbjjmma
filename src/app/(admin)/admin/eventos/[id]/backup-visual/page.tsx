"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import BracketView from "@/components/admin/BracketView"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juvenil A",
  INFANTO_JUVENIL_B: "Infanto Juvenil B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}
const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
}

interface BackupData {
  event: { id: string; name: string; date: string }
  brackets: BracketItem[]
}

// Tipos compatíveis com BracketView
interface BracketItem {
  id: string
  bracketNumber: number
  belt: string
  isAbsolute: boolean
  status: string
  weightCategory: { id: string; name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: {
    id: string
    position: number
    registration: {
      id: string
      athlete: { user: { name: string } } | null
      guestName: string | null
      team: { name: string } | null
      prizePix?: string | null
    } | null
  }[]
  matches: {
    id: string
    round: number
    matchNumber: number
    winnerId: string | null
    position1Id: string | null
    position2Id: string | null
    isWO?: boolean
    woType?: string | null
    woWeight1?: number | null
    woWeight2?: number | null
    endedAt?: string | null
    woReason?: string | null
  }[]
}

export default function BackupVisualPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/backup`)
      if (!res.ok) { setError("Erro ao carregar dados."); return }
      setData(await res.json())
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <p style={{ color: "var(--muted-foreground)" }}>Carregando chaves...</p>
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <p className="text-red-400">{error || "Sem dados."}</p>
    </div>
  )

  const dateStr = data.event.date
    ? new Date(data.event.date).toLocaleDateString("pt-BR")
    : ""

  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .bracket-page { page-break-after: always; break-after: page; }
          .bracket-page:last-child { page-break-after: avoid; break-after: avoid; }
          body { background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Barra de controle — não aparece na impressão */}
      <div className="no-print sticky top-0 z-50 border-b px-6 py-3 flex items-center gap-4"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <Link href={`/admin/eventos/${id}`}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            {data.event.name} {dateStr && `— ${dateStr}`}
          </p>
          <p style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
            {data.brackets.length} chave(s) finalizada(s)
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "#0f766e" }}
        >
          <Printer className="w-4 h-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Conteúdo imprimível */}
      <div style={{ backgroundColor: "var(--background)", padding: "24px 16px" }}>

        {data.brackets.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: "var(--muted-foreground)" }}>Nenhuma chave finalizada ainda.</p>
          </div>
        )}

        {data.brackets.map((bracket) => {
          const age = AGE_GROUP_LABELS[bracket.weightCategory.ageGroup] || bracket.weightCategory.ageGroup
          const belt = BELT_LABELS[bracket.belt] || bracket.belt
          const sex = bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino"
          const peso = bracket.isAbsolute ? "Absoluto" : bracket.weightCategory.name
          const title = `${sex} | ${age} | ${peso} | ${belt}`
          const statusLabel = bracket.status === "PREMIADA" ? "Premiada" : "Finalizada"
          const statusColor = bracket.status === "PREMIADA" ? "#a78bfa" : "#4ade80"

          return (
            <div key={bracket.id} className="bracket-page" style={{ marginBottom: 40 }}>
              {/* Cabeçalho da chave */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 12, paddingBottom: 8,
                borderBottom: "1px solid var(--border)",
              }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>
                    Chave #{bracket.bracketNumber}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                    {title}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 10px",
                  borderRadius: 999, backgroundColor: statusColor + "22", color: statusColor,
                }}>
                  {statusLabel}
                </span>
              </div>

              {/* BracketView */}
              <BracketView bracket={bracket} />
            </div>
          )
        })}
      </div>
    </>
  )
}
