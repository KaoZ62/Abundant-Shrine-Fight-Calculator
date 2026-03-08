// src/solver/run/simulateRun.js

import { simulateWave } from "../wave/simulateWave.js"

export function simulateRun({
  playerTeam,
  waves,
  playerActionProvider,
  startWave = 1,
  endWave = 36
}) {

  let teamState = playerTeam

  for (let waveNumber = startWave; waveNumber <= endWave; waveNumber++) {

    const waveData = waves[waveNumber]

    if (!waveData) {
      return {
        success: false,
        wave: waveNumber,
        reason: "missing_wave"
      }
    }

    const result = simulateWave({
      playerTeam: teamState,
      waveData,
      playerActionProvider
    })

    if (!result.success) {

      return {
        success: false,
        wave: waveNumber,
        team: result.state.player
      }
    }

    // garder les HP / PP restants et garantir 4 slots
    const survivors = [
      ...result.state.player.active,
      ...result.state.player.bench
    ]
    while (survivors.length < 4) survivors.push(null)
    teamState = survivors.slice(0, 4)
  }

  return {
    success: true,
    wave: endWave,
    team: teamState
  }
}