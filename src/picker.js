import { pokemonList } from "./data.js"
import { getFavorites, isFavorite, toggleFavorite } from "./favorites.js"
import { Generations, Pokemon } from "@smogon/calc"

const gen = Generations.get(5)

function getPokemonTypes(name) {
  try {
    const p = new Pokemon(gen, name, { level: 50 })
    return p.types || []
  } catch {
    return []
  }
}
console.log(gen)
// 🔥 Récupérer tous les types uniques présents dans la liste
function getAllTypes() {
  const typeSet = new Set()

  pokemonList.forEach(name => {
    const types = getPokemonTypes(name)
    types.forEach(t => typeSet.add(t))
  })

  return Array.from(typeSet).sort()
}

export function createPicker({
  getSpriteUrl,
  setPickedPokemon,
  closePicker,
  getPickingTarget
}) {

  function ensureTypeFilterExists() {
    if (document.getElementById("typeFilter")) return

    const types = getAllTypes()

    const select = document.createElement("select")
    select.id = "typeFilter"
    select.style.marginBottom = "12px"
    select.style.padding = "6px"
    select.style.borderRadius = "8px"
    select.style.background = "#111"
    select.style.color = "white"
    select.style.border = "1px solid #333"

    select.innerHTML = `
      <option value="">All Types</option>
      ${types.map(t => `<option value="${t}">${t}</option>`).join("")}
    `

    const count = document.getElementById("pokeCount")
    count.parentNode.insertBefore(select, count)

    select.addEventListener("change", () => {
      renderGrid(document.getElementById("pokeSearch")?.value || "")
    })
  }

  function renderGrid(query) {
    ensureTypeFilterExists()

    const q = (query || "").trim().toLowerCase()
    const selectedType = document.getElementById("typeFilter")?.value || ""
    const favorites = getFavorites()

    let baseList = q
      ? pokemonList.filter(n => n.toLowerCase().includes(q))
      : pokemonList

    // 🔥 TYPE FILTER
    if (selectedType) {
      baseList = baseList.filter(name =>
        getPokemonTypes(name).includes(selectedType)
      )
    }

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