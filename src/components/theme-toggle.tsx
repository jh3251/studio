"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="relative h-8 w-14 rounded-full bg-secondary"
      aria-label="Toggle theme"
    >
      <Sun className="absolute left-1.5 h-[1.2rem] w-[1.2rem] transform text-yellow-500 transition-transform duration-500 ease-in-out dark:-translate-x-8" />
      <Moon className="absolute right-1.5 h-[1.2rem] w-[1.2rem] transform text-slate-400 transition-transform duration-500 ease-in-out dark:translate-x-0 translate-x-8" />
      <span
        className="absolute left-1 h-6 w-6 rounded-full bg-background shadow-md transform transition-transform duration-500 ease-in-out dark:translate-x-6"
      />
    </Button>
  )
}
