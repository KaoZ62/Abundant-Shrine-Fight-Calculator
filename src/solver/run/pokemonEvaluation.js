// src/solver/run/pokemonEvaluation.js

import { Generations, Move } from "@smogon/calc"
import { pokemonData } from "../pokemonDataClean.js"

const gen = Generations.get(5)

function getMove(moveName) {
  try {
    return new Move(gen, moveName)
  } catch {
    return null
  }
}

function getMovePower(moveName) {
  const move = getMove(moveName)
  const power = Number(move?.bp || move?.basePower || 0)
  return Number.isFinite(power) ? power : 0
}

function isSpreadMove(moveName) {
  const move = getMove(moveName)
  if (!move) return false
  const target = move.target
  return target === "allAdjacent" || target === "allAdjacentFoes" || target === "all"
}

function isFireMove(moveName) {
  const move = getMove(moveName)
  const type = typeof move?.type === "string" ? move.type : move?.type?.name
  return type === "Fire"
}

function isBossCandidateByMovesOrMedicham(pokemon) {
  const moves = getPokemonMoves(pokemon)
  if (pokemon?.name === "Medicham") return true
  return moves.some(move => isFireMove(move.name))
}

function isBossWeaknessMove(moveName) {
  const move = getMove(moveName)
  const type = typeof move?.type === "string" ? move.type : move?.type?.name
  return type === "Fire" || type === "Fighting" || type === "Bug"
}

function getPokemonMoves(pokemon) {
  if (pokemon?.moves?.length) return pokemon.moves
  const names = pokemonData?.[pokemon?.name]?.moves || []
  return names.map(name => ({ name, pp: 10, maxPP: 10 }))
}

export function estimateWaveClearingCapacity(pokemon) {
  const moves = getPokemonMoves(pokemon)
  let baseCapacity = 0

  for (const move of moves) {
    const pp = Number(move.pp ?? move.maxPP ?? 0)
    if (pp <= 0) continue
    const multiplier = isSpreadMove(move.name) ? 2 : 1
    baseCapacity += pp * multiplier
  }

  const speed = Number(pokemon?.speed || 100)
  const speedFactor = speed / 150

  return baseCapacity * speedFactor
}

export function evaluatePokemonUtility(pokemon, { currentWave = 1 } = {}) {
  const moves = getPokemonMoves(pokemon)
  const capacity = estimateWaveClearingCapacity(pokemon)
  const avgPower = moves.length
    ? moves.reduce((sum, move) => sum + getMovePower(move.name), 0) / moves.length
    : 0
  const supportScore = moves.reduce((sum, move) => {
    if (move.name === "Helping Hand") return sum + 25
    if (move.name === "Dragon's Blessing") return sum + (currentWave >= 13 ? 30 : 1)
    return sum
  }, 0)
  const spreadScore = moves.filter(move => isSpreadMove(move.name)).length * 20
  const speedScore = Number(pokemon?.speed || 0) * 0.15

  return {
    capacity,
    avgPower,
    supportScore,
    spreadScore,
    speedScore,
    score:
      (capacity * 6) +
      (avgPower * 0.4) +
      supportScore +
      spreadScore +
      speedScore
  }
}

export function evaluateBossCounterCandidate(pokemon, { currentWave = 1 } = {}) {
  const moves = getPokemonMoves(pokemon)

  // 1) Base wave clearing capacity: sum(PP * killMultiplier)
  const baseCapacity = moves.reduce((sum, move) => {
    const pp = Number(move.pp ?? move.maxPP ?? 0)
    if (pp <= 0) return sum
    const killMultiplier = isSpreadMove(move.name) ? 2 : 1
    return sum + (pp * killMultiplier)
  }, 0)

  // 2) Speed-scaled capacity.
  const speed = Number(pokemon?.speed || 100)
  const capacityScore = baseCapacity * (speed / 150)

  // 3) Support utility.
  const supportScore = moves.reduce((sum, move) => {
    if (move.name === "Helping Hand") return sum + 35
    if (move.name === "Dragon's Blessing") return sum + (currentWave >= 13 ? 40 : 5)
    return sum
  }, 0)

  // 4) Boss damage potential from Fire/Fighting/Bug moves.
  const bossDamagePotential = moves.reduce((sum, move) => {
    if (!isBossWeaknessMove(move.name)) return sum
    const pp = Number(move.pp ?? move.maxPP ?? 0)
    const power = getMovePower(move.name)
    return sum + ((power * pp) / 10)
  }, 0)

  return {
    baseCapacity,
    capacityScore,
    supportScore,
    bossDamagePotential,
    score:
      (capacityScore * 4) +
      supportScore +
      (bossDamagePotential * 1.2)
  }
}

export function rankBossCounterCandidates(pokemonList, { currentWave = 1 } = {}) {
  const candidates = []

  for (const pokemon of pokemonList || []) {
    if (!pokemon?.name) continue
    if (!isBossCandidateByMovesOrMedicham(pokemon)) continue

    candidates.push({
      pokemon,
      ...evaluateBossCounterCandidate(pokemon, { currentWave })
    })
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return String(a.pokemon.name).localeCompare(String(b.pokemon.name))
  })
  return candidates
}

export function rankFireCandidates(pokemonList, { currentWave = 1 } = {}) {
  // Backward-compatible alias; now uses explicit boss-counter ranking.
  return rankBossCounterCandidates(pokemonList, { currentWave })
}

export function getMoveMeta(moveName) {
  return {
    power: getMovePower(moveName),
    spread: isSpreadMove(moveName),
    fire: isFireMove(moveName)
  }
}

