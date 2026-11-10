"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  toggleLabel?: string
}

function PasswordInput({
  id,
  className,
  disabled,
  toggleLabel = "password",
  ...props
}: PasswordInputProps) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    <div data-slot="password-input" className="relative flex items-center">
      <Input
        {...props}
        id={id}
        type={revealed ? "text" : "password"}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn(className, "pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden")}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 text-muted-foreground before:absolute before:-inset-1.5 before:content-['']"
        aria-label={revealed ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
        aria-pressed={revealed}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  )
}

export { PasswordInput }
