import techniqueData from "@/lib/data/mitre-enterprise-techniques.json"

export interface MitreTechnique {
  id: string
  name: string
  tactics: string[]
  isSubtechnique: boolean
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
