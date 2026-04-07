"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
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
import Link from "next/link"

interface Team {
  id: string
  name: string
}

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]

export default function NovoAtletaPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    email: "",
    password: "",
    phone: "",
    birthDate: "",
    sex: "",
    belt: "BRANCA",
    weight: "",
    teamId: "",
    professor: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    isAffiliated: false,
  })

  useEffect(() => {
    fetch("/api/admin/equipes")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTeams(d) })
  }, [])

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function formatCPF(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.name.trim() || !form.cpf || !form.email || !form.birthDate || !form.sex) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ""),
        phone: form.phone.replace(/\D/g, "") || undefined,
        teamId: form.teamId || undefined,
        weight: parseFloat(form.weight) || 0,
      }

      const res = await fetch("/api/admin/atletas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao criar atleta.")
      } else {
        router.push("/admin/atletas")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/atletas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Atleta</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Cadastre um novo atleta na federação</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dados Pessoais */}
        <section
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
            Dados Pessoais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nome completo do atleta"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={form.cpf}
                onChange={(e) => set("cpf", formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="atleta@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (padrão: CPF sem pontuação)</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Deixe em branco para usar o CPF"
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo *</Label>
              <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASCULINO">Masculino</SelectItem>
                  <SelectItem value="FEMININO">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Dados Esportivos */}
        <section
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
            Dados Esportivos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Faixa</Label>
              <Select value={form.belt} onValueChange={(v) => set("belt", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRANCA">Branca</SelectItem>
                  <SelectItem value="AMARELA_LARANJA_VERDE">Amarela/Laranja/Verde</SelectItem>
                  <SelectItem value="AZUL">Azul</SelectItem>
                  <SelectItem value="ROXA">Roxa</SelectItem>
                  <SelectItem value="MARROM">Marrom</SelectItem>
                  <SelectItem value="PRETA">Preta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="Ex.: 75.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={form.teamId} onValueChange={(v) => set("teamId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
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
                onChange={(e) => set("professor", e.target.value)}
                placeholder="Nome do professor"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="isAffiliated"
                checked={form.isAffiliated}
                onCheckedChange={(v) => set("isAffiliated", Boolean(v))}
              />
              <Label htmlFor="isAffiliated" className="cursor-pointer">
                Atleta Filiado
              </Label>
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section
          className="rounded-lg border p-6 space-y-4"
          style={{ backgroundColor: "#111111", borderColor: "#222222" }}
        >
          <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider">
            Endereço
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="street">Rua / Endereço</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={form.zipCode}
                onChange={(e) => set("zipCode", e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="text-sm text-[#dc2626] px-1">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/admin/atletas">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Atleta"}
          </Button>
        </div>
      </form>
    </div>
  )
}
