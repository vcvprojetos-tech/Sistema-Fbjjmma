"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { X, Upload, Save } from "lucide-react"
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

const BELT_OPTIONS_BY_AGE: Record<string, { value: string; label: string }[]> = {
  PRE_MIRIM:        [{ value: "BRANCA", label: "Branca" }],
  MIRIM:            [{ value: "BRANCA", label: "Branca" }],
  INFANTIL_A:       [{ value: "BRANCA", label: "Branca" }],
  INFANTIL_B:       [{ value: "BRANCA", label: "Branca" }],
  INFANTO_JUVENIL_A:[{ value: "BRANCA", label: "Branca" }, { value: "AMARELA_LARANJA_VERDE", label: "Amarela/Laranja/Verde" }],
  INFANTO_JUVENIL_B:[{ value: "BRANCA", label: "Branca" }, { value: "AMARELA_LARANJA_VERDE", label: "Amarela/Laranja/Verde" }],
  JUVENIL:          [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }],
  ADULTO:           [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
  MASTER_1:         [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
  MASTER_2:         [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
  MASTER_3:         [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
  MASTER_4:         [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
  MASTER_5:         [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
  MASTER_6:         [{ value: "BRANCA", label: "Branca" }, { value: "AZUL", label: "Azul" }, { value: "ROXA", label: "Roxa" }, { value: "MARROM", label: "Marrom" }, { value: "PRETA", label: "Preta" }],
}

interface Athlete {
  id: string
  sex: string
  belt: string
  teamId: string | null
  professor: string | null
  isAffiliated: boolean
  user: { name: string; cpf: string }
  team: { id: string; name: string } | null
}

interface WeightCategory {
  id: string
  ageGroup: string
  sex: string
  name: string
  maxWeight: number
}

interface Team {
  id: string
  name: string
}

interface InscricaoAdminModalProps {
  eventId: string
  eventName?: string
  onClose: () => void
  onSaved: () => void
}

// Row layout: label on left, input on right
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-4 py-3 border-b" style={{ borderColor: "#1e1e1e" }}>
      <span className="text-sm text-[#9ca3af] pt-2">{label}</span>
      <div>{children}</div>
    </div>
  )
}

export default function InscricaoAdminModal({
  eventId,
  eventName,
  onClose,
  onSaved,
}: InscricaoAdminModalProps) {
  const [categories, setCategories] = useState<WeightCategory[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [resolvedEventName, setResolvedEventName] = useState(eventName ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Atleta combobox
  const [athleteQuery, setAthleteQuery] = useState("")
  const [athleteResults, setAthleteResults] = useState<Athlete[]>([])
  const [athleteOpen, setAthleteOpen] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [searchingAthletes, setSearchingAthletes] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    sex: "",
    ageGroup: "",
    belt: "",
    weightCategoryId: "",
    teamId: "",
    professor: "",
    isAbsolute: false,
    observation: "",
    status: "PENDENTE",
    paymentMethod: "PIX",
    medal: "",
    proofFile: null as File | null,
  })

  // Load event info and static data
  useEffect(() => {
    async function load() {
      const [eventRes, teamsRes] = await Promise.all([
        fetch(`/api/admin/eventos/${eventId}`),
        fetch("/api/admin/equipes"),
      ])
      const eventData = await eventRes.json()
      const teamsData = await teamsRes.json()

      if (!eventName && eventData.name) setResolvedEventName(eventData.name)
      if (Array.isArray(teamsData)) setTeams(teamsData)

      if (eventData.weightTableId) {
        const tableRes = await fetch(`/api/admin/tabelas-peso/${eventData.weightTableId}`)
        const tableData = await tableRes.json()
        if (tableData.categories) setCategories(tableData.categories)
      }
    }
    load()
  }, [eventId, eventName])

  // Search athletes as user types
  const searchAthletes = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setAthleteResults([]); return }
    setSearchingAthletes(true)
    try {
      const res = await fetch(`/api/admin/atletas?nome=${encodeURIComponent(q)}&limit=8`)
      const data = await res.json()
      setAthleteResults(data.athletes ?? [])
    } catch { /* ignore */ }
    finally { setSearchingAthletes(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchAthletes(athleteQuery), 300)
    return () => clearTimeout(t)
  }, [athleteQuery, searchAthletes])

  // Close combobox on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setAthleteOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function set<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function selectAthlete(a: Athlete) {
    setSelectedAthlete(a)
    setAthleteQuery(a.user.name)
    setAthleteOpen(false)
    setForm((prev) => ({
      ...prev,
      sex: a.sex,
      belt: a.belt,
      teamId: a.teamId ?? "",
      professor: a.professor ?? "",
      weightCategoryId: "",   // reset peso ao mudar atleta
    }))
  }

  // Age groups present in the loaded categories, sorted in developmental order
  const availableAgeGroups = useMemo(() => {
    const inData = new Set(categories.map((c) => c.ageGroup))
    return Object.keys(AGE_GROUP_LABELS).filter((ag) => inData.has(ag))
  }, [categories])

  const filteredCategories = categories.filter(
    (c) =>
      (!form.sex || c.sex === form.sex) &&
      (!form.ageGroup || c.ageGroup === form.ageGroup)
  )

  const beltOptions = BELT_OPTIONS_BY_AGE[form.ageGroup] ?? []

  async function handleSave() {
    setError("")
    if (!athleteQuery.trim()) { setError("Informe o nome do atleta."); return }
    if (!form.sex || !form.ageGroup || !form.belt || !form.weightCategoryId) {
      setError("Preencha sexo, categoria, faixa e peso.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/eventos/${eventId}/atletas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete?.id ?? null,
          guestName: selectedAthlete ? null : athleteQuery.trim(),
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
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || data.error || "Erro ao inscrever atleta.")
      } else {
        onSaved()
      }
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[95vh] flex flex-col rounded-xl border"
        style={{ backgroundColor: "#0f0f0f", borderColor: "#222222" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "#222222" }}
        >
          <h2 className="text-base font-bold text-white">Cadastrar atleta no evento</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

          {/* Seção: Informações de cadastro */}
          <div>
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">
              Informações de cadastro
            </p>

            <FormRow label="Evento">
              <Input value={resolvedEventName} readOnly className="bg-[#1a1a1a] text-[#9ca3af] border-[#333]" />
            </FormRow>

            {/* Atleta combobox */}
            <FormRow label="Atleta">
              <div className="relative" ref={comboRef}>
                <Input
                  placeholder="Digite o nome para buscar..."
                  value={athleteQuery}
                  onChange={(e) => {
                    setAthleteQuery(e.target.value)
                    setAthleteOpen(true)
                    if (!e.target.value) setSelectedAthlete(null)
                  }}
                  onFocus={() => athleteQuery.length >= 2 && setAthleteOpen(true)}
                />
                {athleteOpen && (athleteResults.length > 0 || searchingAthletes) && (
                  <div
                    className="absolute z-50 w-full top-full mt-1 rounded-md border shadow-lg overflow-hidden"
                    style={{ backgroundColor: "#1a1a1a", borderColor: "#333" }}
                  >
                    {searchingAthletes ? (
                      <div className="px-4 py-3 text-sm text-[#6b7280]">Buscando...</div>
                    ) : (
                      athleteResults.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => selectAthlete(a)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#222] transition-colors"
                        >
                          <p className="text-sm text-white font-medium">{a.user.name}</p>
                          <p className="text-xs text-[#6b7280]">
                            {a.sex === "MASCULINO" ? "Masculino" : "Feminino"}
                            {a.team ? ` • ${a.team.name}` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </FormRow>

            <FormRow label="Sexo">
              <Select value={form.sex} onValueChange={(v) => { set("sex", v); set("weightCategoryId", "") }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASCULINO">Masculino</SelectItem>
                  <SelectItem value="FEMININO">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Categoria">
              <Select value={form.ageGroup} onValueChange={(v) => { set("ageGroup", v); set("weightCategoryId", ""); set("belt", "") }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false}>
                  {availableAgeGroups.map((v) => (
                    <SelectItem key={v} value={v}>{AGE_GROUP_LABELS[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Faixa">
              <Select
                key={`faixa-${form.ageGroup}`}
                value={form.belt}
                onValueChange={(v) => set("belt", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a categoria antes..." /></SelectTrigger>
                <SelectContent>
                  {beltOptions.length === 0 ? (
                    <SelectItem value="_none" disabled>Selecione a categoria antes</SelectItem>
                  ) : (
                    beltOptions.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Peso">
              <Select
                key={`peso-${form.sex}-${form.ageGroup}`}
                value={form.weightCategoryId}
                onValueChange={(v) => set("weightCategoryId", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione sexo e categoria antes..." /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhuma categoria encontrada</SelectItem>
                  ) : (
                    filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.maxWeight >= 999 ? "Acima de tudo" : `até ${c.maxWeight}kg`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Equipe">
              <Select value={form.teamId || "none"} onValueChange={(v) => set("teamId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem equipe</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Professor">
              <Input
                value={form.professor}
                onChange={(e) => set("professor", e.target.value)}
                placeholder="Nome do professor"
              />
            </FormRow>

            <div className="flex items-center gap-2 py-3">
              <Checkbox
                id="isAbsolute"
                checked={form.isAbsolute}
                onCheckedChange={(v) => set("isAbsolute", Boolean(v))}
              />
              <Label htmlFor="isAbsolute" className="cursor-pointer text-sm text-[#e5e7eb]">
                Absoluto
              </Label>
            </div>
          </div>

          {/* Seção: Informações de inscrição */}
          <div className="border-t pt-4" style={{ borderColor: "#222" }}>
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">
              Informações de inscrição
            </p>

            <FormRow label="Observação">
              <textarea
                value={form.observation}
                onChange={(e) => set("observation", e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none resize-none"
                style={{ backgroundColor: "#1a1a1a", borderColor: "#333" }}
                placeholder="Observações..."
              />
            </FormRow>

            <FormRow label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Forma de pagamento">
              <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="ISENTO">Isento</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Comprovante">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white border transition-colors hover:bg-[#222]"
                  style={{ backgroundColor: "#1a1a1a", borderColor: "#333" }}
                >
                  <Upload className="h-4 w-4" />
                  {form.proofFile ? form.proofFile.name : "Selecionar arquivo"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => set("proofFile", e.target.files?.[0] ?? null)}
                />
              </div>
            </FormRow>
          </div>

          {/* Seção: Premiação */}
          <div className="border-t pt-4" style={{ borderColor: "#222" }}>
            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">
              Premiação
            </p>

            <FormRow label="Medalha">
              <Select value={form.medal || "none"} onValueChange={(v) => set("medal", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="OURO">Ouro</SelectItem>
                  <SelectItem value="PRATA">Prata</SelectItem>
                  <SelectItem value="BRONZE">Bronze</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          {error && (
            <p className="text-sm text-[#dc2626]">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
          style={{ borderColor: "#222" }}
        >
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
