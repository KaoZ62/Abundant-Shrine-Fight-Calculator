import { pokemonList } from "./data.js"
import { getFavorites, isFavorite, toggleFavorite } from "./favorites.js"

export function createPicker({
  getSpriteUrl,
  setPickedPokemon,
  closePicker,
  getPickingTarget
}) {

  function renderGrid(query) {
    const q = (query || "").trim().toLowerCase()
    const favorites = getFavorites()

    const baseList = q
      ? pokemonList.filter(n => n.toLowerCase().includes(q))
      : pokemonList

    const filtered = q
      ? baseList
      : baseList.filter(n => !favorites.includes(n))

    document.getElementById("pokeCount").textContent =
      `${filtered.length} Pokémon`

    const grid = document.getElementById("pokeGrid")
    const favContainer = document.getElementById("pokeFavorites")

    grid.innerHTML = ""
    favContainer.innerHTML = ""

    if (!q && favorites.length) {
      favContainer.innerHTML = `
        <div style="margin-bottom:18px;">
          <div style="font-size:14px;margin-bottom:10px;opacity:0.85;">
            ⭐ Favoris
          </div>

          <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;">
            ${favorites.map(name => `
              <button type="button" data-name="${name}"
                style="position:relative;display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;border:1px solid #444;background:#111;color:inherit;cursor:pointer;text-align:left;min-width:170px;">

                <div class="fav-toggle"
                  data-fav="${name}"
                  style="position:absolute;top:6px;right:8px;font-size:16px;cursor:pointer;">
                  ⭐
                </div>

                <img src="${getSpriteUrl(name)}"
                  style="width:40px;height:40px;object-fit:contain;image-rendering:pixelated;" />
                <span>${name}</span>
              </button>
            `).join("")}
          </div>

          <hr style="margin:18px 0;border:0;border-top:1px solid #333;">
        </div>
      `
    }

    grid.innerHTML = filtered.map(name => {
      const star = isFavorite(name) ? "⭐" : "☆"

      return `
        <button type="button" data-name="${name}"
          style="position:relative;display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;border:1px solid #333;background:#0b0b0b;color:inherit;cursor:pointer;text-align:left;">
          
          <div class="fav-toggle"
            data-fav="${name}"
            style="position:absolute;top:6px;right:8px;font-size:16px;cursor:pointer;">
            ${star}
          </div>

          <img src="${getSpriteUrl(name)}"
            style="width:40px;height:40px;object-fit:contain;image-rendering:pixelated;" />
          <span>${name}</span>
        </button>
      `
    }).join("")

    grid.onclick = (e) => {
      const fav = e.target.closest(".fav-toggle")
      if (fav) {
        e.stopPropagation()
        toggleFavorite(fav.dataset.fav)
        renderGrid(query)
        return
      }

      const btn = e.target.closest("button[data-name]")
      if (btn) {
        const target = getPickingTarget()
        if (!target) return
        setPickedPokemon(target, btn.dataset.name)
        closePicker()
      }
    }
  }

  return { renderGrid }
}