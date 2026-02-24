import { abundantStats } from "./src/abundantStats.js"
import { Dex } from "@pkmn/dex"

const dex = Dex

const mismatches = []
const notFound = []

for (const [name, bs] of Object.entries(abundantStats)) {
  const species = dex.species.get(name)

  if (!species || !species.baseStats) {
    notFound.push(name)
    continue
  }

  const ref = species.baseStats
  const keys = ["hp", "atk", "def", "spa", "spd", "spe"]

  const diffs = keys
    .filter(k => Number(bs[k]) !== Number(ref[k]))
    .map(k => `${k}: yours=${bs[k]} ref=${ref[k]}`)

  if (diffs.length) mismatches.push({ name, diffs })
}

console.log("=== NOT FOUND ===")
console.log(notFound.length ? notFound.join(", ") : "none")

console.log("\n=== MISMATCHES ===")
if (!mismatches.length) {
  console.log("none ✅")
} else {
  for (const m of mismatches) {
    console.log(`- ${m.name} -> ${m.diffs.join(" | ")}`)
  }
  console.log(`\nTOTAL mismatches: ${mismatches.length}`)
}