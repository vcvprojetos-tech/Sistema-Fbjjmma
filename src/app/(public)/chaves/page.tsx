import { Suspense } from "react"
import ChavesClient from "./ChavesClient"

export default function ChavesPage() {
  return (
    <Suspense fallback={null}>
      <ChavesClient />
    </Suspense>
  )
}
