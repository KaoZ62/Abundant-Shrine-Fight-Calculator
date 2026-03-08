// src/solver/battle/simulateBattle.js

import { simulateTurn } from "./simulateTurn.js"

function allDead(team) {
  return team.every(p => !p.alive)
}

function enemiesRemaining(state) {

  const activeAlive = state.enemy.active.some(p => p.alive)
  const queueRemaining = state.enemy.queue.length > 0

  return activeAlive || queueRemaining
}

function playersRemaining(state) {

  const activeAlive = state.player.active.some(p => p.alive)
  const benchAlive = state.player.bench.some(p => p.alive)

  return activeAlive || benchAlive
}

export function simulateBattle(state, playerActionProvider) {

  const MAX_TURNS = 50

  while (state.turn <= MAX_TURNS) {

    if (!playersRemaining(state)) {
      return {
        result: "loss",
        turn: state.turn,
        state
      }
    }

    if (!enemiesRemaining(state)) {
      return {
        result: "win",
        turn: state.turn,
        state
      }
    }

    // demander les actions du joueur
    const playerActions = playerActionProvider(state)

    simulateTurn(state, playerActions)
  }

  return {
    result: "timeout",
    turn: state.turn,
    state
  }
}