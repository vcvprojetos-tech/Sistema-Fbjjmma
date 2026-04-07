"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim (4-5 anos)",
  MIRIM: "Mirim (6-7 anos)",
  INFANTIL_A: "Infantil A (8-9 anos)",
  INFANTIL_B: "Infantil B (10-11 anos)",
  INFANTO_JUVENIL_A: "Infanto Juvenil A (12-13 anos)",
  INFANTO_JUVENIL_B: "Infanto Juvenil B (14-15 anos)",
  JUVENIL: "Juvenil (16-17 anos)",
  ADULTO: "Adulto (18-29 anos)",
  MASTER_1: "Master 1 (30-35 anos)",
  MASTER_2: "Master 2 (36-40 anos)",
  MASTER_3: "Master 3 (41-45 anos)",
  MASTER_4: "Master 4 (46-50 anos)",
  MASTER_5: "Master 5 (51-55 anos)",
  MASTER_6: "Master 6 (56-60 anos)",
}

// Belts allowed per age group
const BELT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  PRE_MIRIM: [{ value: "BRANCA", label: "Branca" }],
  MIRIM: [{ value: "BRANCA", label: "Branca" }],
  INFANTIL_A: [{ value: "BRANCA", label: "Branca" }],
  INFANTIL_B: [{ value: "BRANCA", label: "Branca" }],
  INFANTO_JUVENIL_A: [
    { value: "BRANCA", label: "Branca" },
    { value: "AMARELA_LARANJA_VERDE", label: "Amarela/Laranja/Verde" },
  ],
  INFANTO_JUVENIL_B: [
    { value: "BRANCA", label: "Branca" },
    { value: "AMARELA_LARANJA_VERDE", label: "Amarela/Laranja/Verde" },
  ],
  JUVENIL: [
    { value: "BRANCA", label: "Branca" },
    { value: "AZUL", label: "Azul" },
  ],
  ADULTO: [
    { value: "BRANCA", label: "Branca" },
    { value: "AZUL", label: "Azul" },
    { value: "ROXA", label: "Roxa" },
    { value: "MARROM", label: "Marrom" },
    { value: "PRETA", label: "Preta" },
  ],
}
const MASTER_BELTS = [
  { value: "BRANCA", label: "Branca" },
  { value: "AZUL", label: "Azul" },
  { value: "ROXA", label: "Roxa" },
  { value: "MARROM", label: "Marrom" },
  { value: "PRETA", label: "Preta" },
]
;["MASTER_1","MASTER_2","MASTER_3","MASTER_4","MASTER_5","MASTER_6"].forEach(
  (k) => (BELT_OPTIONS[k] = MASTER_BELTS)
)

interface WeightCategory {
  id: string
  ageGroup: string
  sex: string
  name: string
  maxWeight: number
  order: number
}

interface Event {
  id: string
  name: string
  value: number
  hasAbsolute: boolean
  absoluteValue: number | null
  registrationDeadline: string
  registrationOpen: boolean
  paymentInfo: string | null
  imageRights: string | null
  physicalIntegrity: string | null
  weightTable: { categories: WeightCategory[] }
}

interface AthleteProfile {
  id: string
  sex: string
  belt: string
  weight: number
  isAffiliated: boolean
  team: { id: string; name: string } | null
  user: { name: string }
}

