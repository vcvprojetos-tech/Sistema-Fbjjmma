"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useTheme } from "next-themes"
import { useParams } from "next/navigation"
import { ArrowLeft, Search, Plus, Download, Pencil, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import EventoForm from "@/components/admin/EventoForm"
import GerenciarAtletaModal from "@/components/admin/GerenciarAtletaModal"
import InscricaoAdminModal from "@/components/admin/InscricaoAdminModal"
import BracketView from "@/components/admin/BracketView"

const AGE_GROUP_ORDER: string[] = [
  "PRE_MIRIM", "MIRIM", "INFANTIL_A", "INFANTIL_B",
  "INFANTO_JUVENIL_A", "INFANTO_JUVENIL_B", "JUVENIL",
  "ADULTO", "MASTER_1", "MASTER_2", "MASTER_3", "MASTER_4", "MASTER_5", "MASTER_6",
]

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

type Tab =
  | "evento"
  | "valores"
  | "financeiro"
  | "atletas"
  | "checagem"
  | "chaves"
  | "resultado"
  | "tatames"
  | "operacoes"

interface Event {
  id: string
  name: string
  typeId: string
  state: string
  city: string
  location: string
  date: string
  registrationDeadline: string
  correctionDeadline: string
  paymentDeadline: string
  checkinRelease: string
  bracketRelease: string
  weightTableId: string
  value: number
  hasAbsolute: boolean
  absoluteValue: number | null
  registrationOpen: boolean
  isVisible: boolean
  banner: string | null
  schedule: string | null
  about: string | null
  paymentInfo: string | null
  prize: string | null
  weighInInfo: string | null
  imageRights: string | null
  physicalIntegrity: string | null
}

interface CategoryValue {
  sex: string
  ageGroup: string
  value: number
  hasAbsolute: boolean
  absoluteValue: number | null
  id: string | null
}

interface FinancialData {
  inscricoes: { total: number; pendente: number; aprovado: number; cancelado: number }
  medalhas: { total: number; ouro: number; prata: number; bronze: number }
  chaves: { total: number; normal: number; absoluto: number }
  aprovadas: {
    qtdAtletas: number
    qtdAbsoluto: number
    valorTotalInscricoes: number
    valorTotalAbsoluto: number
    totalRecebido: number
    cartao: number
    pix: number
    dinheiro: number
  }
}

interface Registration {
  id: string
  sex: string
  ageGroup: string
  belt: string
  isAbsolute: boolean
  status: string
  medal: string | null
  teamPoints: boolean
  awarded: boolean
  affiliated: boolean
  pointDiff: boolean
  athlete: { user: { id: string; name: string } } | null
  guestName: string | null
  team: { id: string; name: string } | null
  weightCategory: { id: string; name: string; maxWeight: number; ageGroup: string; sex: string }
}

interface Bracket {
  id: string
  bracketNumber: number
  isAbsolute: boolean
  belt: string
  status: string
  tatameId: string | null
  bracketGroupId?: string | null
  isGrandFinal?: boolean
  weightCategory: { id: string; name: string; ageGroup: string; sex: string; maxWeight: number }
  positions: {
    id: string
    position: number
    registration: {
      id: string
      athlete: { user: { name: string } } | null
      guestName: string | null
      team: { name: string } | null
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
  }[]
}

interface Tatame {
  id: string
  name: string
  pin: string
  isActive: boolean
  brackets: { id: string; bracketNumber: number; status: string }[]
  operations: { user: { id: string; name: string }; startedAt: string }[]
}

interface Team {
  id: string
  name: string
}

interface WeightCategory {
  id: string
  name: string
  ageGroup: string
  sex: string
  maxWeight: number
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function toDatetimeLocal(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateLocal(iso: string) {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 10)
}

// ── FiltersBar ─────────────────────────────────────────────────────────────────
// Componente separado com estado próprio para evitar re-render do componente pai
// a cada mudança de filtro. O pai lê os valores via `filtersRef` apenas no Pesquisar.

interface FilterValues {
  nome: string; sexo: string; categoria: string; faixa: string; pesoId: string; equipeId: string; qtdAtletas: string
}

const FiltersBar = React.memo(function FiltersBar({
  weightCategories, teams, filtersRef, resetKey, atletasCounts = [],
}: {
  weightCategories: { name: string }[]
  teams: { id: string; name: string }[]
  filtersRef: React.MutableRefObject<FilterValues>
  resetKey: number
  atletasCounts?: number[]
}) {
  const [nome, setNome] = useState("")
  const [sexo, setSexo] = useState("")
  const [categoria, setCategoria] = useState("")
  const [faixa, setFaixa] = useState("")
  const [pesoId, setPesoId] = useState("")
  const [equipeId, setEquipeId] = useState("")
  const [qtdAtletas, setQtdAtletas] = useState("")

  // Reseta quando o pai muda de aba
  useEffect(() => {
    setNome(""); setSexo(""); setCategoria(""); setFaixa(""); setPesoId(""); setEquipeId(""); setQtdAtletas("")
    filtersRef.current = { nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  // Mantém a ref sincronizada para leitura síncrona pelo pai
  const sync = (field: keyof FilterValues, value: string) => {
    filtersRef.current = { ...filtersRef.current, [field]: value }
  }

  const uniqueWeights = Array.from(new Map(weightCategories.map((c) => [c.name, c])).values())

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
      <Input
        placeholder="Nome"
        value={nome}
        onChange={(e) => { setNome(e.target.value); sync("nome", e.target.value) }}
      />
      <Select value={sexo} onValueChange={(v) => { setSexo(v); sync("sexo", v) }}>
        <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="MASCULINO">Masculino</SelectItem>
          <SelectItem value="FEMININO">Feminino</SelectItem>
        </SelectContent>
      </Select>
      <Select value={categoria} onValueChange={(v) => { setCategoria(v); sync("categoria", v) }}>
        <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(AGE_GROUP_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={faixa} onValueChange={(v) => { setFaixa(v); sync("faixa", v) }}>
        <SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(BELT_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={pesoId} onValueChange={(v) => { setPesoId(v); sync("pesoId", v) }}>
        <SelectTrigger><SelectValue placeholder="Peso" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="__absoluto__">Absoluto</SelectItem>
          {uniqueWeights.map((c) => (
            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={equipeId} onValueChange={(v) => { setEquipeId(v); sync("equipeId", v) }}>
        <SelectTrigger><SelectValue placeholder="Equipe" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem value="all">Todas</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={qtdAtletas} onValueChange={(v) => { setQtdAtletas(v); sync("qtdAtletas", v) }}>
        <SelectTrigger><SelectValue placeholder="Atletas" /></SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem value="all">Todos</SelectItem>
          {atletasCounts.map((n) => (
            <SelectItem key={n} value={String(n)}>{n} atleta{n !== 1 ? "s" : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})

export default function EventoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"
  const [tab, setTab] = useState<Tab>("evento")
  const [event, setEvent] = useState<Event | null>(null)
  const [eventLoading, setEventLoading] = useState(true)

  // Valores tab
  const [valoresData, setValoresData] = useState<CategoryValue[]>([])
  const [valoresLoading, setValoresLoading] = useState(false)
  const [valoresSaving, setValoresSaving] = useState(false)

  // Financeiro tab
  const [finData, setFinData] = useState<FinancialData | null>(null)
  const [finLoading, setFinLoading] = useState(false)

  // Atletas tab
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [atletasLoading, setAtletasLoading] = useState(false)
  const [atletasTab, setAtletasTab] = useState<"ativos" | "lixeira">("ativos")
  const [gerenciarId, setGerenciarId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([])

  // Ref lida pelo pai apenas no clique de Pesquisar — sem estado no pai, sem re-render
  const filtersRef = useRef<FilterValues>({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
  // Incrementado ao trocar de aba para resetar os filtros no FiltersBar
  const [filterResetKey, setFilterResetKey] = useState(0)

  // Committed filters for atletas (only update on "Pesquisar" click)
  const [atletasApplied, setAtletasApplied] = useState({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })

  // Checagem
  const [checagemData, setChecagemData] = useState<Registration[]>([])
  const [checagemLoading, setChecagemLoading] = useState(false)

  // Chaves
  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [chavesLoading, setChavesLoading] = useState(false)
  const [chavesGenerating, setChavesGenerating] = useState(false)

  // Tatames
  const [tatames, setTatames] = useState<Tatame[]>([])
  const [tatamesLoading, setTatamesLoading] = useState(false)
  const [novoTatameNome, setNovoTatameNome] = useState("")
  const [novoTatameSaving, setNovoTatameSaving] = useState(false)
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null)
  const [tatamesApplied, setTatamesApplied] = useState({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedBrackets, setSelectedBrackets] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Resultado
  const [resultadoData, setResultadoData] = useState<Registration[]>([])
  const [resultadoLoading, setResultadoLoading] = useState(false)
  const [resultadoEdits, setResultadoEdits] = useState<Record<string, Partial<Registration>>>({})
  const [resultadoSaving, setResultadoSaving] = useState(false)

  // Modal inscrição
  const [inscreverOpen, setInscreverOpen] = useState(false)

  // Importação Excel
  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; importados: number; ignorados: { nome: string; motivo?: string }[]; erros: { nome: string; motivo?: string }[] } | null>(null)

  useEffect(() => {
    async function loadEvent() {
      setEventLoading(true)
      try {
        const res = await fetch(`/api/admin/eventos/${id}`)
        const data = await res.json()
        if (data.id) setEvent(data)
      } catch {
        console.error("Erro ao carregar evento")
      } finally {
        setEventLoading(false)
      }
    }
    loadEvent()
    fetch("/api/admin/equipes").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setTeams(d)
    })
  }, [id])

  useEffect(() => {
    if (event?.weightTableId) {
      fetch(`/api/admin/tabelas-peso/${event.weightTableId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.categories) setWeightCategories(d.categories)
        })
    }
  }, [event?.weightTableId])

  const loadValores = useCallback(async () => {
    setValoresLoading(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/valores`)
      const data = await res.json()
      if (Array.isArray(data)) setValoresData(data)
    } catch {
      console.error("Erro ao carregar valores")
    } finally {
      setValoresLoading(false)
    }
  }, [id])

  const loadFinanceiro = useCallback(async () => {
    setFinLoading(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/financeiro`)
      const data = await res.json()
      if (data.inscricoes) setFinData(data)
    } catch {
      console.error("Erro ao carregar financeiro")
    } finally {
      setFinLoading(false)
    }
  }, [id])

  const buildAtletasParams = useCallback(() => {
    const f = filtersRef.current
    const params = new URLSearchParams()
    if (f.nome) params.set("nome", f.nome)
    if (f.sexo && f.sexo !== "all") params.set("sexo", f.sexo)
    if (f.categoria && f.categoria !== "all") params.set("categoria", f.categoria)
    if (f.faixa && f.faixa !== "all") params.set("faixa", f.faixa)
    if (f.pesoId && f.pesoId !== "all") {
      if (f.pesoId === "__absoluto__") params.set("absoluto", "1")
      else params.set("pesoNome", f.pesoId)
    }
    if (f.equipeId && f.equipeId !== "all") params.set("equipeId", f.equipeId)
    return params
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Builds params from committed (applied) atletas filters only
  const buildAtletasAppliedParams = useCallback(() => {
    const params = new URLSearchParams()
    if (atletasApplied.nome) params.set("nome", atletasApplied.nome)
    if (atletasApplied.sexo && atletasApplied.sexo !== "all") params.set("sexo", atletasApplied.sexo)
    if (atletasApplied.categoria && atletasApplied.categoria !== "all") params.set("categoria", atletasApplied.categoria)
    if (atletasApplied.faixa && atletasApplied.faixa !== "all") params.set("faixa", atletasApplied.faixa)
    if (atletasApplied.pesoId && atletasApplied.pesoId !== "all") {
      if (atletasApplied.pesoId === "__absoluto__") params.set("absoluto", "1")
      else params.set("pesoNome", atletasApplied.pesoId)
    }
    if (atletasApplied.equipeId && atletasApplied.equipeId !== "all") params.set("equipeId", atletasApplied.equipeId)
    return params
  }, [atletasApplied])

  const loadAtletas = useCallback(async () => {
    setAtletasLoading(true)
    try {
      const params = buildAtletasAppliedParams()
      if (atletasTab === "lixeira") params.set("trash", "1")
      const res = await fetch(`/api/admin/eventos/${id}/atletas?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setRegistrations(data)
    } catch {
      console.error("Erro ao carregar atletas")
    } finally {
      setAtletasLoading(false)
    }
  }, [id, atletasTab, buildAtletasAppliedParams])

  const handleImport = useCallback(async (file: File) => {
    setImportLoading(true)
    setImportResult(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/importar`, { method: "POST", body: formData })
      const data = await res.json()
      setImportResult(data)
      loadAtletas()
    } catch {
      setImportResult({ total: 0, importados: 0, ignorados: [], erros: [{ nome: "—", motivo: "Erro de conexão" }] })
    } finally {
      setImportLoading(false)
    }
  }, [id, loadAtletas])

  const loadChecagem = useCallback(async () => {
    setChecagemLoading(true)
    try {
      const params = buildAtletasParams()
      params.set("status", "APROVADO")
      const res = await fetch(`/api/admin/eventos/${id}/atletas?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setChecagemData(data)
    } catch {
      console.error("Erro ao carregar checagem")
    } finally {
      setChecagemLoading(false)
    }
  }, [id, buildAtletasParams])

  const loadChaves = useCallback(async () => {
    setChavesLoading(true)
    try {
      const params = buildAtletasParams()
      const res = await fetch(`/api/admin/eventos/${id}/chaves?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setBrackets(data)
    } catch {
      console.error("Erro ao carregar chaves")
    } finally {
      setChavesLoading(false)
    }
  }, [id, buildAtletasParams])

  const loadAllChaves = useCallback(async () => {
    setChavesLoading(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/chaves`)
      const data = await res.json()
      if (Array.isArray(data)) setBrackets(data)
    } catch {
      console.error("Erro ao carregar chaves")
    } finally {
      setChavesLoading(false)
    }
  }, [id])

  const loadTatames = useCallback(async () => {
    setTatamesLoading(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/tatames`)
      const data = await res.json()
      if (Array.isArray(data)) setTatames(data)
    } catch {
      console.error("Erro ao carregar tatames")
    } finally {
      setTatamesLoading(false)
    }
  }, [id])

  const criarTatame = useCallback(async () => {
    if (!novoTatameNome.trim()) return
    setNovoTatameSaving(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/tatames`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: novoTatameNome.trim() }),
      })
      if (res.ok) {
        setNovoTatameNome("")
        await loadTatames()
      }
    } catch {
      console.error("Erro ao criar tatame")
    } finally {
      setNovoTatameSaving(false)
    }
  }, [id, novoTatameNome, loadTatames])

  const toggleTatameAtivo = useCallback(async (tatameId: string, isActive: boolean) => {
    await fetch(`/api/admin/eventos/${id}/tatames/${tatameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
    await loadTatames()
  }, [id, loadTatames])

  const excluirTatame = useCallback(async (tatameId: string) => {
    if (!confirm("Excluir este tatame?")) return
    await fetch(`/api/admin/eventos/${id}/tatames/${tatameId}`, { method: "DELETE" })
    await loadTatames()
    await loadAllChaves()
  }, [id, loadTatames, loadAllChaves])

  const atribuirTatame = useCallback(async (bracketId: string, tatameId: string | null) => {
    // Atualização otimista — sem loading
    setBrackets(prev => prev.map(b => b.id === bracketId ? { ...b, tatameId: tatameId } : b))
    await fetch(`/api/admin/eventos/${id}/chaves/${bracketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tatameId: tatameId || null }),
    })
    // Atualiza tatames silenciosamente
    try {
      const res = await fetch(`/api/admin/eventos/${id}/tatames`)
      const data = await res.json()
      if (Array.isArray(data)) setTatames(data)
    } catch { /* silencioso */ }
  }, [id])

  const excluirChave = useCallback(async (bracketId: string) => {
    if (!confirm("Excluir esta chave? Esta ação não pode ser desfeita.")) return
    setBrackets(prev => prev.filter(b => b.id !== bracketId))
    await fetch(`/api/admin/eventos/${id}/chaves/${bracketId}`, { method: "DELETE" })
  }, [id])

  const reiniciarChave = useCallback(async (bracketId: string) => {
    if (!confirm("Reiniciar esta chave? Todos os resultados serão apagados e ela voltará para as pendentes.")) return
    try {
      const res = await fetch(`/api/admin/eventos/${id}/chaves/${bracketId}`, { method: "PATCH" })
      if (!res.ok) { alert("Erro ao reiniciar chave."); return }
      setBrackets(prev => prev.map(b => b.id !== bracketId ? b : {
        ...b,
        status: b.tatameId ? "DESIGNADA" : "PENDENTE",
        matches: [],
      }))
    } catch { alert("Erro ao reiniciar chave.") }
  }, [id])

  const gerarChaves = useCallback(async () => {
    setChavesGenerating(true)
    try {
      const res = await fetch(`/api/admin/eventos/${id}/chaves`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        alert((data.error || "Erro ao gerar chaves.") + (data.detail ? `\n\nDetalhe: ${data.detail}` : ""))
      } else {
        await loadAllChaves()
      }
    } catch {
      alert("Erro ao gerar chaves.")
    } finally {
      setChavesGenerating(false)
    }
  }, [id, loadAllChaves])

  const loadResultado = useCallback(async (silent = false) => {
    if (!silent) setResultadoLoading(true)
    try {
      const params = buildAtletasParams()
      const res = await fetch(`/api/admin/eventos/${id}/resultado?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setResultadoData(data)
    } catch {
      console.error("Erro ao carregar resultado")
    } finally {
      if (!silent) setResultadoLoading(false)
    }
  }, [id, buildAtletasParams])

  // Ref que sempre aponta para os loaders mais recentes — evita que mudanças
  // de filtro (que recriam os callbacks) disparem o efeito de troca de aba
  const tabLoadersRef = useRef({ loadValores, loadFinanceiro, loadAtletas, loadChecagem, loadChaves, loadResultado })
  useEffect(() => {
    tabLoadersRef.current = { loadValores, loadFinanceiro, loadAtletas, loadChecagem, loadChaves, loadResultado }
  }, [loadValores, loadFinanceiro, loadAtletas, loadChecagem, loadChaves, loadResultado])

  useEffect(() => {
    const { loadValores, loadFinanceiro, loadAtletas, loadChecagem, loadChaves, loadResultado } = tabLoadersRef.current
    if (tab === "valores") loadValores()
    if (tab === "financeiro") loadFinanceiro()
    if (tab === "atletas") loadAtletas()
    if (tab === "checagem") loadChecagem()
    if (tab === "chaves") loadChaves()
    if (tab === "resultado") loadResultado()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Atualiza silenciosamente a aba de resultados a cada 10s enquanto está ativa,
  // desde que o usuário não tenha edições pendentes (para não sobrescrever)
  useEffect(() => {
    if (tab !== "resultado") return
    const interval = setInterval(() => {
      if (Object.keys(resultadoEdits).length === 0) {
        loadResultado(true)
      }
    }, 10000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadResultado])

  useEffect(() => {
    // Reseta filtros do FiltersBar e os aplicados sempre que muda de aba
    setFilterResetKey(k => k + 1)
    setAtletasApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
    setTatamesApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
    if (tab === "tatames") {
      loadTatames()
      loadAllChaves()
    }
  }, [tab, loadTatames, loadAllChaves])

  // Polling silencioso na aba tatames (a cada 5 segundos, sem ativar loading)
  useEffect(() => {
    if (tab !== "tatames") return
    const interval = setInterval(async () => {
      try {
        const [chavesRes, tatamesRes] = await Promise.all([
          fetch(`/api/admin/eventos/${id}/chaves`),
          fetch(`/api/admin/eventos/${id}/tatames`),
        ])
        const [chavesData, tatamesData] = await Promise.all([chavesRes.json(), tatamesRes.json()])
        if (Array.isArray(chavesData)) setBrackets(chavesData)
        if (Array.isArray(tatamesData)) setTatames(tatamesData)
      } catch { /* silencioso */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [tab, id])

  useEffect(() => {
    if (tab === "atletas") loadAtletas()
  }, [atletasTab, loadAtletas, tab])

  // Stats for atletas
  const totalAtletas = registrations.length
  const pendenteAtletas = registrations.filter((r) => r.status === "PENDENTE").length
  const aprovadoAtletas = registrations.filter((r) => r.status === "APROVADO").length
  const canceladoAtletas = registrations.filter((r) => r.status === "CANCELADO").length

  const tatamesFilteredBrackets = useMemo(() => {
    return brackets.filter(bracket => {
      if (tatamesApplied.sexo && tatamesApplied.sexo !== "all" && bracket.weightCategory.sex !== tatamesApplied.sexo) return false
      if (tatamesApplied.categoria && tatamesApplied.categoria !== "all" && bracket.weightCategory.ageGroup !== tatamesApplied.categoria) return false
      if (tatamesApplied.faixa && tatamesApplied.faixa !== "all" && bracket.belt !== tatamesApplied.faixa) return false
      if (tatamesApplied.pesoId && tatamesApplied.pesoId !== "all") {
        if (tatamesApplied.pesoId === "__absoluto__") { if (!bracket.isAbsolute) return false }
        else if (bracket.weightCategory.name.toLowerCase() !== tatamesApplied.pesoId.toLowerCase()) return false
      }
      if (tatamesApplied.equipeId && tatamesApplied.equipeId !== "all") {
        const teamName = teams.find(t => t.id === tatamesApplied.equipeId)?.name
        if (!bracket.positions.some(p => p.registration?.team?.name === teamName)) return false
      }
      if (tatamesApplied.nome) {
        const nome = tatamesApplied.nome.toLowerCase()
        if (!bracket.positions.some(p => {
          const name = p.registration?.athlete?.user.name ?? p.registration?.guestName ?? ""
          return name.toLowerCase().includes(nome)
        })) return false
      }
      if (tatamesApplied.qtdAtletas && tatamesApplied.qtdAtletas !== "all") {
        if (bracket.positions.length !== Number(tatamesApplied.qtdAtletas)) return false
      }
      return true
    }).sort((a, b) => {
      const ageA = AGE_GROUP_ORDER.indexOf(a.weightCategory.ageGroup)
      const ageB = AGE_GROUP_ORDER.indexOf(b.weightCategory.ageGroup)
      if (ageA !== ageB) return ageA - ageB
      if (a.isAbsolute !== b.isAbsolute) return a.isAbsolute ? 1 : -1
      return a.weightCategory.maxWeight - b.weightCategory.maxWeight
    })
  }, [brackets, tatamesApplied, teams])

  // Contagens únicas de atletas por chave (para filtro)
  const atletasCounts = useMemo(() => {
    const counts = new Set(brackets.map(b => b.positions.length))
    return Array.from(counts).sort((a, b) => a - b)
  }, [brackets])

  const toggleBracketSelection = (bracketId: string) => {
    setSelectedBrackets(prev => {
      const next = new Set(prev)
      if (next.has(bracketId)) next.delete(bracketId)
      else next.add(bracketId)
      return next
    })
  }

  const bulkAtribuir = async (tatameId: string | null) => {
    setBulkLoading(true)
    await Promise.all(Array.from(selectedBrackets).map(bid => atribuirTatame(bid, tatameId)))
    setBulkLoading(false)
    setSelectedBrackets(new Set())
    setSelectionMode(false)
  }

  const bulkReiniciar = async () => {
    if (!confirm(`Reiniciar ${selectedBrackets.size} chave(s)?`)) return
    setBulkLoading(true)
    await Promise.all(Array.from(selectedBrackets).map(bid => reiniciarChave(bid)))
    setBulkLoading(false)
    setSelectedBrackets(new Set())
    setSelectionMode(false)
  }

  const bulkExcluir = async () => {
    if (!confirm(`Excluir ${selectedBrackets.size} chave(s)?`)) return
    setBulkLoading(true)
    await Promise.all(Array.from(selectedBrackets).map(bid => excluirChave(bid)))
    setBulkLoading(false)
    setSelectedBrackets(new Set())
    setSelectionMode(false)
  }

  const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    PENDENTE: { bg: "#92400e30", text: "#fbbf24" },
    APROVADO: { bg: "#14532d30", text: "#4ade80" },
    CANCELADO: { bg: "#7f1d1d30", text: "#f87171" },
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "evento", label: "EVENTO" },
    { key: "valores", label: "VALORES" },
    { key: "financeiro", label: "FINANCEIRO" },
    { key: "atletas", label: "ATLETAS" },
    { key: "checagem", label: "CHECAGEM" },
    { key: "chaves", label: "CHAVES" },
    { key: "resultado", label: "RESULTADO" },
    { key: "tatames", label: "TATAMES" },
    { key: "operacoes", label: "OPERAÇÕES" },
  ]


  const eventFormInitialData = event
    ? {
        name: event.name,
        typeId: event.typeId,
        state: event.state,
        city: event.city,
        location: event.location,
        date: toDatetimeLocal(event.date),
        registrationDeadline: toDatetimeLocal(event.registrationDeadline),
        correctionDeadline: toDatetimeLocal(event.correctionDeadline),
        paymentDeadline: toDateLocal(event.paymentDeadline),
        checkinRelease: toDatetimeLocal(event.checkinRelease),
        bracketRelease: toDatetimeLocal(event.bracketRelease),
        weightTableId: event.weightTableId,
        value: String(event.value),
        hasAbsolute: event.hasAbsolute,
        absoluteValue: event.absoluteValue ? String(event.absoluteValue) : "",
        registrationOpen: event.registrationOpen,
        isVisible: event.isVisible,
        about: event.about || "",
        paymentInfo: event.paymentInfo || "",
        prize: event.prize || "",
        weighInInfo: event.weighInInfo || "",
        imageRights: event.imageRights || "",
        physicalIntegrity: event.physicalIntegrity || "",
        banner: event.banner || "",
        schedule: event.schedule || "",
      }
    : undefined

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/eventos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {eventLoading ? "Carregando..." : event?.name || "Evento"}
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Gerenciamento do evento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ backgroundColor: "var(--card-alt)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              backgroundColor: tab === t.key ? "#dc2626" : "transparent",
              color: tab === t.key ? "#ffffff" : "#6b7280",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: EVENTO */}
      {tab === "evento" && event && (
        <EventoForm initialData={eventFormInitialData} eventId={id} />
      )}
      {tab === "evento" && eventLoading && (
        <div className="text-[#6b7280] text-center py-12">Carregando...</div>
      )}

      {/* TAB: VALORES */}
      {tab === "valores" && (
        <div className="space-y-4">
          <div
            className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            {valoresLoading ? (
              <div className="p-8 text-center text-[#6b7280]">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase w-8">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase">Sexo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase w-36">Valor (R$)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase w-24">Absoluto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase w-36">Valor Absoluto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valoresData.map((v, i) => (
                      <tr key={`${v.sex}-${v.ageGroup}`} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-4 py-2 text-[#6b7280]">{i + 1}</td>
                        <td className="px-4 py-2 text-[#9ca3af]">
                          {v.sex === "MASCULINO" ? "Masculino" : "Feminino"}
                        </td>
                        <td className="px-4 py-2" style={{ color: "var(--foreground)" }}>
                          {AGE_GROUP_LABELS[v.ageGroup] || v.ageGroup}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.value}
                            onChange={(e) => {
                              const updated = [...valoresData]
                              updated[i] = { ...updated[i], value: parseFloat(e.target.value) || 0 }
                              setValoresData(updated)
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Checkbox
                            checked={v.hasAbsolute}
                            onCheckedChange={(checked) => {
                              const updated = [...valoresData]
                              updated[i] = { ...updated[i], hasAbsolute: Boolean(checked) }
                              setValoresData(updated)
                            }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          {v.hasAbsolute && (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={v.absoluteValue ?? ""}
                              onChange={(e) => {
                                const updated = [...valoresData]
                                updated[i] = {
                                  ...updated[i],
                                  absoluteValue: e.target.value ? parseFloat(e.target.value) : null,
                                }
                                setValoresData(updated)
                              }}
                              className="h-8 text-xs"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              disabled={valoresSaving}
              onClick={async () => {
                setValoresSaving(true)
                try {
                  await fetch(`/api/admin/eventos/${id}/valores`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ values: valoresData }),
                  })
                  loadValores()
                } catch {
                  console.error("Erro ao salvar valores")
                } finally {
                  setValoresSaving(false)
                }
              }}
            >
              {valoresSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {/* TAB: FINANCEIRO */}
      {tab === "financeiro" && (
        <div className="space-y-6">
          {finLoading ? (
            <div className="text-[#6b7280] text-center py-12">Carregando...</div>
          ) : finData ? (
            <>
              {/* Inscrições */}
              <div>
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Inscrições
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total", value: finData.inscricoes.total, color: "var(--foreground)" },
                    { label: "Pendente", value: finData.inscricoes.pendente, color: "#fbbf24" },
                    { label: "Aprovado", value: finData.inscricoes.aprovado, color: "#4ade80" },
                    { label: "Cancelado", value: finData.inscricoes.cancelado, color: "#f87171" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Medalhas */}
              <div>
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Medalhas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total", value: finData.medalhas.total, color: "var(--foreground)" },
                    { label: "Ouro", value: finData.medalhas.ouro, color: "#fbbf24" },
                    { label: "Prata", value: finData.medalhas.prata, color: "var(--muted-foreground)" },
                    { label: "Bronze", value: finData.medalhas.bronze, color: "#d97706" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Chaves */}
              <div>
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Chaves
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total", value: finData.chaves.total, color: "var(--foreground)" },
                    { label: "Normal", value: finData.chaves.normal, color: "#60a5fa" },
                    { label: "Absoluto", value: finData.chaves.absoluto, color: "#c084fc" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Inscrições aprovadas */}
              <div>
                <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-3">
                  Inscrições Aprovadas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Qtd Atletas", value: finData.aprovadas.qtdAtletas, currency: false },
                    { label: "Qtd Absoluto", value: finData.aprovadas.qtdAbsoluto, currency: false },
                    { label: "Valor Inscrições", value: finData.aprovadas.valorTotalInscricoes, currency: true },
                    { label: "Valor Absoluto", value: finData.aprovadas.valorTotalAbsoluto, currency: true },
                    { label: "Total Recebido", value: finData.aprovadas.totalRecebido, currency: true },
                    { label: "Cartão", value: finData.aprovadas.cartao, currency: false },
                    { label: "PIX", value: finData.aprovadas.pix, currency: false },
                    { label: "Dinheiro", value: finData.aprovadas.dinheiro, currency: false },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                        {s.currency ? formatCurrency(s.value as number) : s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[#6b7280] text-center py-12">Sem dados financeiros.</div>
          )}
        </div>
      )}

      {/* TAB: ATLETAS */}
      {tab === "atletas" && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total", value: totalAtletas, color: "var(--foreground)", filter: "" },
              { label: "Pendente", value: pendenteAtletas, color: "#fbbf24", filter: "pendente" },
              { label: "Aprovado", value: aprovadoAtletas, color: "#4ade80", filter: "aprovado" },
              { label: "Cancelado", value: canceladoAtletas, color: "#f87171", filter: "cancelado" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border px-4 py-2 cursor-pointer hover:border-[#444444] transition-colors"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <p className="text-xs text-[#6b7280]">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <FiltersBar weightCategories={weightCategories} teams={teams} filtersRef={filtersRef} resetKey={filterResetKey} />

          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2">
              <Button onClick={() => setAtletasApplied({ ...filtersRef.current })}>
                <Search className="h-4 w-4 mr-2" />
                Pesquisar
              </Button>
              <Button variant="outline" onClick={() => {
                setFilterResetKey(k => k + 1)
                setAtletasApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
              }}>
                Limpar Filtros
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
            <Button onClick={() => setInscreverOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Inscrever
            </Button>
            <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null) }}>
              <Download className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button
              variant="outline"
              style={{ borderColor: "#dc2626", color: "#dc2626" }}
              onClick={async () => {
                if (!confirm("Tem certeza que deseja excluir TODOS os atletas deste evento? As chaves geradas também serão removidas. Esta ação não pode ser desfeita.")) return
                try {
                  const res = await fetch(`/api/admin/eventos/${id}/atletas`, { method: "DELETE" })
                  const data = await res.json()
                  if (!res.ok) alert(data.error || "Erro ao excluir atletas.")
                  else {
                    setAtletasApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
                    setFilterResetKey(k => k + 1)
                  }
                } catch {
                  alert("Erro ao excluir atletas.")
                }
              }}
            >
              Excluir Todos
            </Button>
            {inscreverOpen && (
              <InscricaoAdminModal
                eventId={id}
                onClose={() => setInscreverOpen(false)}
                onSaved={() => { setInscreverOpen(false); loadAtletas() }}
              />
            )}
            {/* Modal Importar Excel */}
            {importOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => !importLoading && setImportOpen(false)}>
                <div className="rounded-lg border w-full max-w-lg" style={{ backgroundColor: "var(--card)", borderColor: "var(--border-alt)" }} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <span className="text-sm font-semibold text-white">Importar Inscritos via Excel</span>
                    {!importLoading && (
                      <button className="text-[#6b7280] hover:text-white text-lg leading-none" onClick={() => setImportOpen(false)}>✕</button>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    {!importResult ? (
                      <>
                        <p className="text-sm text-[#6b7280]">Selecione o arquivo <strong className="text-white">.xlsx</strong> gerado pelo site da federação. Somente inscritos com status <strong className="text-white">Aprovado</strong> serão importados.</p>
                        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${importLoading ? "opacity-50 cursor-not-allowed" : "hover:border-red-500"}`} style={{ borderColor: "var(--border-alt)" }}>
                          <Download className="h-8 w-8 text-[#6b7280] mb-2" />
                          <span className="text-sm text-[#6b7280]">{importLoading ? "Importando, aguarde..." : "Clique para selecionar o arquivo"}</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            disabled={importLoading}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
                          />
                        </label>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-lg p-3" style={{ backgroundColor: "var(--card-alt)" }}>
                            <p className="text-xs text-[#6b7280]">Total na planilha</p>
                            <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{importResult.total}</p>
                          </div>
                          <div className="rounded-lg p-3" style={{ backgroundColor: "#14532d30" }}>
                            <p className="text-xs text-[#4ade80]">Importados</p>
                            <p className="text-xl font-bold text-[#4ade80]">{importResult.importados}</p>
                          </div>
                          <div className="rounded-lg p-3" style={{ backgroundColor: "#7f1d1d30" }}>
                            <p className="text-xs text-[#f87171]">Erros</p>
                            <p className="text-xl font-bold text-[#f87171]">{importResult.erros.length}</p>
                          </div>
                        </div>
                        {importResult.erros.length > 0 && (
                          <div className="rounded-lg border p-3 space-y-1 max-h-48 overflow-y-auto" style={{ borderColor: "var(--border-alt)", backgroundColor: "var(--background)" }}>
                            <p className="text-xs font-semibold text-[#f87171] mb-2">Registros com erro:</p>
                            {importResult.erros.map((e, i) => (
                              <p key={i} className="text-xs text-[#6b7280]"><span className="text-white">{e.nome}</span> — {e.motivo}</p>
                            ))}
                          </div>
                        )}
                        {importResult.ignorados.length > 0 && (
                          <p className="text-xs text-[#6b7280]">{importResult.ignorados.length} registro(s) ignorado(s) por não terem status Aprovado.</p>
                        )}
                        <Button className="w-full" onClick={() => setImportOpen(false)}>Fechar</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase">Atleta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase hidden sm:table-cell">Sexo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase hidden md:table-cell">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase hidden lg:table-cell">Faixa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase hidden lg:table-cell">Peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase hidden xl:table-cell">Equipe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase hidden md:table-cell">Absoluto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {atletasLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-[#6b7280]">Carregando...</td>
                    </tr>
                  ) : registrations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-[#6b7280]">Nenhuma inscrição encontrada.</td>
                    </tr>
                  ) : (
                    registrations.map((reg, i) => {
                      const statusStyle = STATUS_STYLES[reg.status] || { bg: "#1a1a1a", text: "#9ca3af" }
                      return (
                        <tr
                          key={reg.id}
                          style={{ borderBottom: "1px solid var(--border)" }}
                          className="hover:bg-[#1a1a1a] transition-colors"
                        >
                          <td className="px-4 py-3 text-[#6b7280]">{i + 1}</td>
                          <td className="px-4 py-3">
                            <button
                              className="text-white font-medium hover:text-[#dc2626] transition-colors text-left"
                              onClick={() => setGerenciarId(reg.id)}
                            >
                              {reg.athlete?.user.name ?? reg.guestName ?? "—"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell text-xs">
                            {reg.sex === "MASCULINO" ? "M" : "F"}
                          </td>
                          <td className="px-4 py-3 text-[#9ca3af] hidden md:table-cell text-xs">
                            {AGE_GROUP_LABELS[reg.ageGroup]?.split(" (")[0] || reg.ageGroup}
                          </td>
                          <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell text-xs">
                            {BELT_LABELS[reg.belt] || reg.belt}
                          </td>
                          <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell text-xs">
                            {reg.weightCategory?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#9ca3af] hidden xl:table-cell text-xs">
                            {reg.team?.name || "—"}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge variant={reg.isAbsolute ? "default" : "secondary"}>
                              {reg.isAbsolute ? "Sim" : "Não"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: statusStyle.bg,
                                color: statusStyle.text,
                              }}
                            >
                              {reg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setGerenciarId(reg.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-[#dc2626]"
                                onClick={async () => {
                                  if (!confirm("Cancelar esta inscrição?")) return
                                  await fetch(
                                    `/api/admin/eventos/${id}/atletas/${reg.id}`,
                                    { method: "DELETE" }
                                  )
                                  loadAtletas()
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-tabs ATIVOS / LIXEIRA */}
          <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--card-alt)" }}>
            {(["ativos", "lixeira"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAtletasTab(t)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: atletasTab === t ? "#dc2626" : "transparent",
                  color: atletasTab === t ? "#ffffff" : "#6b7280",
                }}
              >
                {t === "ativos" ? "ATIVOS" : "LIXEIRA"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CHECAGEM */}
      {tab === "checagem" && (
        <div className="space-y-4">
          <FiltersBar weightCategories={weightCategories} teams={teams} filtersRef={filtersRef} resetKey={filterResetKey} />
          <Button onClick={loadChecagem}>
            <Search className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>

          {checagemLoading ? (
            <div className="text-[#6b7280] text-center py-12">Carregando...</div>
          ) : (
            (() => {
              const groups = new Map<string, Registration[]>()
              for (const r of checagemData) {
                const key = `${r.sex}|${r.ageGroup}|${r.belt}`
                if (!groups.has(key)) groups.set(key, [])
                groups.get(key)!.push(r)
              }
              return Array.from(groups.entries()).map(([key, regs]) => {
                const [sex, ageGroup, belt] = key.split("|")
                return (
                  <div
                    key={key}
                    className="rounded-lg border overflow-hidden"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div
                      className="px-4 py-3 font-semibold text-sm"
                      style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}
                    >
                      {sex === "MASCULINO" ? "Masculino" : "Feminino"} |{" "}
                      {AGE_GROUP_LABELS[ageGroup]?.split(" (")[0] || ageGroup} |{" "}
                      {BELT_LABELS[belt] || belt}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Nome</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Peso</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Equipe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regs.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td className="px-4 py-2" style={{ color: "var(--foreground)" }}>{r.athlete?.user.name ?? r.guestName ?? "—"}</td>
                            <td className="px-4 py-2 text-[#9ca3af] text-xs">
                              {r.weightCategory?.maxWeight
                                ? `até ${r.weightCategory.maxWeight}kg`
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-[#9ca3af] text-xs">{r.team?.name || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })
            })()
          )}
          {!checagemLoading && checagemData.length === 0 && (
            <div className="text-[#6b7280] text-center py-12">Nenhum atleta para checagem.</div>
          )}
        </div>
      )}

      {/* TAB: CHAVES */}
      {tab === "chaves" && (
        <div className="space-y-4">
          {/* Painel de stats das chaves */}
          {brackets.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {[
                { label: "Total", value: brackets.length, color: "var(--foreground)" },
                { label: "Pendente", value: brackets.filter(b => b.status === "PENDENTE" || b.status === "DESIGNADA").length, color: "var(--muted)" },
                { label: "Em Andamento", value: brackets.filter(b => b.status === "EM_ANDAMENTO").length, color: "#fbbf24" },
                { label: "Finalizada", value: brackets.filter(b => b.status === "FINALIZADA").length, color: "#4ade80" },
                { label: "Premiada", value: brackets.filter(b => b.status === "PREMIADA").length, color: "#a78bfa" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border px-4 py-2"
                  style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                >
                  <p className="text-xs text-[#6b7280]">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <FiltersBar weightCategories={weightCategories} teams={teams} filtersRef={filtersRef} resetKey={filterResetKey} />
          <div className="flex gap-2">
            <Button onClick={loadChaves}>
              <Search className="h-4 w-4 mr-2" />
              Pesquisar
            </Button>
            <Button variant="outline" onClick={() => setFilterResetKey(k => k + 1)}>
              Limpar Filtros
            </Button>
            <Button onClick={gerarChaves} disabled={chavesGenerating}>
              <Plus className="h-4 w-4 mr-2" />
              {chavesGenerating ? "Gerando..." : "Gerar Chaves"}
            </Button>
            {brackets.length > 0 && (
              <Button
                variant="ghost"
                className="text-[#f87171] hover:text-[#f87171]"
                onClick={async () => {
                  if (!confirm("Tem certeza que deseja remover todas as chaves?")) return
                  await fetch(`/api/admin/eventos/${id}/chaves`, { method: "DELETE" })
                  await loadChaves()
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Chaves
              </Button>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          {chavesLoading ? (
            <div className="text-[#6b7280] text-center py-12">Carregando...</div>
          ) : brackets.length === 0 ? (
            <div className="text-[#6b7280] text-center py-12">Nenhuma chave encontrada. Clique em "Gerar Chaves" para criar as chaves a partir das inscrições aprovadas.</div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  PENDENTE:     { bg: "#dc2626", text: "#ffffff" },
                  DESIGNADA:    { bg: "#1e3a8a", text: "#ffffff" },
                  EM_ANDAMENTO: { bg: "#b45309", text: "#ffffff" },
                  FINALIZADA:   { bg: "#166534", text: "#ffffff" },
                  PREMIADA:     { bg: "#5b21b6", text: "#ffffff" },
                }
                const getBracketLabel = (bracket: Bracket) => [
                  bracket.weightCategory.sex === "MASCULINO" ? "M" : "F",
                  AGE_GROUP_LABELS[bracket.weightCategory.ageGroup]?.split(" (")[0] || bracket.weightCategory.ageGroup,
                  bracket.isAbsolute ? null : bracket.weightCategory.name,
                  BELT_LABELS[bracket.belt] || bracket.belt,
                  bracket.isAbsolute ? "Absoluto" : null,
                ].filter(Boolean).join(" | ")

                const sorted = [...brackets].sort((a, b) => {
                  const ageA = AGE_GROUP_ORDER.indexOf(a.weightCategory.ageGroup)
                  const ageB = AGE_GROUP_ORDER.indexOf(b.weightCategory.ageGroup)
                  if (ageA !== ageB) return ageA - ageB
                  if (a.isAbsolute !== b.isAbsolute) return a.isAbsolute ? 1 : -1
                  if (a.weightCategory.maxWeight !== b.weightCategory.maxWeight)
                    return a.weightCategory.maxWeight - b.weightCategory.maxWeight
                  return a.bracketNumber - b.bracketNumber
                })

                // Agrupar: sub-chaves com mesmo bracketGroupId ficam juntas
                const rendered: React.ReactNode[] = []
                const seen = new Set<string>()
                for (const bracket of sorted) {
                  if (bracket.bracketGroupId && !bracket.isGrandFinal) {
                    if (seen.has(bracket.bracketGroupId)) continue
                    seen.add(bracket.bracketGroupId)
                    const group = sorted.filter(b => b.bracketGroupId === bracket.bracketGroupId && !b.isGrandFinal)
                    const grandFinal = sorted.find(b => b.bracketGroupId === bracket.bracketGroupId && b.isGrandFinal)
                    const allInGroup = grandFinal ? [...group, grandFinal] : group
                    const groupLabel = getBracketLabel(bracket)
                    const totalAthletes = group.reduce((s, b) => s + b.positions.length, 0)
                    const groupTatameId = group[0].tatameId || ""
                    rendered.push(
                      <div key={bracket.bracketGroupId} className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "#f59e0b50" }}>
                        <div className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "#1a1000" }}>
                          <span className="text-xs font-bold text-[#f59e0b]">GRUPO</span>
                          <button
                            className="text-sm font-medium flex-1 min-w-0 truncate text-left hover:text-[#f59e0b] transition-colors" style={{ color: "var(--foreground)" }}
                            onClick={() => setSelectedBracketId(group[0].id)}
                          >
                            {groupLabel}
                          </button>
                          <span className="text-xs text-[#6b7280] shrink-0">{totalAthletes} atleta(s)</span>
                          {allInGroup.map(b => {
                            const sc = statusColors[b.status] || statusColors.PENDENTE
                            return <span key={b.id} className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>{b.isGrandFinal ? "GF" : `#${b.bracketNumber}`} {b.status}</span>
                          })}
                          <select
                            className="text-xs rounded border px-2 py-1 shrink-0"
                            style={{ backgroundColor: "var(--card-alt)", borderColor: "#f59e0b60", color: "var(--foreground)" }}
                            value={groupTatameId}
                            onChange={(e) => allInGroup.forEach(b => atribuirTatame(b.id, e.target.value || null))}
                          >
                            <option value="">Sem tatame</option>
                            {tatames.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  } else if (!bracket.bracketGroupId) {
                    const catLabel = getBracketLabel(bracket)
                    const sc = statusColors[bracket.status] || statusColors.PENDENTE
                    rendered.push(
                      <div key={bracket.id} className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span className="text-xs font-bold text-[#6b7280]">#{bracket.bracketNumber}</span>
                          <button
                            className="text-sm font-medium flex-1 min-w-0 truncate text-left hover:text-red-400 transition-colors" style={{ color: "var(--foreground)" }}
                            onClick={() => setSelectedBracketId(bracket.id)}
                          >
                            {catLabel}
                          </button>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {bracket.status}
                          </span>
                          <span className="text-xs text-[#6b7280] shrink-0">{bracket.positions.length} atleta(s)</span>
                          <select
                            className="text-xs rounded border px-2 py-1 shrink-0"
                            style={{ backgroundColor: "var(--card-alt)", borderColor: "var(--border-alt)", color: "var(--foreground)" }}
                            value={bracket.tatameId || ""}
                            onChange={(e) => atribuirTatame(bracket.id, e.target.value || null)}
                          >
                            <option value="">Sem tatame</option>
                            {tatames.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  }
                  // isGrandFinal sozinha (sem sub-chaves visíveis) — já tratada no grupo
                }
                return rendered
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB: RESULTADO */}
      {tab === "resultado" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] inline-block animate-pulse" />
              Sincronizando ao vivo com a premiação
            </span>
          </div>
          <FiltersBar weightCategories={weightCategories} teams={teams} filtersRef={filtersRef} resetKey={filterResetKey} />
          <Button onClick={() => loadResultado()}>
            <Search className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>

          {resultadoLoading ? (
            <div className="text-[#6b7280] text-center py-12">Carregando...</div>
          ) : resultadoData.length === 0 ? (
            <div className="text-[#6b7280] text-center py-12">Nenhum resultado encontrado.</div>
          ) : (
            (() => {
              const groups = new Map<string, Registration[]>()
              for (const r of resultadoData) {
                const key = `${r.weightCategory?.id ?? ""}__${r.isAbsolute ? "1" : "0"}`
                if (!groups.has(key)) groups.set(key, [])
                groups.get(key)!.push(r)
              }
              const sortedGroups = Array.from(groups.entries()).sort(([, a], [, b]) => {
                const ra = a[0], rb = b[0]
                const ageA = AGE_GROUP_ORDER.indexOf(ra.weightCategory?.ageGroup ?? "")
                const ageB = AGE_GROUP_ORDER.indexOf(rb.weightCategory?.ageGroup ?? "")
                if (ageA !== ageB) return ageA - ageB
                if (ra.isAbsolute !== rb.isAbsolute) return ra.isAbsolute ? 1 : -1
                return (ra.weightCategory?.maxWeight ?? 0) - (rb.weightCategory?.maxWeight ?? 0)
              })
              return (
                <>
                  {sortedGroups.map(([wcId, regs]) => {
                    const wc = regs[0]?.weightCategory
                    return (
                      <div
                        key={wcId}
                        className="rounded-lg border overflow-hidden"
                        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                      >
                        <div
                          className="px-4 py-3 font-semibold text-sm"
                          style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}
                        >
                          {wc
                            ? `${wc.sex === "MASCULINO" ? "Masculino" : "Feminino"} | ${AGE_GROUP_LABELS[wc.ageGroup]?.split(" (")[0] || wc.ageGroup} | ${wc.name}`
                            : "Categoria"}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase w-8">#</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Nome</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase hidden sm:table-cell">Equipe</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase w-36">Medalha</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-[#6b7280] uppercase w-20">P.Eq.</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-[#6b7280] uppercase w-20">Premiado</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-[#6b7280] uppercase w-20">Filiado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regs.map((r, idx) => {
                              const edit = resultadoEdits[r.id] || {}
                              return (
                                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                  <td className="px-4 py-2 text-[#6b7280]">{idx + 1}</td>
                                  <td className="px-4 py-2 text-xs" style={{ color: "var(--foreground)" }}>{r.athlete?.user.name ?? r.guestName ?? "—"}</td>
                                  <td className="px-4 py-2 text-[#9ca3af] text-xs hidden sm:table-cell">
                                    {r.team?.name || "—"}
                                  </td>
                                  <td className="px-4 py-2">
                                    <Select
                                      value={edit.medal !== undefined ? edit.medal || "none" : r.medal || "none"}
                                      onValueChange={(v) =>
                                        setResultadoEdits((prev) => ({
                                          ...prev,
                                          [r.id]: { ...prev[r.id], medal: v === "none" ? null : v },
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Medalha" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        <SelectItem value="OURO">Ouro</SelectItem>
                                        <SelectItem value="PRATA">Prata</SelectItem>
                                        <SelectItem value="BRONZE">Bronze</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Checkbox
                                      checked={
                                        edit.teamPoints !== undefined
                                          ? Boolean(edit.teamPoints)
                                          : r.teamPoints
                                      }
                                      onCheckedChange={(v) =>
                                        setResultadoEdits((prev) => ({
                                          ...prev,
                                          [r.id]: { ...prev[r.id], teamPoints: Boolean(v) },
                                        }))
                                      }
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Checkbox
                                      checked={
                                        edit.awarded !== undefined
                                          ? Boolean(edit.awarded)
                                          : r.awarded
                                      }
                                      onCheckedChange={(v) =>
                                        setResultadoEdits((prev) => ({
                                          ...prev,
                                          [r.id]: { ...prev[r.id], awarded: Boolean(v) },
                                        }))
                                      }
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Checkbox
                                      checked={
                                        edit.affiliated !== undefined
                                          ? Boolean(edit.affiliated)
                                          : r.affiliated
                                      }
                                      onCheckedChange={(v) =>
                                        setResultadoEdits((prev) => ({
                                          ...prev,
                                          [r.id]: { ...prev[r.id], affiliated: Boolean(v) },
                                        }))
                                      }
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                  <div className="flex justify-end">
                    <Button
                      disabled={resultadoSaving}
                      onClick={async () => {
                        setResultadoSaving(true)
                        try {
                          const results = resultadoData.map((r) => ({
                            id: r.id,
                            medal: resultadoEdits[r.id]?.medal !== undefined
                              ? resultadoEdits[r.id].medal
                              : r.medal,
                            teamPoints: resultadoEdits[r.id]?.teamPoints !== undefined
                              ? resultadoEdits[r.id].teamPoints
                              : r.teamPoints,
                            awarded: resultadoEdits[r.id]?.awarded !== undefined
                              ? resultadoEdits[r.id].awarded
                              : r.awarded,
                            affiliated: resultadoEdits[r.id]?.affiliated !== undefined
                              ? resultadoEdits[r.id].affiliated
                              : r.affiliated,
                            pointDiff: resultadoEdits[r.id]?.pointDiff !== undefined
                              ? resultadoEdits[r.id].pointDiff
                              : r.pointDiff,
                          }))
                          await fetch(`/api/admin/eventos/${id}/resultado`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ results }),
                          })
                          setResultadoEdits({})
                          loadResultado()
                        } catch {
                          console.error("Erro ao salvar resultados")
                        } finally {
                          setResultadoSaving(false)
                        }
                      }}
                    >
                      {resultadoSaving ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </>
              )
            })()
          )}
        </div>
      )}

      {/* TAB: TATAMES */}
      {tab === "tatames" && (
        <div className="space-y-6">

          {/* Painel de stats das chaves por tatame */}
          {brackets.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {[
                { label: "Total", value: brackets.length, color: "var(--foreground)" },
                { label: "Pendente", value: brackets.filter(b => b.status === "PENDENTE" || b.status === "DESIGNADA").length, color: "var(--muted)" },
                { label: "Em Andamento", value: brackets.filter(b => b.status === "EM_ANDAMENTO").length, color: "#fbbf24" },
                { label: "Finalizada", value: brackets.filter(b => b.status === "FINALIZADA").length, color: "#4ade80" },
                { label: "Premiada", value: brackets.filter(b => b.status === "PREMIADA").length, color: "#a78bfa" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border px-4 py-2"
                  style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                >
                  <p className="text-xs text-[#6b7280]">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tatame cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider flex-1" style={{ color: "var(--foreground)" }}>Tatames Ativos</h3>
              {tatamesLoading && <span className="text-xs text-[#6b7280]">Carregando...</span>}
            </div>

            {tatames.length === 0 ? (
              <p className="text-sm text-[#6b7280] py-4">Nenhum coordenador conectado. Os tatames aparecem aqui quando os coordenadores acessam a tela de controle.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tatames.map((tatame) => {
                  const operador = tatame.operations[0]
                  const emEspera = !operador
                  return (
                    <div
                      key={tatame.id}
                      className="rounded-lg border p-3"
                      style={{
                        borderColor: emEspera ? (isDark ? "#78350f60" : "#d9770660") : (isDark ? "#16a34a40" : "#16a34a50"),
                        backgroundColor: emEspera ? (isDark ? "#1c1200" : "#fffbeb") : (isDark ? "#0d1f0d" : "#f0fdf4"),
                      }}
                    >
                      {/* Header: nome + badge + lixeira */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-sm block truncate" style={{ color: isDark ? "#ffffff" : "#111827" }}>{tatame.name}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5"
                            style={{
                              backgroundColor: emEspera ? "#d97706" : "#16a34a",
                              color: "#ffffff",
                            }}
                          >
                            {emEspera ? "AGUARDANDO" : "ATIVO"}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:text-[#dc2626] flex-shrink-0" onClick={() => excluirTatame(tatame.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Stats em grid 2 colunas */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] mb-1.5">
                        <span style={{ color: isDark ? "#9ca3af" : "#374151" }}>Atribuídas: <span style={{ color: isDark ? "#ffffff" : "#111827", fontWeight: 600 }}>{tatame.brackets.length}</span></span>
                        <span style={{ color: isDark ? "#60a5fa" : "#1d4ed8" }}>Aguardando: {tatame.brackets.filter(b => b.status === "DESIGNADA" || b.status === "PENDENTE").length}</span>
                        <span style={{ color: isDark ? "#fbbf24" : "#b45309" }}>Em andamento: {tatame.brackets.filter(b => b.status === "EM_ANDAMENTO").length}</span>
                        <span style={{ color: isDark ? "#4ade80" : "#15803d" }}>Finalizadas: {tatame.brackets.filter(b => b.status === "FINALIZADA" || b.status === "PREMIADA").length}</span>
                      </div>
                      {/* Operador */}
                      <div className="text-[11px]">
                        {operador ? (
                          <span style={{ color: isDark ? "#4ade80" : "#15803d" }}>
                            {operador.user.name} desde {new Date(operador.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : (
                          <span style={{ color: isDark ? "#fbbf24" : "#b45309" }}>Aguardando reconexão...</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bracket assignment list */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider flex-1" style={{ color: "var(--foreground)" }}>Chaves Geradas</h3>
              <Button size="sm" variant="outline" onClick={() => { setSelectionMode(s => !s); setSelectedBrackets(new Set()) }}>
                {selectionMode ? "Cancelar" : "Selecionar"}
              </Button>
            </div>
            {/* Barra de ações em lote */}
            {selectionMode && selectedBrackets.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg border" style={{ borderColor: "#60a5fa40", backgroundColor: "#0d1a2e" }}>
                <span className="text-xs text-[#60a5fa] font-semibold">{selectedBrackets.size} selecionada(s)</span>
                <select
                  className="text-xs rounded border px-2 py-1"
                  style={{ backgroundColor: "var(--card-alt)", borderColor: "var(--border-alt)", color: "var(--foreground)" }}
                  defaultValue=""
                  onChange={(e) => { if (e.target.value !== "") { bulkAtribuir(e.target.value === "__none__" ? null : e.target.value); e.target.value = "" } }}
                  disabled={bulkLoading}
                >
                  <option value="" disabled>Atribuir tatame...</option>
                  <option value="__none__">Sem tatame</option>
                  {tatames.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={bulkReiniciar} disabled={bulkLoading} className="text-[#fbbf24] border-[#fbbf2440] hover:bg-[#fbbf2410]">
                  <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
                </Button>
                <Button size="sm" variant="outline" onClick={bulkExcluir} disabled={bulkLoading} className="text-[#f87171] border-[#f8717140] hover:bg-[#f8717110]">
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir
                </Button>
              </div>
            )}
            <div className="space-y-3">
              <FiltersBar weightCategories={weightCategories} teams={teams} filtersRef={filtersRef} resetKey={filterResetKey} atletasCounts={atletasCounts} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTatamesApplied({ ...filtersRef.current })}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Pesquisar
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setFilterResetKey(k => k + 1)
                  setTatamesApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "", qtdAtletas: "" })
                }}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
            {chavesLoading ? (
              <p className="text-[#6b7280] text-sm py-4">Carregando chaves...</p>
            ) : brackets.length === 0 ? (
              <p className="text-[#6b7280] text-sm py-4">Nenhuma chave gerada. Vá até a aba CHAVES e clique em "Gerar Chaves".</p>
            ) : tatamesFilteredBrackets.length === 0 ? (
              <p className="text-[#6b7280] text-sm py-4">Nenhuma chave encontrada com os filtros aplicados.</p>
            ) : (() => {
              const pendentes = tatamesFilteredBrackets.filter(b => b.status !== "FINALIZADA" && b.status !== "PREMIADA")
              const finalizadas = tatamesFilteredBrackets.filter(b => b.status === "FINALIZADA" || b.status === "PREMIADA")

              const statusColors: Record<string, { bg: string; text: string }> = {
                PENDENTE:     { bg: "#dc2626", text: "#ffffff" },
                DESIGNADA:    { bg: "#1e3a8a", text: "#ffffff" },
                EM_ANDAMENTO: { bg: "#b45309", text: "#ffffff" },
                FINALIZADA:   { bg: "#166534", text: "#ffffff" },
                PREMIADA:     { bg: "#5b21b6", text: "#ffffff" },
              }

              const getBracketLabel = (bracket: typeof tatamesFilteredBrackets[0]) => [
                bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
                AGE_GROUP_LABELS[bracket.weightCategory.ageGroup]?.split(" (")[0] || bracket.weightCategory.ageGroup,
                BELT_LABELS[bracket.belt] || bracket.belt,
                bracket.isAbsolute ? "Absoluto" : bracket.weightCategory.name,
                bracket.isAbsolute ? null : `Até ${bracket.weightCategory.maxWeight}kg`,
              ].filter(Boolean).join(" | ")

              const renderGroupedList = (list: typeof tatamesFilteredBrackets, selectable = false) => {
                const rows: React.ReactNode[] = []
                const seenGroups = new Set<string>()
                list.forEach((bracket, idx) => {
                  if (bracket.bracketGroupId && !bracket.isGrandFinal) {
                    if (seenGroups.has(bracket.bracketGroupId)) return
                    seenGroups.add(bracket.bracketGroupId)
                    const group = list.filter(b => b.bracketGroupId === bracket.bracketGroupId && !b.isGrandFinal)
                    const grandFinal = brackets.find(b => b.bracketGroupId === bracket.bracketGroupId && b.isGrandFinal)
                    const allInGroup = grandFinal ? [...group, grandFinal] : group
                    const groupTatameId = group[0].tatameId || ""
                    const groupIds = allInGroup.map(b => b.id)
                    const allGroupSelected = groupIds.every(bid => selectedBrackets.has(bid))
                    rows.push(
                      <div
                        key={bracket.bracketGroupId}
                        className="flex items-center gap-3 px-4 py-3 flex-wrap"
                        style={{ borderBottom: idx < list.length - 1 ? "1px solid var(--border)" : "none", backgroundColor: "var(--card)" }}
                      >
                        {selectionMode && selectable && (
                          <input type="checkbox" checked={allGroupSelected}
                            onChange={() => { setSelectedBrackets(prev => { const next = new Set(prev); groupIds.forEach(bid => allGroupSelected ? next.delete(bid) : next.add(bid)); return next }) }}
                            className="shrink-0 w-4 h-4 cursor-pointer"
                          />
                        )}
                        <span className="text-xs font-bold text-[#f59e0b] shrink-0">GRUPO</span>
                        <button
                          className="text-sm font-medium flex-1 min-w-0 truncate text-left hover:text-[#f59e0b] transition-colors" style={{ color: "var(--foreground)" }}
                          onClick={() => setSelectedBracketId(group[0].id)}
                        >
                          {getBracketLabel(bracket)}
                        </button>
                        {allInGroup.map(b => {
                          const sc = statusColors[b.status] || statusColors.PENDENTE
                          return <span key={b.id} className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>{b.isGrandFinal ? "GF" : `#${b.bracketNumber}`} {b.status}</span>
                        })}
                        <span className="text-xs text-[#6b7280] shrink-0">{group.reduce((s, b) => s + b.positions.length, 0)} atleta(s)</span>
                        <select
                          className="text-xs rounded border px-2 py-1 shrink-0"
                          style={{ backgroundColor: "var(--card-alt)", borderColor: "#f59e0b60", color: "var(--foreground)" }}
                          value={groupTatameId}
                          onChange={(e) => allInGroup.forEach(b => atribuirTatame(b.id, e.target.value || null))}
                        >
                          <option value="">Sem tatame</option>
                          {tatames.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )
                  } else if (!bracket.bracketGroupId) {
                    const catLabel = `${getBracketLabel(bracket)} | Chave: ${bracket.bracketNumber}`
                    const isSoloWO = bracket.positions.length === 1 && bracket.matches.some(m => m.position1Id !== null && m.position2Id === null && m.isWO)
                    const sc = isSoloWO ? { bg: "#92400e", text: "#ffffff" } : (statusColors[bracket.status] || statusColors.PENDENTE)
                    const statusLabel = isSoloWO ? "W.O." : bracket.status
                    rows.push(
                      <div
                        key={bracket.id}
                        className="flex items-center gap-3 px-4 py-3 flex-wrap"
                        style={{ borderBottom: idx < list.length - 1 ? "1px solid var(--border)" : "none", backgroundColor: "var(--card)" }}
                      >
                        {selectionMode && selectable && (
                          <input type="checkbox" checked={selectedBrackets.has(bracket.id)}
                            onChange={() => toggleBracketSelection(bracket.id)}
                            className="shrink-0 w-4 h-4 cursor-pointer"
                          />
                        )}
                        <button
                          className="text-sm font-medium flex-1 min-w-0 truncate text-left hover:text-red-400 transition-colors cursor-pointer" style={{ color: "var(--foreground)" }}
                          onClick={() => setSelectedBracketId(bracket.id)}
                        >
                          {catLabel}
                        </button>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>
                          {statusLabel}
                        </span>
                        <span className="text-xs text-[#6b7280] shrink-0">{bracket.positions.length} atleta(s)</span>
                        <select
                          className="text-xs rounded border px-2 py-1 shrink-0"
                          style={{ backgroundColor: "var(--card-alt)", borderColor: "var(--border-alt)", color: "var(--foreground)" }}
                          value={bracket.tatameId || ""}
                          onChange={(e) => atribuirTatame(bracket.id, e.target.value || null)}
                        >
                          <option value="">Sem tatame</option>
                          {tatames.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => reiniciarChave(bracket.id)}
                          className="shrink-0 p-1 rounded hover:text-[#fbbf24] transition-colors"
                          style={{ color: "#6b7280" }}
                          title="Reiniciar chave"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => excluirChave(bracket.id)}
                          className="shrink-0 p-1 rounded hover:text-[#dc2626] transition-colors"
                          style={{ color: "#6b7280" }}
                          title="Excluir chave"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  }
                })
                return rows
              }

              // IDs de todas as pendentes selecionáveis
              const allPendentesIds = pendentes.flatMap(b =>
                b.bracketGroupId && !b.isGrandFinal ? [] : [b.id]
              ).concat(
                pendentes.filter(b => b.bracketGroupId && !b.isGrandFinal).flatMap(b => {
                  const group = pendentes.filter(x => x.bracketGroupId === b.bracketGroupId)
                  const gf = brackets.find(x => x.bracketGroupId === b.bracketGroupId && x.isGrandFinal)
                  return [...group, ...(gf ? [gf] : [])].map(x => x.id)
                })
              )
              const allPendentesSelected = allPendentesIds.length > 0 && allPendentesIds.every(bid => selectedBrackets.has(bid))

              return (
                <div className="space-y-4">
                  {pendentes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#fbbf24" }}>Pendentes</span>
                        <span className="text-xs text-[#6b7280]">({pendentes.length})</span>
                        {selectionMode && (
                          <button
                            className="text-xs text-[#60a5fa] hover:text-white transition-colors ml-1"
                            onClick={() => setSelectedBrackets(prev => {
                              const next = new Set(prev)
                              allPendentesIds.forEach(bid => allPendentesSelected ? next.delete(bid) : next.add(bid))
                              return next
                            })}
                          >
                            {allPendentesSelected ? "Desmarcar todas" : "Selecionar todas"}
                          </button>
                        )}
                      </div>
                      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                        {renderGroupedList(pendentes, true)}
                      </div>
                    </div>
                  )}
                  {finalizadas.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4ade80" }}>Finalizadas</span>
                        <span className="text-xs text-[#6b7280]">({finalizadas.length})</span>
                      </div>
                      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                        {renderGroupedList(finalizadas, false)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* TAB: OPERAÇÕES */}
      {tab === "operacoes" && (
        <div className="space-y-6">

          {/* Painel de Chamadas */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">Painel de Chamadas</p>
                <p className="text-[#6b7280] text-xs mt-0.5">Abra em uma TV para os atletas acompanharem as chamadas. O painel divide os tatames automaticamente pela metade.</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href={`/painel/${id}?painel=1`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: "#dc2626" }}>
                Abrir Painel 1 (1ª metade)
              </a>
              <a href={`/painel/${id}?painel=2`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: "#b91c1c" }}>
                Abrir Painel 2 (2ª metade)
              </a>
              <a href={`/painel/${id}`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
                style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                Painel Completo
              </a>
            </div>
          </div>

          {/* Painel de Premiação */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">Painel de Premiação</p>
                <p className="text-[#6b7280] text-xs mt-0.5">Abra em uma TV na área de premiação. Exibe os atletas aguardando medalhas conforme as chaves são finalizadas.</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href={`/painel-premiacao/${id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: "#92400e" }}>
                Abrir Painel de Premiação
              </a>
            </div>
          </div>

          {/* Backup das Chaves Finalizadas */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Backup das Chaves Finalizadas</p>
                <p className="text-[#6b7280] text-xs mt-0.5">
                  Exporta um arquivo JSON com todas as chaves finalizadas e premiadas — resultados, partidas e atletas.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a href={`/admin/eventos/${id}/backup-visual`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#0f766e" }}>
                  <Download className="w-4 h-4" />
                  Ver / Imprimir Chaves
                </a>
                <a href={`/api/admin/eventos/${id}/backup`} download
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                  JSON
                </a>
              </div>
            </div>
          </div>

          {/* Link Coordenador de Premiação */}
          <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "#4a1d9640", backgroundColor: "var(--background)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[#a78bfa] text-sm font-bold uppercase tracking-wider">🏆 Coordenador de Premiação</span>
            </div>
            <p className="text-xs text-[#6b7280]">Compartilhe o link abaixo com o coordenador responsável pela entrega de medalhas.</p>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border-alt)", backgroundColor: "var(--card)" }}>
              <span className="text-xs text-[#9ca3af] flex-1 truncate font-mono">{typeof window !== "undefined" ? `${window.location.origin}/premiacao/${id}` : `/premiacao/${id}`}</span>
              <button
                className="text-xs text-[#a78bfa] hover:text-white font-semibold shrink-0 transition-colors"
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/premiacao/${id}`)}
              >
                Copiar
              </button>
            </div>
            <a href={`/premiacao/${id}`} target="_blank" rel="noopener noreferrer"
              className="inline-block text-xs text-[#a78bfa] underline hover:text-white">
              Abrir página de premiação →
            </a>
          </div>

        </div>
      )}

            {/* Modal de visualização de chave */}
      {selectedBracketId && (() => {
        const bracket = brackets.find(b => b.id === selectedBracketId)
        if (!bracket) return null
        const bracketsToShow = bracket.bracketGroupId
          ? [...brackets]
              .filter(b => b.bracketGroupId === bracket.bracketGroupId)
              .sort((a, b) => { if (a.isGrandFinal !== b.isGrandFinal) return a.isGrandFinal ? 1 : -1; return a.bracketNumber - b.bracketNumber })
          : [bracket]
        const modalTitle = [
          bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
          AGE_GROUP_LABELS[bracket.weightCategory.ageGroup]?.split(" (")[0] || bracket.weightCategory.ageGroup,
          BELT_LABELS[bracket.belt] || bracket.belt,
          bracket.isAbsolute ? "Absoluto" : bracket.weightCategory.name,
          bracket.isAbsolute ? null : `Até ${bracket.weightCategory.maxWeight}kg`,
        ].filter(Boolean).join(" | ")
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setSelectedBracketId(null)}
          >
            <div
              className="relative rounded-lg border w-full max-w-4xl max-h-[90vh] overflow-auto"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border-alt)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
                <span className="text-sm font-semibold text-white">{modalTitle}</span>
                <button
                  className="text-[#6b7280] hover:text-white transition-colors text-lg leading-none"
                  onClick={() => setSelectedBracketId(null)}
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-6">
                {bracketsToShow.map(b => (
                  <div key={b.id}>
                    {bracketsToShow.length > 1 && (
                      <p className="text-xs font-semibold mb-2" style={{ color: b.isGrandFinal ? "#fbbf24" : "#6b7280" }}>
                        {b.isGrandFinal ? `🏆 Grande Final (#${b.bracketNumber})` : `Sub-chave #${b.bracketNumber} — ${b.positions.length} atleta(s)`}
                      </p>
                    )}
                    <BracketView bracket={b} onAthleteClick={(registrationId) => setGerenciarId(registrationId)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Gerenciar Atleta Modal */}
      {gerenciarId && (
        <GerenciarAtletaModal
          eventId={id}
          registrationId={gerenciarId}
          onClose={() => setGerenciarId(null)}
          onSaved={() => {
            loadAtletas()
            loadChaves()
            setGerenciarId(null)
          }}
        />
      )}
    </div>
  )
}
