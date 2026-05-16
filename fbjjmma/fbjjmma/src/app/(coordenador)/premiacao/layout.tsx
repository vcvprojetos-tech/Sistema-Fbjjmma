import type { Metadata } from "next"

export const metadata: Metadata = {
  manifest: "/premiacao-manifest.webmanifest",
}

export default function PremiacaoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