export default function InscreverPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()

  const [event, setEvent] = useState<Event | null>(null)
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const [ageGroup, setAgeGroup] = useState("")
  const [belt, setBelt] = useState("")
  const [weightCategoryId, setWeightCategoryId] = useState("")
  const [isAbsolute, setIsAbsolute] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedImageRights, setAcceptedImageRights] = useState(false)
  const [acceptedPhysicalIntegrity, setAcceptedPhysicalIntegrity] = useState(false)

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/eventos/${eventId}/inscrever`)
      return
    }
    if (authStatus !== "authenticated") return

    Promise.all([
      fetch(`/api/public/eventos/${eventId}`).then((r) => r.json()),
      fetch("/api/public/atleta").then((r) => r.json()),
    ]).then(([eventData, userData]) => {
      if (eventData.id) setEvent(eventData)
      if (userData.athlete) {
        setAthlete({ ...userData.athlete, user: { name: userData.name } })
        setBelt(userData.athlete.belt || "BRANCA")
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [eventId, authStatus, router])

  // Reset belt and weight category when age group changes
  useEffect(() => {
    if (ageGroup) {
      const belts = BELT_OPTIONS[ageGroup] || MASTER_BELTS
      // Keep current belt if valid, else pick first
      if (!belts.find((b) => b.value === belt)) {
        setBelt(belts[0].value)
      }
      setWeightCategoryId("")
    }
  }, [ageGroup]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCategories = event?.weightTable.categories.filter(
    (c) => c.ageGroup === ageGroup && c.sex === athlete?.sex
  ) || []

  const beltOptions = ageGroup ? (BELT_OPTIONS[ageGroup] || MASTER_BELTS) : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!ageGroup || !belt || !weightCategoryId) {
      setError("Selecione a categoria de idade, faixa e categoria de peso.")
      return
    }

    const needsTerms = event?.imageRights || event?.physicalIntegrity
    if (needsTerms && (!acceptedImageRights || !acceptedPhysicalIntegrity)) {
      setError("Você deve aceitar todos os termos para continuar.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/public/inscricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          ageGroup,
          belt,
          weightCategoryId,
          isAbsolute,
          acceptedTerms: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao realizar inscrição.")
      } else {
        setDone(true)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-[#6b7280]">
        Carregando...
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6b7280]">Evento não encontrado.</p>
        <Link href="/eventos" className="text-[#dc2626] text-sm mt-4 inline-block">
          ← Voltar para Eventos
        </Link>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <AlertCircle className="h-10 w-10 text-[#fbbf24] mx-auto mb-4" />
          <h2 className="text-white font-semibold mb-2">Perfil de atleta não encontrado</h2>
          <p className="text-[#6b7280] text-sm mb-6">
            Sua conta não está vinculada a um perfil de atleta.
            Entre em contato com a federação para regularizar seu cadastro.
          </p>
          <Link href="/minha-conta">
            <Button>Ir para Minha Conta</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isDeadlinePast = new Date() > new Date(event.registrationDeadline)
  if (!event.registrationOpen || isDeadlinePast) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <AlertCircle className="h-10 w-10 text-[#fbbf24] mx-auto mb-4" />
          <h2 className="text-white font-semibold mb-2">Inscrições encerradas</h2>
          <p className="text-[#6b7280] text-sm mb-6">
            O prazo de inscrição para este evento já encerrou.
          </p>
          <Link href={`/eventos/${eventId}`}>
            <Button variant="outline">Ver Evento</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <CheckCircle className="h-12 w-12 text-[#4ade80] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Inscrição Realizada!</h2>
          <p className="text-[#9ca3af] text-sm mb-2">
            Sua inscrição no <strong className="text-white">{event.name}</strong> foi registrada com sucesso.
          </p>
          {event.paymentInfo && (
            <p className="text-[#6b7280] text-sm mb-6">
              Realize o pagamento e envie o comprovante na sua área de inscrições.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link href="/minha-conta">
              <Button>Minhas Inscrições</Button>
            </Link>
            <Link href="/eventos">
              <Button variant="outline">Ver Mais Eventos</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/eventos/${eventId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Inscrição</h1>
          <p className="text-[#6b7280] text-sm">{event.name}</p>
        </div>
      </div>

      {/* Athlete info */}
      <div
        className="rounded-xl border p-4 flex items-center gap-4"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ backgroundColor: "#dc2626" }}
        >
          {athlete.user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{athlete.user.name}</p>
          <p className="text-[#6b7280] text-xs">
            {athlete.sex === "MASCULINO" ? "Masculino" : "Feminino"} •{" "}
            {athlete.team?.name || "Sem equipe"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category selection */}
        <section
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
            Categoria
          </h3>

          <div className="space-y-2">
            <Label>Categoria de Idade *</Label>
            <Select value={ageGroup} onValueChange={setAgeGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria de idade" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGE_GROUP_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ageGroup && (
            <div className="space-y-2">
              <Label>Faixa *</Label>
              <Select value={belt} onValueChange={setBelt}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa" />
                </SelectTrigger>
                <SelectContent>
                  {beltOptions.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {ageGroup && (
            <div className="space-y-2">
              <Label>Categoria de Peso *</Label>
              {filteredCategories.length === 0 ? (
                <p className="text-xs text-[#6b7280]">
                  Nenhuma categoria de peso disponível para esta seleção.
                </p>
              ) : (
                <Select value={weightCategoryId} onValueChange={setWeightCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria de peso" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.maxWeight >= 999 ? "Acima" : `até ${c.maxWeight}kg`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {athlete.weight > 0 && (
                <p className="text-xs text-[#6b7280]">
                  Seu peso cadastrado: <strong className="text-[#9ca3af]">{athlete.weight}kg</strong>
                </p>
              )}
            </div>
          )}

          {event.hasAbsolute && (
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="isAbsolute"
                checked={isAbsolute}
                onCheckedChange={(v) => setIsAbsolute(Boolean(v))}
              />
              <Label htmlFor="isAbsolute" className="cursor-pointer">
                Inscrever-se também no Absoluto
                {event.absoluteValue && (
                  <span className="text-[#6b7280] ml-1 text-xs">
                    (+R$ {event.absoluteValue.toFixed(2)})
                  </span>
                )}
              </Label>
            </div>
          )}
        </section>

        {/* Payment info */}
        {event.paymentInfo && (
          <section
            className="rounded-xl border p-6"
            style={{ backgroundColor: "#111111", borderColor: "#222222" }}
          >
            <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
              Informações de Pagamento
            </h3>
            <div
              className="text-[#9ca3af] text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: event.paymentInfo }}
            />
            <div
              className="mt-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              <p className="text-white font-medium">
                Total: R$ {(event.value + (isAbsolute && event.absoluteValue ? event.absoluteValue : 0)).toFixed(2)}
              </p>
            </div>
          </section>
        )}

        {/* Terms */}
        <section
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
            Termos e Condições
          </h3>

          {event.imageRights && (
            <div className="space-y-2">
              <div
                className="rounded-lg p-3 text-xs text-[#6b7280] max-h-32 overflow-y-auto"
                style={{ backgroundColor: "#0a0a0a" }}
                dangerouslySetInnerHTML={{ __html: event.imageRights }}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="imageRights"
                  checked={acceptedImageRights}
                  onCheckedChange={(v) => setAcceptedImageRights(Boolean(v))}
                />
                <Label htmlFor="imageRights" className="cursor-pointer text-sm">
                  Aceito os termos de direitos de imagem
                </Label>
              </div>
            </div>
          )}

          {event.physicalIntegrity && (
            <div className="space-y-2">
              <div
                className="rounded-lg p-3 text-xs text-[#6b7280] max-h-32 overflow-y-auto"
                style={{ backgroundColor: "#0a0a0a" }}
                dangerouslySetInnerHTML={{ __html: event.physicalIntegrity }}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="physicalIntegrity"
                  checked={acceptedPhysicalIntegrity}
                  onCheckedChange={(v) => setAcceptedPhysicalIntegrity(Boolean(v))}
                />
                <Label htmlFor="physicalIntegrity" className="cursor-pointer text-sm">
                  Aceito o termo de integridade física
                </Label>
              </div>
            </div>
          )}

          {!event.imageRights && !event.physicalIntegrity && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
              />
              <Label htmlFor="terms" className="cursor-pointer text-sm">
                Declaro que li e aceito os regulamentos do evento
              </Label>
            </div>
          )}
        </section>

        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ backgroundColor: "#dc262620", color: "#f87171" }}
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full py-3 text-base font-semibold"
        >
          {submitting ? "Realizando inscrição..." : "Confirmar Inscrição"}
        </Button>
      </form>
    </div>
  )
}
