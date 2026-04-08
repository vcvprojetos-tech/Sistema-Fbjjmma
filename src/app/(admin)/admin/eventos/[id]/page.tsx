"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Search, Plus, Download, Pencil, Trash2 } from "lucide-react"
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

export default function EventoDetailPage() {
  const { id } = useParams<{ id: string }>()
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

  // Filters shared across tabs
  const [filterNome, setFilterNome] = useState("")
  const [filterSexo, setFilterSexo] = useState("")
  const [filterCategoria, setFilterCategoria] = useState("")
  const [filterFaixa, setFilterFaixa] = useState("")
  const [filterPesoId, setFilterPesoId] = useState("")
  const [filterEquipeId, setFilterEquipeId] = useState("")

  // Committed filters for atletas (only update on "Pesquisar" click)
  const [atletasApplied, setAtletasApplied] = useState({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })

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
  const [tatamesApplied, setTatamesApplied] = useState({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })

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
    const params = new URLSearchParams()
    if (filterNome) params.set("nome", filterNome)
    if (filterSexo && filterSexo !== "all") params.set("sexo", filterSexo)
    if (filterCategoria && filterCategoria !== "all") params.set("categoria", filterCategoria)
    if (filterFaixa && filterFaixa !== "all") params.set("faixa", filterFaixa)
    if (filterPesoId && filterPesoId !== "all") {
      if (filterPesoId === "__absoluto__") params.set("absoluto", "1")
      else params.set("pesoNome", filterPesoId)
    }
    if (filterEquipeId && filterEquipeId !== "all") params.set("equipeId", filterEquipeId)
    return params
  }, [filterNome, filterSexo, filterCategoria, filterFaixa, filterPesoId, filterEquipeId])

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

  const loadResultado = useCallback(async () => {
    setResultadoLoading(true)
    try {
      const params = buildAtletasParams()
      const res = await fetch(`/api/admin/eventos/${id}/resultado?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setResultadoData(data)
    } catch {
      console.error("Erro ao carregar resultado")
    } finally {
      setResultadoLoading(false)
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

  useEffect(() => {
    // Limpa todos os filtros compartilhados sempre que muda de aba
    setFilterNome(""); setFilterSexo(""); setFilterCategoria(""); setFilterFaixa(""); setFilterPesoId(""); setFilterEquipeId("")
    setAtletasApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })
    setTatamesApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })
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
      return true
    }).sort((a, b) => {
      const ageA = AGE_GROUP_ORDER.indexOf(a.weightCategory.ageGroup)
      const ageB = AGE_GROUP_ORDER.indexOf(b.weightCategory.ageGroup)
      if (ageA !== ageB) return ageA - ageB
      if (a.isAbsolute !== b.isAbsolute) return a.isAbsolute ? 1 : -1
      return a.weightCategory.maxWeight - b.weightCategory.maxWeight
    })
  }, [brackets, tatamesApplied, teams])

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
  ]

  const sharedFilters = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <Input
        placeholder="Nome"
        value={filterNome}
        onChange={(e) => setFilterNome(e.target.value)}
      />
      <Select value={filterSexo} onValueChange={setFilterSexo}>
        <SelectTrigger>
          <SelectValue placeholder="Sexo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="MASCULINO">Masculino</SelectItem>
          <SelectItem value="FEMININO">Feminino</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterCategoria} onValueChange={setFilterCategoria}>
        <SelectTrigger>
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(AGE_GROUP_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterFaixa} onValueChange={setFilterFaixa}>
        <SelectTrigger>
          <SelectValue placeholder="Faixa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(BELT_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterPesoId} onValueChange={setFilterPesoId}>
        <SelectTrigger>
          <SelectValue placeholder="Peso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="__absoluto__">Absoluto</SelectItem>
          {Array.from(new Map(weightCategories.map((c) => [c.name, c])).values()).map((c) => (
            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterEquipeId} onValueChange={setFilterEquipeId}>
        <SelectTrigger>
          <SelectValue placeholder="Equipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

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
          <h1 className="text-2xl font-bold text-white">
            {eventLoading ? "Carregando..." : event?.name || "Evento"}
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Gerenciamento do evento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ backgroundColor: "#1a1a1a" }}>
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
            style={{ backgroundColor: "#111111", borderColor: "#222222" }}
          >
            {valoresLoading ? (
              <div className="p-8 text-center text-[#6b7280]">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222222" }}>
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
                      <tr key={`${v.sex}-${v.ageGroup}`} style={{ borderBottom: "1px solid #1a1a1a" }}>
                        <td className="px-4 py-2 text-[#6b7280]">{i + 1}</td>
                        <td className="px-4 py-2 text-[#9ca3af]">
                          {v.sex === "MASCULINO" ? "Masculino" : "Feminino"}
                        </td>
                        <td className="px-4 py-2 text-white">
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
                    { label: "Total", value: finData.inscricoes.total, color: "#ffffff" },
                    { label: "Pendente", value: finData.inscricoes.pendente, color: "#fbbf24" },
                    { label: "Aprovado", value: finData.inscricoes.aprovado, color: "#4ade80" },
                    { label: "Cancelado", value: finData.inscricoes.cancelado, color: "#f87171" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "#111111", borderColor: "#222222" }}
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
                    { label: "Total", value: finData.medalhas.total, color: "#ffffff" },
                    { label: "Ouro", value: finData.medalhas.ouro, color: "#fbbf24" },
                    { label: "Prata", value: finData.medalhas.prata, color: "#9ca3af" },
                    { label: "Bronze", value: finData.medalhas.bronze, color: "#d97706" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "#111111", borderColor: "#222222" }}
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
                    { label: "Total", value: finData.chaves.total, color: "#ffffff" },
                    { label: "Normal", value: finData.chaves.normal, color: "#60a5fa" },
                    { label: "Absoluto", value: finData.chaves.absoluto, color: "#c084fc" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-4"
                      style={{ backgroundColor: "#111111", borderColor: "#222222" }}
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
                      style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                    >
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-xl font-bold text-white">
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
              { label: "Total", value: totalAtletas, color: "#ffffff", filter: "" },
              { label: "Pendente", value: pendenteAtletas, color: "#fbbf24", filter: "pendente" },
              { label: "Aprovado", value: aprovadoAtletas, color: "#4ade80", filter: "aprovado" },
              { label: "Cancelado", value: canceladoAtletas, color: "#f87171", filter: "cancelado" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border px-4 py-2 cursor-pointer hover:border-[#444444] transition-colors"
                style={{ backgroundColor: "#111111", borderColor: "#222222" }}
              >
                <p className="text-xs text-[#6b7280]">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {sharedFilters}

          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2">
              <Button onClick={() => setAtletasApplied({ nome: filterNome, sexo: filterSexo, categoria: filterCategoria, faixa: filterFaixa, pesoId: filterPesoId, equipeId: filterEquipeId })}>
                <Search className="h-4 w-4 mr-2" />
                Pesquisar
              </Button>
              <Button variant="outline" onClick={() => {
                setFilterNome(""); setFilterSexo(""); setFilterCategoria(""); setFilterFaixa(""); setFilterPesoId(""); setFilterEquipeId("")
                setAtletasApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })
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
                    setAtletasApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })
                    setFilterNome(""); setFilterSexo(""); setFilterCategoria(""); setFilterFaixa(""); setFilterPesoId(""); setFilterEquipeId("")
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
                <div className="rounded-lg border w-full max-w-lg" style={{ backgroundColor: "#111", borderColor: "#333" }} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#222" }}>
                    <span className="text-sm font-semibold text-white">Importar Inscritos via Excel</span>
                    {!importLoading && (
                      <button className="text-[#6b7280] hover:text-white text-lg leading-none" onClick={() => setImportOpen(false)}>✕</button>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    {!importResult ? (
                      <>
                        <p className="text-sm text-[#6b7280]">Selecione o arquivo <strong className="text-white">.xlsx</strong> gerado pelo site da federação. Somente inscritos com status <strong className="text-white">Aprovado</strong> serão importados.</p>
                        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${importLoading ? "opacity-50 cursor-not-allowed" : "hover:border-red-500"}`} style={{ borderColor: "#333" }}>
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
                          <div className="rounded-lg p-3" style={{ backgroundColor: "#1a1a1a" }}>
                            <p className="text-xs text-[#6b7280]">Total na planilha</p>
                            <p className="text-xl font-bold text-white">{importResult.total}</p>
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
                          <div className="rounded-lg border p-3 space-y-1 max-h-48 overflow-y-auto" style={{ borderColor: "#333", backgroundColor: "#0d0d0d" }}>
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
            style={{ backgroundColor: "#111111", borderColor: "#222222" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #222222" }}>
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
                          style={{ borderBottom: "1px solid #1a1a1a" }}
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
          <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "#1a1a1a" }}>
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
          {sharedFilters}
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
                    style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                  >
                    <div
                      className="px-4 py-3 font-semibold text-sm text-white"
                      style={{ borderBottom: "1px solid #222222" }}
                    >
                      {sex === "MASCULINO" ? "Masculino" : "Feminino"} |{" "}
                      {AGE_GROUP_LABELS[ageGroup]?.split(" (")[0] || ageGroup} |{" "}
                      {BELT_LABELS[belt] || belt}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Nome</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Peso</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280] uppercase">Equipe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regs.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                            <td className="px-4 py-2 text-white">{r.athlete?.user.name ?? r.guestName ?? "—"}</td>
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
                { label: "Total", value: brackets.length, color: "#ffffff" },
                { label: "Pendente", value: brackets.filter(b => b.status === "PENDENTE" || b.status === "DESIGNADA").length, color: "#6b7280" },
                { label: "Em Andamento", value: brackets.filter(b => b.status === "EM_ANDAMENTO").length, color: "#fbbf24" },
                { label: "Finalizada", value: brackets.filter(b => b.status === "FINALIZADA").length, color: "#4ade80" },
                { label: "Premiada", value: brackets.filter(b => b.status === "PREMIADA").length, color: "#a78bfa" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border px-4 py-2"
                  style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                >
                  <p className="text-xs text-[#6b7280]">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {sharedFilters}
          <div className="flex gap-2">
            <Button onClick={loadChaves}>
              <Search className="h-4 w-4 mr-2" />
              Pesquisar
            </Button>
            <Button variant="outline" onClick={() => {
              setFilterNome(""); setFilterSexo(""); setFilterCategoria(""); setFilterFaixa(""); setFilterPesoId(""); setFilterEquipeId("")
            }}>
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
                  PENDENTE: { bg: "#1a1a1a", text: "#6b7280" },
                  DESIGNADA: { bg: "#1e3a5f40", text: "#60a5fa" },
                  EM_ANDAMENTO: { bg: "#78350f40", text: "#fbbf24" },
                  FINALIZADA: { bg: "#14532d40", text: "#4ade80" },
                  PREMIADA: { bg: "#4a1d9640", text: "#a78bfa" },
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
                    const groupLabel = getBracketLabel(bracket)
                    const totalAthletes = group.reduce((s, b) => s + b.positions.length, 0)
                    rendered.push(
                      <div key={bracket.bracketGroupId} className="rounded-lg border overflow-hidden" style={{ backgroundColor: "#111111", borderColor: "#f59e0b50" }}>
                        <div className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: "1px solid #1a1a1a", backgroundColor: "#1a1000" }}>
                          <span className="text-xs font-bold text-[#f59e0b]">GRUPO</span>
                          <span className="text-sm font-medium text-white flex-1 min-w-0 truncate">{groupLabel}</span>
                          <span className="text-xs text-[#6b7280] shrink-0">{totalAthletes} atleta(s) no total</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "#1a1a1a" }}>
                          {group.map((b) => {
                            const sc = statusColors[b.status] || statusColors.PENDENTE
                            return (
                              <div key={b.id}>
                                <div className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: "1px solid #111" }}>
                                  <span className="text-xs font-bold text-[#6b7280]">Sub-chave #{b.bracketNumber}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>{b.status}</span>
                                  <span className="text-xs text-[#6b7280] shrink-0">{b.positions.length} atleta(s)</span>
                                  <select
                                    className="text-xs rounded border px-2 py-1 shrink-0 ml-auto"
                                    style={{ backgroundColor: "#1a1a1a", borderColor: "#333", color: "#fff" }}
                                    value={b.tatameId || ""}
                                    onChange={(e) => atribuirTatame(b.id, e.target.value || null)}
                                  >
                                    <option value="">Sem tatame</option>
                                    {tatames.map((t) => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <BracketView bracket={b} onAthleteClick={(registrationId) => setGerenciarId(registrationId)} />
                              </div>
                            )
                          })}
                          {grandFinal && (() => {
                            const sc = statusColors[grandFinal.status] || statusColors.PENDENTE
                            return (
                              <div>
                                <div className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: "1px solid #111", backgroundColor: "#0d0a00" }}>
                                  <span className="text-xs font-bold text-[#fbbf24]">🏆 Grande Final #{grandFinal.bracketNumber}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>{grandFinal.status}</span>
                                  <span className="text-xs text-[#6b7280] shrink-0">{grandFinal.positions.length} atleta(s)</span>
                                  <select
                                    className="text-xs rounded border px-2 py-1 shrink-0 ml-auto"
                                    style={{ backgroundColor: "#1a1a1a", borderColor: "#333", color: "#fff" }}
                                    value={grandFinal.tatameId || ""}
                                    onChange={(e) => atribuirTatame(grandFinal.id, e.target.value || null)}
                                  >
                                    <option value="">Sem tatame</option>
                                    {tatames.map((t) => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <BracketView bracket={grandFinal} onAthleteClick={(registrationId) => setGerenciarId(registrationId)} />
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  } else if (!bracket.bracketGroupId) {
                    const catLabel = getBracketLabel(bracket)
                    const sc = statusColors[bracket.status] || statusColors.PENDENTE
                    rendered.push(
                      <div key={bracket.id} className="rounded-lg border overflow-hidden" style={{ backgroundColor: "#111111", borderColor: "#222222" }}>
                        <div className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderBottom: "1px solid #1a1a1a" }}>
                          <span className="text-xs font-bold text-[#6b7280]">#{bracket.bracketNumber}</span>
                          <span className="text-sm font-medium text-white flex-1 min-w-0 truncate">{catLabel}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {bracket.status}
                          </span>
                          <span className="text-xs text-[#6b7280] shrink-0">{bracket.positions.length} atleta(s)</span>
                          <select
                            className="text-xs rounded border px-2 py-1 shrink-0"
                            style={{ backgroundColor: "#1a1a1a", borderColor: "#333", color: "#fff" }}
                            value={bracket.tatameId || ""}
                            onChange={(e) => atribuirTatame(bracket.id, e.target.value || null)}
                          >
                            <option value="">Sem tatame</option>
                            {tatames.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <BracketView bracket={bracket} onAthleteClick={(registrationId) => setGerenciarId(registrationId)} />
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
          {sharedFilters}
          <Button onClick={loadResultado}>
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
                        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                      >
                        <div
                          className="px-4 py-3 font-semibold text-sm text-white"
                          style={{ borderBottom: "1px solid #222222" }}
                        >
                          {wc
                            ? `${wc.sex === "MASCULINO" ? "Masculino" : "Feminino"} | ${AGE_GROUP_LABELS[wc.ageGroup]?.split(" (")[0] || wc.ageGroup} | ${wc.name}`
                            : "Categoria"}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
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
                                <tr key={r.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                                  <td className="px-4 py-2 text-[#6b7280]">{idx + 1}</td>
                                  <td className="px-4 py-2 text-white text-xs">{r.athlete?.user.name ?? r.guestName ?? "—"}</td>
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
                { label: "Total", value: brackets.length, color: "#ffffff" },
                { label: "Pendente", value: brackets.filter(b => b.status === "PENDENTE" || b.status === "DESIGNADA").length, color: "#6b7280" },
                { label: "Em Andamento", value: brackets.filter(b => b.status === "EM_ANDAMENTO").length, color: "#fbbf24" },
                { label: "Finalizada", value: brackets.filter(b => b.status === "FINALIZADA").length, color: "#4ade80" },
                { label: "Premiada", value: brackets.filter(b => b.status === "PREMIADA").length, color: "#a78bfa" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border px-4 py-2"
                  style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                >
                  <p className="text-xs text-[#6b7280]">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tatame cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex-1">Tatames</h3>
              {tatamesLoading && <span className="text-xs text-[#6b7280]">Carregando...</span>}
              <div className="flex gap-2">
                <Input
                  placeholder="Nome (ex: Tatame 1)"
                  value={novoTatameNome}
                  onChange={(e) => setNovoTatameNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") criarTatame() }}
                  className="w-48"
                />
                <Button size="sm" onClick={criarTatame} disabled={novoTatameSaving || !novoTatameNome.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {novoTatameSaving ? "Criando..." : "Adicionar"}
                </Button>
              </div>
            </div>

            {tatames.length === 0 ? (
              <p className="text-sm text-[#6b7280] py-4">Nenhum tatame criado. Adicione tatames para ativar o controle ao vivo.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tatames.map((tatame) => {
                  const operador = tatame.operations[0]
                  return (
                    <div
                      key={tatame.id}
                      className="rounded-lg border p-4 space-y-3"
                      style={{ borderColor: tatame.isActive ? "#16a34a40" : "#333", backgroundColor: tatame.isActive ? "#0d1f0d" : "#111" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{tatame.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: tatame.isActive ? "#14532d40" : "#1a1a1a", color: tatame.isActive ? "#4ade80" : "#6b7280" }}
                        >
                          {tatame.isActive ? "ATIVO" : "INATIVO"}
                        </span>
                      </div>
                      <div className="text-xs text-[#6b7280] space-y-1">
                        <p>PIN: <span className="font-mono text-[#fbbf24] font-bold tracking-widest text-sm">{tatame.pin}</span></p>
                        <p>Chaves atribuídas: {tatame.brackets.length}</p>
                        {operador && (
                          <p className="text-[#4ade80]">
                            Operando: {operador.user.name.split(" ")[0]} desde{" "}
                            {new Date(operador.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => toggleTatameAtivo(tatame.id, !tatame.isActive)}>
                          {tatame.isActive ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-[#dc2626]" onClick={() => excluirTatame(tatame.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Link Coordenador de Premiação */}
          <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "#4a1d9640", backgroundColor: "#0d0d1a" }}>
            <div className="flex items-center gap-2">
              <span className="text-[#a78bfa] text-sm font-bold uppercase tracking-wider">🏆 Coordenador de Premiação</span>
            </div>
            <p className="text-xs text-[#6b7280]">Compartilhe o link abaixo com o coordenador responsável pela entrega de medalhas.</p>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "#333", backgroundColor: "#111" }}>
              <span className="text-xs text-[#9ca3af] flex-1 truncate font-mono">{typeof window !== "undefined" ? `${window.location.origin}/premiacao/${id}` : `/premiacao/${id}`}</span>
              <button
                className="text-xs text-[#a78bfa] hover:text-white font-semibold shrink-0 transition-colors"
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/premiacao/${id}`)}
              >
                Copiar
              </button>
            </div>
            <a
              href={`/premiacao/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-[#a78bfa] underline hover:text-white"
            >
              Abrir página de premiação →
            </a>
          </div>

          {/* Bracket assignment list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Chaves Geradas</h3>
            <div className="space-y-3">
              {sharedFilters}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTatamesApplied({ nome: filterNome, sexo: filterSexo, categoria: filterCategoria, faixa: filterFaixa, pesoId: filterPesoId, equipeId: filterEquipeId })}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Pesquisar
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setFilterNome(""); setFilterSexo(""); setFilterCategoria(""); setFilterFaixa(""); setFilterPesoId(""); setFilterEquipeId("")
                  setTatamesApplied({ nome: "", sexo: "", categoria: "", faixa: "", pesoId: "", equipeId: "" })
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
                PENDENTE:     { bg: "#1a1a1a",   text: "#6b7280" },
                DESIGNADA:    { bg: "#1e3a5f40", text: "#60a5fa" },
                EM_ANDAMENTO: { bg: "#78350f40", text: "#fbbf24" },
                FINALIZADA:   { bg: "#14532d40", text: "#4ade80" },
                PREMIADA:     { bg: "#4a1d9640", text: "#a78bfa" },
              }

              const renderRow = (bracket: typeof tatamesFilteredBrackets[0], idx: number, list: typeof tatamesFilteredBrackets) => {
                const catLabel = [
                  bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
                  AGE_GROUP_LABELS[bracket.weightCategory.ageGroup]?.split(" (")[0] || bracket.weightCategory.ageGroup,
                  BELT_LABELS[bracket.belt] || bracket.belt,
                  bracket.isAbsolute ? "Absoluto" : bracket.weightCategory.name,
                  bracket.isAbsolute ? null : `Até ${bracket.weightCategory.maxWeight}kg`,
                  `Chave: ${bracket.bracketNumber}`,
                ].filter(Boolean).join(" | ")
                const sc = statusColors[bracket.status] || statusColors.PENDENTE
                return (
                  <div
                    key={bracket.id}
                    className="flex items-center gap-3 px-4 py-3 flex-wrap"
                    style={{ borderBottom: idx < list.length - 1 ? "1px solid #1a1a1a" : "none", backgroundColor: "#111" }}
                  >
                    <button
                      className="text-sm font-medium text-white flex-1 min-w-0 truncate text-left hover:text-red-400 transition-colors cursor-pointer"
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
                      style={{ backgroundColor: "#1a1a1a", borderColor: "#333", color: "#fff" }}
                      value={bracket.tatameId || ""}
                      onChange={(e) => atribuirTatame(bracket.id, e.target.value || null)}
                    >
                      <option value="">Sem tatame</option>
                      {tatames.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )
              }

              return (
                <div className="space-y-4">
                  {pendentes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#fbbf24" }}>Pendentes</span>
                        <span className="text-xs text-[#6b7280]">({pendentes.length})</span>
                      </div>
                      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#222" }}>
                        {pendentes.map((b, i) => renderRow(b, i, pendentes))}
                      </div>
                    </div>
                  )}
                  {finalizadas.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4ade80" }}>Finalizadas</span>
                        <span className="text-xs text-[#6b7280]">({finalizadas.length})</span>
                      </div>
                      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#222" }}>
                        {finalizadas.map((b, i) => renderRow(b, i, finalizadas))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

            {/* Modal de visualização de chave */}
      {selectedBracketId && (() => {
        const bracket = brackets.find(b => b.id === selectedBracketId)
        if (!bracket) return null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setSelectedBracketId(null)}
          >
            <div
              className="relative rounded-lg border w-full max-w-3xl max-h-[85vh] overflow-auto"
              style={{ backgroundColor: "#111", borderColor: "#333" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#222" }}>
                <span className="text-sm font-semibold text-white">
                  {[
                    bracket.weightCategory.sex === "MASCULINO" ? "Masculino" : "Feminino",
                    AGE_GROUP_LABELS[bracket.weightCategory.ageGroup]?.split(" (")[0] || bracket.weightCategory.ageGroup,
                    BELT_LABELS[bracket.belt] || bracket.belt,
                    bracket.isAbsolute ? "Absoluto" : bracket.weightCategory.name,
                    bracket.isAbsolute ? null : `Até ${bracket.weightCategory.maxWeight}kg`,
                    `Chave: ${bracket.bracketNumber}`,
                  ].filter(Boolean).join(" | ")}
                </span>
                <button
                  className="text-[#6b7280] hover:text-white transition-colors text-lg leading-none"
                  onClick={() => setSelectedBracketId(null)}
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-auto">
                <BracketView bracket={bracket} onAthleteClick={(registrationId) => {
                  setGerenciarId(registrationId)
                }} />
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
