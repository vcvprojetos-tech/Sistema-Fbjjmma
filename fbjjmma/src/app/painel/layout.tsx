import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Painel de Chamadas — FBJJMMA",
  description: "Painel de chamadas ao vivo para atletas na área de pesagem",
  openGraph: {
    siteName: "FBJJMMA",
    title: "Painel de Chamadas — FBJJMMA",
    description: "Painel de chamadas ao vivo para atletas na área de pesagem",
    type: "website",
  },
}

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
