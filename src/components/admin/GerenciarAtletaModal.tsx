"use client"

import { useState, useEffect } from "react"
import { X, CreditCard, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  PRE_MIRIM: "Pré Mirim (4 e 5 anos)",
  MIRIM: "Mirim (6 e 7 anos)",
  INFANTIL_A: "Infantil A (8 e 9 anos)",
  INFANTIL_B: "Infantil B (10 e 11 anos)",
  INFANTO_JUVENIL_A: "Infanto Juvenil A (12 e 13 anos)",
  INFANTO_JUVENIL_B: "Infanto Juvenil B (14 e 15 anos)",
  JUVENIL: "Juvenil (16 e 17 anos)",
  ADULTO: "Adulto (18 a 29 anos)",
  MASTER_1: "Master 1 (30 a 35 anos)",
  MASTER_2: "Master 2 (36 a 40 anos)",
  MASTER_3: "Master 3 (41 a 45 anos)",
  MASTER_4: "Master 4 (46 a 50 anos)",
  MASTER_5: "Master 5 (51 a 55 anos)",
  MASTER_6: "Master 6 (56 a 60 anos)",
}

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca",
  AMARELA_LARANJA_VERDE: "Amarela/Laranja/Verde",
  AZUL: "Azul",
  ROXA: "Roxa",
  MARROM: "Marrom",
  PRETA: "Preta",
}

interface Team {
  id: string
  name: string
}

interface WeightCategory {
  id: string
  ageGroup: string
  sex: string
  name: string
  maxWeight: number
}

interface BracketPosition {
  id: string
  position: number
  bracket: {
    id: string
    bracketNumber: number
    isAbsolute: boolean
    status: string
    weightCategory: { name: string; ageGroup: string; sex: string }
  }
}

interface Registration {
  id: string
  eventId: string
  athleteId: string
  sex: string
  ageGroup: string
  belt: string
  weightCategoryId: string
  teamId: string | null
  professor: string | null
  isAbsolute: boolean
  status: string
  paymentMethod: string | null
  paymentProof: string | null
  observation: string | null
  medal: string | null
  teamPoints: boolean
  awarded: boolean
  affiliated: boolean
  pointDiff: boolean
  registeredAt: string
  event: { id: string; name: string }
  athlete: { user: { id: string; name: string } } | null
  guestName: string | null
  team: Team | null
  weightCategory: WeightCategory
  bracketPositions: BracketPosition[]
}

interface GerenciarAtletaModalProps {
  eventId: string
  registrationId: string
  onClose: () => void
  onSaved: () => void
}

