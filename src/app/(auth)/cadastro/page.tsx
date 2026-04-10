"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ESTADOS_BR = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
]

const FAIXAS = [
  { value: "BRANCA", label: "Branca" },
  { value: "AMARELA_LARANJA_VERDE", label: "Amarela / Laranja / Verde" },
  { value: "AZUL", label: "Azul" },
  { value: "ROXA", label: "Roxa" },
  { value: "MARROM", label: "Marrom" },
  { value: "PRETA", label: "Preta" },
]

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

interface Team {
  id: string
  name: string
}

export default function CadastroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    email: "",
    confirmEmail: "",
    phone: "",
    sex: "",
    belt: "",
    weight: "",
    teamId: "",
    professor: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetch("/api/admin/equipes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTeams(data)
      })
      .catch(() => {})
  }, [])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (form.email !== form.confirmEmail) {
      setError("Os e-mails não conferem.")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não conferem.")
      return
    }
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          cpf: form.cpf.replace(/\D/g, ""),
          birthDate: form.birthDate,
          email: form.email,
          phone: form.phone.replace(/\D/g, ""),
          sex: form.sex,
          belt: form.belt,
          weight: parseFloat(form.weight),
          teamId: form.teamId || undefined,
          professor: form.professor,
          street: form.street,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          password: form.password,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao realizar cadastro.")
      } else {
        setSuccess(true)
        setTimeout(() => router.push("/login"), 2000)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div
          className="rounded-lg border p-8 text-center max-w-md w-full"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-white mb-2">Cadastro realizado!</h2>
          <p className="text-[#6b7280]">Redirecionando para o login...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 flex items-center justify-center mb-3"
            style={{
              clipPath:
                "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              backgroundColor: "#dc2626",
            }}
          >
            <span className="text-white font-black text-xs tracking-widest">
              FBJJMMA
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
          <p className="text-sm text-[#6b7280]">Federação Baiana de Jiu-Jitsu e MMA</p>
        </div>

        <div
          className="rounded-lg border p-8"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-4">
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={form.cpf}
                    onChange={(e) =>
                      handleChange("cpf", formatCpf(e.target.value))
                    }
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
                    onChange={(e) => handleChange("birthDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmEmail">Confirmar E-mail *</Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={form.confirmEmail}
                    onChange={(e) =>
                      handleChange("confirmEmail", e.target.value)
                    }
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Celular *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) =>
                      handleChange("phone", formatPhone(e.target.value))
                    }
                    placeholder="(71) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sex">Sexo *</Label>
                  <Select
                    value={form.sex}
                    onValueChange={(v) => handleChange("sex", v)}
                  >
                    <SelectTrigger id="sex">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASCULINO">Masculino</SelectItem>
                      <SelectItem value="FEMININO">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dados Esportivos */}
            <div>
              <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-4">
                Dados Esportivos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="belt">Faixa *</Label>
                  <Select
                    value={form.belt}
                    onValueChange={(v) => handleChange("belt", v)}
                  >
                    <SelectTrigger id="belt">
                      <SelectValue placeholder="Selecione a faixa" />
                    </SelectTrigger>
                    <SelectContent>
                      {FAIXAS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.weight}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    placeholder="70.0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamId">Equipe</Label>
                  <Select
                    value={form.teamId}
                    onValueChange={(v) => handleChange("teamId", v)}
                  >
                    <SelectTrigger id="teamId">
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                    <SelectContent>
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
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-4">
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="street">Rua / Logradouro</Label>
                  <Input
                    id="street"
                    value={form.street}
                    onChange={(e) => handleChange("street", e.target.value)}
                    placeholder="Rua, número, complemento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Salvador"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => handleChange("state", v)}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    value={form.zipCode}
                    onChange={(e) => handleChange("zipCode", e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>

            {/* Senha */}
            <div>
              <h3 className="text-sm font-semibold text-[#dc2626] uppercase tracking-wider mb-4">
                Senha de Acesso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    placeholder="Confirme sua senha"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#dc2626] text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#6b7280]">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="text-[#dc2626] hover:text-[#ef4444] font-medium transition-colors"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
