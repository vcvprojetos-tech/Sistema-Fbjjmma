"use client"

import React, { useMemo } from "react"

// Athlete cards (outer/first-round columns) — taller, wider for names
const ATHLETE_H = 44
const ATHLETE_W = 170
// Result boxes (inner rounds) — small placeholders
const RESULT_H = 18
const RESULT_W = 28
// Final center boxes
const CENTER_W = 80
// Spacing
const ROUND_GAP = 10  // horizontal gap between any two columns
const GROUP_GAP = 8   // vertical gap between match pairs in athlete column
const PADDING = 10
const POS_LABEL_W = 16 // space for position number label beside athlete card
const LINE_COLOR = "#555"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim", MIRIM: "Mirim", INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B", INFANTO_JUVENIL_A: "Infanto Juvenil A",
  INFANTO_JUVENIL_B: "Infanto Juvenil B", JUVENIL: "Juvenil", ADULTO: "Adulto",
  MASTER_1: "Master 1", MASTER_2: "Master 2", MASTER_3: "Master 3",
  MASTER_4: "Master 4", MASTER_5: "Master 5", MASTER_6: "Master 6",
}

interface Reg {
  id: string
  athlete: { user: { name: string } } | null
  guestName: string | null
  team: { name: string } | null
  prizePix?: string | null
}

interface BPos {
  id: string
  position: number
  registration: Reg | null
}

interface BMatch {
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
  callTimes?: Array<{ call: number; at: string; pos?: "p1" | "p2" | null }> | null
  woReason?: string | null
}

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca", AMARELA_LARANJA_VERDE: "Amar/Lar/Verde",
  AZUL: "Azul", ROXA: "Roxa", MARROM: "Marrom", PRETA: "Preta",
}

interface BracketData {
  id: string
  bracketNumber: number
  isAbsolute: boolean
  belt?: string
  weightCategory: { id: string; name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: BPos[]
  matches?: BMatch[]
}

function nextPow2(n: number): number {
  if (n <= 2) return 2
  let p = 2
  while (p < n) p *= 2
  return p
}

function bitReverse(n: number, bits: number): number {
  let result = 0
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (n & 1)
    n >>= 1
  }
  return result
}

function getSlotOrder(start: number, halfSize: number): number[] {
  if (halfSize === 1) return [start]
  const k = Math.log2(halfSize)
  const result: number[] = []
  for (let i = 0; i < halfSize; i++) {
    const idx = bitReverse(i, k)
    result.push(start + idx * 2)
  }
  return result
}

// Top y of athlete slot i (uses ATHLETE_H and GROUP_GAP)
function slotTopY(slotIndex: number): number {
  const pairIndex = Math.floor(slotIndex / 2)
  const withinPair = slotIndex % 2
  return pairIndex * (2 * ATHLETE_H + GROUP_GAP) + withinPair * ATHLETE_H
}

function slotCenterY(slotIndex: number): number {
  return slotTopY(slotIndex) + ATHLETE_H / 2
}

function getRegName(reg: Reg | null): string {
  return reg?.athlete?.user.name ?? reg?.guestName ?? "—"
}

function woLabel(woType?: string | null, weight?: number | null, reason?: string | null): string {
  if (woType === "PESO") return weight ? `Peso (${weight}kg)` : "Peso"
  if (woType === "DESCLASSIFICACAO") return reason ? `Desclassificado: ${reason}` : "Desclassificado"
  return "Ausência"
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Bahia" })
  } catch { return iso }
}

