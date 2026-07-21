"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, ExternalLink, Plus, X } from "lucide-react"
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
  getMitreTechniqueLabel,
  getMitreTechniqueUrl,
  mitreTechniques,
  searchMitreTechniques,
  type MitreTechnique,
} from "@/lib/mitre-attack"
import type { MitreTechniqueReference } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MitreTechniquePickerProps {
  techniques: MitreTechniqueReference[]
  onChange: (techniques: MitreTechniqueReference[]) => void
}

export function MitreTechniquePicker({ techniques, onChange }: MitreTechniquePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const selectedIds = useMemo(
    () => new Set(techniques.map((technique) => technique.id)),
    [techniques],
  )
  const results = useMemo(() => searchMitreTechniques(query), [query])

  const selectTechnique = (technique: MitreTechnique) => {
    if (editingIndex !== null) {
      const nextTechniques = [...techniques]
      nextTechniques[editingIndex] = { id: technique.id, name: technique.name }
      onChange(
        nextTechniques.filter(
          (candidate, index) =>
            nextTechniques.findIndex((item) => item.id === candidate.id) === index,
        ),
      )
    } else if (!selectedIds.has(technique.id)) {
      onChange([...techniques, { id: technique.id, name: technique.name }])
    }
    setOpen(false)
    setEditingIndex(null)
    setQuery("")
  }

  const removeTechnique = (id: string) => {
    onChange(techniques.filter((technique) => technique.id !== id))
  }

  return (
    <div className="mt-1 space-y-2">
      {techniques.length > 0 && (
        <div className="space-y-1.5">
          {techniques.map((technique, index) => {
            const url = getMitreTechniqueUrl(technique.id)
            return (
              <div
                key={technique.id}
                className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm text-gray-200 hover:text-white"
                  title="Change technique"
                  onClick={() => {
                    setEditingIndex(index)
                    setQuery("")
                    setOpen(true)
                  }}
                >
                    {getMitreTechniqueLabel(technique.id, technique.name)}
                </button>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${getMitreTechniqueLabel(technique.id, technique.name)} on MITRE ATT&CK`}
                    title="Open on MITRE ATT&CK"
                    className="shrink-0 text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${getMitreTechniqueLabel(technique.id, technique.name)}`}
                  className="h-6 w-6 shrink-0 p-0 text-gray-500 hover:bg-gray-700 hover:text-white"
                  onClick={() => removeTechnique(technique.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setQuery("")
            setEditingIndex(null)
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            onClick={() => setEditingIndex(null)}
            className={cn(
              "justify-between border-gray-700 bg-gray-800 px-3 font-normal text-white hover:bg-gray-700 hover:text-white",
              techniques.length > 0 ? "h-8 w-auto text-xs" : "w-full",
            )}
          >
            <span className="flex items-center truncate text-gray-400">
              {techniques.length > 0 ? (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add technique
                </>
              ) : (
                "Search by technique name or ID…"
              )}
            </span>
            {techniques.length === 0 && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(420px,calc(100vw-2rem))] overflow-hidden border-gray-700 bg-gray-900 p-0 text-gray-100 shadow-xl"
          align="start"
        >
          <Command
            shouldFilter={false}
            className="bg-gray-900 text-gray-100 [&_[cmdk-input-wrapper]]:border-gray-700 [&_[cmdk-input-wrapper]]:bg-gray-950/50 [&_[cmdk-input]]:text-gray-100 [&_[cmdk-input]]:placeholder:text-gray-500"
          >
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search techniques…"
              className="focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <CommandList>
              <CommandEmpty className="text-gray-400">No ATT&CK techniques found.</CommandEmpty>
              <CommandGroup
                heading={`Enterprise ATT&CK · ${mitreTechniques.length} techniques`}
                className="text-gray-200 [&_[cmdk-group-heading]]:text-gray-500"
              >
                {results.map((technique) => (
                  <CommandItem
                    key={technique.id}
                    value={technique.id}
                    onSelect={() => selectTechnique(technique)}
                    className="cursor-pointer items-start py-2.5 text-gray-200 data-[selected=true]:bg-blue-500/15 data-[selected=true]:text-white"
                  >
                    <Check
                      className={cn(
                        "mt-1 h-4 w-4",
                        selectedIds.has(technique.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div
                      className={cn(
                        "min-w-0 flex-1",
                        technique.isSubtechnique && "ml-1 border-l border-gray-700 pl-3",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-blue-400">{technique.id}</span>
                        {technique.isSubtechnique && (
                          <span className="shrink-0 rounded border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-blue-300/80">
                            Sub-technique
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 whitespace-normal text-sm font-medium leading-5 text-gray-100">
                        {technique.name}
                      </div>
                      {technique.isSubtechnique && technique.parentName ? (
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          Under {technique.parentId} — {technique.parentName}
                        </div>
                      ) : technique.tactics.length > 0 ? (
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          {technique.tactics.join(" · ")}
                        </div>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
