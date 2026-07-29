const assert = require("node:assert/strict")
const test = require("node:test")
const {
  formatCompactLocalTimestamp,
  getCenteredParallelLaneCenters,
} = require("../lib/self-connection-runtime.mjs")

test("centers unequal parallel lane widths around the same visual axis", () => {
  const widths = [4, 2, 3]
  const centers = getCenteredParallelLaneCenters(widths)

  assert.deepEqual(centers, [-2.5, 0.5, 3])
  assert.equal(centers[0] - widths[0] / 2, -4.5)
  assert.equal(centers.at(-1) + widths.at(-1) / 2, 4.5)
  assert.equal(
    centers[0] + widths[0] / 2,
    centers[1] - widths[1] / 2,
  )
  assert.equal(
    centers[1] + widths[1] / 2,
    centers[2] - widths[2] / 2,
  )
})

test("keeps lane geometry independent from selection-only stroke emphasis", () => {
  const baseStrokeWidths = [3, 2, 4]
  const centers = getCenteredParallelLaneCenters(baseStrokeWidths)
  const selectedDrawingWidths = baseStrokeWidths.map(
    (strokeWidth) => strokeWidth + 2,
  )

  assert.equal(getCenteredParallelLaneCenters.length, 1)
  assert.deepEqual(
    getCenteredParallelLaneCenters(baseStrokeWidths),
    centers,
  )
  assert.notDeepEqual(selectedDrawingWidths, baseStrokeWidths)
})

test("round-trips a stored ISO timestamp into the browser's local calendar", () => {
  const localTime = new Date(2026, 2, 18, 8, 7, 0, 0)

  assert.equal(
    formatCompactLocalTimestamp(localTime.toISOString()),
    "18 Mar 08:07",
  )
})

test("applies local timezone rollover instead of copying UTC clock digits", () => {
  assert.equal(
    formatCompactLocalTimestamp("2026-03-18T23:30:00.000Z", {
      timeZone: "Europe/Copenhagen",
    }),
    "19 Mar 00:30",
  )
})

test("omits invalid or ambiguous timestamps safely", () => {
  assert.equal(formatCompactLocalTimestamp("not-a-timestamp"), null)
  assert.equal(
    formatCompactLocalTimestamp("2026-02-30T08:07:00.000Z"),
    null,
  )
  assert.equal(formatCompactLocalTimestamp("2026-03-18T08:07"), null)
  assert.equal(formatCompactLocalTimestamp(undefined), null)
})
