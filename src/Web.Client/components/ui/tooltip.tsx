"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

type OpenChangeDetails = Parameters<NonNullable<TooltipPrimitive.Root.Props["onOpenChange"]>>[1]

// Decides whether a request to open the tooltip should go through.
// - Touch and pen taps also fire hover events. Opening on those would leave the tooltip over the
//   control after a tap, with no hover to dismiss it, so only mouse hover opens it.
// - Focus that a pointer interaction caused (for example focus returned to the trigger after a
//   sheet closed) should not open it. Only keyboard focus (:focus-visible) does.
function allowsOpen(open: boolean, details: OpenChangeDetails): boolean {
  if (!open) {
    return true
  }
  if (details.reason === "trigger-hover") {
    const pointerType = (details.event as { pointerType?: string } | undefined)?.pointerType
    return pointerType === undefined || pointerType === "mouse"
  }
  if (details.reason === "trigger-focus") {
    const target = details.event?.target
    if (!(target instanceof HTMLElement)) {
      return true
    }
    try {
      return target.matches(":focus-visible")
    } catch {
      return true
    }
  }
  return true
}

function Tooltip({ onOpenChange, ...props }: TooltipPrimitive.Root.Props) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      {...props}
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!allowsOpen(nextOpen, details)) {
          return
        }
        setOpen(nextOpen)
        onOpenChange?.(nextOpen, details)
      }}
    />
  )
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 w-max max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipTrigger }
