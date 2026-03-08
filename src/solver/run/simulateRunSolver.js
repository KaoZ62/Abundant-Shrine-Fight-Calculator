// src/solver/run/simulateRunSolver.js

import { simulateWaveSolver } from "../wave/simulateWaveSolver.js"
import { createPokemonId } from "../state/pokemonId.js"
import { getActionConstraintsForWave, isRunStateValid, getRunStateInvalidReason } from "./constraints.js"
import { Generations, Move } from "@smogon/calc"
import { pokemonData } from "../pokemonDataClean.js"
import { evaluatePokemonUtility, rankFireCandidates, estimateWaveClearingCapacity, getMoveMeta } from "./pokemonEvaluation.js"
import { buildTargetRosterPlan } from "./targetRosterPlanner.js"
import {
  MAX_WAVE,
  getBattleTeamState,
  getWaveFormat,
  applyWaveResult,
  canBuyCharm,
  buyCharm,
  addAvailablePokemon,
  addToRoster
} from "./runState.js"

export const RUN_BEAM_WIDTH = 24
const gen = Generations.get(5)
const BOSS_WEAK_TYPES = new Set(["Fire", "Fighting", "Bug"])
const BOSS_ADVANTAGE_ABILITIES = new Set(["Contrary", "Defiant", "Competitive", "Justified"])
const UNEVOLVED_BASE_FORMS = new Set([
  "Charmander",
  "Vulpix",
  "Growlithe",
  "Cyndaquil",
  "Torchic",
  "Tepig",
  "Ponyta",
  "Pansear",
  "Darumaka",
  "Houndour",
  "Chimchar",
  "Meditite",
  "Snivy",
  "Mienfoo"
])

function normalizeWaveDataForRun(waveData, waveNumber) {
  const expectedDefenderCount = getWaveFormat(waveNumber)
  const defenders = (waveData?.defenders || []).slice(0, expectedDefenderCount)

  return {
    ...waveData,
    defenders
  }
}

function getMoveType(moveName) {
  try {
    const move = new Move(gen, moveName)
    return typeof move.type === "string" ? move.type : move.type?.name || null
  } catch {
    return null
  }
}

function getMovePower(moveName) {
  const meta = getMoveMeta(moveName)
  return Number(meta.power || 0)
}

function isEvolved(name) {
  return !UNEVOLVED_BASE_FORMS.has(name)
}

function getPokemonAbility(pokemon) {
  return pokemon?.ability || pokemonData?.[pokemon?.name]?.ability || null
}

function getAllRosterMoves(pokemon) {
  if (pokemon?.moves?.length) return pokemon.moves
  const fallback = pokemonData?.[pokemon?.name]?.moves || []
  return fallback.map(name => ({ name, pp: 10, maxPP: 10 }))
}

function ppBucket(pp) {
  if (pp >= 7) return "high"
  if (pp >= 3) return "mid"
  return "low"
}

function hasEvolvedFireUser(roster) {
  return (roster || []).some(pokemon =>
    isEvolved(pokemon?.name) &&
    getAllRosterMoves(pokemon).some(move => getMoveType(move.name) === "Fire")
  )
}

function hasEvolvedMedicham(roster) {
  return (roster || []).some(pokemon => pokemon?.name === "Medicham")
}

function hasFirstBossSolution(runState, roster) {
  const strategy = runState.bossStrategy?.firstBoss
  const hasFire = hasEvolvedFireUser(roster)
  const hasMedicham = hasEvolvedMedicham(roster)

  if (strategy === "fire") return hasFire
  if (strategy === "medicham") return hasMedicham
  return hasFire || hasMedicham
}

function getStableTeamScore(runState) {
  const team = getBattleTeamState(runState)
  const aliveCount = team.filter(p => p?.alive).length
  const avgHp = team.length
    ? team.reduce((sum, p) => sum + (p?.hp || 0), 0) / team.length
    : 0

  // Slight preference for stable, healthy teams in late waves.
  return (aliveCount * 25) + (avgHp * 0.2)
}

