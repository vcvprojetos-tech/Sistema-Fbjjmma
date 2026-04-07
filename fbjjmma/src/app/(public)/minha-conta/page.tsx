"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { User, CalendarDays, FileText, CheckCircle, XCircle, Clock, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const AGE_GROUP_LABELS: Record<string, string> = {
  PRE_MIRIM: "Pré Mirim",
  MIRIM: "Mirim",
  INFANTIL_A: "Infantil A",
  INFANTIL_B: "Infantil B",
  INFANTO_JUVENIL_A: "Infanto Juvenil A",
  INFANTO_JUVENIL_B: "Infanto Juvenil B",
  JUVENIL: "Juvenil",
  ADULTO: "Adulto",
  MASTER_1: "Master 1",
  MASTER_2: "Master 2",
  MASTER_3: "Master 3",
  MASTER_4: "Master 4",
  MASTER_5: "Master 5",
  MASTER_6: "Master 6",
}

const BELT_LABELS: Record<string, string> = {
  BRANCA: "Branca",
  AMARELA_LARANJA_VERDE: "Amarela/Laranja/Verde",
  AZUL: "Azul",
  ROXA: "Roxa",
  MARROM: "Marrom",
  PRETA: "Preta",
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDENTE: <Clock className="h-4 w-4 text-[#fbbf24]" />,
  APROVADO: <CheckCircle className="h-4 w-4 text-[#4ade80]" />,
  CANCELADO: <XCircle className="h-4 w-4 text-[#f87171]" />,
}

const STATUS_VARIANT: Record<string, "default" | "success" | "destructive" | "secondary"> = {
  PENDENTE: "secondary",
  APROVADO: "success",
  CANCELADO: "destructive",
}

interface Registration {
  id: string
  status: string
  ageGroup: string
  belt: string
  isAbsolute: boolean
  paymentProof: string | null
  registeredAt: string
  observation: string | null
  medal: string | null
  event: {
    id: string
    name: string
    date: string
    city: string
    state: string
    status: string
    value: number
  }
  weightCategory: {
    name: string
    maxWeight: number
    ageGroup: string
    sex: string
  }
  team: { name: string } | null
}

interface AthleteData {
  id: string
  name: string
  cpf: string
  email: string
  phone: string | null
  athlete: {
    id: string
    sex: string
    belt: string
    weight: number
    birthDate: string
    professor: string | null
    street: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    isAffiliated: boolean
    team: { id: string; name: string } | null
    registrations: Registration[]
  } | null
}

type Tab = "inscricoes" | "perfil"

