"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"

const AGE_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juv. A",
  INFANTO_JUVENIL_B: "Infanto Juv. B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}
const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
}

// Cor diferente por coluna de tatame (igual ao IBJJF)
const COL_COLORS = ["#0d9488","#f97316","#eab308","#7c3aed","#0891b2","#be185d","#15803d","#dc2626"]

interface CallTime { call: number; at: string; pos?: "p1" | "p2" | null }
interface MatchInfo {
  id: string; round: number; matchNumber: number
  callTimes: CallTime[] | null
  p1CheckedIn: boolean; p2CheckedIn: boolean
  isWO: boolean; endedAt: string | null
  position1: { id: string; registration: { athlete: { user: { name: string } } | null; guestName?: string | null; team?: { name: string } | null } | null } | null
  position2: { id: string; registration: { athlete: { user: { name: string } } | null; guestName?: string | null; team?: { name: string } | null } | null } | null
}
interface BracketInfo {
  id: string; bracketNumber: number; belt: string; isAbsolute: boolean
  weightCategory: { name: string; ageGroup: string; sex: string }
  matches: MatchInfo[]
}
interface TatameInfo {
  id: string; name: string
  operations: { user: { name: string } }[]
  brackets: BracketInfo[]
}
interface PainelData {
  event: { id: string; name: string }
  tatames: TatameInfo[]
}
interface FlatMatch { bracketLabel: string; match: MatchInfo }

function catLabel(b: BracketInfo) {
  const sex = b.weightCategory.sex === "MASCULINO" ? "M" : "F"
  const age = AGE_LABELS[b.weightCategory.ageGroup] || b.weightCategory.ageGroup
  const peso = b.isAbsolute ? "Absoluto" : b.weightCategory.name
  const belt = BELT_LABELS[b.belt] || b.belt
  return `${sex} · ${age} · ${peso} · ${belt}`
}
function getName(pos: MatchInfo["position1"]) {
  if (!pos?.registration) return "BYE"
  return pos.registration.athlete?.user.name ?? pos.registration.guestName ?? "—"
}
function getTeam(pos: MatchInfo["position1"]) {
  return pos?.registration?.team?.name ?? ""
}
function flatMatches(tatame: TatameInfo): FlatMatch[] {
  const result: FlatMatch[] = []
  for (const b of tatame.brackets) {
    for (const m of b.matches) {
      if (!m.endedAt && m.position1 !== null) result.push({ bracketLabel: catLabel(b), match: m })
    }
  }
  return result.slice(0, 5)
}

// Cores de fundo por status
function statusStyle(checkedIn: boolean, calls: CallTime[] | null, isWO: boolean) {
  if (isWO)      return { bg: "#334155", text: "#94a3b8", sub: "#64748b", label: "W.O." }
  if (checkedIn) return { bg: "#14532d", text: "#bbf7d0", sub: "#86efac", label: "PRESENTE ✓" }
  const n = calls?.length ?? 0
  if (n >= 3)    return { bg: "#7f1d1d", text: "#fecaca", sub: "#fca5a5", label: "3ª CHAMADA" }
  if (n === 2)   return { bg: "#7c2d12", text: "#fed7aa", sub: "#fdba74", label: "2ª CHAMADA" }
  if (n === 1)   return { bg: "#713f12", text: "#fde68a", sub: "#fcd34d", label: "1ª CHAMADA" }
  return           { bg: "#991b1b", text: "#fecdd3", sub: "#fca5a5", label: "NÃO PESADO" }
}

const LEGEND = [
  { bg: "#991b1b", label: "Não pesado" },
  { bg: "#713f12", label: "1ª Chamada" },
  { bg: "#7c2d12", label: "2ª Chamada" },
  { bg: "#7f1d1d", label: "3ª Chamada" },
  { bg: "#14532d", label: "Presente" },
  { bg: "#334155", label: "W.O." },
]

