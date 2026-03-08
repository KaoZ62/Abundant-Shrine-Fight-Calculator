// src/solver/battle/actionOrder.js

const CUSTOM_PRIORITY_MOVES = [
  "Serpent's Fear",
  "Dragon's Blessing",
  "Mending Prayer",
  "Joyous Cheer",
  "Flash of Speed",
  "Protective Aura",
  "Horse's Protection"
]

function getMovePriority(moveName) {

  if (moveName === "Helping Hand") return 5

  if (moveName === "Protect") return 4

  if (moveName === "Fake Out") return 3

  if (CUSTOM_PRIORITY_MOVES.includes(moveName)) return 4

  return 0
}

export function orderActions(actions) {

  return actions.sort((a, b) => {

    const pA = getMovePriority(a.move)
    const pB = getMovePriority(b.move)

    // priorité
    if (pA !== pB) {
      return pB - pA
    }

    // vitesse
    if (a.speed !== b.speed) {
      return b.speed - a.speed
    }

    // stabilité
    return 0
  })
}