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

const TYPE_COLORS = {
  Normal: "#A8A77A",
  Fire: "#EE8130",
  Water: "#6390F0",
  Electric: "#F7D02C",
  Grass: "#7AC74C",
  Ice: "#96D9D6",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#E2BF65",
  Flying: "#A98FF3",
  Psychic: "#F95587",
  Bug: "#A6B91A",
  Rock: "#B6A136",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#705746",
  Steel: "#B7B7CE"
}

function darkenColor(hex, amount = 0.25) {
  const num = parseInt(hex.replace("#", ""), 16)
  let r = (num >> 16) & 255
  let g = (num >> 8) & 255
  let b = num & 255
  r = Math.floor(r * (1 - amount))
  g = Math.floor(g * (1 - amount))
  b = Math.floor(b * (1 - amount))
  return `rgb(${r}, ${g}, ${b})`
}

function getAllTypes() {
  const typeSet = new Set()
  pokemonList.forEach(name => {
    getPokemonTypes(name).forEach(t => typeSet.add(t))
  })
  return Array.from(typeSet).sort()
}

export function createPicker({
  getSpriteUrl,
  setPickedPokemon,
  closePicker,
  getPickingTarget
}) {

  let activeType = null

  function ensureTypeFilterExists() {
    if (document.getElementById("typeFilterBar")) return

    const types = getAllTypes()

    const bar = document.createElement("div")
    bar.id = "typeFilterBar"
    bar.style.display = "flex"
    bar.style.flexWrap = "nowrap"
    bar.style.overflowX = "auto"
    bar.style.gap = "6px"
    bar.style.marginBottom = "10px"

    types.forEach(type => {
      const btn = document.createElement("button")
      btn.textContent = type

      btn.style.padding = "4px 8px"
      btn.style.borderRadius = "6px"
      btn.style.border = "none"
      btn.style.cursor = "pointer"
      btn.style.color = "white"
      btn.style.fontWeight = "600"
      btn.style.fontSize = "14px"
      btn.style.lineHeight = "1.1"
      btn.style.whiteSpace = "nowrap"
      btn.style.background = darkenColor(TYPE_COLORS[type] || "#777")

      btn.onclick = () => {
        activeType = activeType === type ? null : type
        renderGrid(document.getElementById("pokeSearch")?.value || "")
      }

      bar.appendChild(btn)
    })

    const count = document.getElementById("pokeCount")
    count.parentNode.insertBefore(bar, count)

    // 🔥 RESET BUTTON ROW
    const resetRow = document.createElement("div")
    resetRow.style.display = "flex"
    resetRow.style.justifyContent = "space-between"
    resetRow.style.alignItems = "center"
    resetRow.style.marginBottom = "12px"

    const left = document.createElement("div")
    left.id = "pokeCountWrapper"
    left.appendChild(count)

    const resetBtn = document.createElement("button")
    resetBtn.textContent = "Reset"
    resetBtn.style.padding = "6px 14px"
    resetBtn.style.borderRadius = "8px"
    resetBtn.style.border = "1px solid #444"
    resetBtn.style.background = "#1f1f1f"
    resetBtn.style.color = "white"
    resetBtn.style.fontWeight = "600"
    resetBtn.style.cursor = "pointer"
    resetBtn.style.fontSize = "15px"

    resetBtn.onclick = () => {
      activeType = null
      const search = document.getElementById("pokeSearch")
      if (search) search.value = ""
      renderGrid("")
    }

    resetRow.appendChild(left)
    resetRow.appendChild(resetBtn)

    bar.parentNode.insertBefore(resetRow, bar.nextSibling)
  }

  function renderGrid(query) {
    ensureTypeFilterExists()

    const target = getPickingTarget() || "attacker"
    const q = (query || "").trim().toLowerCase()
    const favorites = getFavorites(target)

    let baseList = q
      ? pokemonList.filter(n => n.toLowerCase().includes(q))
      : pokemonList

    if (activeType) {
      baseList = baseList.filter(name =>
        getPokemonTypes(name).includes(activeType)
      )
    }

    const favs = baseList.filter(n => favorites.includes(n))
    const others = baseList.filter(n => !favorites.includes(n))

    const grid = document.getElementById("pokeGrid")
    grid.style.display = "grid"
    grid.style.gridTemplateColumns = "repeat(4, 1fr)"
    grid.style.gap = "12px"
    grid.innerHTML = ""

    const totalCount = favs.length + others.length
    document.getElementById("pokeCount").textContent =
      `${totalCount} Pokémon`

    function renderCard(name) {
      const star = isFavorite(name, target) ? "⭐" : "☆"
      const types = getPokemonTypes(name)

      return `
        <button type="button" data-name="${name}"
          style="position:relative;
                 display:flex;
                 align-items:center;
                 gap:12px;
                 padding:14px;
                 border-radius:14px;
                 border:1px solid #333;
                 background:#0b0b0b;
                 color:inherit;
                 cursor:pointer;
                 text-align:left;">

          <div class="fav-toggle"
            data-fav="${name}"
            style="position:absolute;top:6px;right:8px;font-size:16px;cursor:pointer;">
            ${star}
          </div>

          <img src="${getSpriteUrl(name)}"
            style="width:48px;height:48px;object-fit:contain;image-rendering:pixelated;" />

          <div style="display:flex;flex-direction:column;">
            <span style="font-size:16px;font-weight:600;">
              ${name}
            </span>

            <div style="display:flex;gap:6px;margin-top:6px;">
              ${types.map(type => `
                <span style="
                  background:${darkenColor(TYPE_COLORS[type] || "#777")};
                  padding:2px 8px;
                  border-radius:6px;
                  font-size:12px;
                  font-weight:600;
                  color:white;">
                  ${type}
                </span>
              `).join("")}
            </div>
          </div>
        </button>
      `
    }

    if (favs.length > 0) {
      grid.innerHTML += favs.map(renderCard).join("")

      if (others.length > 0) {
        grid.innerHTML += `
          <div style="
            grid-column: 1 / -1;
            height:1px;
            background:#333;
            margin:6px 0;
          "></div>
        `
      }
    }

    grid.innerHTML += others.map(renderCard).join("")

    grid.onclick = (e) => {
      const fav = e.target.closest(".fav-toggle")
      if (fav) {
        e.stopPropagation()
        toggleFavorite(fav.dataset.fav, target)
        renderGrid(query)
        return
      }

      const btn = e.target.closest("button[data-name]")
      if (btn) {
        setPickedPokemon(target, btn.dataset.name)
        activeType = null
        closePicker()
      }
    }
  }

  return { renderGrid }
}