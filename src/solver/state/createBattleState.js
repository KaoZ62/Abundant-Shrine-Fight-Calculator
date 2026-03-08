// solver/state/createBattleState.js

import { pokemonData } from "../pokemonDataClean.js"
import { getSpeedInfo } from "../../calculator.js"
import { createPokemonId } from "./pokemonId.js"

function createPokemonState(name, level, existingState = null, options = {}) {
  const strengthCharm =
    existingState?.strengthCharm ??
    options.defaultStrengthCharm ??
    false


  const data = pokemonData[name]

  if (!data) {
    throw new Error(`Missing pokemon data for ${name}`)
  }

  const moves = data.moves.map(move => {

    const existingMove = existingState?.moves?.find(m => m.name === move)

    return {
      name: move,
      pp: existingMove ? existingMove.pp : 10,
      maxPP: existingMove ? existingMove.maxPP : 10
    }
  })

  const { attackerSpe } = getSpeedInfo({
  attackerName: name,
  defenderName: name,
  attackerLevel: level,
  defenderLevel: level,
  evEnabled: strengthCharm
})

return {
  id: existingState?.id || createPokemonId(),
  name,
  level,

  ability: data.ability,
  strengthCharm,

  speed: attackerSpe,

  hp: existingState ? existingState.hp : 100,
  maxHp: existingState ? existingState.maxHp : 100,

  alive: existingState?.alive ?? true,

  moves
}
}

function createEmptyPokemonState() {
  return {
    id: createPokemonId(),
    name: "__EMPTY__",
    level: 1,
    ability: null,
    speed: 0,
    strengthCharm: false,
    hp: 0,
    maxHp: 100,
    alive: false,
    moves: []
  }
}

export function createBattleState({
  playerTeam,
  waveData
}) {

  const enemies = waveData.defenders

  const enemyActive = enemies.slice(0, 2)
  const enemyQueue = enemies.slice(2)
  const playerSlots = [0, 1, 2, 3].map(index => {
    const member = playerTeam?.[index]
    if (!member?.name) return createEmptyPokemonState()
    return createPokemonState(member.name, member.level, member)
  })

  const state = {

    turn: 1,

    player: {
      active: [
        playerSlots[0],
        playerSlots[1]
      ],

      bench: [
        playerSlots[2],
        playerSlots[3]
      ]
    },

    enemy: {
      active: enemyActive.map(name =>
        createPokemonState(name, waveData.level)
      ),

      queue: enemyQueue.map(name =>
        createPokemonState(name, waveData.level)
      )
    }

  }

  return state
}