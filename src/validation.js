import { Generations, Move, Pokemon } from '@smogon/calc'

const gen = Generations.get(5)

/* ------------------ NORMALISATION ------------------ */

export function normalizeMoveName(name) {
  if (!name) return ''

  return name
    .replace(/\u00A0/g, ' ') // supprime espaces invisibles
    .replace(/\s+/g, ' ')
    .replace(/\(\s*/g, ' ')
    .replace(/\s*\)/g, '')
    .trim()
}

export function fixHiddenPower(name) {
  const match = name.match(/Hidden Power\s*\(?\s*(\w+)\s*\)?/i)
  if (match) {
    return `Hidden Power ${match[1]}`
  }
  return name
}

/* ------------------ VALIDATION MOVE ------------------ */

export function validateMove(moveName) {
  try {
    let name = normalizeMoveName(moveName)
    name = fixHiddenPower(name)

    const move = new Move(gen, name)

    if (!move.name || typeof move.basePower !== 'number') {
      return { valid: false, reason: 'Move introuvable en Gen 5' }
    }

    return { valid: true, name: move.name }

  } catch {
    return { valid: false, reason: 'Move invalide' }
  }
}

/* ------------------ VALIDATION TALENT ------------------ */

export function validateAbility(pokemonName, abilityName, baseStats) {
  try {
    const pokemon = new Pokemon(gen, pokemonName, {
      ability: abilityName,
      overrides: { baseStats }
    })

    if (!pokemon.ability || pokemon.ability !== abilityName) {
      return { valid: false, reason: 'Talent invalide en Gen 5' }
    }

    return { valid: true }

  } catch {
    return { valid: false, reason: 'Talent invalide' }
  }
}