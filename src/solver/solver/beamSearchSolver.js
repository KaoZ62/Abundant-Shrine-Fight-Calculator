// src/solver/solver/beamSearchSolver.js

import { generatePlayerActions } from "./generatePlayerActions.js"
import { cloneBattleState } from "../state/cloneBattleState.js"
import { simulateTurn } from "../battle/simulateTurn.js"

function hashState(state) {
  const playerActive = state.player.active.map(p => ({
    name: p.name,
    hp: p.hp,
    pp: p.moves.map(m => m.pp)
  }))

  const enemyActive = state.enemy.active.map(p => ({
    name: p.name,
    hp: p.hp
  }))

  return JSON.stringify({
    turn: state.turn,
    playerActive,
    enemyActive,
    enemyQueueLength: state.enemy.queue.length
  })
}

export function beamSearchSolver(initialState, options = {}) {

  const BEAM_WIDTH = options.beamWidth || 20
  const MAX_TURNS = options.maxTurns || 20
  const MAX_COMBINATIONS_PER_STATE = options.maxCombinationsPerState || 24
  const MAX_ACTIONS_PER_TARGET = options.maxActionsPerTarget || 2

 let states = [
  {
    state: cloneBattleState(initialState),
    score: 0,
    history: []
  }
]

  for (let turn = 0; turn < MAX_TURNS; turn++) {

    const newStates = []
    const seenStates = new Map()

    for (const node of states) {

  const state = node.state

  // stop si plus d'ennemis
 const enemiesAlive = [
  ...state.enemy.active,
  ...state.enemy.queue
].some(e => e.alive)

const playersAlive = [
  ...state.player.active,
  ...state.player.bench
].some(p => p.alive)

if (!enemiesAlive) {
  return node
}

if (!playersAlive) {
  continue
}

      const actionsList = generatePlayerActions(state, {
        maxCombinations: MAX_COMBINATIONS_PER_STATE,
        maxActionsPerTarget: MAX_ACTIONS_PER_TARGET,
        ...(options.playerActionOptions || {})
      })
      if (typeof options.onActionsGenerated === "function") {
        options.onActionsGenerated(actionsList.length)
      }

      for (const actions of actionsList) {

        const cloned = cloneBattleState(state)

        simulateTurn(cloned, actions)

        const score = evaluateState(cloned)

        const newNode = {
          state: cloned,
          score: node.score + score,
          history: [...node.history, actions]
        }

        const stateHash = hashState(cloned)
        const existing = seenStates.get(stateHash)

        if (!existing || newNode.score > existing.score) {
          seenStates.set(stateHash, newNode)
        }
      }
    }

    newStates.push(...seenStates.values())

    newStates.sort((a, b) => b.score - a.score)

    states = newStates.slice(0, BEAM_WIDTH)

    if (states.length === 0) break
  }

  return states[0]
}
function evaluateState(state) {

  let score = 0

  // ennemis morts = énorme bonus
  for (const e of state.enemy.active) {
    if (!e.alive) score += 10000
  }

  for (const e of state.enemy.queue) {
    if (!e.alive) score += 10000
  }

  // HP restants
 for (const p of state.player.active) {
  if (p.alive) score += (p.hp ?? 0)
}

for (const p of state.player.bench) {
  if (p.alive) score += (p.hp ?? 0)
}

  // PP restants (très important)
  const allPokemon = [
    ...state.player.active,
    ...state.player.bench
  ]

  for (const p of allPokemon) {
    for (const m of p.moves) {
      score += (m.pp ?? 0) * 50
    }
  }

  return score
}