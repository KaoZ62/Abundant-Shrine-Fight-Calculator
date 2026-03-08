// src/solver/wave/simulateWaveSolver.js

import { createBattleState } from "../state/createBattleState.js"
import { beamSearchSolver } from "../solver/beamSearchSolver.js"
import { simulateBattle } from "../battle/simulateBattle.js"
import { buildWaveCaptures } from "../run/captureRewards.js"

export function simulateWaveSolver(playerState, waveData, options = {}) {
  const battleState = createBattleState({
    playerTeam: playerState,
    waveData
  })

  const beamOptions = {
    beamWidth: options.beamWidth || 20,
    maxTurns: options.searchDepth || 6,
    maxCombinationsPerState: options.maxCombinationsPerState || 24,
    maxActionsPerTarget: options.maxActionsPerTarget || 2
  }

  const result = simulateBattle(battleState, currentState => {
    const best = beamSearchSolver(currentState, {
      ...beamOptions,
      playerActionOptions: options.playerActionOptions || {},
      onActionsGenerated: options.onActionsGenerated
    })
    return best?.history?.[0] || []
  })

  const defeatedEnemies = result.result === "win"
    ? (waveData.defenders || [])
    : []

  const captures = buildWaveCaptures(defeatedEnemies, {
    evolutionCharmCount: options.evolutionCharmCount || 0,
    resolveBaseForm: options.resolveBaseForm
  })

  return {
    success: result.result === "win",
    result: result.result,
    turn: result.turn,
    defeatedEnemies,
    captures,
    playerState: [
      ...result.state.player.active,
      ...result.state.player.bench
    ]
  }
}
