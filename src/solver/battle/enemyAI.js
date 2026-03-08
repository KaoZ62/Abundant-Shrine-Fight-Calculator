// src/solver/battle/enemyAI.js

import { calculateDamage } from "../../calculator.js"
import { Generations, Move } from "@smogon/calc"

const gen = Generations.get(5)

function isSpreadMove(moveName) {
  try {
    const move = new Move(gen, moveName)
    const spreadTargets = ["allAdjacent", "allAdjacentFoes", "all"]
    return spreadTargets.includes(move.target)
  } catch {
    return false
  }
}

export function chooseEnemyAction(enemy, playerTeam) {

  let bestAction = null
  let bestScore = -Infinity

  for (const move of enemy.moves) {

    if (move.pp <= 0) continue

    const spread = isSpreadMove(move.name)

    if (spread) {

      let totalDamage = 0

      for (const target of playerTeam) {

        if (!target.alive) continue

        const result = calculateDamage({
          attackerName: enemy.name,
          defenderName: target.name,
          moveName: move.name,
          attackerLevel: enemy.level,
          defenderLevel: target.level,
          evEnabled: Boolean(enemy.strengthCharm),
          defenderEvEnabled: Boolean(target.strengthCharm),
          boosts: {},
          damageMultiplier: 1,
          spreadHitsTwoTargets: true,
          abilityEnabled: true
        })

        const dmg = Number(result.percentMax || 0)

        totalDamage += dmg
      }

      if (totalDamage > bestScore) {

        bestScore = totalDamage

        bestAction = {
          user: enemy,
          move: move.name,
          type: "spread"
        }
      }

    } else {

      for (const target of playerTeam) {

        if (!target.alive) continue

        const result = calculateDamage({
          attackerName: enemy.name,
          defenderName: target.name,
          moveName: move.name,
          attackerLevel: enemy.level,
          defenderLevel: target.level,
          evEnabled: Boolean(enemy.strengthCharm),
          defenderEvEnabled: Boolean(target.strengthCharm),
          boosts: {},
          damageMultiplier: 1,
          spreadHitsTwoTargets: false,
          abilityEnabled: true
        })

        const dmg = Number(result.percentMax || 0)

        if (dmg > bestScore) {

          bestScore = dmg

          bestAction = {
            user: enemy,
            move: move.name,
            target: target,
            type: "single"
          }
        }
      }
    }
  }

  return bestAction
}