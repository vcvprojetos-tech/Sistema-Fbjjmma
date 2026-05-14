"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react"
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

const ROLE_CLS: Record<string, string> = {
  PRESIDENTE: "admin-badge admin-badge-amber",
  COORDENADOR_GERAL: "admin-badge admin-badge-blue",
  COORDENADOR_TATAME: "admin-badge admin-badge-purple",
  ATLETA: "admin-badge admin-badge-gray",
  CUSTOM: "admin-badge admin-badge-gray",
}

function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11) return "***.***.***-**"
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios")
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch {
      console.error("Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

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
    if (!confirm("Desativar este usuário?")) return
    await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" })
    loadUsers()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="admin-page-title">Usuários</p>
          <p className="admin-page-subtitle">Gerencie os usuários administrativos da federação</p>
        </div>
        <Link href="/admin/usuarios/novo">
          <button className="admin-btn admin-btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Novo Usuário
          </button>
        </Link>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Nome</th>
                <th className="hidden md:table-cell">CPF</th>
                <th className="hidden sm:table-cell">E-mail</th>
                <th>Perfil</th>
                <th>Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td style={{ color: "var(--muted)" }}>{index + 1}</td>
                    <td>
                      <p className="font-semibold" style={{ color: "var(--foreground)" }}>{user.name}</p>
                      {user.phone && (
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{user.phone}</p>
                      )}
                    </td>
                    <td className="hidden md:table-cell font-mono" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      {maskCPF(user.cpf)}
                    </td>
                    <td className="hidden sm:table-cell" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      {user.email}
                    </td>
                    <td>
                      <span className={ROLE_CLS[user.role] || "admin-badge admin-badge-gray"}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <span className={user.isActive ? "admin-badge admin-badge-green" : "admin-badge admin-badge-red"}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center"
                          title={user.isActive ? "Desativar" : "Ativar"}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? (
                            <UserX size={14} color="#d97706" />
                          ) : (
                            <UserCheck size={14} color="#16a34a" />
                          )}
                        </button>
                        <Link href={`/admin/usuarios/${user.id}/editar`}>
                          <button className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center" title="Editar">
                            <Pencil size={14} color="#3b82f6" />
                          </button>
                        </Link>
                        <button
                          className="admin-btn admin-btn-ghost h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => handleDelete(user.id)}
                          title="Excluir"
                        >
                          <Trash2 size={14} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
