// src/solver/battle/simulateTurn.js

import { chooseEnemyAction } from "./enemyAI.js"
import { orderActions } from "./actionOrder.js"
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

function applyDamage(target, percent) {

  const damage = Math.floor(target.maxHp * percent / 100)

  target.hp -= damage

  if (target.hp <= 0) {
    target.hp = 0
    target.alive = false
  }
}

function resolveUser(state, action) {
  if (action.user) return action.user
  if (action.userSide === "player") return state.player.active[action.userSlot]
  if (action.userSide === "enemy") return state.enemy.active[action.userSlot]
  return null
}

function resolveTarget(state, action) {
  if (action.target) return action.target
  if (action.targetSide === "player") return state.player.active[action.targetSlot]
  if (action.targetSide === "enemy") return state.enemy.active[action.targetSlot]
  return null
}

export function simulateTurn(state, playerActions) {

  const actions = []

  const playerActive = state.player.active
  const enemyActive = state.enemy.active

  // --- actions joueur
  for (const action of playerActions) {
    const user = resolveUser(state, action)
    if (!user || !user.alive) continue

    actions.push({
      ...action,
      user,
      side: action.side || "player",
      speed: user.speed
    })
  }

  // --- actions ennemies
  for (const enemy of enemyActive) {

    if (!enemy.alive) continue

    const action = chooseEnemyAction(enemy, playerActive)

    if (!action) continue

    actions.push({
      ...action,
      side: "enemy",
      speed: enemy.speed
    })
  }

  // --- ordre d'action
  const ordered = orderActions(actions)

  // --- exécution
  for (const action of ordered) {

    const user = action.user

    if (!user.alive) continue

    const moveName = action.move

    const moveData = user.moves.find(m => m.name === moveName)

    if (!moveData || moveData.pp <= 0) continue

    moveData.pp--

    const spread = isSpreadMove(moveName)

    if (spread) {
      const targets = action.side === "player"
        ? state.enemy.active
        : state.player.active

      for (const target of targets) {

        if (!target.alive) continue

        const result = calculateDamage({
          attackerName: user.name,
          defenderName: target.name,
          moveName,
          attackerLevel: user.level,
          defenderLevel: target.level,
          evEnabled: Boolean(user.strengthCharm),
          defenderEvEnabled: Boolean(target.strengthCharm),
          boosts: {},
          damageMultiplier: 1,
          spreadHitsTwoTargets: targets.filter(t => t.alive).length === 2,
          abilityEnabled: true
        })

        const percent = Number(result.percentMax || 0)

        applyDamage(target, percent)
      }

    } else {

      const target = resolveTarget(state, action)

      if (!target || !target.alive) continue

      const result = calculateDamage({
        attackerName: user.name,
        defenderName: target.name,
        moveName,
        attackerLevel: user.level,
        defenderLevel: target.level,
        evEnabled: Boolean(user.strengthCharm),
        defenderEvEnabled: Boolean(target.strengthCharm),
        boosts: {},
        damageMultiplier: 1,
        spreadHitsTwoTargets: false,
        abilityEnabled: true
      })

      const percent = Number(result.percentMax || 0)

      applyDamage(target, percent)
    }
  }

  // --- fin du tour
// --- fin du tour
spawnEnemyReplacements(state)
spawnPlayerReplacements(state)

state.turn++
}

function spawnEnemyReplacements(state) {

  const active = state.enemy.active
  const queue = state.enemy.queue

  for (let i = 0; i < active.length; i++) {

    if (!active[i].alive && queue.length > 0) {
      active[i] = queue.shift()
    }
  }
}

function spawnPlayerReplacements(state) {

  const active = state.player.active
  const bench = state.player.bench

  for (let i = 0; i < active.length; i++) {

    if (!active[i].alive && bench.length > 0) {

      const replacementIndex = bench.findIndex(p => p.alive)

      if (replacementIndex !== -1) {

        const replacement = bench.splice(replacementIndex, 1)[0]

        active[i] = replacement
      }
    }
  }
}