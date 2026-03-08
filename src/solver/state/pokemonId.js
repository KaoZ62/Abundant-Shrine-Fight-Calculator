// src/solver/state/pokemonId.js

let nextPokemonId = 1

export function createPokemonId() {
  const id = `pokemon_${nextPokemonId}`
  nextPokemonId += 1
  return id
}

export function ensurePokemonId(pokemon) {
  if (!pokemon) return pokemon
  if (pokemon.id) return pokemon
  return {
    ...pokemon,
    id: createPokemonId()
  }
}
