"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface ThemeLogoProps {
  className?: string
  style?: React.CSSProperties
}

export function ThemeLogo({ className, style }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = !mounted || resolvedTheme === "dark"
  const src = isDark ? "/logo2.png" : "/logo-color.png"

  return (
    <img
      src={src}
      alt="FBJJMMA"
      className={className}
      style={{
        objectFit: "contain",
        transform: isDark ? "none" : "scale(3.5)",
        transformOrigin: "center",
        ...style,
      }}
    />
  )
}
