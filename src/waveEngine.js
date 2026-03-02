// waveEngine.js
// PURE LOGIC — NO DOM

import { Generations, Move, Pokemon } from "@smogon/calc"

const gen = Generations.get(5)

// ================= GROUP WAVES =================

export function groupWaves(RAW_WAVES, animal, phase) {
  const filtered = RAW_WAVES.filter(
    row =>
      Number(row.phase) === Number(phase) &&
      String(row.animal).trim() === String(animal).trim()
  )

  const wavesGrouped = {}

  filtered.forEach(row => {
    if (!wavesGrouped[row.wave]) {
      wavesGrouped[row.wave] = {
        level: row.level,
        defenders: []
      }
    }

    wavesGrouped[row.wave].defenders.push(row.defender)
  })

  return wavesGrouped
}

// ================= SPEED =================

export function attackerIsFaster({
  attackerName,
  defenderName,
  attackerLevel,
  defenderLevel,
  evEnabled,
  getSpeedInfo
}) {
  try {
    const { attackerSpe, defenderSpe } = getSpeedInfo({
      attackerName,
      defenderName,
      attackerLevel,
      defenderLevel,
      evEnabled
    })

    return attackerSpe > defenderSpe
  } catch {
    return false
  }
}

// ================= ITEM MULTIPLIER =================

export function getItemMultiplier({
  item,
  moveName,
  defenderName
}) {
  if (!item) return 1.0

  let multiplier = 1.0
  let move

  try {
    move = new Move(gen, moveName)
  } catch {
    return 1.0
  }

  const TYPE_BOOST_ITEMS = {
    "Flame Plate": "Fire",
    "Splash Plate": "Water",
    "Zap Plate": "Electric",
    "Meadow Plate": "Grass",
    "Icicle Plate": "Ice",
    "Fist Plate": "Fighting",
    "Toxic Plate": "Poison",
    "Earth Plate": "Ground",
    "Sky Plate": "Flying",
    "Mind Plate": "Psychic",
    "Insect Plate": "Bug",
    "Stone Plate": "Rock",
    "Spooky Plate": "Ghost",
    "Draco Plate": "Dragon",
    "Dread Plate": "Dark",
    "Iron Plate": "Steel"
  }

  if (item === "Life Orb") multiplier *= 1.3
  if (item === "Choice Band" && move.category === "Physical") multiplier *= 1.5
  if (item === "Choice Specs" && move.category === "Special") multiplier *= 1.5
  if (item === "Muscle Band" && move.category === "Physical") multiplier *= 1.1
  if (item === "Wise Glasses" && move.category === "Special") multiplier *= 1.1

if (item === "Expert Belt") {
  try {
    const weaknesses = getWeaknesses(defenderName)

    const moveType =
      typeof move.type === "string"
        ? move.type
        : move.type?.name

    const isSuperEffective = weaknesses.some(w => w.type === moveType)

    if (isSuperEffective) {
      multiplier *= 1.2
    }

  } catch (e) {
    console.log("Expert Belt error:", e)
  }
}
  if (TYPE_BOOST_ITEMS[item]) {
    const expectedType = TYPE_BOOST_ITEMS[item]
    const actualType =
      typeof move.type === "string"
        ? move.type
        : move.type?.name

    if (actualType === expectedType) {
      multiplier *= 1.2
    }
  }

  return multiplier
}

// ================= SIMPLE DAMAGE (CALCULATOR MODE) =================

export function computeWaveDamageForAttackerMove({
  defenderName,
  level,
  attackerName,
  moveName,
  attackerLevel,
  evEnabled,
  boosts,
  damageMultiplier,
  spreadHitsTwoTargets,
  abilityEnabled,
  calculateDamage,
  getSpeedInfo
}) {
  const res = calculateDamage({
    attackerName,
    defenderName,
    moveName,
    attackerLevel,
    defenderLevel: level,
    evEnabled,
    boosts,
    damageMultiplier,
    spreadHitsTwoTargets,
    abilityEnabled
  })

  if (res?.error) return null

  const faster = attackerIsFaster({
    attackerName,
    defenderName,
    attackerLevel,
    defenderLevel: level,
    evEnabled,
    getSpeedInfo
  })

  return {
    percentMin: Number(res.percentMin),
    percentMax: Number(res.percentMax),
    faster
  }
}

// ================= MINI GAME OHKO =================

export function computeWaveOHKO({
  defenderName,
  level,
  teamToUse,
  teamItems,
  calculateDamage,
  getSpeedInfo
}) {
  const results = []

  const ITEM_PRIORITY = [
    "Expert Belt","Muscle Band","Wise Glasses",
    "Flame Plate","Splash Plate","Zap Plate","Meadow Plate",
    "Icicle Plate","Fist Plate","Toxic Plate","Earth Plate",
    "Sky Plate","Mind Plate","Insect Plate","Stone Plate",
    "Spooky Plate","Draco Plate","Dread Plate","Iron Plate",
    "Life Orb","Choice Band","Choice Specs"
  ]

  const sortedItems = ITEM_PRIORITY.filter(i => teamItems.includes(i))

  function toNum(x) {
    return Number(String(x).replace("%", "").trim())
  }

  for (const member of teamToUse) {
    for (const moveName of member.priorityMoves || []) {

      let bestGuaranteed = null
      let bestPossible = null

      function evaluate(min, max, itemUsed) {
        const faster = attackerIsFaster({
          attackerName: member.name,
          defenderName,
          attackerLevel: 50,
          defenderLevel: level,
          evEnabled: member.strengthCharm,
          getSpeedInfo
        })

        if (min >= 100) {
          if (!bestGuaranteed) {
            bestGuaranteed = {
              attacker: member.name,
              move: moveName,
              item: itemUsed,
              status: faster ? "guaranteedFast" : "guaranteedSlow"
            }
          }
          return
        }

        if (max >= 100) {
          if (!bestPossible || max > bestPossible.max) {
            bestPossible = {
              attacker: member.name,
              move: moveName,
              item: itemUsed,
              max,
              status: faster ? "possibleFast" : "possibleSlow"
            }
          }
        }
      }

      const base = calculateDamage({
        attackerName: member.name,
        defenderName,
        moveName,
        attackerLevel: 50,
        defenderLevel: level,
        evEnabled: member.strengthCharm,
        boosts: {},
        damageMultiplier: 1.0,
        spreadHitsTwoTargets: false,
        abilityEnabled: false
      })

      if (!base?.error) {
        evaluate(toNum(base.percentMin), toNum(base.percentMax), null)
      }

      for (const item of sortedItems) {
        const multiplier = getItemMultiplier({
          item,
          moveName,
          defenderName
        })

        const res = calculateDamage({
          attackerName: member.name,
          defenderName,
          moveName,
          attackerLevel: 50,
          defenderLevel: level,
          evEnabled: member.strengthCharm,
          boosts: {},
          damageMultiplier: multiplier,
          spreadHitsTwoTargets: false,
          abilityEnabled: false
        })

        if (!res?.error) {
          evaluate(toNum(res.percentMin), toNum(res.percentMax), item)
        }
      }

      if (bestGuaranteed) results.push(bestGuaranteed)
      else if (bestPossible) results.push(bestPossible)
    }
  }

  return results
}