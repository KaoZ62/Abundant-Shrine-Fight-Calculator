/**
 * Retourne la bonne clé selon le contexte.
 */
function getStorageKey(target) {
  if (target === "defender") {
    return "abundant_favorite_defenders"
  }
  return "abundant_favorite_attackers"
}

/**
 * Récupère les favoris depuis le storage.
 */
export function getFavorites(target = "attacker") {
  try {
    const key = getStorageKey(target)
    const raw = localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return [...new Set(parsed)]
  } catch {
    return []
  }
}

/**
 * Sauvegarde proprement une liste.
 */
function saveFavorites(list, target) {
  const key = getStorageKey(target)
  const clean = [...new Set(list)]
  localStorage.setItem(key, JSON.stringify(clean))
}

/**
 * Vérifie si un Pokémon est favori.
 */
export function isFavorite(name, target = "attacker") {
  return getFavorites(target).includes(name)
}

/**
 * Ajoute un favori.
 */
export function addFavorite(name, target = "attacker") {
  const favs = getFavorites(target)
  if (favs.includes(name)) return false

  favs.push(name)
  saveFavorites(favs, target)
  return true
}

/**
 * Retire un favori.
 */
export function removeFavorite(name, target = "attacker") {
  const favs = getFavorites(target)
  if (!favs.includes(name)) return false

  const updated = favs.filter(p => p !== name)
  saveFavorites(updated, target)
  return true
}

/**
 * Toggle favori.
 */
export function toggleFavorite(name, target = "attacker") {
  return isFavorite(name, target)
    ? removeFavorite(name, target)
    : addFavorite(name, target)
}