// src/solver/run/constraints.js

import { Generations, Move } from "@smogon/calc"
import { MAX_WAVE, getBattleTeamState } from "./runState.js"

const gen = Generations.get(5)
const BOSS_WAVES = new Set([12, 18, 24, 30, 36])
const BOSS_WEAK_TYPES = ["Fire", "Fighting", "Bug"]
const LEGENDARY_STARTERS = new Set(["Terrakion", "Keldeo", "Virizion", "Cobalion"])
const BOSS_ADVANTAGE_ABILITIES = new Set(["Contrary", "Defiant", "Competitive", "Justified"])

const REQUIRED_POKEMON = ["Serperior", "Spinda"]
const UNEVOLVED_BASE_FORMS = new Set([
  "Charmander",
  "Vulpix",
  "Growlithe",
  "Cyndaquil",
  "Torchic",
  "Tepig",
  "Ponyta",
  "Pansear",
  "Darumaka",
  "Houndour",
  "Chimchar",
  "Meditite"
])

function isFireMove(moveName) {
  try {
    const move = new Move(gen, moveName)
    return move.type === "Fire"
  } catch {
    return false
  }
}

function getMoveType(moveName) {
  try {
    const move = new Move(gen, moveName)
    const moveType = typeof move.type === "string" ? move.type : move.type?.name
    return moveType || null
  } catch {
    return null
  }
}

function getMovePower(moveName) {
  try {
    const move = new Move(gen, moveName)
    return Number(move?.bp || move?.basePower || 0)
  } catch {
    return 0
  }
}

function addSoftMovePenalty(map, pokemon, moveName, penalty) {
  if (!pokemon?.id || !moveName || penalty <= 0) return
  if (!map[pokemon.id]) map[pokemon.id] = {}
  map[pokemon.id][moveName] = Math.max(map[pokemon.id][moveName] || 0, penalty)
}

function addSoftTypePenalty(map, pokemon, moveType, penalty) {
  if (!pokemon?.id || !moveType || penalty <= 0) return
  if (!map[pokemon.id]) map[pokemon.id] = {}
  map[pokemon.id][moveType] = Math.max(map[pokemon.id][moveType] || 0, penalty)
}

function addMinRemainingPP(map, pokemon, moveName, minPP) {
  if (!pokemon?.id || !moveName) return
  if (!map[pokemon.id]) map[pokemon.id] = {}
  map[pokemon.id][moveName] = Math.max(map[pokemon.id][moveName] || 0, minPP)
}

function isEvolvedPokemon(pokemon) {
  if (!pokemon?.name) return false
  return !UNEVOLVED_BASE_FORMS.has(pokemon.name)
}

function addReservedMove(map, pokemon, moveName) {
  if (!pokemon?.id || !moveName) return
  if (!map[pokemon.id]) map[pokemon.id] = []
  if (!map[pokemon.id].includes(moveName)) map[pokemon.id].push(moveName)
}

function shouldReserveMedichamDrainPunch(runState) {
  const firstBossUsesMedicham =
    runState.bossStrategy?.firstBoss === "medicham" &&
    runState.currentWave < 12

  const secondBossUsesMedicham =
    runState.bossStrategy?.secondBoss === "medicham" &&
    runState.currentWave < 18

  return firstBossUsesMedicham || secondBossUsesMedicham
}

export function getActionConstraintsForWave(runState) {
  const team = getBattleTeamState(runState)
  const isBossWave = BOSS_WAVES.has(runState.currentWave)

  const hardReservedMovesByPokemonId = {}
  const minRemainingPPByPokemonId = {}
  const softReservedMovesByPokemonId = {}
  const softReservedTypesByPokemonId = {}

  for (const pokemon of team) {
    if (!pokemon?.alive) continue

    if (!isBossWave && pokemon.name === "Serperior") {
      addReservedMove(hardReservedMovesByPokemonId, pokemon, "Gastro Acid")
      addReservedMove(hardReservedMovesByPokemonId, pokemon, "Leaf Storm")
    }

    if (!isBossWave && pokemon.name === "Spinda") {
      addReservedMove(hardReservedMovesByPokemonId, pokemon, "Superpower")
      addReservedMove(hardReservedMovesByPokemonId, pokemon, "Super Power")
    }

    if (!isBossWave && pokemon.name === "Medicham" && shouldReserveMedichamDrainPunch(runState)) {
      addReservedMove(hardReservedMovesByPokemonId, pokemon, "Drain Punch")
    }

    // Soft preservation: boss weakness types.
    for (const move of pokemon.moves || []) {
      const moveType = getMoveType(move.name)
      if (moveType && BOSS_WEAK_TYPES.includes(moveType)) {
        addSoftTypePenalty(softReservedTypesByPokemonId, pokemon, moveType, 10)
      }

      // Legendary starter Fighting PP is valuable: soft reserve strongly.
      if (LEGENDARY_STARTERS.has(pokemon.name) && moveType === "Fighting") {
        addSoftMovePenalty(softReservedMovesByPokemonId, pokemon, move.name, 18)
      }

      // Early-wave strong-move preservation for late-game resources.
      if (runState.currentWave < 12 && getMovePower(move.name) > 100) {
        addSoftMovePenalty(softReservedMovesByPokemonId, pokemon, move.name, 26)
      }

      // Keldeo exception: may use Fighting moves, but keep at least 6 PP.
      if (pokemon.name === "Keldeo" && moveType === "Fighting") {
        addMinRemainingPP(minRemainingPPByPokemonId, pokemon, move.name, 6)
        addSoftMovePenalty(softReservedMovesByPokemonId, pokemon, move.name, 12)
      }
    }

    // Ability-based boss advantage: prefer keeping PP for key abilities.
    const effectiveAbility =
      pokemon.ability ||
      (LEGENDARY_STARTERS.has(pokemon.name) ? "Justified" : null)

    if (effectiveAbility && BOSS_ADVANTAGE_ABILITIES.has(effectiveAbility)) {
      for (const move of pokemon.moves || []) {
        const moveType = getMoveType(move.name)
        if (moveType && BOSS_WEAK_TYPES.includes(moveType)) {
          addSoftMovePenalty(softReservedMovesByPokemonId, pokemon, move.name, 8)
        }
      }
    }
  }

  return {
    hardReservedMovesByPokemonId,
    // Backward-compat alias used by existing generator versions.
    reservedMovesByPokemonId: hardReservedMovesByPokemonId,
    minRemainingPPByPokemonId,
    softReservedMovesByPokemonId,
    softReservedTypesByPokemonId
  }
}

