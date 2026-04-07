"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
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
import Link from "next/link"

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    email: "",
    password: "",
    phone: "",
    role: "COORDENADOR_GERAL",
  })

  function set(field: string, value: string) {
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

    if (!form.name.trim() || !form.cpf || !form.email || !form.password) {
      setError("Nome, CPF, e-mail e senha são obrigatórios.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cpf: form.cpf.replace(/\D/g, ""),
          phone: form.phone.replace(/\D/g, "") || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao criar usuário.")
      } else {
        router.push("/admin/usuarios")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/usuarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Usuário</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Cadastre um novo usuário administrativo</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border p-6 space-y-4"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nome completo"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="phone">Celular</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="usuario@email.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Perfil *</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRESIDENTE">Presidente</SelectItem>
              <SelectItem value="COORDENADOR_GERAL">Coordenador Geral</SelectItem>
              <SelectItem value="COORDENADOR_TATAME">Coordenador de Tatame</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/usuarios">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
