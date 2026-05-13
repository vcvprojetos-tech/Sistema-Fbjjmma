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
          "bg-[#991b1b] text-[#fca5a5]",
        outline:
          "border border-[var(--border-alt)] text-[var(--foreground)]",
        success:
          "bg-[#166534] text-[#86efac]",
        warning:
          "bg-[#92400e] text-[#fcd34d]",
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
