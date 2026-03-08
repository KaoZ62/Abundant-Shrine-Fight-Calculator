// battleEngine.js

export function simulateFullBattle({
  playerTeam,
  enemyTeam,
  calculateDamage,
  maxTurns = 20
}) {

  const state = {
    player: playerTeam.map(p => structuredClone(p)),
    enemy: {
      active: enemyTeam.slice(0, 2).map(e => structuredClone(e)),
      reserve: enemyTeam.slice(2).map(e => structuredClone(e))
    }
  }

  let turn = 0

  while (turn < maxTurns) {

    turn++

    const playerActions = choosePlayerActions(state)

    const result = simulateBattleTurn({
      state,
      playerActions,
      calculateDamage
    })

    if (result.result !== "ongoing") {
      return {
        ...result,
        turns: turn
      }
    }
  }

  return {
    result: "timeout",
    state,
    turns: turn
  }
}

// ==============================
// ONE TURN
// ==============================

export function simulateBattleTurn({
  state,
  playerActions,
  calculateDamage
}) {

  const actions = []

  // =================
  // PLAYER ACTIONS
  // =================

  for (const p of state.player) {

    if (p.hp <= 0) continue

    const act = playerActions[p.name]
    if (!act) continue

    actions.push({
      side: "player",
      user: p,
      move: act.move,
      target: act.target
    })
  }

  // =================
  // ENEMY ACTIONS
  // =================

  for (const e of state.enemy.active) {

    if (e.hp <= 0) continue

    actions.push({
      side: "enemy",
      user: e,
      move: e.moves?.[0] || "Tackle",
      target: "player"
    })
  }

  // =================
  // SPEED ORDER
  // =================

  actions.sort((a, b) => {
    const speA = a.user.speed || 0
    const speB = b.user.speed || 0
    return speB - speA
  })

  // =================
  // EXECUTE ACTIONS
  // =================

  for (const action of actions) {

    const attacker = action.user
    if (attacker.hp <= 0) continue

    const moveName = action.move

    if (attacker.moves?.[moveName]) {

      if (attacker.moves[moveName].pp <= 0) continue
      attacker.moves[moveName].pp--
    }

    let targets = []

    if (action.target === "all") {

      targets =
        action.side === "player"
          ? state.enemy.active
          : state.player

    } else {

      targets = [action.target]
    }

    for (const target of targets) {

      if (!target || target.hp <= 0) continue

      const res = calculateDamage({
        attackerName: attacker.name,
        defenderName: target.name,
        moveName,
        attackerLevel: attacker.level || 50,
        defenderLevel: target.level || 50,
        evEnabled: false,
        boosts: {},
        damageMultiplier: action.target === "all" ? 0.75 : 1,
        spreadHitsTwoTargets: action.target === "all",
        abilityEnabled: false
      })

      if (!res || res.error) continue

      const damagePercent = Number(res.percentMax)
      const damage = (damagePercent / 100) * target.maxHp

      target.hp -= damage

      if (target.hp < 0) target.hp = 0
    }
  }

  // =================
  // REMOVE FAINTED
  // =================

  state.enemy.active = state.enemy.active.filter(e => e.hp > 0)

  // =================
  // ADD REINFORCEMENTS
  // =================

  while (
    state.enemy.active.length < 2 &&
    state.enemy.reserve.length > 0
  ) {

    const next = state.enemy.reserve.shift()

    state.enemy.active.push(next)
  }

  // =================
  // CHECK RESULT
  // =================

  const playerAlive = state.player.some(p => p.hp > 0)

  const enemyAlive =
    state.enemy.active.length > 0 ||
    state.enemy.reserve.length > 0

  let result = "ongoing"

  if (!enemyAlive) result = "win"
  if (!playerAlive) result = "lose"

  return {
    result,
    state
  }
}

// ==============================
// TEMP PLAYER AI
// ==============================

function choosePlayerActions(state) {

  const actions = {}

  for (const p of state.player) {

    if (p.hp <= 0) continue

    const moves = Object.keys(p.moves || {})

    if (!moves.length) continue

    actions[p.name] = {
      move: moves[0],
      target: "all"
    }
  }

  return actions
}