function WOHistory({ matches, posIdMap }: { matches: BMatch[]; posIdMap: Map<string, BPos> }) {
  const woMatches = matches.filter(m => m.isWO)
  if (woMatches.length === 0) return null

  // Expande cada partida W.O. em entradas individuais por atleta
  const entries: { key: string; name: string; label: string; woType?: string | null; calls: Array<{ call: number; at: string }>; endedAt?: string | null }[] = []
  for (const m of woMatches) {
    const isSolo = m.position2Id === null
    const isDoubleWO = !isSolo && m.winnerId === null && !!m.position1Id && !!m.position2Id
    const allCalls = m.callTimes ?? []

    if (isDoubleWO) {
      const reg1 = posIdMap.get(m.position1Id!)?.registration ?? null
      const reg2 = posIdMap.get(m.position2Id!)?.registration ?? null
      const p1Calls = allCalls.filter(c => c.pos === "p1" || !c.pos)
      const p2Calls = allCalls.filter(c => c.pos === "p2" || !c.pos)
      // Infere tipo por atleta: peso presente → PESO; outro lado tem peso mas este não → AUSENCIA; senão usa woType do match
      const p1WoType = m.woWeight1 != null ? "PESO" : (m.woWeight2 != null ? "AUSENCIA" : (m.woType ?? "AUSENCIA"))
      const p2WoType = m.woWeight2 != null ? "PESO" : (m.woWeight1 != null ? "AUSENCIA" : (m.woType ?? "AUSENCIA"))
      if (reg1) entries.push({ key: `${m.id}-1`, name: getRegName(reg1), label: woLabel(p1WoType, m.woWeight1 ?? null, m.woReason), woType: p1WoType, calls: p1Calls, endedAt: m.endedAt })
      if (reg2) entries.push({ key: `${m.id}-2`, name: getRegName(reg2), label: woLabel(p2WoType, m.woWeight2 ?? null, m.woReason), woType: p2WoType, calls: p2Calls, endedAt: m.endedAt })
    } else if (m.position1Id) {
      if (isSolo && m.winnerId !== null) continue
      const loserId = isSolo
        ? m.position1Id
        : (m.winnerId === m.position1Id ? m.position2Id : m.position1Id)
      const loserReg = loserId ? posIdMap.get(loserId)?.registration ?? null : null
      const weight = (!isSolo && m.winnerId === m.position1Id) ? m.woWeight2 : m.woWeight1
      const loserPos = loserId === m.position1Id ? "p1" : "p2"
      const loserCalls = allCalls.filter(c => c.pos === loserPos || !c.pos)
      if (loserReg) entries.push({ key: m.id, name: getRegName(loserReg), label: woLabel(m.woType, weight ?? null, m.woReason), woType: m.woType, calls: loserCalls, endedAt: m.endedAt })
    }
  }

  if (entries.length === 0) return null

  const allAbsent = entries.every(e => e.woType === "AUSENCIA" || !e.woType)
  const allDescl = entries.every(e => e.woType === "PESO" || e.woType === "DESCLASSIFICACAO")
  const sectionTitle = allAbsent ? "W.O." : allDescl ? "Desclassificados" : "W.O. / Desclassificados"

  return (
    <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: "#f97316", margin: "0 0 5px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{sectionTitle}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {entries.map(e => {
          const isAbsence = e.woType === "AUSENCIA" || !e.woType
          const endLabel = isAbsence ? "W.O." : "Desc."
          const endColor = isAbsence ? "#dc2626" : "#a855f7"
          return (
            <div key={e.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: "#f97316", fontWeight: 700 }}>▸</span>
                <span style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 600 }}>{e.name}</span>
                <span style={{ fontSize: 9, color: "#6b7280" }}>— {e.label}</span>
              </div>
              {(e.calls.length > 0 || e.endedAt) && (
                <div style={{ display: "flex", gap: 8, marginTop: 2, marginLeft: 14, flexWrap: "wrap" }}>
                  {e.calls.sort((a, b) => a.call - b.call).map(c => (
                    <span key={c.call} style={{ fontSize: 8, color: "#9ca3af" }}>
                      <span style={{ color: "#f97316", fontWeight: 700 }}>{c.call}ª</span> {fmtTime(c.at)}
                    </span>
                  ))}
                  {e.endedAt && (
                    <span style={{ fontSize: 8, color: "#9ca3af" }}>
                      <span style={{ color: endColor, fontWeight: 700 }}>{endLabel}</span> {fmtTime(e.endedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function shortName(reg: Reg | null): string {
  const full = reg?.athlete?.user.name ?? reg?.guestName ?? ""
  if (!full) return ""
  const words = full.trim().split(/\s+/)
  if (words.length === 1) return words[0].toUpperCase()
  return (words[0] + " " + words[words.length - 1].substring(0, 1) + ".").toUpperCase()
}

interface SlotEntry { posId: string | null; isWinner: boolean; hasPotential: boolean }

// Builds slot progression for one half of the bracket.
// posId = null + hasPotential = false → true BYE (no athlete, no future athlete)
// posId = null + hasPotential = true  → match not decided yet
// posId = someId                      → athlete occupying this slot
//
// matchBySoloPosRound: posId → (round → solo match)
// Usado para checar resultado de partidas solo antes de auto-avançar por BYE.
function buildSlots(
  order: number[],
  posNumToId: Map<number, string>,
  posIdMap: Map<string, BPos>,
  matchByPair: Map<string, BMatch>,
  numRounds: number,
  matchBySoloPosRound?: Map<string, Map<number, BMatch>>,
  bracketStarted?: boolean
): Array<Array<SlotEntry>> {
  const slots: Array<Array<SlotEntry>> = []

  // Round 0: real athletes only; positions with no registration are BYE (hasPotential=false)
  slots.push(order.map(posNum => {
    const posId = posNumToId.get(posNum) ?? null
    if (!posId) return { posId: null, isWinner: false, hasPotential: false }
    const hasAthlete = posIdMap.get(posId)?.registration != null
    return { posId: hasAthlete ? posId : null, isWinner: false, hasPotential: false }
  }))

  // Resolve avanço por BYE: verifica resultado da partida solo antes de auto-avançar
  function resolveByeAdvance(athletePosId: string, round: number): SlotEntry {
    // Chave não iniciada: nenhum número deve avançar nas caixas de conexão
    if (!bracketStarted) {
      return { posId: null, isWinner: false, hasPotential: false }
    }
    const soloMatch = matchBySoloPosRound?.get(athletePosId)?.get(round)
    if (!soloMatch) {
      // Sem partida solo registrada → auto-avança (BYE verdadeiro, seed sem atleta)
      return { posId: athletePosId, isWinner: false, hasPotential: false }
    }
    if (soloMatch.winnerId === athletePosId) {
      // Atleta confirmou presença e avançou
      return { posId: athletePosId, isWinner: true, hasPotential: false }
    }
    if (soloMatch.isWO && soloMatch.endedAt) {
      // Atleta tomou W.O. — não avança
      return { posId: null, isWinner: false, hasPotential: false }
    }
    // Partida pendente (aguardando pesagem)
    return { posId: null, isWinner: false, hasPotential: true }
  }

  for (let r = 1; r < numRounds; r++) {
    const prev = slots[r - 1]
    const curr: Array<SlotEntry> = []
    for (let i = 0; i < prev.length / 2; i++) {
      const a = prev[2 * i], b = prev[2 * i + 1]

      if (!a.posId && !b.posId) {
        // Both empty (BYE or unresolved)
        curr.push({ posId: null, isWinner: false, hasPotential: a.hasPotential || b.hasPotential })
      } else if (!a.posId) {
        if (a.hasPotential) {
          // a's match not decided yet — wait
          curr.push({ posId: null, isWinner: false, hasPotential: true })
        } else {
          // a is BYE — verifica resultado da partida solo de b
          curr.push(resolveByeAdvance(b.posId!, r))
        }
      } else if (!b.posId) {
        if (b.hasPotential) {
          // b's match not decided yet — wait
          curr.push({ posId: null, isWinner: false, hasPotential: true })
        } else {
          // b is BYE — verifica resultado da partida solo de a
          curr.push(resolveByeAdvance(a.posId!, r))
        }
      } else {
        // Both have athletes — look up the match result
        const key = [a.posId, b.posId].sort().join("|")
        const match = matchByPair.get(key)
        const isResolved = !!match?.winnerId || (match?.isWO && !!match?.endedAt)
        curr.push({ posId: match?.winnerId ?? null, isWinner: !!match?.winnerId, hasPotential: !match || !isResolved })
      }
    }
    slots.push(curr)
  }
  return slots
}

type PositionCardInfo = { registrationId: string; positionId: string; positionNum: number; bracketId: string }

// ── 3-athlete FBJJMMA repescagem bracket ──────────────────────────────────
function ThreeAthleteBracket({
  bracket,
  onAthleteClick,
  onPositionCardClick,
}: {
  bracket: BracketData
  onAthleteClick?: (registrationId: string) => void
  onPositionCardClick?: (info: PositionCardInfo) => void
}) {
  const { positions, weightCategory, bracketNumber, isAbsolute, belt, matches = [] } = bracket

  const pos1 = positions.find(p => p.position === 1) ?? positions[0] ?? null
  const pos2 = positions.find(p => p.position === 2) ?? positions[1] ?? null
  const pos3 = positions.find(p => p.position === 3) ?? positions[2] ?? null

  const m1 = matches.find(m => m.round === 1) ?? null
  const m2 = matches.find(m => m.round === 2) ?? null
  const mFinal = matches.find(m => m.round === 3) ?? null

  const posIdMap3 = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions])

  const m1WinnerId = m1?.winnerId ?? null
  const m1LoserId = m1WinnerId
    ? (m1WinnerId === m1!.position1Id ? m1!.position2Id : m1!.position1Id)
    : null
  // Se M1 foi W.O., o perdedor não entra na repescagem — slot fica vazio
  const m1LoserPos = (m1LoserId && !m1?.isWO) ? (posIdMap3.get(m1LoserId) ?? null) : null

  const m2WinnerId = m2?.winnerId ?? null
  const m2LoserId = m2WinnerId
    ? (m2WinnerId === m2!.position1Id ? m2!.position2Id : m2!.position1Id)
    : null

  const finalWinnerId = mFinal?.winnerId ?? null
  const finalLoserId = finalWinnerId
    ? (finalWinnerId === mFinal!.position1Id ? mFinal!.position2Id : mFinal!.position1Id)
    : null

  // Layout constants
  const PAD = 22        // left padding (includes space for position label)
  const CW = 140        // card width
  const CH = 44         // card height
  const VG = 6          // vertical gap between athlete cards in same match
  const DROP_GAP = 60   // vertical gap between bottom of pos3 and top of loser card
  const BLX = PAD + CW         // bracket vertical line X (right edge of cards) = 162
  const HG1 = 10               // gap bracket line → result box
  const RBX = BLX + HG1        // result box left = 172
  const RBW = 32
  const RBH = 20
  const PBLX = RBX + RBW + 8  // pre-final bracket X = 212
  const FX = PBLX + 8          // final box left = 220
  const FBW = 80
  const FBH = 44

  // Y coordinates
  const pos1Y = PAD                              // 22
  const pos3Y = PAD + CH + VG                    // 72
  const pos1CY = pos1Y + CH / 2                  // 44
  const pos3CY = pos3Y + CH / 2                  // 94
  const m1MatchCY = (pos1CY + pos3CY) / 2        // 69
  const m1BoxTop = m1MatchCY - RBH / 2           // 59

  const loserY = pos3Y + CH + DROP_GAP           // 176
  const pos2Y = loserY + CH + VG                 // 226
  const loserCY = loserY + CH / 2               // 198
  const pos2CY = pos2Y + CH / 2                 // 248
  const m2MatchCY = (loserCY + pos2CY) / 2      // 223
  const m2BoxTop = m2MatchCY - RBH / 2          // 213

  const finalCY = (m1MatchCY + m2MatchCY) / 2   // 146
  const finalBoxTop = finalCY - FBH / 2          // 124

  const TOTAL_W = FX + FBW + PAD               // 322
  const TOTAL_H = pos2Y + CH + PAD             // 292

  const m2Active = !!m1WinnerId

  // ── Inner render helpers (no hooks) ──────────────────────────────────────
  function ACard({
    pos, top, posLabel, dimmed = false, emptyText = "—",
  }: {
    pos: BPos | null; top: number; posLabel: string; dimmed?: boolean; emptyText?: string
  }) {
    const reg = pos?.registration ?? null
    const name = reg?.athlete?.user.name ?? reg?.guestName ?? null
    const team = reg?.team?.name ?? null
    const clickable = !!reg && !dimmed && !!(onAthleteClick || onPositionCardClick)
    const handleCardClick = clickable ? () => {
      if (onPositionCardClick && pos) {
        onPositionCardClick({ registrationId: reg!.id, positionId: pos.id, positionNum: pos.position, bracketId: bracket.id })
      } else if (onAthleteClick) {
        onAthleteClick(reg!.id)
      }
    } : undefined
    return (
      <div
        onClick={handleCardClick}
        style={{
          position: "absolute", left: PAD, top, width: CW, height: CH,
          border: `1px solid ${name && !dimmed ? "var(--bracket-card-border)" : dimmed && name ? "var(--bracket-dimmed-border)" : "var(--border)"}`,
          backgroundColor: name ? (dimmed ? "var(--bracket-dimmed-bg)" : "var(--bracket-card-bg)") : "var(--card)",
          borderRadius: 2, padding: "3px 7px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          boxSizing: "border-box", overflow: "hidden",
          cursor: clickable ? "pointer" : "default",
          opacity: dimmed ? 0.5 : 1,
        }}
      >
        {/* position label, outside left edge */}
        <span style={{
          position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)",
          fontSize: 10, color: dimmed ? "#f59e0b" : "var(--foreground)", fontWeight: 700, userSelect: "none",
        }}>{posLabel}</span>
        {name ? (
          <>
            <p style={{ fontSize: 9, color: dimmed ? "var(--bracket-dimmed-text)" : "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, lineHeight: "1.35" }}>
              {name.toUpperCase()}
            </p>
            <p style={{ fontSize: 8, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, lineHeight: "1.35" }}>
              {(team || "—").toUpperCase()}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>{emptyText}</p>
        )}
      </div>
    )
  }

  function RBox({ top, winnerId, inactive = false }: { top: number; winnerId: string | null; inactive?: boolean }) {
    const label = winnerId ? String(posIdMap3.get(winnerId)?.position ?? "") || null : null
    return (
      <div style={{
        position: "absolute", left: RBX, top, width: RBW, height: RBH,
        border: `1px solid ${label ? "var(--bracket-card-border)" : "var(--border)"}`,
        backgroundColor: label ? "var(--bracket-card-bg)" : "var(--background)",
        borderRadius: 2, boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: inactive ? 0.25 : 1,
      }}>
        {label && <span style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 700 }}>{label}</span>}
      </div>
    )
  }

  const champion = finalWinnerId ? posIdMap3.get(finalWinnerId)?.registration ?? null : null
  // Se a final terminou por W.O., o perdedor foi desclassificado — sem 2° lugar
  const runnerUp = (finalLoserId && !mFinal?.isWO) ? posIdMap3.get(finalLoserId)?.registration ?? null : null
  // Se o perdedor do R2 foi eliminado por W.O., não recebe 3° lugar
  const thirdPlace = (m2LoserId && !m2?.isWO) ? posIdMap3.get(m2LoserId)?.registration ?? null : null

  const bracketTitle = [
    weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
    AGE_GROUP_LABELS[weightCategory.ageGroup] || weightCategory.ageGroup,
    isAbsolute ? null : `${weightCategory.name} | Até ${weightCategory.maxWeight}kg`,
    isAbsolute ? "Absoluto" : null,
    belt ? (BELT_LABELS[belt] || belt) : null,
    `Chave: ${bracketNumber}`,
  ].filter(Boolean).join(" | ")

  const loserLabel = m1LoserPos ? String(m1LoserPos.position) : "?"
  return (
    <div style={{ marginBottom: 16, overflowX: "auto" }}>
      <div style={{ width: TOTAL_W, margin: "0 auto", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", backgroundColor: "var(--background)" }}>
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{bracketTitle}</p>
      </div>
      <div style={{ overflow: "hidden", width: TOTAL_W, height: TOTAL_H }}>
        <div style={{ position: "relative", width: TOTAL_W, height: TOTAL_H }}>
          <svg style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }} width={TOTAL_W} height={TOTAL_H}>
            {/* M1: pos1 & pos3 bracket lines */}
            <line x1={BLX} y1={pos1CY} x2={BLX} y2={pos3CY} stroke={LINE_COLOR} strokeWidth={1} />
            <line x1={BLX} y1={m1MatchCY} x2={RBX} y2={m1MatchCY} stroke={LINE_COLOR} strokeWidth={1} />

            {/* Loser drop: dashed amber path from M1 result box down to loser card */}
            <line x1={RBX + RBW / 2} y1={m1BoxTop + RBH} x2={RBX + RBW / 2} y2={loserCY}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" opacity={m2Active ? 1 : 0.18} />
            <line x1={PAD + CW} y1={loserCY} x2={RBX + RBW / 2} y2={loserCY}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" opacity={m2Active ? 1 : 0.18} />

            {/* M2: loser & pos2 bracket lines */}
            <line x1={BLX} y1={loserCY} x2={BLX} y2={pos2CY} stroke={LINE_COLOR} strokeWidth={1} opacity={m2Active ? 1 : 0.2} />
            <line x1={BLX} y1={m2MatchCY} x2={RBX} y2={m2MatchCY} stroke={LINE_COLOR} strokeWidth={1} opacity={m2Active ? 1 : 0.2} />

            {/* M1 result → pre-final bracket */}
            <line x1={RBX + RBW} y1={m1MatchCY} x2={PBLX} y2={m1MatchCY} stroke={LINE_COLOR} strokeWidth={1} />
            {/* M2 result → pre-final bracket */}
            <line x1={RBX + RBW} y1={m2MatchCY} x2={PBLX} y2={m2MatchCY} stroke={LINE_COLOR} strokeWidth={1} opacity={m2Active ? 1 : 0.2} />
            {/* Pre-final vertical bracket */}
            <line x1={PBLX} y1={m1MatchCY} x2={PBLX} y2={m2MatchCY} stroke={LINE_COLOR} strokeWidth={1} opacity={m2Active ? 1 : 0.2} />
            {/* Pre-final → Final */}
            <line x1={PBLX} y1={finalCY} x2={FX} y2={finalCY} stroke={LINE_COLOR} strokeWidth={1} opacity={m2Active ? 1 : 0.2} />
          </svg>

          {/* pos1 card */}
          <ACard pos={pos1} top={pos1Y} posLabel="1" />
          {/* pos3 card */}
          <ACard pos={pos3} top={pos3Y} posLabel="3" />
          {/* M1 result box */}
          <RBox top={m1BoxTop} winnerId={m1WinnerId} />

          {/* Loser of M1 (dimmed card on repescagem side) */}
          <ACard pos={m1LoserPos} top={loserY} posLabel={loserLabel} dimmed emptyText="Perdedor M1" />
          {/* pos2 card */}
          <ACard pos={pos2} top={pos2Y} posLabel="2" />
          {/* M2 result box */}
          <RBox top={m2BoxTop} winnerId={m2WinnerId} inactive={!m2Active} />

          {/* Final box */}
          <div style={{
            position: "absolute", left: FX, top: finalBoxTop, width: FBW, height: FBH,
            border: `1px solid ${finalWinnerId ? "var(--bracket-gold-border)" : m2Active ? "var(--bracket-card-border)" : "var(--border)"}`,
            backgroundColor: finalWinnerId ? "var(--bracket-gold-bg)" : m2Active ? "var(--bracket-card-bg)" : "var(--background)",
            borderRadius: 2, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            boxSizing: "border-box", padding: "2px 6px", gap: 2,
            opacity: m2Active ? 1 : 0.3,
          }}>
            <span style={{ fontSize: 8, color: "#fbbf24", fontWeight: 700, lineHeight: 1.3 }}>FINAL</span>
            {!finalWinnerId && m1WinnerId && m2WinnerId && (
              <span style={{ fontSize: 7, color: "var(--muted-foreground)", lineHeight: 1.3 }}>
                {posIdMap3.get(m1WinnerId)?.position} vs {posIdMap3.get(m2WinnerId)?.position}
              </span>
            )}
            {finalWinnerId && (
              <span style={{ fontSize: 8, color: "#86efac", fontWeight: 700, lineHeight: 1.3 }}>
                {posIdMap3.get(finalWinnerId)?.position}° VENCEU
              </span>
            )}
          </div>
        </div>
      </div>

      {(champion || runnerUp || thirdPlace) && (
        <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--card-alt)", backgroundColor: "var(--card)", flexWrap: "wrap" }}>
          {[
            { label: "1° Lugar", color: "#fbbf24", reg: champion },
            { label: "2° Lugar", color: "var(--muted-foreground)", reg: runnerUp },
            { label: "3° Lugar", color: "#cd7c2f", reg: thirdPlace },
          ].map(({ label, color, reg }) => reg ? (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "var(--card-alt)", borderRadius: 6, padding: "5px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
              <span style={{ fontSize: 10, color: "var(--foreground)", fontWeight: 600 }}>{getRegName(reg)}</span>
              {reg.team && <span style={{ fontSize: 9, color: "var(--muted)" }}>({reg.team.name})</span>}
              {label === "1° Lugar" && isAbsolute && reg.prizePix && (
                <span style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>· PIX: {reg.prizePix}</span>
              )}
            </div>
          ) : null)}
        </div>
      )}
      <WOHistory matches={matches} posIdMap={posIdMap3} />
      </div>
    </div>
  )
}
// ── End ThreeAthleteBracket ────────────────────────────────────────────────

function StandardBracketView({ bracket, onAthleteClick, onPositionCardClick }: { bracket: BracketData; onAthleteClick?: (registrationId: string) => void; onPositionCardClick?: (info: PositionCardInfo) => void }) {
  const { positions, weightCategory, bracketNumber, isAbsolute, belt, matches = [] } = bracket

  const posMap = useMemo(() => {
    const m = new Map<number, BPos>()
    for (const p of positions) m.set(p.position, p)
    return m
  }, [positions])

  // Map position number → position id
  const posNumToId = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of positions) m.set(p.position, p.id)
    return m
  }, [positions])

  // Map position id → BPos
  const posIdMap = useMemo(() => {
    const m = new Map<string, BPos>()
    for (const p of positions) m.set(p.id, p)
    return m
  }, [positions])

  // Map sorted pair of position ids → match
  const matchByPair = useMemo(() => {
    const m = new Map<string, BMatch>()
    for (const match of matches) {
      if (match.position1Id && match.position2Id) {
        const key = [match.position1Id, match.position2Id].sort().join("|")
        m.set(key, match)
      }
    }
    return m
  }, [matches])

  // Map posId → (round → solo match) para checar resultado de partidas solo antes de auto-avançar
  const matchBySoloPosRound = useMemo(() => {
    const m = new Map<string, Map<number, BMatch>>()
    for (const match of matches) {
      if (match.position1Id && !match.position2Id) {
        if (!m.has(match.position1Id)) m.set(match.position1Id, new Map())
        m.get(match.position1Id)!.set(match.round, match)
      }
    }
    return m
  }, [matches])

  const n = positions.length
  const bracketSize = Math.max(nextPow2(Math.max(n, 2)), 16)
  const halfSize = bracketSize / 2
  // numHalfRounds: rounds 0 (athletes) through log2(halfSize) (finalist)
  const numHalfRounds = Math.log2(halfSize) + 1

  const leftOrder = useMemo(() => getSlotOrder(1, halfSize), [halfSize])
  const rightOrder = useMemo(() => getSlotOrder(2, halfSize), [halfSize])

  const bracketStarted = matches.length > 0

  // Build progression slots for both halves
  const leftSlots = useMemo(
    () => buildSlots(leftOrder, posNumToId, posIdMap, matchByPair, numHalfRounds, matchBySoloPosRound, bracketStarted),
    [leftOrder, posNumToId, posIdMap, matchByPair, numHalfRounds, matchBySoloPosRound, bracketStarted]
  )
  const rightSlots = useMemo(
    () => buildSlots(rightOrder, posNumToId, posIdMap, matchByPair, numHalfRounds, matchBySoloPosRound, bracketStarted),
    [rightOrder, posNumToId, posIdMap, matchByPair, numHalfRounds, matchBySoloPosRound, bracketStarted]
  )

  // centerYs[r][i] = center y of slot i at round r, based on athlete card geometry
  const centerYs: number[][] = useMemo(() => {
    const rounds: number[][] = []
    const r0: number[] = []
    for (let i = 0; i < halfSize; i++) r0.push(slotCenterY(i))
    rounds.push(r0)
    for (let r = 1; r < numHalfRounds; r++) {
      const prev = rounds[r - 1]
      const curr: number[] = []
      for (let i = 0; i < prev.length / 2; i++) {
        curr.push((prev[2 * i] + prev[2 * i + 1]) / 2)
      }
      rounds.push(curr)
    }
    return rounds
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [halfSize, numHalfRounds])

  const totalHeight = slotTopY(halfSize - 1) + ATHLETE_H + 2 * PADDING

  // Column width for a given round (r=0: athletes, r>=1: result boxes)
  function colW(r: number) { return r === 0 ? ATHLETE_W : RESULT_W }

  // Left column x positions
  function leftColX(r: number): number {
    if (r === 0) return PADDING + POS_LABEL_W
    return PADDING + POS_LABEL_W + ATHLETE_W + r * ROUND_GAP + (r - 1) * RESULT_W
  }

  // Center column x (the "Final" area)
  const centerX = leftColX(numHalfRounds - 1) + RESULT_W + ROUND_GAP

  // Right column x positions (r=0 outermost athlete, r=numHalfRounds-1 innermost result)
  function rightColX(r: number): number {
    if (r === 0) {
      // outermost: centerX + CENTER_W + (numHalfRounds-1) gaps + (numHalfRounds-1) result boxes + 1 gap
      return centerX + CENTER_W + numHalfRounds * ROUND_GAP + (numHalfRounds - 1) * RESULT_W
    }
    // result boxes: r=numHalfRounds-1 is innermost (closest to center)
    const stepsFromInner = numHalfRounds - 1 - r
    return centerX + CENTER_W + (stepsFromInner + 1) * ROUND_GAP + stepsFromInner * RESULT_W
  }

  const totalWidth = rightColX(0) + ATHLETE_W + POS_LABEL_W + PADDING

  const finalCenterY = centerYs[numHalfRounds - 1][0] + PADDING

  // ── SVG Lines ──────────────────────────────────────────────────────────────
  const lines: React.ReactElement[] = []

  // Left half: connect each match group to next round column
  for (let r = 0; r < numHalfRounds - 1; r++) {
    const lineX = leftColX(r) + colW(r) // right edge of current col
    const nextX = leftColX(r + 1)       // left edge of next col
    const numMatches = centerYs[r].length / 2
    for (let i = 0; i < numMatches; i++) {
      const topCY = centerYs[r][2 * i] + PADDING
      const botCY = centerYs[r][2 * i + 1] + PADDING
      const midCY = (topCY + botCY) / 2
      lines.push(
        <line key={`ll-v-${r}-${i}`} x1={lineX} y1={topCY} x2={lineX} y2={botCY} stroke={LINE_COLOR} strokeWidth={1} />,
        <line key={`ll-h-${r}-${i}`} x1={lineX} y1={midCY} x2={nextX} y2={midCY} stroke={LINE_COLOR} strokeWidth={1} />
      )
    }
  }

  // Left finalist → Final center
  lines.push(
    <line
      key="left-to-final"
      x1={leftColX(numHalfRounds - 1) + RESULT_W}
      y1={finalCenterY}
      x2={centerX}
      y2={finalCenterY}
      stroke={LINE_COLOR} strokeWidth={1}
    />
  )

  // Right half: connect each match group to next round column (flowing left)
  for (let r = 0; r < numHalfRounds - 1; r++) {
    const lineX = rightColX(r)          // left edge of current col (right side flows left)
    const nextX = rightColX(r + 1) + colW(r + 1) // right edge of next (inner) col
    const numMatches = centerYs[r].length / 2
    for (let i = 0; i < numMatches; i++) {
      const topCY = centerYs[r][2 * i] + PADDING
      const botCY = centerYs[r][2 * i + 1] + PADDING
      const midCY = (topCY + botCY) / 2
      lines.push(
        <line key={`rl-v-${r}-${i}`} x1={lineX} y1={topCY} x2={lineX} y2={botCY} stroke={LINE_COLOR} strokeWidth={1} />,
        <line key={`rl-h-${r}-${i}`} x1={lineX} y1={midCY} x2={nextX} y2={midCY} stroke={LINE_COLOR} strokeWidth={1} />
      )
    }
  }

  // Right finalist → Final center
  lines.push(
    <line
      key="right-to-final"
      x1={rightColX(numHalfRounds - 1)}
      y1={finalCenterY}
      x2={centerX + CENTER_W}
      y2={finalCenterY}
      stroke={LINE_COLOR} strokeWidth={1}
    />
  )

  // ── Cards ──────────────────────────────────────────────────────────────────
  const cards: React.ReactElement[] = []

  // Left round 0: athlete cards (large)
  leftOrder.forEach((posNum, slotIdx) => {
    const pos = posMap.get(posNum)
    const reg = pos?.registration ?? null
    const name = reg?.athlete?.user.name ?? reg?.guestName ?? null
    const team = reg?.team?.name ?? null
    const clickable = !!reg && !!(onAthleteClick || onPositionCardClick)
    const handleLeftClick = clickable ? () => {
      if (onPositionCardClick && pos) {
        onPositionCardClick({ registrationId: reg!.id, positionId: pos.id, positionNum: posNum, bracketId: bracket.id })
      } else if (onAthleteClick) {
        onAthleteClick(reg!.id)
      }
    } : undefined
    cards.push(
      <div
        key={`left-0-${posNum}`}
        onClick={handleLeftClick}
        style={{
          position: "absolute",
          left: leftColX(0),
          top: slotTopY(slotIdx) + PADDING,
          width: ATHLETE_W,
          height: ATHLETE_H,
          border: `1px solid ${name ? "var(--bracket-card-border)" : "var(--border)"}`,
          backgroundColor: name ? "var(--bracket-card-bg)" : "var(--card)",
          borderRadius: 2,
          padding: "3px 7px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          overflow: "visible",
          cursor: clickable ? "pointer" : "default",
        }}
      >
        {/* Position number label on left */}
        <span style={{
          position: "absolute", left: -POS_LABEL_W, top: "50%",
          transform: "translateY(-50%)", fontSize: 10, color: "var(--foreground)",
          fontWeight: 700, userSelect: "none",
        }}>{posNum}</span>
        {name ? (
          <>
            <p style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, lineHeight: "1.35" }}>{name.toUpperCase()}</p>
            <p style={{ fontSize: 8, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, lineHeight: "1.35" }}>{(team || "—").toUpperCase()}</p>
          </>
        ) : (
          <p style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>—</p>
        )}
      </div>
    )
  })

  // Left rounds 1 to numHalfRounds-2: result boxes with position number
  // (numHalfRounds-1 is the finalist box, rendered separately in the center section)
  for (let r = 1; r < numHalfRounds - 1; r++) {
    for (let i = 0; i < centerYs[r].length; i++) {
      const slot = leftSlots[r]?.[i]
      const posNum = slot?.posId ? posIdMap.get(slot.posId)?.position ?? null : null
      cards.push(
        <div
          key={`left-r${r}-${i}`}
          style={{
            position: "absolute",
            left: leftColX(r),
            top: centerYs[r][i] - RESULT_H / 2 + PADDING,
            width: RESULT_W,
            height: RESULT_H,
            border: `1px solid ${posNum !== null ? "var(--bracket-card-border)" : "var(--border)"}`,
            backgroundColor: posNum !== null ? "var(--bracket-card-bg)" : "var(--background)",
            borderRadius: 2,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {posNum !== null && <span style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 700 }}>{posNum}</span>}
        </div>
      )
    }
  }

  // Right round 0: athlete cards (large)
  rightOrder.forEach((posNum, slotIdx) => {
    const pos = posMap.get(posNum)
    const reg = pos?.registration ?? null
    const name = reg?.athlete?.user.name ?? reg?.guestName ?? null
    const team = reg?.team?.name ?? null
    const clickable = !!reg && !!(onAthleteClick || onPositionCardClick)
    const handleRightClick = clickable ? () => {
      if (onPositionCardClick && pos) {
        onPositionCardClick({ registrationId: reg!.id, positionId: pos.id, positionNum: posNum, bracketId: bracket.id })
      } else if (onAthleteClick) {
        onAthleteClick(reg!.id)
      }
    } : undefined
    cards.push(
      <div
        key={`right-0-${posNum}`}
        onClick={handleRightClick}
        style={{
          position: "absolute",
          left: rightColX(0),
          top: slotTopY(slotIdx) + PADDING,
          width: ATHLETE_W,
          height: ATHLETE_H,
          border: `1px solid ${name ? "var(--bracket-card-border)" : "var(--border)"}`,
          backgroundColor: name ? "var(--bracket-card-bg)" : "var(--card)",
          borderRadius: 2,
          padding: "3px 7px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          cursor: clickable ? "pointer" : "default",
          boxSizing: "border-box",
          overflow: "visible",
        }}
      >
        {/* Position number label on right */}
        <span style={{
          position: "absolute", right: -POS_LABEL_W, top: "50%",
          transform: "translateY(-50%)", fontSize: 10, color: "var(--foreground)",
          fontWeight: 700, userSelect: "none",
        }}>{posNum}</span>
        {name ? (
          <>
            <p style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, lineHeight: "1.35" }}>{name.toUpperCase()}</p>
            <p style={{ fontSize: 8, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, lineHeight: "1.35" }}>{(team || "—").toUpperCase()}</p>
          </>
        ) : (
          <p style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>—</p>
        )}
      </div>
    )
  })

  // Right rounds 1 to numHalfRounds-2: result boxes with position number
  // (numHalfRounds-1 is the finalist box, rendered separately in the center section)
  for (let r = 1; r < numHalfRounds - 1; r++) {
    for (let i = 0; i < centerYs[r].length; i++) {
      const slot = rightSlots[r]?.[i]
      const posNum = slot?.posId ? posIdMap.get(slot.posId)?.position ?? null : null
      cards.push(
        <div
          key={`right-r${r}-${i}`}
          style={{
            position: "absolute",
            left: rightColX(r),
            top: centerYs[r][i] - RESULT_H / 2 + PADDING,
            width: RESULT_W,
            height: RESULT_H,
            border: `1px solid ${posNum !== null ? "var(--bracket-card-border)" : "var(--border)"}`,
            backgroundColor: posNum !== null ? "var(--bracket-card-bg)" : "var(--background)",
            borderRadius: 2,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {posNum !== null && <span style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 700 }}>{posNum}</span>}
        </div>
      )
    }
  }

  // Final center: 1° Lugar / 2° Lugar boxes — only show when ALL matches are complete
  const finalBoxH = 24
  const allMatchesDone = matches.length > 0 && matches.every(m => m.winnerId || (m.isWO && m.endedAt))
  // Partida final = a de maior rodada com dois atletas reais (exclui W.O. fantasma com position2Id null)
  const realMatches = matches.filter(m => m.position1Id !== null && m.position2Id !== null)
  const maxRealRound = realMatches.length > 0 ? Math.max(...realMatches.map(m => m.round)) : 0
  const finalMatch = allMatchesDone
    ? realMatches.find(m => m.round === maxRealRound && m.matchNumber === 1)
    : undefined
  const finalWinnerId = finalMatch?.winnerId ?? null
  const firstPlaceReg = finalWinnerId
    ? posIdMap.get(finalWinnerId)?.registration ?? null
    : null
  const secondPosId = (finalMatch && finalWinnerId && !finalMatch.isWO)
    ? (finalWinnerId === finalMatch.position1Id ? finalMatch.position2Id : finalMatch.position1Id)
    : null
  const secondPlaceReg = secondPosId ? posIdMap.get(secondPosId)?.registration ?? null : null

  // 3° lugar: perdedor da semifinal do campeão (ou do vice se o lado do campeão foi W.O.)
  const thirdPlaceReg = (() => {
    if (!finalMatch?.winnerId || maxRealRound < 2) return null
    const semiRound = maxRealRound - 1
    const champSemiAny = realMatches.find(m => m.round === semiRound && m.winnerId === finalMatch.winnerId)
    // Campeão ganhou a semi por qualquer W.O. — sem 3° lugar
    if (champSemiAny?.isWO) return null
    // Sem partida 2x2 na semi: verificar W.O. solo na mesma rodada (adversário eliminado antes da partida)
    if (!champSemiAny && matches.some(m => m.round === semiRound && m.isWO)) return null
    const champSemi = champSemiAny ?? null
    const runnerUpSemi = realMatches.find(m => m.round === semiRound && m.winnerId === secondPosId && !m.isWO)
    const semi = champSemi ?? runnerUpSemi
    if (!semi) return null
    const loserId = semi.winnerId === semi.position1Id ? semi.position2Id : semi.position1Id
    return loserId ? posIdMap.get(loserId)?.registration ?? null : null
  })()


  const leftFinalistPosNum = leftSlots[numHalfRounds - 1]?.[0]?.posId
    ? posIdMap.get(leftSlots[numHalfRounds - 1][0].posId!)?.position ?? null
    : null
  const rightFinalistPosNum = rightSlots[numHalfRounds - 1]?.[0]?.posId
    ? posIdMap.get(rightSlots[numHalfRounds - 1][0].posId!)?.position ?? null
    : null

  // Left finalist box (feeds into 1° Lugar slot)
  cards.push(
    <div key="finalist-left" style={{
      position: "absolute",
      left: leftColX(numHalfRounds - 1),
      top: centerYs[numHalfRounds - 1][0] - RESULT_H / 2 + PADDING,
      width: RESULT_W,
      height: RESULT_H,
      border: `1px solid ${leftFinalistPosNum !== null ? "var(--bracket-card-border)" : "var(--border)"}`,
      backgroundColor: leftFinalistPosNum !== null ? "var(--bracket-card-bg)" : "var(--background)",
      borderRadius: 2,
      boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {leftFinalistPosNum !== null && <span style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 700 }}>{leftFinalistPosNum}</span>}
    </div>
  )

  // Right finalist box
  cards.push(
    <div key="finalist-right" style={{
      position: "absolute",
      left: rightColX(numHalfRounds - 1),
      top: centerYs[numHalfRounds - 1][0] - RESULT_H / 2 + PADDING,
      width: RESULT_W,
      height: RESULT_H,
      border: `1px solid ${rightFinalistPosNum !== null ? "var(--bracket-card-border)" : "var(--border)"}`,
      backgroundColor: rightFinalistPosNum !== null ? "var(--bracket-card-bg)" : "var(--background)",
      borderRadius: 2,
      boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {rightFinalistPosNum !== null && <span style={{ fontSize: 9, color: "var(--foreground)", fontWeight: 700 }}>{rightFinalistPosNum}</span>}
    </div>
  )

  cards.push(
    <div key="final-1" style={{
      position: "absolute", left: centerX,
      top: finalCenterY - finalBoxH - 3,
      width: CENTER_W, height: finalBoxH,
      border: `1px solid ${firstPlaceReg ? "var(--bracket-gold-border)" : "var(--border)"}`,
      backgroundColor: firstPlaceReg ? "var(--bracket-gold-bg)" : "var(--card)",
      borderRadius: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "1px 4px",
    }}>
      <span style={{ fontSize: 7, color: "#fbbf24", fontWeight: 700, lineHeight: 1.2 }}>1° Lugar</span>
      {firstPlaceReg && <span style={{ fontSize: 7, color: "var(--bracket-final-name)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", lineHeight: 1.2 }}>{shortName(firstPlaceReg)}</span>}
    </div>,
    <div key="final-2" style={{
      position: "absolute", left: centerX,
      top: finalCenterY + 3,
      width: CENTER_W, height: finalBoxH,
      border: `1px solid ${secondPlaceReg ? "var(--bracket-silver-border)" : "var(--border)"}`,
      backgroundColor: secondPlaceReg ? "var(--bracket-silver-bg)" : "var(--card)",
      borderRadius: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "1px 4px",
    }}>
      <span style={{ fontSize: 7, color: "var(--muted-foreground)", fontWeight: 600, lineHeight: 1.2 }}>2° Lugar</span>
      {secondPlaceReg && <span style={{ fontSize: 7, color: "var(--bracket-final-name)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", lineHeight: 1.2 }}>{shortName(secondPlaceReg)}</span>}
    </div>,
    ...((!allMatchesDone || thirdPlaceReg) ? [<div key="final-3" style={{
      position: "absolute", left: centerX,
      top: finalCenterY + finalBoxH + 9,
      width: CENTER_W, height: finalBoxH,
      border: `1px solid ${thirdPlaceReg ? "var(--bracket-bronze-border)" : "var(--border)"}`,
      backgroundColor: thirdPlaceReg ? "var(--bracket-bronze-bg)" : "var(--card)",
      borderRadius: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "1px 4px",
    }}>
      <span style={{ fontSize: 7, color: "#cd7c2f", fontWeight: 600, lineHeight: 1.2 }}>3° Lugar</span>
      {thirdPlaceReg && <span style={{ fontSize: 7, color: "var(--bracket-final-name)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", lineHeight: 1.2 }}>{shortName(thirdPlaceReg)}</span>}
    </div>] : [])
  )

  // ── Placements ─────────────────────────────────────────────────────────────
  // Only compute placements when ALL matches are done
  const posMap2 = new Map(positions.map(p => [p.id, p]))
  let primeiro: Reg | null = null
  let segundo: Reg | null = null

  if (allMatchesDone && finalMatch?.winnerId) {
    const winnerPos = posMap2.get(finalMatch.winnerId)
    primeiro = winnerPos?.registration ?? null

    const loserId = finalMatch.winnerId === finalMatch.position1Id ? finalMatch.position2Id : finalMatch.position1Id
    if (loserId) segundo = posMap2.get(loserId)?.registration ?? null
  }

  const placements = [
    { label: "1° Lugar", color: "#fbbf24", reg: primeiro },
    { label: "2° Lugar", color: "var(--muted-foreground)", reg: segundo },
    { label: "3° Lugar", color: "#cd7c2f", reg: thirdPlaceReg },
  ]

  const title = [
    weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
    AGE_GROUP_LABELS[weightCategory.ageGroup] || weightCategory.ageGroup,
    isAbsolute ? null : `${weightCategory.name} | Até ${weightCategory.maxWeight}kg`,
    isAbsolute ? "Absoluto" : null,
    belt ? (BELT_LABELS[belt] || belt) : null,
    `Chave: ${bracketNumber}`,
  ].filter(Boolean).join(" | ")

  return (
    <div style={{ marginBottom: 16, overflowX: "auto" }}>
      <div style={{ width: totalWidth, margin: "0 auto", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", backgroundColor: "var(--background)" }}>
        <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{title}</p>
        </div>
        <div style={{ overflow: "hidden", width: totalWidth, height: totalHeight }}>
          <div style={{ position: "relative", width: totalWidth, height: totalHeight, minHeight: 80 }}>
            <svg style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }} width={totalWidth} height={totalHeight}>
              {lines}
            </svg>
            {cards}
          </div>
        </div>
        {(primeiro || segundo) && (
          <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--card-alt)", backgroundColor: "var(--card)", flexWrap: "wrap" }}>
            {placements.map(({ label, color, reg }) => reg && (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "var(--card-alt)", borderRadius: 6, padding: "5px 10px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
                <span style={{ fontSize: 10, color: "var(--foreground)", fontWeight: 600 }}>{getRegName(reg)}</span>
                {reg.team && <span style={{ fontSize: 9, color: "var(--muted)" }}>({reg.team.name})</span>}
                {label === "1° Lugar" && isAbsolute && reg.prizePix && (
                  <span style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>· PIX: {reg.prizePix}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <WOHistory matches={matches} posIdMap={posIdMap} />
      </div>
    </div>
  )
}

export default function BracketView({ bracket, onAthleteClick, onPositionCardClick }: { bracket: BracketData; onAthleteClick?: (registrationId: string) => void; onPositionCardClick?: (info: PositionCardInfo) => void }) {
  if (bracket.positions.length === 3) {
    return <ThreeAthleteBracket bracket={bracket} onAthleteClick={onAthleteClick} onPositionCardClick={onPositionCardClick} />
  }
  return <StandardBracketView bracket={bracket} onAthleteClick={onAthleteClick} onPositionCardClick={onPositionCardClick} />
}
