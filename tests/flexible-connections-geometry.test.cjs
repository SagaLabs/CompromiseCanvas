const test = require("node:test")
const assert = require("node:assert/strict")
const { getSmoothStepPath, Position } = require("reactflow")

test("all handle pairings produce finite paths across extreme routes", () => {
  const positions = [Position.Top, Position.Right, Position.Bottom, Position.Left]
  const coordinates = [-10000, -1000, -1, 0, 1, 1000, 10000]
  let cases = 0

  for (const sourcePosition of positions) {
    for (const targetPosition of positions) {
      for (const sourceX of coordinates) {
        for (const sourceY of [-1000, 0, 1000]) {
          for (const targetX of [-1000, 0, 1000]) {
            for (const targetY of coordinates) {
              for (const offset of [-5000, 0, 5000]) {
                const result = getSmoothStepPath({
                  sourceX,
                  sourceY,
                  targetX,
                  targetY,
                  sourcePosition,
                  targetPosition,
                  centerX: (sourceX + targetX) / 2 + offset,
                  centerY: (sourceY + targetY) / 2 - offset,
                  borderRadius: 50,
                })

                assert.equal(typeof result[0], "string")
                assert.equal(result[0].startsWith("M"), true)
                assert.equal(result.slice(1).every(Number.isFinite), true)
                cases += 1
              }
            }
          }
        }
      }
    }
  }

  assert.equal(cases, 21168)
})
