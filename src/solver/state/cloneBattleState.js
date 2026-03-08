// src/solver/state/cloneBattleState.js

export function cloneBattleState(state) {

  return {

    turn: state.turn,

    player: {
      active: state.player.active.map(clonePokemon),
      bench: state.player.bench.map(clonePokemon)
    },

    enemy: {
      active: state.enemy.active.map(clonePokemon),
      queue: state.enemy.queue.map(clonePokemon)
    }

  }
}

function clonePokemon(p) {

  return {

    name: p.name,
    id: p.id,
    level: p.level,
    ability: p.ability,
    strengthCharm: p.strengthCharm ?? false,

    hp: p.hp,
    maxHp: p.maxHp,

    speed: p.speed,

    alive: p.alive,

    moves: p.moves.map(m => ({
      name: m.name,
      pp: m.pp,
      maxPP: m.maxPP
    }))
  }
}