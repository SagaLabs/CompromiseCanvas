"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  getMitreTechnique,
  getMitreTechniqueLabel,
  getMitreTechniqueUrl,
  mitreTechniques,
  type MitreTechnique,
} from "@/lib/mitre-attack"
import { cn } from "@/lib/utils"

interface MitreTechniquePickerProps {
  id?: string
  name?: string
  onChange: (technique?: MitreTechnique) => void
}

const normalize = (value: string) => value.toLowerCase().trim()

function searchTechniques(query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return mitreTechniques.slice(0, 50)

  const terms = normalizedQuery.split(/\s+/)
  return mitreTechniques
    .filter((technique) => {
      const haystack = normalize(`${technique.id} ${technique.name} ${technique.tactics.join(" ")}`)
      return terms.every((term) => haystack.includes(term))
    })
    .sort((left, right) => {
      const leftId = normalize(left.id)
      const rightId = normalize(right.id)
      const leftName = normalize(left.name)
      const rightName = normalize(right.name)
      const leftRank = leftId.startsWith(normalizedQuery) ? 0 : leftName.startsWith(normalizedQuery) ? 1 : 2
      const rightRank = rightId.startsWith(normalizedQuery) ? 0 : rightName.startsWith(normalizedQuery) ? 1 : 2
      return leftRank - rightRank || left.id.localeCompare(right.id, undefined, { numeric: true })
    })
    .slice(0, 50)
}

export function MitreTechniquePicker({ id, name, onChange }: MitreTechniquePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedTechnique = getMitreTechnique(id)
  const selectedUrl = getMitreTechniqueUrl(id)
  const results = useMemo(() => searchTechniques(query), [query])

  const selectTechnique = (technique: MitreTechnique) => {
    onChange(technique)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="mt-1 space-y-2">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setQuery("")
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between border-gray-700 bg-gray-800 px-3 font-normal text-white hover:bg-gray-700 hover:text-white"
          >
            <span className={cn("truncate", !id && "text-gray-400")}>
              {id ? getMitreTechniqueLabel(id, name) : "Search by technique name or ID…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Try unsecured, credentials, or T1552…"
            />
            <CommandList>
              <CommandEmpty>No ATT&CK techniques found.</CommandEmpty>
              <CommandGroup heading={`Enterprise ATT&CK · ${mitreTechniques.length} techniques`}>
                {results.map((technique) => (
                  <CommandItem
                    key={technique.id}
                    value={technique.id}
                    onSelect={() => selectTechnique(technique)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        technique.id === selectedTechnique?.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="font-mono text-xs text-blue-400">{technique.id}</span>
                        <span className="ml-2">{technique.name}</span>
                      </div>
                      {technique.tactics.length > 0 && (
                        <div className="truncate text-xs text-muted-foreground">
                          {technique.tactics.join(" · ")}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {id && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {selectedUrl ? (
            <a
              href={selectedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1 truncate text-blue-400 hover:text-blue-300 hover:underline"
            >
              View on MITRE ATT&CK
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="truncate text-gray-400">Unknown ATT&CK technique</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-gray-400 hover:bg-gray-700 hover:text-white"
            onClick={() => onChange(undefined)}
          >
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
      )}
    </div>
  )
}
