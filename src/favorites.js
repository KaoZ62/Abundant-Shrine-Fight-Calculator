const STORAGE_KEY = "abundant_favorite_attackers"

/**
 * Récupère les favoris depuis le storage.
 * Sécurise contre données corrompues.
 */
export function getFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    // Supprime doublons éventuels
    return [...new Set(parsed)]
  } catch {
    return []
  }
}

/**
 * Sauvegarde proprement une liste.
 */
function saveFavorites(list) {
  const clean = [...new Set(list)]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

/**
 * Vérifie si un Pokémon est favori.
 */
export function isFavorite(name) {
  return getFavorites().includes(name)
}

/**
 * Ajoute un favori (si pas déjà présent).
 */
export function addFavorite(name) {
  const favs = getFavorites()
  if (favs.includes(name)) return false

  favs.push(name)
  saveFavorites(favs)
  return true
}

/**
 * Retire un favori.
 */
export function removeFavorite(name) {
  const favs = getFavorites()
  if (!favs.includes(name)) return false

  const updated = favs.filter(p => p !== name)
  saveFavorites(updated)
  return true
}

/**
 * Toggle favori (ajout / retrait).
 */
export function toggleFavorite(name) {
  return isFavorite(name)
    ? removeFavorite(name)
    : addFavorite(name)
}