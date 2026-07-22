import techniqueData from "@/lib/data/mitre-enterprise-techniques.json"
import type { MitreTechniqueReference } from "@/lib/types"

export interface MitreTechnique {
  id: string
  name: string
  tactics: string[]
  isSubtechnique: boolean
  parentId?: string
  parentName?: string
  url: string
}

export const mitreTechniques = techniqueData as MitreTechnique[]

const techniquesById = new Map(
  mitreTechniques.map((technique) => [technique.id.toUpperCase(), technique]),
)

export function getMitreTechnique(id?: string) {
  if (!id) return undefined
  return techniquesById.get(id.trim().toUpperCase())
}

export function getMitreTechniqueUrl(id?: string) {
  const normalizedId = id?.trim().toUpperCase()
  if (!normalizedId || !/^T\d{4}(?:\.\d{3})?$/.test(normalizedId)) return undefined
  return (
    getMitreTechnique(normalizedId)?.url ||
    `https://attack.mitre.org/techniques/${normalizedId.replace(".", "/")}/`
  )
}

export function getMitreTechniqueLabel(id?: string, storedName?: string) {
  if (!id) return ""
  const technique = getMitreTechnique(id)
  const name = storedName || technique?.name
  return name ? `${id.toUpperCase()} — ${name}` : id.toUpperCase()
}

export function normalizeMitreTechniqueReferences(
  techniques?: MitreTechniqueReference[],
  legacyId?: string,
  legacyName?: string,
) {
  if (techniques?.length) return techniques
  if (!legacyId) return []

  return [
    {
      id: legacyId,
      name: legacyName || getMitreTechnique(legacyId)?.name || "",
    },
  ]
}

export function searchMitreTechniques(query: string, limit = 50) {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return mitreTechniques.slice(0, limit)

  const terms = normalizedQuery.split(/\s+/)
  const matching = mitreTechniques.filter((technique) => {
    const haystack = `${technique.id} ${technique.name} ${technique.parentName || ""} ${technique.tactics.join(" ")}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })

  const resultIds = new Set(matching.map((technique) => technique.id))
  matching.forEach((technique) => {
    if (technique.parentId) resultIds.add(technique.parentId)
  })

  return mitreTechniques
    .filter((technique) => resultIds.has(technique.id))
    .sort((left, right) => {
      const leftFamily = left.parentId || left.id
      const rightFamily = right.parentId || right.id
      return (
        leftFamily.localeCompare(rightFamily, undefined, { numeric: true }) ||
        Number(left.isSubtechnique) - Number(right.isSubtechnique) ||
        left.id.localeCompare(right.id, undefined, { numeric: true })
      )
    })
    .slice(0, limit)
}
