import { prisma } from "@/lib/db"
import { CalendarDays, Users, Trophy, TrendingUp } from "lucide-react"
import Link from "next/link"

async function getStats() {
  const [totalAthletes, totalEvents, upcomingEvents] = await Promise.all([
    prisma.athlete.count(),
    prisma.event.count({ where: { deletedAt: null } }),
    prisma.event.count({
      where: { deletedAt: null, date: { gte: new Date() }, isVisible: true },
    }),
  ])
  return { totalAthletes, totalEvents, upcomingEvents }
}

async function getRecentEvents() {
  return prisma.event.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { type: true },
  })
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  RASCUNHO:    { label: "Rascunho",    cls: "admin-badge admin-badge-gray" },
  ABERTO:      { label: "Aberto",      cls: "admin-badge admin-badge-green" },
  ENCERRADO:   { label: "Encerrado",   cls: "admin-badge admin-badge-amber" },
  EM_ANDAMENTO:{ label: "Em Andamento",cls: "admin-badge admin-badge-blue" },
  FINALIZADO:  { label: "Finalizado",  cls: "admin-badge admin-badge-gray" },
}

export default async function DashboardPage() {
  const stats = await getStats()
  const recentEvents = await getRecentEvents()

  const cards = [
    { label: "Total de Atletas",  value: stats.totalAthletes, icon: Users,        color: "#dc2626", link: "/admin/atletas" },
    { label: "Total de Eventos",  value: stats.totalEvents,   icon: CalendarDays, color: "#2563eb", link: "/admin/eventos" },
    { label: "Próximos Eventos",  value: stats.upcomingEvents,icon: Trophy,        color: "#fbbf24", link: "/admin/eventos" },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      <div className="admin-page-header" style={{ padding: 0, border: "none", marginBottom: 0 }}>
        <p className="admin-page-title">Dashboard</p>
        <p className="admin-page-subtitle">Visão geral do sistema FBJJMMA</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.link}
              className="admin-stat-card group hover:opacity-90 transition-opacity"
              style={{ borderLeftColor: card.color }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${card.color}18` }}>
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums" style={{ color: "var(--foreground)" }}>{card.value}</p>
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{card.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Eventos Recentes */}
      <div className="admin-card">
        <div className="admin-card-header">
          <span>Eventos Recentes</span>
          <Link href="/admin/eventos" className="text-xs font-semibold" style={{ color: "#dc2626" }}>
            Ver todos →
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <TrendingUp className="h-8 w-8" style={{ color: "var(--muted)" }} />
            <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum evento cadastrado ainda.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Status</th>
                <th>Visível</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => {
                const st = STATUS_CONFIG[event.status] ?? { label: event.status, cls: "admin-badge admin-badge-gray" }
                return (
                  <tr key={event.id}>
                    <td>
                      <Link href={`/admin/eventos/${event.id}`} className="font-semibold hover:text-[#dc2626] transition-colors">
                        {event.name}
                      </Link>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                        {event.city}, {event.state}
                      </p>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{event.type.name}</td>
                    <td className="tabular-nums" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      {new Date(event.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td><span className={st.cls}>{st.label}</span></td>
                    <td>
                      <span className={event.isVisible ? "admin-badge admin-badge-green" : "admin-badge admin-badge-gray"}>
                        {event.isVisible ? "Visível" : "Oculto"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