export function scoreRunState(runState) {
  const roster = runState.roster || []
  const actionConstraints = getActionConstraintsForWave(runState)
  const hardReservedMovesByPokemonId =
    actionConstraints.hardReservedMovesByPokemonId ||
    actionConstraints.reservedMovesByPokemonId ||
    {}

  let totalRemainingHP = 0
  let totalRemainingPP = 0
  let remainingFirePP = 0
  let remainingFightingPP = 0
  let remainingBugPP = 0
  let remainingReservedPP = 0
  let bossAbilityCount = 0
  let evolvedCount = 0
  let strengthCharmCount = 0

  for (const pokemon of roster) {
    if (!pokemon) continue

    if (pokemon.alive) totalRemainingHP += (pokemon.hp || 0)
    if (pokemon.strengthCharm) strengthCharmCount += 1
    if (isEvolved(pokemon.name)) evolvedCount += 1

    const ability = getPokemonAbility(pokemon)
    if (ability && BOSS_ADVANTAGE_ABILITIES.has(ability)) bossAbilityCount += 1

    const reservedMoves = hardReservedMovesByPokemonId[pokemon.id] || []
    const moves = getAllRosterMoves(pokemon)
    for (const move of moves) {
      const pp = move.pp || 0
      const power = getMovePower(move.name)
      const usefulnessDecay = (runState.currentWave >= 10 && power < 70) ? 0.5 : 1
      totalRemainingPP += pp * usefulnessDecay

      const moveType = getMoveType(move.name)
      if (moveType === "Fire") remainingFirePP += pp
      if (moveType === "Fighting") remainingFightingPP += pp
      if (moveType === "Bug") remainingBugPP += pp
      if (reservedMoves.includes(move.name)) remainingReservedPP += pp
    }
  }

  const hpScore = totalRemainingHP * 0.5
  const ppScore = totalRemainingPP * 2
  const bossResourceScore =
    (remainingFirePP * 5) +
    (remainingFightingPP * 5) +
    (remainingBugPP * 5)
  const reservedMoveScore = remainingReservedPP * 6
  const abilityScore = bossAbilityCount * 100
  const evolutionScore = evolvedCount * 40
  const strengthCharmScore = strengthCharmCount * 60
  const goldScore = (runState.gold || 0) * 2
  const waveProgressScore = (runState.currentWave || 0) * 50
  const stableTeamScore = getStableTeamScore(runState)
  const rosterCapacityScore = roster.reduce(
    (sum, pokemon) => sum + estimateWaveClearingCapacity(pokemon),
    0
  ) * 0.8

  const fireCandidates = rankFireCandidates(
    [...(runState.roster || []), ...(runState.availablePokemon || [])],
    { currentWave: runState.currentWave || 1 }
  )
  const fireCandidateScore = fireCandidates
    .slice(0, 2)
    .reduce((sum, candidate) => sum + candidate.score, 0) * 0.6

  const targetRosterBonus = (runState.targetRosterNames || []).reduce((sum, name) => {
    return sum + (roster.some(p => p.name === name) ? 120 : 0)
  }, 0)

  return hpScore +
    ppScore +
    bossResourceScore +
    reservedMoveScore +
    abilityScore +
    evolutionScore +
    strengthCharmScore +
    stableTeamScore +
    rosterCapacityScore +
    fireCandidateScore +
    targetRosterBonus +
    goldScore +
    waveProgressScore
}

export function hashRunState(runState) {
  const roster = (runState.roster || []).map(p => ({
    id: p?.id,
    name: p?.name,
    hp: p?.hp,
    alive: p?.alive,
    strengthCharm: Boolean(p?.strengthCharm),
    pp: (p?.moves || []).map(m => ({ n: m.name, pp: ppBucket(m.pp || 0) }))
  }))

  return JSON.stringify({
    wave: runState.currentWave,
    gold: runState.gold,
    roster,
    battleTeam: runState.battleTeam,
    charms: runState.charms,
    bossStrategy: runState.bossStrategy,
  })
}

function applyStrengthCharmToFirstEligible(runState) {
  if ((runState.charms?.strength || 0) <= 0) return runState

  const roster = [...runState.roster]
  const spindaIndex = roster.findIndex(p => p && p.name === "Spinda" && !p.strengthCharm)
  const targetIndex = spindaIndex !== -1
    ? spindaIndex
    : roster.findIndex(p => p && !p.strengthCharm)
  if (targetIndex === -1) return runState

  roster[targetIndex] = {
    ...roster[targetIndex],
    strengthCharm: true
  }

  return {
    ...runState,
    roster,
    charms: {
      ...runState.charms,
      strength: runState.charms.strength - 1
    }
  }
}

