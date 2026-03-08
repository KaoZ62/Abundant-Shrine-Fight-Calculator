// src/solver/run/runSolverTest.js

import { Generations, Move } from "@smogon/calc"
import { RAW_WAVES, buildWaveIndex } from "../../waves.js"
import { createRunState } from "./runState.js"
import { simulateRunSolver, scoreRunState } from "./simulateRunSolver.js"

const gen = Generations.get(5)
const BOSS_RESOURCE_TYPES = new Set(["Fire", "Fighting", "Bug"])

function getMoveType(moveName) {
  try {
    const move = new Move(gen, moveName)
    return typeof move.type === "string" ? move.type : move.type?.name || null
  } catch {
    return null
  }
}

function collectBossResourcePP(roster) {
  const byType = { Fire: 0, Fighting: 0, Bug: 0 }
  const byMove = {}

  for (const pokemon of roster || []) {
    for (const move of pokemon.moves || []) {
      const type = getMoveType(move.name)
      if (!type || !BOSS_RESOURCE_TYPES.has(type)) continue

      byType[type] += (move.pp || 0)
      byMove[move.name] = (byMove[move.name] || 0) + (move.pp || 0)
    }
  }

  return { byType, byMove }
}

function summarizeRoster(roster) {
  return (roster || []).map(p => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    hp: p.hp,
    strengthCharm: Boolean(p.strengthCharm)
  }))
}

function main() {
  const waves = buildWaveIndex(RAW_WAVES)
  const initialRunState = createRunState({})

  // Keep beam width tunable for quick iteration.
  const beamWidth = Number(process.env.RUN_BEAM_WIDTH || 12)
  const result = simulateRunSolver(initialRunState, waves, { beamWidth })
  const finalRunState = result.finalRunState
  const finalScore = scoreRunState(finalRunState)
  const bossResourcePP = collectBossResourcePP(finalRunState.roster)

  console.log("=== Run Solver Test ===")
  console.log(`Beam Width: ${beamWidth}`)
  console.log(`Success: ${result.success}`)
  console.log(`Highest Cleared Wave: ${result.clearedWaves}`)
  console.log(`Final Score: ${finalScore}`)
  console.log(`Remaining Gold: ${finalRunState.gold}`)
  console.log("Boss Strategies:", finalRunState.bossStrategy)
  console.log("Boss Resource PP by Type:", bossResourcePP.byType)
  console.log("Boss Resource PP by Move:", bossResourcePP.byMove)
  console.log("Final Roster:", summarizeRoster(finalRunState.roster))
}

main()
