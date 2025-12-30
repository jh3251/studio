"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  const onCheckedChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-5 w-5" />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={onCheckedChange}
        aria-label="Toggle theme"
      />
      <Moon className="h-5 w-5 text-primary" />
    </div>
  )
}
