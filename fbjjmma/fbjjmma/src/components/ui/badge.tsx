"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#dc2626] text-white",
        secondary:
          "bg-[var(--card-alt)] text-[var(--foreground)] border border-[var(--border-alt)]",
        destructive:
          "bg-[#dc2626]/20 text-[#dc2626] border border-[#dc2626]/30",
        outline:
          "border border-[var(--border-alt)] text-[var(--foreground)]",
        success:
          "bg-green-900/30 text-green-400 border border-green-800",
        warning:
          "bg-yellow-900/30 text-yellow-400 border border-yellow-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
