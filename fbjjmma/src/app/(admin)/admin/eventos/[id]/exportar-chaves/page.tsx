"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import BracketView from "@/components/admin/BracketView"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

const AGE_GROUP_ORDER: string[] = [
  "PRE_MIRIM", "MIRIM", "INFANTIL_A", "INFANTIL_B",
  "INFANTO_JUVENIL_A", "INFANTO_JUVENIL_B", "JUVENIL",
  "ADULTO", "MASTER_1", "MASTER_2", "MASTER_3", "MASTER_4", "MASTER_5", "MASTER_6",
]

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juvenil A",
  INFANTO_JUVENIL_B: "Infanto Juvenil B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}

interface BracketForExport {
  id: string
  bracketNumber: number
  isAbsolute: boolean
  belt: string | null
  status: string
  bracketGroupId?: string | null
  isGrandFinal?: boolean
  isCustom?: boolean
  customNumber?: number | null
  customSex?: string | null
  customCategory?: string | null
  customBelt?: string | null
  customWeight?: string | null
  weightCategory: { id: string; name: string; ageGroup: string; sex: string; maxWeight: number } | null
  positions: {
    id: string
    position: number
    customName?: string | null
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
    isWO: boolean
    woType: string | null
    woWeight1: number | null
    woWeight2: number | null
    woReason?: string | null
    pesoPhoto1?: string | null
    pesoPhoto2?: string | null
    endedAt?: string | null
    callTimes?: Array<{ call: number; at: string; pos?: "p1" | "p2" | null }> | null
  }[]
}

function ExportarContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [brackets, setBrackets] = useState<BracketForExport[]>([])
  const [eventName, setEventName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const params = searchParams.toString()
    Promise.all([
      fetch(`/api/admin/eventos/${id}/chaves?${params}`).then(r => r.json()),
      fetch(`/api/admin/eventos/${id}`).then(r => r.json()),
    ])
      .then(([chaves, event]) => {
        if (Array.isArray(chaves)) setBrackets(chaves)
        else setError("Erro ao carregar chaves.")
        if (event?.name) setEventName(event.name)
      })
      .catch(() => setError("Erro de conexão."))
      .finally(() => setLoading(false))
  }, [id, searchParams])

  const sorted = [...brackets].sort((a, b) => {
    if (a.isCustom && !b.isCustom) return 1
    if (!a.isCustom && b.isCustom) return -1
    if (a.isCustom && b.isCustom) return (a.customNumber ?? 0) - (b.customNumber ?? 0)
    const ageA = AGE_GROUP_ORDER.indexOf(a.weightCategory?.ageGroup ?? "")
    const ageB = AGE_GROUP_ORDER.indexOf(b.weightCategory?.ageGroup ?? "")
    if (ageA !== ageB) return ageA - ageB
    if (a.isAbsolute !== b.isAbsolute) return a.isAbsolute ? 1 : -1
    if ((a.weightCategory?.maxWeight ?? 0) !== (b.weightCategory?.maxWeight ?? 0))
      return (a.weightCategory?.maxWeight ?? 0) - (b.weightCategory?.maxWeight ?? 0)
    return a.bracketNumber - b.bracketNumber
  })

  function handlePrint() {
    const root = document.documentElement
    const wasDark = root.classList.contains("dark")
    if (wasDark) {
      root.classList.remove("dark")
      root.classList.add("light")
    }
    window.print()
    if (wasDark) {
      root.classList.remove("light")
      root.classList.add("dark")
    }
  }

  const filterLabel = (() => {
    const parts: string[] = []
    const sexo = searchParams.get("sexo")
    const categoria = searchParams.get("categoria")
    const faixa = searchParams.get("faixa")
    const absoluto = searchParams.get("absoluto")
    const pesoNome = searchParams.get("pesoNome")
    if (sexo) parts.push(sexo === "MASCULINO" ? "Masculino" : "Feminino")
    if (categoria) parts.push(AGE_GROUP_LABELS[categoria] || categoria)
    if (faixa) parts.push(faixa)
    if (absoluto === "1") parts.push("Absoluto")
    if (pesoNome) parts.push(pesoNome)
    return parts.length > 0 ? parts.join(" · ") : "Todas as chaves"
  })()

  return (
    <>
      <style>{`
        @media print {
          aside { display: none !important; }
          header { display: none !important; }
          button[style*="position: fixed"], button[style*="position:fixed"] { display: none !important; }
          .no-print { display: none !important; }
          html, body { overflow: visible !important; height: auto !important; }
          .flex.h-screen { height: auto !important; overflow: visible !important; display: block !important; }
          .flex-1.overflow-hidden, .flex-1.overflow-y-auto { overflow: visible !important; height: auto !important; }
          main { overflow: visible !important; height: auto !important; }
          .bracket-page-break { page-break-after: always; break-after: page; }
          @page { size: landscape; margin: 8mm 10mm; }
        }
      `}</style>

      {/* Barra de controle — oculta na impressão */}
      <div
        className="no-print"
        style={{
          position: "sticky", top: 0, zIndex: 20,
          backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)",
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 16,
        }}
      >
        <Link
          href={`/admin/eventos/${id}`}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none" }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Voltar
        </Link>
        <div style={{ flex: 1 }}>
          {eventName && <p style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 13, margin: 0 }}>{eventName}</p>}
          <p style={{ color: "var(--muted-foreground)", fontSize: 11, margin: 0 }}>
            {loading ? "Carregando..." : `${brackets.length} chave(s) · ${filterLabel}`}
          </p>
        </div>
        <button
          onClick={handlePrint}
          disabled={loading || brackets.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#dc2626", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 16px", fontSize: 13,
            fontWeight: 600, cursor: (loading || brackets.length === 0) ? "not-allowed" : "pointer",
            opacity: (loading || brackets.length === 0) ? 0.5 : 1,
          }}
        >
          <Printer style={{ width: 14, height: 14 }} />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Conteúdo das chaves */}
      <div style={{ padding: "16px 20px" }}>
        {loading && (
          <p style={{ color: "var(--muted-foreground)", padding: "40px 0", textAlign: "center" }}>Carregando chaves...</p>
        )}
        {error && (
          <p style={{ color: "#f87171", padding: "40px 0", textAlign: "center" }}>{error}</p>
        )}
        {!loading && !error && brackets.length === 0 && (
          <p style={{ color: "var(--muted-foreground)", padding: "40px 0", textAlign: "center" }}>Nenhuma chave encontrada com os filtros selecionados.</p>
        )}
        {sorted.map((b, i) => (
          <div
            key={b.id}
            className={i < sorted.length - 1 ? "bracket-page-break" : undefined}
          >
            <BracketView bracket={b} />
          </div>
        ))}
      </div>
    </>
  )
}

export default function ExportarChavesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--muted-foreground)" }}>Carregando...</div>}>
      <ExportarContent />
    </Suspense>
  )
}
