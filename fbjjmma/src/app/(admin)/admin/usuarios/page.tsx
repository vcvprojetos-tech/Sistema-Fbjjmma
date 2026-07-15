"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, UserCheck, UserX, RotateCcw, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface User {
  id: string
  name: string
  cpf: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE: "Presidente",
  COORDENADOR_GERAL: "Coordenador Geral",
  COORDENADOR_TATAME: "Coordenador de Tatame",
  ATLETA: "Atleta",
  CUSTOM: "Personalizado",
}

const ROLE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PRESIDENTE: { bg: "#92400e30", text: "#fbbf24", border: "#92400e60" },
  COORDENADOR_GERAL: { bg: "#1e3a5f30", text: "#60a5fa", border: "#1e3a5f60" },
  COORDENADOR_TATAME: { bg: "#4c1d9530", text: "#c084fc", border: "#4c1d9560" },
  ATLETA: { bg: "var(--card-alt)", text: "#9ca3af", border: "var(--border-alt)" },
  CUSTOM: { bg: "var(--card-alt)", text: "#9ca3af", border: "var(--border-alt)" },
}

function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11) return "***.***.***-**"
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

export default function UsuariosPage() {
  const [tab, setTab] = useState<"ativos" | "excluidos">("ativos")
  const [users, setUsers] = useState<User[]>([])
  const [deletedUsers, setDeletedUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    setLoading(true)
    try {
      const [activeRes, trashRes] = await Promise.all([
        fetch("/api/admin/usuarios"),
        fetch("/api/admin/usuarios?trash=1"),
      ])
      const activeData = await activeRes.json()
      const trashData = await trashRes.json()
      if (Array.isArray(activeData)) setUsers(activeData)
      if (Array.isArray(trashData)) setDeletedUsers(trashData)
    } catch {
      console.error("Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function handleToggleActive(user: User) {
    const action = user.isActive ? "desativar" : "ativar"
    if (!confirm(`Deseja ${action} este usuário?`)) return
    await fetch(`/api/admin/usuarios/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    loadUsers()
  }

  async function handleDelete(id: string) {
    if (!confirm("Mover este usuário para a lixeira?")) return
    await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" })
    loadUsers()
  }

  async function handleRestore(id: string) {
    await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    })
    loadUsers()
  }

  async function handleDeletePermanent(user: User) {
    if (!confirm(`Excluir PERMANENTEMENTE o usuário "${user.name}"?\n\nEssa ação não pode ser desfeita.`)) return
    await fetch(`/api/admin/usuarios/${user.id}?permanent=1`, { method: "DELETE" })
    loadUsers()
  }

  const currentList = tab === "ativos" ? users : deletedUsers

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Gerencie os usuários administrativos da federação
          </p>
        </div>
        <Link href="/admin/usuarios/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </Link>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setTab("ativos")}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: tab === "ativos" ? "#dc2626" : "var(--muted)",
            borderBottom: tab === "ativos" ? "2px solid #dc2626" : "2px solid transparent",
          }}
        >
          Usuários
          {users.length > 0 && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--card-alt)", color: "var(--muted)" }}>
              {users.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("excluidos")}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: tab === "excluidos" ? "#dc2626" : "var(--muted)",
            borderBottom: tab === "excluidos" ? "2px solid #dc2626" : "2px solid transparent",
          }}
        >
          Lixeira
          {deletedUsers.length > 0 && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#dc262620", color: "#dc2626" }}>
              {deletedUsers.length}
            </span>
          )}
        </button>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden md:table-cell">CPF</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider hidden sm:table-cell">E-mail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Perfil</th>
                {tab === "ativos" && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Ativo</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tab === "ativos" ? 7 : 6} className="px-4 py-10 text-center text-[#6b7280]">
                    Carregando...
                  </td>
                </tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={tab === "ativos" ? 7 : 6} className="px-4 py-10 text-center text-[#6b7280]">
                    {tab === "ativos" ? "Nenhum usuário encontrado." : "Lixeira vazia."}
                  </td>
                </tr>
              ) : (
                currentList.map((user, index) => {
                  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.CUSTOM
                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: "1px solid var(--card-alt)" }}
                      className="hover:bg-[var(--card-alt)] transition-colors"
                    >
                      <td className="px-4 py-3 text-[#6b7280]">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{user.name}</p>
                        {user.phone && (
                          <p className="text-xs text-[#6b7280]">{user.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af] hidden md:table-cell font-mono text-xs">
                        {maskCPF(user.cpf)}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af] hidden sm:table-cell text-xs">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.text,
                            borderColor: roleStyle.border,
                          }}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      {tab === "ativos" && (
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? "success" : "destructive"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {tab === "ativos" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={user.isActive ? "Desativar" : "Ativar"}
                                onClick={() => handleToggleActive(user)}
                              >
                                {user.isActive ? (
                                  <UserX className="h-3.5 w-3.5 text-[#d97706]" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5 text-green-400" />
                                )}
                              </Button>
                              <Link href={`/admin/usuarios/${user.id}/editar`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-[#dc2626]"
                                title="Mover para lixeira"
                                onClick={() => handleDelete(user.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Restaurar usuário"
                                onClick={() => handleRestore(user.id)}
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-green-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-[#dc2626]"
                                title="Excluir permanentemente"
                                onClick={() => handleDeletePermanent(user)}
                              >
                                <Flame className="h-3.5 w-3.5 text-[#dc2626]" />
                              </Button>
                            </>
                          )}
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
    </div>
  )
}
