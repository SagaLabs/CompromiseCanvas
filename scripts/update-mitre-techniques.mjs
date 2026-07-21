import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const DEFAULT_SOURCE =
  "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json"
const OUTPUT_PATH = resolve("lib/data/mitre-enterprise-techniques.json")

const source = process.argv[2] || DEFAULT_SOURCE

async function loadBundle(location) {
  if (/^https?:\/\//.test(location)) {
    const response = await fetch(location)
    if (!response.ok) {
      throw new Error(`Unable to download ATT&CK data: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  return JSON.parse(await readFile(resolve(location), "utf8"))
}

function getMitreReference(object) {
  return object.external_references?.find(
    (reference) => reference.source_name === "mitre-attack" && reference.external_id,
  )
}

const bundle = await loadBundle(source)
const techniques = bundle.objects
  .filter(
    (object) =>
      object.type === "attack-pattern" &&
      !object.revoked &&
      !object.x_mitre_deprecated &&
      getMitreReference(object),
  )
  .map((object) => {
    const reference = getMitreReference(object)
    return {
      id: reference.external_id,
      name: object.name,
      tactics: [...new Set((object.kill_chain_phases || []).map((phase) => phase.phase_name))].sort(),
      isSubtechnique: Boolean(object.x_mitre_is_subtechnique),
      url: reference.url || `https://attack.mitre.org/techniques/${reference.external_id.replace(".", "/")}/`,
    }
  })
  .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }))

await mkdir(dirname(OUTPUT_PATH), { recursive: true })
await writeFile(OUTPUT_PATH, `${JSON.stringify(techniques, null, 2)}\n`)

console.log(`Wrote ${techniques.length} Enterprise ATT&CK techniques to ${OUTPUT_PATH}`)
