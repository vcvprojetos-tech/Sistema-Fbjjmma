import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId: id },
    include: { weightCategory: true },
  })

  const totalInscricoes = registrations.length
  const pendentes = registrations.filter((r) => r.status === "PENDENTE").length
  const aprovados = registrations.filter((r) => r.status === "APROVADO").length
  const cancelados = registrations.filter((r) => r.status === "CANCELADO").length

  const ouro = registrations.filter((r) => r.medal === "OURO").length
  const prata = registrations.filter((r) => r.medal === "PRATA").length
  const bronze = registrations.filter((r) => r.medal === "BRONZE").length

  const brackets = await prisma.bracket.findMany({
    where: { eventId: id },
  })
  const totalChaves = brackets.length
  const normais = brackets.filter((b) => !b.isAbsolute).length
  const absolutas = brackets.filter((b) => b.isAbsolute).length

  const aprovadosReg = registrations.filter((r) => r.status === "APROVADO")
  const qtdAtletas = aprovadosReg.filter((r) => !r.isAbsolute).length
  const qtdAbsoluto = aprovadosReg.filter((r) => r.isAbsolute).length

  const cartao = aprovadosReg.filter((r) => r.paymentMethod === "CARTAO")
  const pix = aprovadosReg.filter((r) => r.paymentMethod === "PIX")
  const dinheiro = aprovadosReg.filter((r) => r.paymentMethod === "DINHEIRO")

  const calcValor = (regs: typeof aprovadosReg) =>
    regs.reduce((acc) => acc + event.value, 0)

  const valorTotalInscricoes = calcValor(
    aprovadosReg.filter((r) => !r.isAbsolute)
  )
  const valorTotalAbsoluto =
    aprovadosReg.filter((r) => r.isAbsolute).length * (event.absoluteValue || 0)
  const totalRecebido = valorTotalInscricoes + valorTotalAbsoluto

  return NextResponse.json({
    inscricoes: {
      total: totalInscricoes,
      pendente: pendentes,
      aprovado: aprovados,
      cancelado: cancelados,
    },
    medalhas: {
      total: ouro + prata + bronze,
      ouro,
      prata,
      bronze,
    },
    chaves: {
      total: totalChaves,
      normal: normais,
      absoluto: absolutas,
    },
    aprovadas: {
      qtdAtletas,
      qtdAbsoluto,
      valorTotalInscricoes,
      valorTotalAbsoluto,
      totalRecebido,
      cartao: cartao.length,
      pix: pix.length,
      dinheiro: dinheiro.length,
    },
  })
}
