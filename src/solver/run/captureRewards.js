// src/solver/run/captureRewards.js

export function resolveCapturedPokemonName(defeatedName, options = {}) {
  const evolutionCharmCount = options.evolutionCharmCount || 0
  const resolveBaseForm = options.resolveBaseForm || (name => name)

  if (evolutionCharmCount > 0) {
    return defeatedName
  }

  return resolveBaseForm(defeatedName) || defeatedName
}

export function buildWaveCaptures(defeatedEnemies, options = {}) {
  return (defeatedEnemies || []).map(name =>
    resolveCapturedPokemonName(name, options)
  )
}
