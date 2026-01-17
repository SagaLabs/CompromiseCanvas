"use client"

import { useMemo } from "react"
import { useTheme } from "next-themes"
import { Check, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const themeOptions = [
  { id: "dark", label: "Default Dark" },
  { id: "nord", label: "Nord" },
  { id: "sagalabs", label: "SagaLabs" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "solarized", label: "Solarized" },
  { id: "monokai", label: "Monokai" },
  { id: "dracula", label: "Dracula" },
]

export default function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const activeTheme = useMemo(() => theme ?? "nord", [theme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-300 hover:bg-gray-700"
          title="Theme"
          aria-label="Theme"
        >
          <Palette className="h-5 w-5" />
          <span className="sr-only">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {themeOptions.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => setTheme(option.id)}>
            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
              {activeTheme === option.id ? <Check className="h-4 w-4" /> : null}
            </span>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