function generatePreWaveDecisions(runState) {
  const canBuyStrengthCharm =
    canBuyCharm(runState, "strength") &&
    runState.roster.some(p => p && !p.strengthCharm)
  const canBuyEvolutionCharm = canBuyCharm(runState, "evolution")

  const purchaseOptions = [{ buyStrength: false, buyEvolution: false }]
  if (canBuyStrengthCharm) purchaseOptions.push({ buyStrength: true, buyEvolution: false })
  if (canBuyEvolutionCharm) purchaseOptions.push({ buyStrength: false, buyEvolution: true })
  if (canBuyStrengthCharm && canBuyEvolutionCharm) {
    purchaseOptions.push({ buyStrength: true, buyEvolution: true })
  }

  const decisions = []
  const seen = new Set()
  const strategyStates = generateBossStrategyStates(runState)

  for (const strategyState of strategyStates) {
    for (const purchase of purchaseOptions) {
      let afterPurchase = strategyState
      if (purchase.buyStrength) {
        afterPurchase = buyCharm(afterPurchase, "strength")
        afterPurchase = applyStrengthCharmToFirstEligible(afterPurchase)
      }
      if (purchase.buyEvolution) {
        afterPurchase = buyCharm(afterPurchase, "evolution")
      }

      const useEvolutionOptions = (afterPurchase.charms?.evolution || 0) > 0
        ? [false, true]
        : [false]

      for (const useEvolutionCharm of useEvolutionOptions) {
        const key =
          `${afterPurchase.bossStrategy?.firstBoss || "x"}-` +
          `${afterPurchase.bossStrategy?.secondBoss || "x"}-` +
          `${purchase.buyStrength}-${purchase.buyEvolution}-${useEvolutionCharm}`
        if (seen.has(key)) continue
        seen.add(key)

        decisions.push({
          runState: afterPurchase,
          useEvolutionCharm,
          decision: { ...purchase, useEvolutionCharm, bossStrategy: afterPurchase.bossStrategy }
        })
      }
    }
  }

  return decisions
}

function generateBossStrategyStates(runState) {
  const current = runState.bossStrategy || { firstBoss: null, secondBoss: null }

  const firstOptions =
    current.firstBoss
      ? [current.firstBoss]
      : (runState.currentWave < 12 ? ["fire", "medicham"] : ["fire", "medicham"])

  const secondOptions =
    current.secondBoss
      ? [current.secondBoss]
      : (runState.currentWave < 18 ? ["fire", "medicham"] : ["fire", "medicham"])

  const states = []
  const seen = new Set()

  for (const firstBoss of firstOptions) {
    for (const secondBoss of secondOptions) {
      const key = `${firstBoss}-${secondBoss}`
      if (seen.has(key)) continue
      seen.add(key)

      states.push({
        ...runState,
        bossStrategy: {
          firstBoss,
          secondBoss
        }
      })
    }
  }

  return states
}

function createCapturedPokemon(name, level) {
  return {
    id: createPokemonId(),
    name,
    level,
    hp: 100,
    maxHp: 100,
    alive: true,
    strengthCharm: false
  }
}

function generateRosterChoices(runState, newCaptureIds) {
  if (!newCaptureIds.length || runState.roster.length >= 16) {
    return [{ type: "none" }]
  }

  const captures = newCaptureIds
    .map(id => runState.availablePokemon.find(p => p.id === id))
    .filter(Boolean)
    .map(pokemon => ({
      id: pokemon.id,
      name: pokemon.name,
      score: evaluatePokemonUtility(pokemon, { currentWave: runState.currentWave }).score
    }))
    .sort((a, b) => b.score - a.score)

  const targetSet = new Set(runState.targetRosterNames || [])
  const prioritized = [
    ...captures.filter(c => targetSet.has(c.name)),
    ...captures.filter(c => !targetSet.has(c.name))
  ]

  const choices = [{ type: "none" }]
  for (const { id } of prioritized.slice(0, 3)) {
    choices.push({ type: "add_one", id })
  }
  return choices
}

function applyRosterChoice(runState, choice) {
  if (choice.type === "none") return runState
  if (choice.type === "add_one") return addToRoster(runState, choice.id)
  return runState
}

