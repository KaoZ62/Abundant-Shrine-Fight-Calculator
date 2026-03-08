// src/solver/run/targetRosterPlanner.js

import { pokemonData } from "../pokemonDataClean.js"
import { getSpeedInfo } from "../../calculator.js"
import { evaluatePokemonUtility, rankBossCounterCandidates } from "./pokemonEvaluation.js"

const STARTER_NAMES = new Set(["Terrakion", "Keldeo", "Virizion", "Cobalion"])

function buildPokemonCandidate(name, level = 50) {
  let speed = 100
  try {
    speed = getSpeedInfo({
      attackerName: name,
      defenderName: name,
      attackerLevel: level,
      defenderLevel: level,
      evEnabled: false
    }).attackerSpe || 100
  } catch {
    speed = 100
  }

  const moves = (pokemonData[name]?.moves || []).map(moveName => ({
    name: moveName,
    pp: 10,
    maxPP: 10
  }))

  return {
    name,
    level,
    speed,
    moves
  }
}

function uniquePushByName(list, name) {
  if (!name) return
  if (!list.includes(name)) list.push(name)
}

export function buildTargetRosterPlan(options = {}) {
  const level = options.level || 50
  const targetCount = options.targetCount || 6

  const candidates = Object.keys(pokemonData).map(name =>
    buildPokemonCandidate(name, level)
  )

  const bossCounterCandidates = rankBossCounterCandidates(candidates, { currentWave: 1 })
  const overallRanking = candidates
    .map(pokemon => ({
      pokemon,
      ...evaluatePokemonUtility(pokemon, { currentWave: 1 })
    }))
    .sort((a, b) => b.score - a.score)

  const targetRosterNames = []
  const targetBossCounterNames = []

  // Required boss counters: two best Fire-move/Medicham candidates.
  for (const entry of bossCounterCandidates.slice(0, 2)) {
    uniquePushByName(targetRosterNames, entry.pokemon.name)
    uniquePushByName(targetBossCounterNames, entry.pokemon.name)
  }

  // Add strong support candidates.
  const supportCandidates = overallRanking
    .filter(entry =>
      (entry.pokemon.moves || []).some(m =>
        m.name === "Helping Hand" || m.name === "Dragon's Blessing"
      )
    )
    .slice(0, 2)

  for (const entry of supportCandidates) {
    uniquePushByName(targetRosterNames, entry.pokemon.name)
  }

  // Fill remaining slots with strong general wave clearers.
  for (const entry of overallRanking) {
    if (targetRosterNames.length >= targetCount) break
    if (STARTER_NAMES.has(entry.pokemon.name)) continue
    uniquePushByName(targetRosterNames, entry.pokemon.name)
  }

  return {
    targetRosterNames,
    targetBossCounterNames,
    bossCounterCandidates,
    fireCandidates: bossCounterCandidates, // backward compatibility
    overallRanking
  }
}

