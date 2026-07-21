const assert = require("node:assert/strict")
const test = require("node:test")
const techniques = require("../lib/data/mitre-enterprise-techniques.json")

test("bundles a unique, active Enterprise ATT&CK catalog", () => {
  assert.ok(techniques.length > 600)
  assert.equal(new Set(techniques.map((technique) => technique.id)).size, techniques.length)

  for (const technique of techniques) {
    assert.match(technique.id, /^T\d{4}(?:\.\d{3})?$/)
    assert.ok(technique.name)
    assert.ok(technique.url.startsWith("https://attack.mitre.org/techniques/"))
  }
})

test("contains Unsecured Credentials and supports partial name and ID matching", () => {
  const search = (query) => {
    const normalizedQuery = query.toLowerCase()
    return techniques.filter((technique) =>
      `${technique.id} ${technique.name}`.toLowerCase().includes(normalizedQuery),
    )
  }

  const unsecured = techniques.find((technique) => technique.id === "T1552")
  assert.equal(unsecured?.name, "Unsecured Credentials")
  assert.ok(search("unsec").some((technique) => technique.id === "T1552"))
  assert.ok(search("t1552").some((technique) => technique.id === "T1552"))
})

test("records parent context for sub-techniques", () => {
  const privateKeys = techniques.find((technique) => technique.id === "T1552.004")
  assert.equal(privateKeys?.isSubtechnique, true)
  assert.equal(privateKeys?.parentId, "T1552")
  assert.equal(privateKeys?.parentName, "Unsecured Credentials")
})