export function isRunStateValid(runState) {
  return getRunStateInvalidReason(runState) === null
}

export function getRunStateInvalidReason(runState) {
  const roster = runState.roster || []
  const available = runState.availablePokemon || []
  const rosterNames = new Set(roster.map(p => p.name))
  const availableNames = new Set(available.map(p => p.name))
  const team = getBattleTeamState(runState)
  const targetRosterNames = runState.targetRosterNames || []
  const targetBossCounterNames = runState.targetBossCounterNames || []

  // If a required Pokemon was captured, it must be added to roster immediately.
  for (const name of REQUIRED_POKEMON) {
    if (availableNames.has(name) && !rosterNames.has(name)) {
      return `run constraint: required captured pokemon missing from roster (${name})`
    }
  }

  // Target roster is now a soft preference (handled in score), not a hard validity gate.

  // Boss-counter targets are hard planning targets.
  // If roster is full and a target is still missing, this branch cannot recover.
  if (roster.length >= 16) {
    for (const name of targetBossCounterNames) {
      if (!rosterNames.has(name)) {
        return `run constraint: roster full before adding boss-counter target (${name})`
      }
    }
  }

  // Must have Spinda with Strength Charm before wave 13 starts.
  if (runState.currentWave >= 13) {
    const spinda = roster.find(p => p.name === "Spinda")
    if (!spinda || !spinda.strengthCharm) {
      return "boss preparation constraint: Spinda must have Strength Charm before wave 13"
    }
  }

  const evolvedFireUsers = team.filter(
    p => isEvolvedPokemon(p) && (p?.moves || []).some(m => isFireMove(m.name))
  )
  const hasEvolvedMedicham = team.some(p => p?.name === "Medicham")

  const firstBossStrategy = runState.bossStrategy?.firstBoss
  const secondBossStrategy = runState.bossStrategy?.secondBoss

  // First boss gate (around wave 12).
  if (runState.currentWave >= 12 && runState.currentWave < 18) {
    if (firstBossStrategy === "medicham") {
      if (!hasEvolvedMedicham) return "boss preparation constraint: first boss strategy requires Medicham"
    } else if (firstBossStrategy === "fire") {
      if (evolvedFireUsers.length < 1) return "boss preparation constraint: first boss strategy requires evolved Fire user"
    } else {
      if (evolvedFireUsers.length < 1 && !hasEvolvedMedicham) {
        return "boss preparation constraint: first boss requires evolved Fire user or Medicham"
      }
    }
  }

  // Second boss gate (around wave 18).
  if (runState.currentWave >= 18 && runState.currentWave < 24) {
    if (secondBossStrategy === "medicham") {
      if (!hasEvolvedMedicham) return "boss preparation constraint: second boss strategy requires Medicham"
    } else if (secondBossStrategy === "fire") {
      if (evolvedFireUsers.length < 2) return "boss preparation constraint: second boss strategy requires two evolved Fire users"
    } else {
      if (evolvedFireUsers.length < 2 && !hasEvolvedMedicham) {
        return "boss preparation constraint: second boss requires two evolved Fire users or Medicham"
      }
    }
  }

  // By the end of the run, both required pokemon must be in roster.
  if (runState.currentWave > MAX_WAVE) {
    if (!rosterNames.has("Serperior")) return "run constraint: final roster missing Serperior"
    if (!rosterNames.has("Spinda")) return "run constraint: final roster missing Spinda"
    for (const name of targetBossCounterNames) {
      if (!rosterNames.has(name)) {
        return `run constraint: final roster missing boss-counter target (${name})`
      }
    }
  }

  return null
}
