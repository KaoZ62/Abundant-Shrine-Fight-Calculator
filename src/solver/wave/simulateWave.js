// src/solver/wave/simulateWave.js

import { createBattleState } from "../state/createBattleState.js"
import { simulateBattle } from "../battle/simulateBattle.js"

export function simulateWave({
  playerTeam,
  waveData,
  playerActionProvider
}) {

  const state = createBattleState({
    playerTeam,
    waveData
  })

  const result = simulateBattle(state, playerActionProvider)

  if (result.result === "loss") {
    return {
      success: false,
      state: result.state
    }
  }

  return {
    success: true,
    state: result.state
  }
}