import { prisma } from "@/lib/db"
import { CalendarDays, Users, Trophy } from "lucide-react"

async function getStats() {
  const [totalAthletes, totalEvents, upcomingEvents] = await Promise.all([
    prisma.athlete.count(),
    prisma.event.count({ where: { deletedAt: null } }),
    prisma.event.count({
      where: {
        deletedAt: null,
        date: { gte: new Date() },
        isVisible: true,
      },
    }),
  ])
  return { totalAthletes, totalEvents, upcomingEvents }
}

async function getRecentEvents() {
  return prisma.event.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { type: true },
  })
}

export default async function DashboardPage() {
  const stats = await getStats()
  const recentEvents = await getRecentEvents()

  const cards = [
    {
      label: "Total de Atletas",
      value: stats.totalAthletes,
      icon: Users,
      color: "#dc2626",
    },
    {
      label: "Total de Eventos",
      value: stats.totalEvents,
      icon: CalendarDays,
      color: "#2563eb",
    },
    {
      label: "Próximos Eventos",
      value: stats.upcomingEvents,
      icon: Trophy,
      color: "#16a34a",
    },
  ]

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Visão geral do sistema FBJJMMA
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-lg border p-6 flex items-center gap-4"
              style={{ backgroundColor: "#111111", borderColor: "#222222" }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <Icon className="h-6 w-6" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{card.value}</p>
                <p className="text-sm text-[#6b7280]">{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Events */}
      <div
        className="rounded-lg border"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: "#222222" }}
        >
          <h2 className="text-base font-semibold text-white">
            Eventos Recentes
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: "#222222" }}>
          {recentEvents.length === 0 ? (
            <p className="px-6 py-8 text-center text-[#6b7280] text-sm">
              Nenhum evento cadastrado ainda.
            </p>
          ) : (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-white font-medium text-sm">{event.name}</p>
                  <p className="text-[#6b7280] text-xs mt-0.5">
                    {event.type.name} &bull;{" "}
                    {event.city}, {event.state} &bull;{" "}
                    {new Date(event.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: event.isVisible ? "#16a34a20" : "#6b728020",
                    color: event.isVisible ? "#4ade80" : "#9ca3af",
                  }}
                >
                  {event.isVisible ? "Visível" : "Oculto"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
