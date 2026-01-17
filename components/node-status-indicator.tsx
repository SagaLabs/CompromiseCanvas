"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, Loader2, XCircle, Circle } from "lucide-react"
import { forwardRef } from "react"

const nodeStatusIndicatorVariants = cva(
  "relative inline-flex items-center justify-center",
  {
    variants: {
      variant: {
        border: "relative",
        overlay: "relative",
      },
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "border",
      size: "md",
    },
  }
)

const nodeStatusIndicatorIconVariants = cva(
  "h-full w-full",
  {
    variants: {
      variant: {
        border: "absolute inset-0",
        overlay: "absolute inset-0",
      },
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "border",
      size: "md",
    },
  }
)

export interface NodeStatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof nodeStatusIndicatorVariants> {
  status?: "success" | "loading" | "error" | "initial" | "selected"
  children?: React.ReactNode
}

const NodeStatusIndicator = forwardRef<HTMLDivElement, NodeStatusIndicatorProps>(
  ({ className, variant, size, status = "initial", children, ...props }, ref) => {
    const getStatusIcon = () => {
      switch (status) {
        case "success":
          return <CheckCircle2 className="h-full w-full text-green-500" />
        case "loading":
          return <Loader2 className="h-full w-full animate-spin text-blue-500" />
        case "error":
          return <XCircle className="h-full w-full text-red-500" />
        case "selected":
          return <Circle className="h-full w-full text-blue-400" />
        default:
          return null
      }
    }

    const getStatusAnimation = () => {
      switch (status) {
        case "loading":
          return "animate-spin"
        case "selected":
          return "animate-pulse"
        default:
          return ""
      }
    }

    const getStatusRing = () => {
      if (status === "selected") {
        return (
          <>
            {/* Animated border with custom animation */}
            <div className="absolute -inset-1 rounded-lg border-2 border-blue-400 animate-border-pulse" />
          </>
        )
      }
      return null
    }

    return (
      <div
        className={cn(nodeStatusIndicatorVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {children}
        {status !== "initial" && (
          <>
            {getStatusRing()}
            <div
              className={cn(
                nodeStatusIndicatorIconVariants({ variant, size }),
                getStatusAnimation()
              )}
            >
              {getStatusIcon()}
            </div>
          </>
        )}
      </div>
    )
  }
)

NodeStatusIndicator.displayName = "NodeStatusIndicator"

export { NodeStatusIndicator, nodeStatusIndicatorVariants } 