function AthleteRow({ pos, checkedIn, calls, seed, isWO }: {
  pos: MatchInfo["position1"]; checkedIn: boolean; calls: CallTime[] | null; seed: number; isWO: boolean
}) {
  const name = getName(pos)
  const team = getTeam(pos)
  if (name === "BYE") return (
    <div style={{ flex: 1, minHeight: 0, backgroundColor: "#0f172a" }} />
  )
  const s = statusStyle(checkedIn, calls, isWO)
  return (
    <div style={{ flex: 1, minHeight: 0, backgroundColor: s.bg, display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", overflow: "hidden" }}>
      <span style={{ color: s.sub, fontWeight: 800, fontSize: "clamp(0.75rem, 1.2vw, 1rem)", width: "20px", textAlign: "center", flexShrink: 0 }}>{seed}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: s.text, fontWeight: 700, fontSize: "clamp(0.7rem, 1.1vw, 0.95rem)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {team && <div style={{ color: s.sub, fontSize: "clamp(0.58rem, 0.8vw, 0.72rem)", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team}</div>}
      </div>
    </div>
  )
}

function MatchCell({ fm, accentColor, cardH }: { fm: FlatMatch; accentColor: string; cardH: number }) {
  const { match, bracketLabel } = fm
  const isSolo = match.position2 === null
  const allCalls = match.callTimes as CallTime[] | null
  const p1Calls = allCalls ? allCalls.filter(c => c.pos === "p1" || !c.pos) : null
  const p2Calls = allCalls ? allCalls.filter(c => c.pos === "p2" || !c.pos) : null
  const isWOFinal = match.isWO && match.endedAt !== null
  return (
    <div style={{ flexShrink: 0, height: cardH > 0 ? cardH : undefined, flex: cardH > 0 ? undefined : 1, border: `1px solid #1e293b`, borderTop: `2px solid ${accentColor}`, backgroundColor: "#0f172a", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, backgroundColor: "#1e293b", padding: "3px 10px" }}>
        <span style={{ color: "#94a3b8", fontSize: "clamp(0.55rem, 0.75vw, 0.68rem)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{bracketLabel}</span>
      </div>
      <AthleteRow pos={match.position1} checkedIn={match.p1CheckedIn} calls={p1Calls} seed={1} isWO={isWOFinal} />
      {!isSolo && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", backgroundColor: "#0a0f1a", padding: "2px 10px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#1e293b" }} />
          <span style={{ color: "#334155", fontSize: "0.5rem", fontWeight: 800, padding: "0 6px", letterSpacing: "0.1em" }}>VS</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#1e293b" }} />
        </div>
      )}
      {!isSolo && <AthleteRow pos={match.position2} checkedIn={match.p2CheckedIn} calls={p2Calls} seed={2} isWO={isWOFinal} />}
      {isSolo && <div style={{ flex: 1, backgroundColor: "#0a0f1a" }} />}
    </div>
  )
}

export default function PainelPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [data, setData] = useState<PainelData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    setShowOverlay(false)
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/painel/${eventId}`)
      if (!res.ok) return
      setData(await res.json())
      setLastUpdate(new Date())
    } catch { /* silencioso */ }
  }, [eventId])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 5000)
    return () => clearInterval(iv)
  }, [fetchData])

  if (!data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0f1a" }}>
      <p style={{ color: "#475569" }}>Carregando painel...</p>
    </div>
  )

  const { event, tatames } = data
  const columns = tatames.map(t => ({ tatame: t, matches: flatMatches(t) }))

  return (
    <div style={{ height: "100dvh", width: "100%", boxSizing: "border-box", backgroundColor: "#0a0f1a", padding: "8px 12px", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Overlay de entrada */}
      {showOverlay && (
        <div
          onClick={enterFullscreen}
          style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#0a0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: "80px", height: "80px", objectFit: "contain", marginBottom: "24px" }} />
          <div style={{ color: "#f1f5f9", fontSize: "1.5rem", fontWeight: 900, marginBottom: "12px" }}>Painel de Chamadas</div>
          <div style={{ color: "#64748b", fontSize: "1rem", marginBottom: "32px" }}>Área de Pesagem</div>
          <div style={{ backgroundColor: "#1e3a5f", border: "2px solid #3b82f6", borderRadius: "12px", padding: "16px 40px", color: "#93c5fd", fontSize: "1.1rem", fontWeight: 700 }}>
            Pressione OK para abrir em Tela Cheia
          </div>
        </div>
      )}

      {/* Botão fixo fullscreen */}
      {!showOverlay && (
        <button
          onClick={isFullscreen ? () => document.exitFullscreen?.() : enterFullscreen}
          style={{ position: "fixed", bottom: "12px", right: "12px", zIndex: 1000, backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#64748b", fontSize: "0.7rem", padding: "6px 10px", cursor: "pointer" }}
        >
          {isFullscreen ? "⊠ Sair" : "⛶ Tela Cheia"}
        </button>
      )}

      {/* Topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="FBJJMMA" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: "0.9rem" }}>{event.name}</div>
            <div style={{ color: "#64748b", fontSize: "0.6rem" }}>Painel de Chamadas — Área de Pesagem</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#475569", fontSize: "0.55rem" }}>Última atualização</div>
          <div style={{ color: "#64748b", fontSize: "0.7rem", fontFamily: "monospace" }}>
            {lastUpdate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "10px", height: "10px", backgroundColor: l.bg, borderRadius: "2px" }} />
            <span style={{ color: "#64748b", fontSize: "0.62rem" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {tatames.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#1e293b", fontSize: "3rem", marginBottom: "10px" }}>📋</div>
            <div style={{ color: "#475569", fontSize: "1rem" }}>Nenhum tatame ativo no momento</div>
          </div>
        </div>
      ) : (
        /* Grid de colunas — cada coluna é um flex column */
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${tatames.length}, minmax(0, 1fr))`, gap: "8px" }}>
          {columns.map(({ tatame, matches }, colIdx) => {
            const color = COL_COLORS[colIdx % COL_COLORS.length]
            const num = tatame.name.match(/Tatame\s+(\d+)/i)?.[1] ?? tatame.name
            const op = tatame.operations[0]?.user.name ?? ""
            return (
              <div key={tatame.id} style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
                {/* Cabeçalho da coluna */}
                <div style={{ textAlign: "center", paddingBottom: "8px", borderBottom: `3px solid ${color}`, flexShrink: 0 }}>
                  <div style={{ color: "#ffffff", fontWeight: 900, fontSize: "1.2rem", letterSpacing: "0.04em" }}>Tatame {num}</div>
                  {op && <div style={{ color: "#64748b", fontSize: "0.65rem", marginTop: "1px" }}>{op}</div>}
                </div>
                {/* Container de lutas */}
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "6px", paddingTop: "6px", overflow: "hidden" }}>
                  {matches.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>Sem lutas pendentes</span>
                    </div>
                  ) : (
                    matches.map(fm => (
                      <MatchCell key={fm.match.id} fm={fm} accentColor={color} cardH={0} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
