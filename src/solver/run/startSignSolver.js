// src/solver/run/startSignSolver.js

import { createRunState } from "./runState.js"
import { simulateRunSolver } from "./simulateRunSolver.js"

const SIGN_COUNT = 12
const TOTAL_WAVES = 36

function sourceWaveFor(startSign, waveNumber) {
  const lap = Math.floor((waveNumber - 1) / SIGN_COUNT) // 0..2
  const signInCycle = ((startSign - 1 + (waveNumber - 1)) % SIGN_COUNT) + 1 // 1..12
  return (lap * SIGN_COUNT) + signInCycle // 1..36
}

function buildWavesForStartSign(waves, startSign) {
  const remapped = {}

  for (let waveNumber = 1; waveNumber <= TOTAL_WAVES; waveNumber++) {
    const sourceWave = sourceWaveFor(startSign, waveNumber)
    remapped[waveNumber] = waves?.[sourceWave]
  }

  return remapped
}

function isBetterResult(candidate, best) {
  if (!best) return true
  if (candidate.success !== best.success) return candidate.success
  if (candidate.clearedWaves !== best.clearedWaves) {
    return candidate.clearedWaves > best.clearedWaves
  }

  const candidateGold = candidate.finalRunState?.gold || 0
  const bestGold = best.finalRunState?.gold || 0
  return candidateGold > bestGold
}

export function solveBestStartSign(waves, options = {}) {
  let bestStartSign = 1
  let bestResult = null

  for (let startSign = 1; startSign <= SIGN_COUNT; startSign++) {
    const waveSequence = buildWavesForStartSign(waves, startSign)
    const initialRunState = createRunState({
      ...options.initialRunState,
      startWave: 1
    })

    initialRunState.startSign = startSign

    const result = simulateRunSolver(initialRunState, waveSequence, options.runSolverOptions || {})

    if (isBetterResult(result, bestResult)) {
      bestStartSign = startSign
      bestResult = result
    }
  }

  return {
    bestStartSign,
    result: bestResult
  }
}

export const startSignSolver = solveBestStartSign