export function simulateRunSolver(initialRunState, waves, options = {}) {
  const beamWidth = options.beamWidth || RUN_BEAM_WIDTH
  const debug = Boolean(options.debug)
  const targetPlan =
    options.targetRosterPlan ||
    buildTargetRosterPlan({
      targetCount: options.targetRosterCount || 6
    })

  const seededInitialRunState = {
    ...initialRunState,
    targetRosterNames:
      initialRunState.targetRosterNames?.length
        ? initialRunState.targetRosterNames
        : targetPlan.targetRosterNames,
    targetBossCounterNames:
      initialRunState.targetBossCounterNames?.length
        ? initialRunState.targetBossCounterNames
        : targetPlan.targetBossCounterNames
  }

  if (!isRunStateValid(seededInitialRunState)) {
    if (debug) {
      console.debug(`state rejected: ${getRunStateInvalidReason(seededInitialRunState) || "run constraint"}`)
    }
    return {
      success: false,
      clearedWaves: seededInitialRunState.lastClearedWave || 0,
      finalRunState: seededInitialRunState
    }
  }

  let states = [
    {
      runState: seededInitialRunState,
      score: scoreRunState(seededInitialRunState),
      history: [],
      terminal: false
    }
  ]

  while (true) {
    const allTerminal = states.every(node => node.terminal)
    if (allTerminal) break

    const nextMap = new Map()

    for (const node of states) {
      if (node.terminal) {
        const key = hashRunState(node.runState)
        const existing = nextMap.get(key)
        if (!existing || node.score > existing.score) nextMap.set(key, node)
        continue
      }

      const runState = node.runState
      if (!isRunStateValid(runState)) {
        if (debug) {
          console.debug(`state rejected: ${getRunStateInvalidReason(runState) || "run constraint"}`)
        }
        continue
      }
      const waveNumber = runState.currentWave

      if (waveNumber > MAX_WAVE) {
        const doneNode = { ...node, terminal: true }
        const key = hashRunState(doneNode.runState)
        const existing = nextMap.get(key)
        if (!existing || doneNode.score > existing.score) nextMap.set(key, doneNode)
        continue
      }

      const waveDataRaw = waves?.[waveNumber]
      if (!waveDataRaw) {
        const failNode = { ...node, terminal: true }
        const key = hashRunState(failNode.runState)
        const existing = nextMap.get(key)
        if (!existing || failNode.score > existing.score) nextMap.set(key, failNode)
        continue
      }

      const waveData = normalizeWaveDataForRun(waveDataRaw, waveNumber)
      const preWaveBranches = generatePreWaveDecisions(runState)

      for (const branch of preWaveBranches) {
        const beforeWave = branch.runState
        if (!isRunStateValid(beforeWave)) {
          if (debug) {
            console.debug(`state rejected: ${getRunStateInvalidReason(beforeWave) || "run constraint"}`)
          }
          continue
        }
        const battleTeamState = getBattleTeamState(beforeWave)
        const actionConstraints = getActionConstraintsForWave(beforeWave)
        let generatedActionCombos = 0

        const waveResult = simulateWaveSolver(battleTeamState, waveData, {
          evolutionCharmCount: branch.useEvolutionCharm ? 1 : 0,
          playerActionOptions: actionConstraints,
          onActionsGenerated: count => {
            generatedActionCombos += count
          }
        })

        if (debug) {
          console.debug(
            `wave ${waveNumber}: generated action combos=${generatedActionCombos} ` +
            `(firstBoss=${beforeWave.bossStrategy?.firstBoss || "unset"}, ` +
            `secondBoss=${beforeWave.bossStrategy?.secondBoss || "unset"})`
          )
          if (generatedActionCombos === 0) {
            console.debug("state rejected: action generation returned 0 actions")
          }
        }

        let afterWave = applyWaveResult(beforeWave, {
          waveSuccess: waveResult.success,
          nextPlayerState: waveResult.playerState
        })

        if (branch.useEvolutionCharm && waveResult.success && (waveResult.captures || []).length > 0) {
          afterWave = {
            ...afterWave,
            charms: {
              ...afterWave.charms,
              evolution: Math.max(0, (afterWave.charms?.evolution || 0) - 1)
            }
          }
        }

        const captureIds = []
        for (const capturedName of waveResult.captures || []) {
          const captured = createCapturedPokemon(capturedName, waveData.level)
          captureIds.push(captured.id)
          afterWave = addAvailablePokemon(afterWave, captured)
        }

        const rosterChoices = generateRosterChoices(afterWave, captureIds)

        for (const rosterChoice of rosterChoices) {
          const childRunState = applyRosterChoice(afterWave, rosterChoice)
          if (!isRunStateValid(childRunState)) {
            if (debug) {
              console.debug(`state rejected: ${getRunStateInvalidReason(childRunState) || "run constraint"}`)
            }
            continue
          }
          const childTerminal = !waveResult.success || childRunState.currentWave > MAX_WAVE
          const childScore = scoreRunState(childRunState)

          const childNode = {
            runState: childRunState,
            score: childScore,
            history: [
              ...node.history,
              {
                wave: waveNumber,
                preDecision: branch.decision,
                rosterChoice,
                success: waveResult.success
              }
            ],
            terminal: childTerminal
          }

          const key = hashRunState(childRunState)
          const existing = nextMap.get(key)
          if (!existing || childNode.score > existing.score) {
            nextMap.set(key, childNode)
          }
        }
      }
    }

    states = [...nextMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, beamWidth)

    if (states.length === 0) break
  }

  states.sort((a, b) => b.score - a.score)
  const best = states[0]

  return {
    success: Boolean(best?.runState?.lastClearedWave >= MAX_WAVE),
    clearedWaves: best?.runState?.lastClearedWave || 0,
    finalRunState: best?.runState || seededInitialRunState
  }
}
