import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import EventoForm from "@/components/admin/EventoForm"
import { format } from "date-fns"

function toDatetimeLocal(date: Date | null): string {
  if (!date) return ""
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function toDateLocal(date: Date | null): string {
  if (!date) return ""
  return format(date, "yyyy-MM-dd")
}

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
  })

  if (!event) notFound()

  const initialData = {
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
    banner: event.banner || "",
    schedule: event.schedule || "",
    about: event.about || "",
    paymentInfo: event.paymentInfo || "",
    prize: event.prize || "",
    weighInInfo: event.weighInInfo || "",
    imageRights: event.imageRights || "",
    physicalIntegrity: event.physicalIntegrity || "",
  }

  return <EventoForm initialData={initialData} eventId={id} />
}
