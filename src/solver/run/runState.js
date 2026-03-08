// src/solver/run/runState.js

import { createPokemonId, ensurePokemonId } from "../state/pokemonId.js"

export const MAX_WAVE = 36
export const GOLD_PER_WAVE = 9
export const MAX_ROSTER_SIZE = 16

const STARTER_NAMES = [
  "Terrakion",
  "Keldeo",
  "Virizion",
  "Cobalion"
]

export const CHARM_COSTS = {
  strength: 12,
  evolution: 16
}

function createStarterPokemon(name, level = 50) {
  return {
    id: createPokemonId(),
    name,
    level,
    hp: 100,
    maxHp: 100,
    alive: true,
    strengthCharm: true
  }
}

function normalizePokemonList(list) {
  const byId = new Map()
  for (const p of list || []) {
    if (!p?.name) continue
    const withId = ensurePokemonId(p)
    byId.set(withId.id, withId)
  }
  return [...byId.values()]
}

function clampRoster(roster) {
  return roster.slice(0, MAX_ROSTER_SIZE)
}

function normalizeBattleTeamIndices(battleTeam, rosterLength) {
  if (!Array.isArray(battleTeam)) return [0, 1, 2, 3]

  const asIndices = battleTeam.every(x => Number.isInteger(x))
    ? battleTeam
    : []

  const normalized = asIndices
    .filter(i => i >= 0 && i < rosterLength)
    .slice(0, 4)

  return normalized.length === 4 ? normalized : [0, 1, 2, 3].filter(i => i < rosterLength)
}

function materializeBattleTeam(roster, battleTeam) {
  return battleTeam.map(index => roster[index]).filter(Boolean)
}

export function createRunState({
  initialPlayerState,
  initialBattleTeam,
  initialRoster,
  initialAvailablePokemon,
  startWave = 1,
  startingGold = 0,
  starterLevel = 50
}) {
  const starterRoster = STARTER_NAMES.map(name =>
    createStarterPokemon(name, starterLevel)
  )

  const roster = clampRoster(
    normalizePokemonList(initialRoster || initialPlayerState || starterRoster)
  )

  const availablePokemon = normalizePokemonList(
    initialAvailablePokemon || []
  )

  const battleTeam = normalizeBattleTeamIndices(initialBattleTeam || [0, 1, 2, 3], roster.length)
  const playerState = materializeBattleTeam(roster, battleTeam)

  return {
    currentWave: startWave,
    lastClearedWave: startWave - 1,
    availablePokemon,
    roster,
    battleTeam,
    // Backward compatibility with existing solver modules.
    playerState,
    gold: startingGold,
    charms: {
      strength: 2,
      evolution: 2
    },
    bossStrategy: {
      firstBoss: null,   // "fire" | "medicham" | null
      secondBoss: null   // "fire" | "medicham" | null
    },
    targetRosterNames: [],
    targetBossCounterNames: [],
    success: false
  }
}

export function getWaveFormat(waveNumber) {
  if (waveNumber <= 12) return 2
  if (waveNumber <= 18) return 3
  return 4
}

export function canBuyCharm(runState, charmType) {
  const cost = CHARM_COSTS[charmType]
  return Number.isFinite(cost) && runState.gold >= cost
}

export function addAvailablePokemon(runState, pokemon) {
  if (!pokemon?.name) return runState

  const availablePokemon = normalizePokemonList([
    ...runState.availablePokemon,
    pokemon
  ])

  return {
    ...runState,
    availablePokemon
  }
}

export function addToRoster(runState, pokemonName) {
  if (!pokemonName) return runState
  if (runState.roster.length >= MAX_ROSTER_SIZE) return runState

  const candidate =
    runState.availablePokemon.find(p => p.id === pokemonName) ||
    runState.availablePokemon.find(p => p.name === pokemonName && !runState.roster.some(r => r.id === p.id))
  if (!candidate) return runState

  return {
    ...runState,
    roster: [...runState.roster, candidate]
  }
}

export function buyCharm(runState, charmType) {
  if (!canBuyCharm(runState, charmType)) return runState

  const cost = CHARM_COSTS[charmType]

  return {
    ...runState,
    gold: runState.gold - cost,
    charms: {
      ...runState.charms,
      [charmType]: (runState.charms[charmType] || 0) + 1
    }
  }
}

export function getBattleTeamState(runState) {
  return materializeBattleTeam(runState.roster, runState.battleTeam)
}

export function applyWaveResult(runState, { waveSuccess, nextPlayerState }) {
  const roster = [...runState.roster]
  const preWaveTeam = materializeBattleTeam(runState.roster, runState.battleTeam)
  const rosterIndexById = new Map()

  for (let i = 0; i < preWaveTeam.length; i++) {
    const pokemon = preWaveTeam[i]
    const rosterIndex = runState.battleTeam[i]
    if (pokemon?.id && Number.isInteger(rosterIndex)) {
      rosterIndexById.set(pokemon.id, rosterIndex)
    }
  }

  for (const updatedPokemon of nextPlayerState || []) {
    if (!updatedPokemon?.id) continue
    const rosterIndex = rosterIndexById.get(updatedPokemon.id)
    if (rosterIndex == null || !roster[rosterIndex]) continue
    roster[rosterIndex] = updatedPokemon
  }

  const updated = {
    ...runState,
    roster,
    playerState: materializeBattleTeam(roster, runState.battleTeam)
  }

  if (!waveSuccess) {
    return updated
  }

  const clearedWave = runState.currentWave
  const nextWave = clearedWave + 1

  return {
    ...updated,
    gold: runState.gold + GOLD_PER_WAVE,
    lastClearedWave: clearedWave,
    currentWave: nextWave,
    success: clearedWave >= MAX_WAVE
  }
}