export default function GerenciarAtletaModal({
  eventId,
  registrationId,
  onClose,
  onSaved,
}: GerenciarAtletaModalProps) {
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<WeightCategory[]>([])

  const [form, setForm] = useState({
    sex: "",
    ageGroup: "",
    belt: "",
    weightCategoryId: "",
    teamId: "",
    professor: "",
    isAbsolute: false,
    status: "",
    paymentMethod: "",
    observation: "",
    medal: "",
    pointDiff: false,
    teamPoints: true,
    awarded: false,
    affiliated: false,
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [regRes, teamsRes] = await Promise.all([
          fetch(`/api/admin/eventos/${eventId}/atletas/${registrationId}`),
          fetch("/api/admin/equipes"),
        ])
        const reg = await regRes.json()
        const ts = await teamsRes.json()
        if (Array.isArray(ts)) setTeams(ts)
        if (reg.id) {
          setRegistration(reg)
          setForm({
            sex: reg.sex || "",
            ageGroup: reg.ageGroup || "",
            belt: reg.belt || "",
            weightCategoryId: reg.weightCategoryId || "",
            teamId: reg.teamId || "",
            professor: reg.professor || "",
            isAbsolute: reg.isAbsolute || false,
            status: reg.status || "",
            paymentMethod: reg.paymentMethod || "",
            observation: reg.observation || "",
            medal: reg.medal || "",
            pointDiff: reg.pointDiff || false,
            teamPoints: reg.teamPoints !== false,
            awarded: reg.awarded || false,
            affiliated: reg.affiliated || false,
          })
          // Load weight categories for the event
          const catRes = await fetch(
            `/api/admin/eventos/${eventId}/atletas?limit=1`
          )
          // Get categories from the weight table
          const eventRes = await fetch(`/api/admin/eventos/${eventId}`)
          const eventData = await eventRes.json()
          if (eventData.weightTableId) {
            const tableRes = await fetch(
              `/api/admin/tabelas-peso/${eventData.weightTableId}`
            )
            const tableData = await tableRes.json()
            if (tableData.categories) setCategories(tableData.categories)
          }
          void catRes
        }
      } catch {
        setError("Erro ao carregar dados.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId, registrationId])

  function handleChange(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Verifica se alguma chave do atleta está em andamento (bloqueia alterações de categoria)
  const bracketLocked =
    registration?.bracketPositions.some(
      (p) => p.bracket.status !== "PENDENTE" && p.bracket.status !== "DESIGNADA"
    ) ?? false

  const filteredCategories = categories.filter(
    (c) =>
      (!form.sex || c.sex === form.sex) &&
      (!form.ageGroup || c.ageGroup === form.ageGroup)
  )

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(
        `/api/admin/eventos/${eventId}/atletas/${registrationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sex: form.sex,
            ageGroup: form.ageGroup,
            belt: form.belt,
            weightCategoryId: form.weightCategoryId,
            teamId: form.teamId || null,
            professor: form.professor || null,
            isAbsolute: form.isAbsolute,
            status: form.status,
            paymentMethod: form.paymentMethod || null,
            observation: form.observation || null,
            medal: form.medal || null,
            pointDiff: form.pointDiff,
            teamPoints: form.teamPoints,
            awarded: form.awarded,
            affiliated: form.affiliated,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao salvar.")
      } else {
        onSaved()
        onClose()
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  const sectionClass =
    "text-xs font-semibold text-[#dc2626] uppercase tracking-wider mb-3"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 border-b z-10"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <h2 className="text-lg font-bold text-white">Gerenciar Atleta no Evento</h2>
          <div className="flex items-center gap-2">
            {registration?.paymentProof && (
              <a
                href={registration.paymentProof}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  PAGAMENTO
                </Button>
              </a>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#6b7280]">Carregando...</div>
        ) : !registration ? (
          <div className="p-8 text-center text-[#6b7280]">Inscrição não encontrada.</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#6b7280]">Evento</Label>
                <p className="text-sm text-white">{registration.event.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#6b7280]">Atleta</Label>
                <p className="text-sm text-white">{registration.athlete?.user.name ?? registration.guestName ?? "Convidado"}</p>
              </div>
            </div>

            {/* Aviso de chave em andamento */}
            {bracketLocked && (
              <div
                className="flex items-start gap-3 rounded-lg border px-4 py-3"
                style={{ borderColor: "#854d0e", backgroundColor: "#1c1003" }}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                <p className="text-sm text-yellow-400">
                  Uma ou mais chaves deste atleta já estão em andamento. As alterações de sexo, categoria, faixa, peso e absoluto estão bloqueadas.
                </p>
              </div>
            )}

            {/* Informações de cadastro */}
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ borderColor: "#222222" }}
            >
              <h3 className={sectionClass}>Informações de Cadastro</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sex">Sexo</Label>
                  <Select value={form.sex} onValueChange={(v) => handleChange("sex", v)} disabled={bracketLocked}>
                    <SelectTrigger id="sex">
                      <SelectValue placeholder="Sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASCULINO">Masculino</SelectItem>
                      <SelectItem value="FEMININO">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ageGroup">Categoria</Label>
                  <Select
                    value={form.ageGroup}
                    onValueChange={(v) => handleChange("ageGroup", v)}
                    disabled={bracketLocked}
                  >
                    <SelectTrigger id="ageGroup">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGE_GROUP_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="belt">Faixa</Label>
                  <Select
                    value={form.belt}
                    onValueChange={(v) => handleChange("belt", v)}
                    disabled={bracketLocked}
                  >
                    <SelectTrigger id="belt">
                      <SelectValue placeholder="Faixa" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BELT_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weightCategoryId">Peso</Label>
                  <Select
                    value={form.weightCategoryId}
                    onValueChange={(v) => handleChange("weightCategoryId", v)}
                    disabled={bracketLocked}
                  >
                    <SelectTrigger id="weightCategoryId">
                      <SelectValue placeholder="Peso" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} (até {c.maxWeight}kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamId">Equipe</Label>
                  <Select
                    value={form.teamId}
                    onValueChange={(v) => handleChange("teamId", v)}
                  >
                    <SelectTrigger id="teamId">
                      <SelectValue placeholder="Equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem equipe</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professor">Professor</Label>
                  <Input
                    id="professor"
                    value={form.professor}
                    onChange={(e) => handleChange("professor", e.target.value)}
                    placeholder="Nome do professor"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isAbsolute"
                  checked={form.isAbsolute}
                  onCheckedChange={(v) => handleChange("isAbsolute", Boolean(v))}
                  disabled={bracketLocked}
                />
                <Label htmlFor="isAbsolute" className={bracketLocked ? "cursor-not-allowed text-[#6b7280]" : "cursor-pointer"}>
                  Absoluto
                </Label>
              </div>
            </div>

            {/* Informações de inscrição */}
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ borderColor: "#222222" }}
            >
              <h3 className={sectionClass}>Informações de Inscrição</h3>
              <div className="space-y-1">
                <Label className="text-xs text-[#6b7280]">Data de Inscrição</Label>
                <p className="text-sm text-white">
                  {new Date(registration.registeredAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observation">Observação</Label>
                <textarea
                  id="observation"
                  value={form.observation}
                  onChange={(e) => handleChange("observation", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#dc2626] resize-y"
                  style={{ backgroundColor: "#1a1a1a", borderColor: "#333333" }}
                  placeholder="Observações sobre a inscrição..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => handleChange("status", v)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APROVADO">Aprovado</SelectItem>
                      <SelectItem value="PENDENTE">Pendente</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select
                    value={form.paymentMethod}
                    onValueChange={(v) => handleChange("paymentMethod", v)}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CARTAO">Cartão</SelectItem>
                      <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Premiação */}
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ borderColor: "#222222" }}
            >
              <h3 className={sectionClass}>Premiação</h3>
              <div className="space-y-2">
                <Label htmlFor="medal">Medalha</Label>
                <Select
                  value={form.medal}
                  onValueChange={(v) => handleChange("medal", v)}
                >
                  <SelectTrigger id="medal">
                    <SelectValue placeholder="Medalha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="OURO">Ouro</SelectItem>
                    <SelectItem value="PRATA">Prata</SelectItem>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pointDiff"
                    checked={form.pointDiff}
                    onCheckedChange={(v) => handleChange("pointDiff", Boolean(v))}
                  />
                  <Label htmlFor="pointDiff" className="cursor-pointer">
                    Ponto diferenciado
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="teamPoints"
                    checked={form.teamPoints}
                    onCheckedChange={(v) => handleChange("teamPoints", Boolean(v))}
                  />
                  <Label htmlFor="teamPoints" className="cursor-pointer">
                    Pontuar equipe
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="awarded"
                    checked={form.awarded}
                    onCheckedChange={(v) => handleChange("awarded", Boolean(v))}
                  />
                  <Label htmlFor="awarded" className="cursor-pointer">
                    Premiado
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="affiliated"
                    checked={form.affiliated}
                    onCheckedChange={(v) => handleChange("affiliated", Boolean(v))}
                  />
                  <Label htmlFor="affiliated" className="cursor-pointer">
                    Filiado
                  </Label>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
