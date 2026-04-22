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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <p style={{ color: "#666" }}>Carregando chaves...</p>
    </div>
  )

  if (error || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <p style={{ color: "red" }}>{error || "Sem dados."}</p>
    </div>
  )

  const dateStr = data.event.date
    ? new Date(data.event.date).toLocaleDateString("pt-BR")
    : ""

  return (
    <>
      <style>{`
        /* ── Tela ── */
        body { margin: 0; }

        .print-wrapper {
          background: #fff;
          min-height: 100vh;
          padding: 0;
        }

        .screen-topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .bracket-page {
          background: #fff;
          padding: 20px 24px 12px;
          border-bottom: 2px solid #e2e8f0;
        }

        .bracket-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        .bracket-number {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 2px;
        }

        .bracket-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 999px;
        }

        /* ── Impressão ── */
        @media print {
          .screen-topbar { display: none !important; }

          .print-wrapper {
            background: #fff !important;
            padding: 0 !important;
          }

          .bracket-page {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
            break-after: page;
            padding: 12px 16px 8px;
            border-bottom: none;
          }

          .bracket-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Força cores claras no SVG e nos elementos da BracketView */
          svg text { fill: #0f172a !important; }
          svg line, svg path { stroke: #555 !important; }
          svg rect { fill: #f1f5f9 !important; stroke: #94a3b8 !important; }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        @page {
          size: A4 landscape;
          margin: 10mm;
        }
      `}</style>

      <div className="print-wrapper">

        {/* Barra de controle — só aparece na tela */}
        <div className="screen-topbar">
          <Link href={`/admin/eventos/${id}`}
            style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Voltar
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13, margin: 0 }}>
              {data.event.name}{dateStr && ` — ${dateStr}`}
            </p>
            <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>
              {data.brackets.length} chave(s) finalizada(s)
            </p>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#0f766e", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 16px", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            <Printer style={{ width: 14, height: 14 }} />
            Imprimir / Salvar PDF
          </button>
        </div>

        {data.brackets.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "#64748b" }}>Nenhuma chave finalizada ainda.</p>
          </div>
        )}

        {data.brackets.map((bracket) => {
          const age = AGE_GROUP_LABELS[bracket.weightCategory.ageGroup] || bracket.weightCategory.ageGroup
          const belt = BELT_LABELS[bracket.belt] || bracket.belt
          const sex = bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino"
          const peso = bracket.isAbsolute ? "Absoluto" : bracket.weightCategory.name
          const title = `${sex} | ${age} | ${peso} | ${belt}`
          const isPremiada = bracket.status === "PREMIADA"

          return (
            <div key={bracket.id} className="bracket-page">
              <div className="bracket-header">
                <div>
                  <p className="bracket-number">Chave #{bracket.bracketNumber}</p>
                  <p className="bracket-title">{title}</p>
                </div>
                <span className="status-badge" style={{
                  background: isPremiada ? "#ede9fe" : "#dcfce7",
                  color: isPremiada ? "#7c3aed" : "#16a34a",
                }}>
                  {isPremiada ? "Premiada" : "Finalizada"}
                </span>
              </div>

              <BracketView bracket={bracket} />
            </div>
          )
        })}
      </div>
    </>
  )
}
