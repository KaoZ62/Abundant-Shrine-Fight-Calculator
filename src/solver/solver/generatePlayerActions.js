// src/solver/solver/generatePlayerActions.js

import { calculateDamage } from "../../calculator.js"
import { Generations, Move } from "@smogon/calc"

const gen = Generations.get(5)

const SUPPORT_MOVES = new Set([
  "Helping Hand",
  "Protect",
  "Fake Tears",
  "Tailwind",
  "Protective Aura",
  "Horse's Protection",
  "Dragon's Blessing",
  "Flash of Speed",
  "Serpent's Fear",
  "Will-O-Wisp",
  "Provoke",
  "Haze",
  "Lovely Kiss",
  "Toxic",
  "Skill Swap",
  "After You",
  "Quick Guard",
  "Slack Off",
  "Roost",
  "Thunder Wave",
  "Gastro Acid",
  "Me First"
])

const OUT_OF_BATTLE_ONLY_MOVES = new Set([
  "Mending Prayer",
  "Joyous Cheer",
  "Healing Wind"
])

const PRESERVE_SUPPORT_MOVES = new Set([
  "Helping Hand",
  "Dragon's Blessing"
])

function isSpreadMove(moveName) {
  try {
    const move = new Move(gen, moveName)
    return ["allAdjacent", "allAdjacentFoes", "all"].includes(move.target)
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

function estimateDamagePercent(attacker, target, moveName, spreadHitsTwoTargets) {
  const result = calculateDamage({
    attackerName: attacker.name,
    defenderName: target.name,
    moveName,
    attackerLevel: attacker.level,
    defenderLevel: target.level,
    evEnabled: Boolean(attacker.strengthCharm),
    defenderEvEnabled: Boolean(target.strengthCharm),
    boosts: {},
    damageMultiplier: 1,
    spreadHitsTwoTargets,
    abilityEnabled: true
  })

  return Number(result?.percentMax || 0)
}

function getPairScore(a1, a2, context) {
  let score = (a1.score || 0) + (a2.score || 0)

  const blessingOnFirst = a1.move === "Dragon's Blessing" && a2.isAttack
  const blessingOnSecond = a2.move === "Dragon's Blessing" && a1.isAttack
  const hasBlessingCombo = blessingOnFirst || blessingOnSecond
  const partnerScore = blessingOnFirst ? (a2.score || 0) : (a1.score || 0)

  if (hasBlessingCombo && partnerScore > 0) {
    const partnerMove = blessingOnFirst ? a2.move : a1.move

    score += 200 // baseline support+attack synergy
    if (isSpreadMove(partnerMove)) score += 300
    if (context.aliveEnemyCount >= 2) score += 200
    if (context.hasEnemyQueue) score += 250
  }

  return score
}

export function generatePlayerActions(state, options = {}) {
  const MAX_ACTIONS_PER_TARGET = options.maxActionsPerTarget || 2
  const MAX_COMBINATIONS = options.maxCombinations || 24

  const p1 = state.player.active[0]
  const p2 = state.player.active[1]

  const enemies = state.enemy.active

  const p1Actions = getActionsForPokemon(p1, 0, enemies, MAX_ACTIONS_PER_TARGET, options)
  const p2Actions = getActionsForPokemon(p2, 1, enemies, MAX_ACTIONS_PER_TARGET, options)
  const p1HasAttack = p1Actions.some(a => a.isAttack)
  const p2HasAttack = p2Actions.some(a => a.isAttack)
  const pairScoreContext = {
    aliveEnemyCount: enemies.filter(e => e.alive).length,
    hasEnemyQueue: state.enemy.queue.some(e => e.alive)
  }

  const mustKeep = []
  const combinations = []
  const seen = new Set()

  for (const a1 of p1Actions) {
    for (const a2 of p2Actions) {
      // Preserve core support synergies only if partner can attack.
      if (PRESERVE_SUPPORT_MOVES.has(a1.move) && !p2HasAttack) continue
      if (PRESERVE_SUPPORT_MOVES.has(a2.move) && !p1HasAttack) continue

      const key = `${a1.move}:${a1.targetSlot ?? "x"}|${a2.move}:${a2.targetSlot ?? "x"}`
      if (seen.has(key)) continue
      seen.add(key)

      const pair = [a1, a2]
      const isPreservedSupportCombo =
        (PRESERVE_SUPPORT_MOVES.has(a1.move) && a2.isAttack) ||
        (PRESERVE_SUPPORT_MOVES.has(a2.move) && a1.isAttack)

      if (isPreservedSupportCombo) {
        mustKeep.push(pair)
      } else {
        combinations.push(pair)
      }
    }
  }

  mustKeep.sort((a, b) => {
    const scoreA = getPairScore(a[0], a[1], pairScoreContext)
    const scoreB = getPairScore(b[0], b[1], pairScoreContext)
    return scoreB - scoreA
  })

  combinations.sort((a, b) => {
    const scoreA = getPairScore(a[0], a[1], pairScoreContext)
    const scoreB = getPairScore(b[0], b[1], pairScoreContext)
    return scoreB - scoreA
  })

  return [...mustKeep, ...combinations].slice(0, MAX_COMBINATIONS)
}

function getActionsForPokemon(pokemon, userSlot, enemies, maxActionsPerTarget, options = {}) {

  if (!pokemon || !pokemon.alive) return []

  const aliveEnemies = enemies
    .map((enemy, enemySlot) => ({ enemy, enemySlot }))
    .filter(({ enemy }) => enemy.alive)

  const actionsByTarget = new Map()
  const spreadActions = []
  const supportActions = []

  for (const move of pokemon.moves) {

    if (move.pp <= 0) continue
    if (OUT_OF_BATTLE_ONLY_MOVES.has(move.name)) continue
    const hardBlock = getHardReservationBlockReason(pokemon, move, options)
    if (hardBlock) {
      if (options.debugActionConstraints) {
        console.debug(`action filtered (hard): ${hardBlock}`)
      }
      continue
    }

    const softPenaltyInfo = getSoftReservationPenaltyInfo(pokemon, move.name, options)
    const softPenalty = softPenaltyInfo.penalty
    if (options.debugActionConstraints && softPenalty > 0) {
      for (const reason of softPenaltyInfo.reasons) {
        console.debug(`action penalized (soft): ${reason}`)
      }
    }

    const spread = isSpreadMove(move.name)

    if (spread) {
      let totalDamage = 0
      for (const { enemy } of aliveEnemies) {
        totalDamage += estimateDamagePercent(pokemon, enemy, move.name, aliveEnemies.length === 2)
      }

      if (totalDamage > 0) {
        spreadActions.push({
          side: "player",
          userSide: "player",
          userSlot,
          move: move.name,
          targetSide: "enemy",
          targetSlot: aliveEnemies[0]?.enemySlot ?? 0,
          isAttack: true,
          score: totalDamage - softPenalty
        })
      }

      continue
    }

    let moveHasDamage = false

    for (const { enemy, enemySlot } of aliveEnemies) {
      const damage = estimateDamagePercent(pokemon, enemy, move.name, false)
      if (damage <= 0) continue

      moveHasDamage = true

      const action = {
        side: "player",
        userSide: "player",
        userSlot,
        move: move.name,
        targetSide: "enemy",
        targetSlot: enemySlot,
        isAttack: true,
        score: damage - softPenalty
      }

      const key = `enemy:${enemySlot}`
      if (!actionsByTarget.has(key)) actionsByTarget.set(key, [])
      actionsByTarget.get(key).push(action)
    }

    if (!moveHasDamage && SUPPORT_MOVES.has(move.name)) {
      supportActions.push({
        side: "player",
        userSide: "player",
        userSlot,
        move: move.name,
        targetSide: "enemy",
        targetSlot: aliveEnemies[0]?.enemySlot ?? 0,
        isAttack: false,
        score: (move.name === "Helping Hand" ? -50 : -100) - softPenalty
      })
    }
  }

  const actions = []

  for (const list of actionsByTarget.values()) {
    list.sort((a, b) => b.score - a.score)
    actions.push(...list.slice(0, maxActionsPerTarget))
  }

  spreadActions.sort((a, b) => b.score - a.score)
  actions.push(...spreadActions.slice(0, 2))

  if (supportActions.length > 0) {
    const preservedSupport = supportActions.filter(a => PRESERVE_SUPPORT_MOVES.has(a.move))
    const otherSupport = supportActions.filter(a => !PRESERVE_SUPPORT_MOVES.has(a.move))

    actions.push(...preservedSupport)
    actions.push(...otherSupport.slice(0, 1))
  }

  return actions
}

function getHardReservationBlockReason(pokemon, move, options) {
  const moveName = move.name
  const hardReservedById =
    options.hardReservedMovesByPokemonId ||
    options.reservedMovesByPokemonId ||
    {}
  const reservedByName = options.reservedMovesByPokemonName || {}
  const minRemainingPPByPokemonId = options.minRemainingPPByPokemonId || {}

  const byId = pokemon?.id ? (hardReservedById[pokemon.id] || []) : []
  const byName = pokemon?.name ? (reservedByName[pokemon.name] || []) : []
  const minPP = pokemon?.id
    ? (minRemainingPPByPokemonId[pokemon.id]?.[moveName] ?? -1)
    : -1
  const moveCost = getMoveCost(moveName, options)

  if (minPP >= 0 && (move.pp - moveCost) < minPP) {
    return `${pokemon?.name || "Pokemon"} ${moveName} blocked by PP floor (${move.pp}-${moveCost}<${minPP})`
  }

  if (byId.includes(moveName) || byName.includes(moveName)) {
    return `${pokemon?.name || "Pokemon"} ${moveName} reserved`
  }

  return null
}

function getMoveCost(moveName, options) {
  const costs = options.moveCostByName || {}
  const cost = costs[moveName]
  return Number.isFinite(cost) && cost > 0 ? cost : 1
}

function getSoftReservationPenaltyInfo(pokemon, moveName, options) {
  const softMovesById = options.softReservedMovesByPokemonId || {}
  const softTypesById = options.softReservedTypesByPokemonId || {}

  const movePenaltyRaw = pokemon?.id
    ? (softMovesById[pokemon.id]?.[moveName] || 0)
    : 0

  const moveType = getMoveType(moveName)
  const typePenaltyRaw = (pokemon?.id && moveType)
    ? (softTypesById[pokemon.id]?.[moveType] || 0)
    : 0

  const reasons = []
  if (movePenaltyRaw > 0) reasons.push(`${pokemon?.name || "Pokemon"} ${moveName} preservation`)
  if (typePenaltyRaw > 0) reasons.push(`${moveType} move preservation`)

  return {
    penalty: movePenaltyRaw + typePenaltyRaw,
    reasons
  }
}