export default function MinhaContaPage() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()

  const [data, setData] = useState<AthleteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("inscricoes")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  // Profile edit state
  const [phone, setPhone] = useState("")
  const [professor, setProfessor] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zipCode, setZipCode] = useState("")

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/minha-conta")
      return
    }
    if (authStatus !== "authenticated") return

    fetch("/api/public/atleta")
      .then((r) => r.json())
      .then((d: AthleteData) => {
        setData(d)
        if (d.athlete) {
          setPhone(d.phone || "")
          setProfessor(d.athlete.professor || "")
          setStreet(d.athlete.street || "")
          setCity(d.athlete.city || "")
          setState(d.athlete.state || "")
          setZipCode(d.athlete.zipCode || "")
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authStatus, router])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    try {
      await fetch("/api/public/atleta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, professor, street, city, state, zipCode }),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadProof(registrationId: string, file: File) {
    setUploadingFor(registrationId)
    try {
      // For now, we'll just store the file name as proof (placeholder for real upload)
      // In production, this would upload to R2/S3 and return a URL
      const formData = new FormData()
      formData.append("file", file)
      formData.append("registrationId", registrationId)

      const res = await fetch("/api/public/inscricao/comprovante", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        // Refresh data
        const refreshed = await fetch("/api/public/atleta").then((r) => r.json())
        setData(refreshed)
      }
    } catch {
      // ignore
    } finally {
      setUploadingFor(null)
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#6b7280]">
        Carregando...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#6b7280]">
        Erro ao carregar dados. Tente novamente.
      </div>
    )
  }

  const athlete = data.athlete
  const registrations = athlete?.registrations || []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: "#dc2626" }}
        >
          {data.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{data.name}</h1>
          <p className="text-[#6b7280] text-sm">
            {athlete ? (
              <>
                {athlete.sex === "MASCULINO" ? "Masculino" : "Feminino"} •{" "}
                {BELT_LABELS[athlete.belt] || athlete.belt}
                {athlete.team && ` • ${athlete.team.name}`}
                {athlete.isAffiliated && (
                  <span className="ml-2 text-xs text-[#60a5fa]">Filiado</span>
                )}
              </>
            ) : (
              data.email
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "#222222" }}>
        {(
          [
            { key: "inscricoes", label: "Minhas Inscrições", icon: CalendarDays },
            { key: "perfil", label: "Perfil", icon: User },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor: activeTab === key ? "#dc2626" : "transparent",
              color: activeTab === key ? "#ffffff" : "#6b7280",
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Inscriptions Tab */}
      {activeTab === "inscricoes" && (
        <div className="space-y-4">
          {registrations.length === 0 ? (
            <div
              className="rounded-xl border p-12 text-center"
              style={{ backgroundColor: "#111111", borderColor: "#222222" }}
            >
              <FileText className="h-10 w-10 text-[#333333] mx-auto mb-3" />
              <p className="text-[#6b7280] mb-4">Você ainda não possui inscrições.</p>
              <Link href="/eventos">
                <Button>Ver Eventos Disponíveis</Button>
              </Link>
            </div>
          ) : (
            registrations.map((reg) => {
              const isPending = reg.status === "PENDENTE"
              return (
                <div
                  key={reg.id}
                  className="rounded-xl border p-5 space-y-4"
                  style={{ backgroundColor: "#111111", borderColor: "#222222" }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <Link
                        href={`/eventos/${reg.event.id}`}
                        className="text-white font-semibold hover:text-[#dc2626] transition-colors"
                      >
                        {reg.event.name}
                      </Link>
                      <p className="text-[#6b7280] text-xs mt-0.5">
                        {new Date(reg.event.date).toLocaleDateString("pt-BR")} •{" "}
                        {reg.event.city}, {reg.event.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {STATUS_ICONS[reg.status]}
                      <Badge variant={STATUS_VARIANT[reg.status] || "secondary"}>
                        {reg.status === "PENDENTE" ? "Aguardando pagamento" : reg.status === "APROVADO" ? "Aprovado" : "Cancelado"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      { label: "Categoria", value: AGE_GROUP_LABELS[reg.ageGroup] || reg.ageGroup },
                      { label: "Faixa", value: BELT_LABELS[reg.belt] || reg.belt },
                      { label: "Peso", value: `${reg.weightCategory.name} (${reg.weightCategory.maxWeight >= 999 ? "Acima" : `até ${reg.weightCategory.maxWeight}kg`})` },
                      { label: "Modalidade", value: reg.isAbsolute ? "Absoluto" : "Categoria" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-[#6b7280]">{item.label}</p>
                        <p className="text-[#9ca3af] font-medium mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {reg.medal && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#fbbf24]">🏆</span>
                      <span className="text-white font-medium">{reg.medal}</span>
                    </div>
                  )}

                  {reg.observation && (
                    <p className="text-xs text-[#fbbf24] bg-[#fbbf2410] rounded-lg px-3 py-2">
                      Obs: {reg.observation}
                    </p>
                  )}

                  {/* Payment proof upload */}
                  {isPending && (
                    <div
                      className="rounded-lg border p-4"
                      style={{ borderColor: "#333333", backgroundColor: "#0d0d0d" }}
                    >
                      <p className="text-xs text-[#9ca3af] mb-3">
                        {reg.paymentProof
                          ? "✅ Comprovante enviado. Aguardando confirmação."
                          : "📎 Envie o comprovante de pagamento para confirmar sua inscrição."}
                      </p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={uploadingFor === reg.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadProof(reg.id, file)
                          }}
                        />
                        <span
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors hover:bg-[#1a1a1a] cursor-pointer"
                          style={{ borderColor: "#333333", color: "#9ca3af" }}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingFor === reg.id ? "Enviando..." : "Enviar Comprovante"}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "perfil" && (
        <div className="space-y-4">
          {/* Read-only info */}
          <div
            className="rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: "#111111", borderColor: "#222222" }}
          >
            <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
              Dados Pessoais (somente leitura)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Nome", value: data.name },
                { label: "CPF", value: data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.$3-**") },
                { label: "E-mail", value: data.email },
                { label: "Sexo", value: athlete?.sex === "MASCULINO" ? "Masculino" : "Feminino" },
                { label: "Faixa", value: BELT_LABELS[athlete?.belt || ""] || "—" },
                { label: "Peso", value: athlete ? `${athlete.weight}kg` : "—" },
                { label: "Data de nascimento", value: athlete ? new Date(athlete.birthDate).toLocaleDateString("pt-BR") : "—" },
                { label: "Equipe", value: athlete?.team?.name || "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[#6b7280] text-xs">{item.label}</p>
                  <p className="text-[#9ca3af] mt-0.5">{item.value || "—"}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6b7280]">
              Para alterar dados pessoais, entre em contato com a federação.
            </p>
          </div>

          {/* Editable info */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: "#111111", borderColor: "#222222" }}
          >
            <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
              Informações Editáveis
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Celular</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="professor">Professor</Label>
                <Input
                  id="professor"
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  placeholder="Nome do professor"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="street">Endereço</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {saveSuccess && (
                <span className="text-sm text-[#4ade80] flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Salvo com sucesso!
                </span>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
