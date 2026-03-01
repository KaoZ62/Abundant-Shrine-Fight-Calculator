import { pokemonList, boostOptions, damageMultipliers, pokemonData } from "./data.js"
import { calculateDamage, getSpeedInfo } from "./calculator.js"
import { getFavorites, isFavorite, toggleFavorite } from "./favorites.js"
import { createPicker, TYPE_COLORS, darkenColor } from "./picker.js"
import { Generations, Move, Pokemon } from "@smogon/calc"
import { RAW_WAVES, buildWaveIndex } from "./waves.js"
import { initMiniGame } from "./miniGame.js"

const waveIndex = buildWaveIndex(RAW_WAVES)
const chineseAnimals = [...new Set(
  Object.values(waveIndex).map(w => w.animal)
)]
const gen = Generations.get(5)

// --- Sprites (Option 1: PokemonDB) ---
function toPokemonDbId(name) {
  if (name === "Nidoran♀") return "nidoran-f"
  if (name === "Nidoran♂") return "nidoran-m"

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

function getSpriteUrl(name) {
  return `https://img.pokemondb.net/sprites/black-white/anim/normal/${toPokemonDbId(name)}.gif`
}

// --- Helpers ---
function numOptions(list, selected) {
  return list
    .map(v => `<option value="${v}" ${v === selected ? "selected" : ""}>${v}</option>`)
    .join("")
}



function options(list, selected) {
  return list.map(v => `<option ${v === selected ? "selected" : ""}>${v}</option>`).join("")
}

function getMovesFor(pokemonName) {
  return pokemonData?.[pokemonName]?.moves ?? []
}
function getItemImage(name) {
  if (!name) return ""
  const imgName = name.toLowerCase().replace(/ /g, "-")
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${imgName}.png`
}

function isSpreadMove(moveName) {
  try {
    const move = new Move(gen, moveName)
    const spreadTargets = ["allAdjacent", "allAdjacentFoes", "all"]
    return spreadTargets.includes(move.target)
  } catch {
    return false
  }
}

function getWeaknesses(defenderName) {
  try {
    const p = new Pokemon(gen, defenderName)
    if (!p.types || !p.types.length) return []

    // Gen 5 type chart (no Fairy). Only non-1 multipliers are listed.
    const TYPE_CHART = {
      Normal: { Rock: 0.5, Steel: 0.5, Ghost: 0 },
      Fire: { Grass: 2, Ice: 2, Bug: 2, Steel: 2, Fire: 0.5, Water: 0.5, Rock: 0.5, Dragon: 0.5 },
      Water: { Fire: 2, Ground: 2, Rock: 2, Water: 0.5, Grass: 0.5, Dragon: 0.5 },
      Electric: { Water: 2, Flying: 2, Electric: 0.5, Grass: 0.5, Dragon: 0.5, Ground: 0 },
      Grass: {
        Water: 2, Ground: 2, Rock: 2,
        Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Dragon: 0.5, Steel: 0.5
      },
      Ice: { Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
      Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Ghost: 0 },
      Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
      Ground: { Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2, Grass: 0.5, Bug: 0.5, Flying: 0 },
      Flying: { Grass: 2, Fighting: 2, Bug: 2, Electric: 0.5, Rock: 0.5, Steel: 0.5 },
      Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
      Bug: {
        Grass: 2, Psychic: 2, Dark: 2,
        Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5
      },
      Rock: { Fire: 2, Ice: 2, Flying: 2, Bug: 2, Fighting: 0.5, Ground: 0.5, Steel: 0.5 },
      Ghost: { Psychic: 2, Ghost: 2, Dark: 0.5, Normal: 0 },
      Dragon: { Dragon: 2, Steel: 0.5 },
      Dark: { Psychic: 2, Ghost: 2, Fighting: 0.5, Dark: 0.5, Steel: 0.5 },
      Steel: { Ice: 2, Rock: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5 }
    }

    const allTypes = Object.keys(TYPE_CHART)
    const weaknesses = []

    for (const atkType of allTypes) {
      let mult = 1
      const row = TYPE_CHART[atkType] || {}

      for (const defType of p.types) {
        const m = row[defType] ?? 1
        mult *= m
      }

      if (mult > 1) weaknesses.push({ type: atkType, multiplier: mult })
    }

    return weaknesses.sort((a, b) => b.multiplier - a.multiplier)
  } catch (e) {
    console.log("Weakness error:", e)
    return []
  }
}



export function renderUI() {
  // ===== CALCULATOR ITEMS =====
const CALC_ITEMS = [
  "Expert Belt","Muscle Band","Wise Glasses",
  "Flame Plate","Splash Plate","Zap Plate","Meadow Plate",
  "Icicle Plate","Fist Plate","Toxic Plate","Earth Plate",
  "Sky Plate","Mind Plate","Insect Plate","Stone Plate",
  "Spooky Plate","Draco Plate","Dread Plate","Iron Plate",
  "Life Orb","Choice Band","Choice Specs"
]

let selectedItem = null
  let miniGameApi = null
  const defaultAttacker = pokemonList[0]

  const defaultDefender = pokemonList[0]

  const defaultMoves = getMovesFor(defaultAttacker)
  const defaultMove = defaultMoves[0] ?? ""

  document.querySelector("#app").innerHTML = `
  
    <!-- TABS (top-left fixed) -->
    <div style="
      position:fixed;
      top:16px;
      left:16px;
      display:flex;
      gap:10px;
      z-index:2000;
    ">
      <button id="tab-calculator"
        style="
          padding:8px 16px;
          border-radius:12px;
          border:1px solid #444;
          background:#1a1a1a;
          color:inherit;
          cursor:pointer;
        ">
        Calculator
      </button>

      <button id="tab-mini-game"
        style="
          padding:8px 16px;
          border-radius:12px;
          border:1px solid #444;
          background:#1a1a1a;
          color:inherit;
          cursor:pointer;
        ">
        Mini Game
      </button>
    </div>

    <div style="max-width:860px;margin:0 auto;padding:24px;text-align:center;padding-top:70px;">
      <!-- ================= CALCULATOR SECTION ================= -->
      <div id="calculator-section">
        <h1 style="margin-bottom:18px;">Abundant Shrine Calculator</h1>

        <!-- Top row -->
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:center;">
          <label>Attacker:</label>

          <button id="attackerBtn" type="button"
            style="
              display:inline-flex;
              align-items:center;
              gap:12px;
              padding:10px 18px;
              border-radius:16px;
              border:1px solid #888;
              background:transparent;
              color:inherit;
              cursor:pointer;
              flex:0 0 auto;
            ">
            <img id="attackerImg"
              style="
                width:56px;
                height:56px;
                object-fit:contain;
                image-rendering:pixelated;
                flex:0 0 56px;
              " />
            <span id="attackerLabel" style="font-size:18px;font-weight:700;"></span>
          </button>

          <input id="attacker" type="hidden" value="${defaultAttacker}" />

          <label>Atk Lvl:</label>
          <input id="attackerLevel" type="number" min="1" max="100" value="50" style="width:70px;" />

          <label>Move:</label>
          <select id="move">${options(defaultMoves, defaultMove)}</select>
        </div>

        <!-- Middle row -->
        <div style="margin-top:12px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;align-items:center;">
          <label>
            <input type="checkbox" id="evToggle" checked />
            Strength Charm
          </label>

          <label>
            <input type="checkbox" id="abilityToggle" checked />
            Ability active
          </label>

          <label>Boost Atk:</label>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" id="atkMinus"
              style="width:22px;height:22px;padding:0;font-size:13px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center;">
              −
            </button>

            <span id="boostAtkDisplay" style="min-width:22px;text-align:center;font-weight:700;font-size:14px;">0</span>

            <button type="button" id="atkPlus"
              style="width:22px;height:22px;padding:0;font-size:13px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center;">
              +
            </button>

            <input type="hidden" id="boostAtk" value="0" />
          </div>

          <label>Boost SpA:</label>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" id="spaMinus"
              style="width:22px;height:22px;padding:0;font-size:13px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center;">
              −
            </button>

            <span id="boostSpaDisplay" style="min-width:22px;text-align:center;font-weight:700;font-size:14px;">0</span>

            <button type="button" id="spaPlus"
              style="width:22px;height:22px;padding:0;font-size:13px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center;">
              +
            </button>

            <input type="hidden" id="boostSpa" value="0" />
          </div>

          <div style="flex-basis:100%;height:0;"></div>

          <label>Item:</label>

<div id="calcItemDropdown" style="position:relative; min-width:220px;">
  <div id="calcItemSelected"
    style="
      padding:6px 10px;
      border-radius:8px;
      background:#1a1a1a;
      border:1px solid #444;
      cursor:pointer;
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      align-items:center;
    ">
    None ▾
  </div>

  <div id="calcItemList"
    style="
      position:absolute;
      top:110%;
      left:0;
      right:0;
      max-height:260px;
      overflow:auto;
      background:#111;
      border:1px solid #444;
      border-radius:8px;
      display:none;
      z-index:5000;
    ">
  </div>
</div>

          <label>
            <input type="checkbox" id="spreadToggle" />
            Doubles (2 targets / AOE move)
          </label>
        </div>

        <hr style="margin:22px 0;opacity:0.2;" />

        <!-- Defender -->
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:center;">
          <label>Defender:</label>

          <button id="defenderBtn" type="button"
            style="
              display:inline-flex;
              align-items:center;
              gap:12px;
              padding:10px 18px;
              border-radius:16px;
              border:1px solid #888;
              background:transparent;
              color:inherit;
              cursor:pointer;
              flex:0 0 auto;
            ">
            <img id="defenderImg"
              style="width:56px;height:56px;object-fit:contain;image-rendering:pixelated;flex:0 0 56px;" />
            <span id="defenderLabel" style="font-size:18px;font-weight:700;"></span>
          </button>

          <input id="defender" type="hidden" value="${defaultDefender}" />

          <label>Def Lvl:</label>
          <input id="defenderLevel" type="number" min="1" max="100" value="50" style="width:70px;" />
        </div>

        <div id="defWeaknesses" style="margin-top:10px;"></div>
        <div id="speedInfo" style="margin-top:14px;font-size:18px;font-weight:700;"></div>
        <div id="result" style="margin-top:18px;"></div>
      </div>
<div id="mini-game-section" style="display:none; margin-top:20px;"></div>
  
    <!-- Modal Pokémon Picker -->
    <div id="pokeModal"
      style="position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);padding:18px;z-index:9999;">
      <div style="width:min(920px, 96vw);max-height:85vh;overflow:auto;background:#111;border:1px solid #444;border-radius:16px;padding:14px;">
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
          <div style="font-weight:700;" id="pokeModalTitle">Select Pokémon</div>
          <button id="pokeClose" type="button"
            style="padding:10px 14px;border-radius:12px;border:1px solid #444;background:transparent;color:inherit;cursor:pointer;">Close</button>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <input id="pokeSearch" placeholder="Search Pokémon..."
            style="flex:1;min-width:240px;padding:10px;border-radius:12px;border:1px solid #444;background:#0b0b0b;color:inherit;" />
          <div style="opacity:0.8;font-size:12px;" id="pokeCount"></div>
        </div>

        <div id="pokeFavorites"></div>

        <div id="pokeGrid"
          style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));gap:10px;">
        </div>
      </div>
    </div>
  `

  // ===== TAB SWITCH =====
  const calculatorSection = document.getElementById("calculator-section")
  const miniGameSection = document.getElementById("mini-game-section")
  const tabCalc = document.getElementById("tab-calculator")
  const tabMini = document.getElementById("tab-mini-game")

  if (tabCalc && tabMini && calculatorSection && miniGameSection) {
    tabCalc.addEventListener("click", () => {
      calculatorSection.style.display = "block"
      miniGameSection.style.display = "none"
    })

    tabMini.addEventListener("click", () => {
      calculatorSection.style.display = "none"
      miniGameSection.style.display = "block"
    })
  }

// ===== ROSTER LOGIC (Using Picker) =====

const roster = []
const rosterContainer = document.getElementById("rosterContainer")
const addRosterBtn = document.getElementById("addRosterBtn")

if (rosterContainer && addRosterBtn) {

  function renderRoster() {
    rosterContainer.innerHTML = roster.map((member, index) => `
      <div style="
        border:1px solid #444;
        border-radius:14px;
        padding:10px 14px;
        background:#1a1a1a;
        display:flex;
        align-items:center;
        gap:12px;
        min-width:200px;
      ">
        <img src="${getSpriteUrl(member.name)}"
             style="width:56px;height:56px;image-rendering:pixelated;" />

        <div style="font-weight:700;">${member.name}</div>

        <button data-index="${index}" 
                class="removeRosterBtn"
                style="margin-left:auto;background:#c62828;border:none;color:white;padding:4px 8px;border-radius:6px;cursor:pointer;">
          ✕
        </button>
      </div>
    `).join("")

    document.querySelectorAll(".removeRosterBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.index)
        roster.splice(i, 1)
        renderRoster()
      })
    })
  }

  // 👇 Utilise le picker existant
  addRosterBtn.addEventListener("click", () => {
    pickingTarget = "roster"
    document.getElementById("pokeModalTitle").textContent = "Select Roster Pokémon"
    document.getElementById("pokeModal").style.display = "flex"
    document.getElementById("pokeSearch").value = ""
    picker.renderGrid("")
  })

  // Hook dans setPickedPokemon
  const originalSetPickedPokemon = setPickedPokemon

  setPickedPokemon = function(targetId, name) {
    if (targetId === "roster") {
      if (!roster.find(p => p.name === name)) {
        roster.push({ name })
        renderRoster()
      }
      closePicker()
      pickingTarget = null
      return
    }

    originalSetPickedPokemon(targetId, name)
  }
}

 

  // ===== Picker =====
  let pickingTarget = null
  const picker = createPicker({
    getSpriteUrl,
    setPickedPokemon,
    closePicker,
    getPickingTarget: () => pickingTarget
  })

  function refreshMoves() {
    const attackerName = document.getElementById("attacker").value
    const moves = getMovesFor(attackerName)
    const moveSelect = document.getElementById("move")
    const current = moveSelect.value

    moveSelect.innerHTML = options(
      moves,
      moves.includes(current) ? current : (moves[0] ?? "")
    )

    const selectedMove = moveSelect.value
    const spreadToggle = document.getElementById("spreadToggle")
    if (spreadToggle) spreadToggle.checked = isSpreadMove(selectedMove)
  }

  function refreshSpeed() {
    const attackerName = document.getElementById("attacker").value
    const defenderName = document.getElementById("defender").value

    const attackerLevel = Number(document.getElementById("attackerLevel").value || 50)
    const defenderLevel = Number(document.getElementById("defenderLevel").value || 50)
    const evEnabled = document.getElementById("evToggle").checked

    const { attackerSpe, defenderSpe } = getSpeedInfo({
      attackerName,
      defenderName,
      attackerLevel,
      defenderLevel,
      evEnabled
    })

    let text = "Speed tie"
    let bg = "#ef6c00"

    if (attackerSpe > defenderSpe) {
      text = "Attacker moves first"
      bg = "#2e7d32"
    } else if (defenderSpe > attackerSpe) {
      text = "Defender moves first"
      bg = "#c62828"
    }

    document.getElementById("speedInfo").innerHTML = `
      <div style="
        margin-top:18px;
        padding:12px 16px;
        border-radius:14px;
        font-size:18px;
        font-weight:800;
        background:${bg};
        color:white;
        display:inline-block;
        min-width:220px;
        box-shadow:0 6px 18px rgba(0,0,0,0.35);
      ">
        ⚡ ${text}
      </div>
    `
  }
function getItemMultiplier(item, moveName, defenderName) {
  if (!item) return 1.0

  let multiplier = 1.0
  let move

  try {
    move = new Move(gen, moveName)
  } catch {
    return 1.0
  }

  const TYPE_BOOST_ITEMS = {
    "Flame Plate": "Fire",
    "Splash Plate": "Water",
    "Zap Plate": "Electric",
    "Meadow Plate": "Grass",
    "Icicle Plate": "Ice",
    "Fist Plate": "Fighting",
    "Toxic Plate": "Poison",
    "Earth Plate": "Ground",
    "Sky Plate": "Flying",
    "Mind Plate": "Psychic",
    "Insect Plate": "Bug",
    "Stone Plate": "Rock",
    "Spooky Plate": "Ghost",
    "Draco Plate": "Dragon",
    "Dread Plate": "Dark",
    "Iron Plate": "Steel"
  }

  if (item === "Life Orb") multiplier *= 1.3
  if (item === "Choice Band" && move.category === "Physical") multiplier *= 1.5
  if (item === "Choice Specs" && move.category === "Special") multiplier *= 1.5
  if (item === "Muscle Band" && move.category === "Physical") multiplier *= 1.1
  if (item === "Wise Glasses" && move.category === "Special") multiplier *= 1.1

  if (item === "Expert Belt") {
    try {
      const defender = new Pokemon(gen, defenderName)
      const typeData = gen.types.get(move.type)
      const effectiveness = typeData.effectiveness(defender.types)
      if (effectiveness > 1) multiplier *= 1.2
    } catch {}
  }

  if (TYPE_BOOST_ITEMS[item]) {
    const expectedType = TYPE_BOOST_ITEMS[item]
    const actualType =
      typeof move.type === "string"
        ? move.type
        : move.type?.name

    if (actualType === expectedType) {
      multiplier *= 1.2
    }
  }

  return multiplier
}
  function runCalc() {
    const attackerName = document.getElementById("attacker").value
    const defenderName = document.getElementById("defender").value
    const moveName = document.getElementById("move").value

    if (!moveName) {
      document.getElementById("result").innerHTML = ""
      return
    }

    const attackerLevel = Number(document.getElementById("attackerLevel").value || 50)
    const defenderLevel = Number(document.getElementById("defenderLevel").value || 50)

    const evEnabled = document.getElementById("evToggle").checked
    const abilityEnabled = document.getElementById("abilityToggle").checked

    const boostAtk = Number(document.getElementById("boostAtk").value)
    const boostSpa = Number(document.getElementById("boostSpa").value)
    let damageMultiplier = 1.0

if (selectedItem) {
  damageMultiplier = getItemMultiplier(
    selectedItem,
    moveName,
    defenderName
  )
}
    const spreadHitsTwoTargets = document.getElementById("spreadToggle").checked

    const boosts = {}
    if (boostAtk !== 0) boosts.atk = boostAtk
    if (boostSpa !== 0) boosts.spa = boostSpa

    const result = calculateDamage({
      attackerName,
      defenderName,
      moveName,
      attackerLevel,
      defenderLevel,
      evEnabled,
      boosts,
      damageMultiplier,
      spreadHitsTwoTargets,
      abilityEnabled
    })
console.log("UI RESULT", {
  attacker: attackerName,
  defender: defenderName,
  level: defenderLevel,
  min: result.percentMin,
  max: result.percentMax,
  hp: result.defenderHP
})
    if (result?.error) {
      document.getElementById("result").innerHTML = `
        <div style="color:#FF5252;font-weight:700;">
          ⚠ Error with ${attackerName} using ${moveName}
        </div>
        <div style="margin-top:6px;font-size:12px;opacity:0.85;">
          ${result.message}
        </div>
      `
      return
    }

    const minPercent = Number(result.percentMin)
    const maxPercent = Number(result.percentMax)

    let color = "#FF5252"
    if (minPercent >= 100) color = "#4CAF50"
    else if (minPercent < 100 && maxPercent >= 100) color = "#FF9800"

    let koText = "Does not KO"
    let koBg = "#c62828"

    if (minPercent >= 100) {
      koText = "Guaranteed KO"
      koBg = "#2e7d32"
    } else if (minPercent < 100 && maxPercent >= 100) {
      koText = "Possible KO"
      koBg = "#ef6c00"
    }

    document.getElementById("result").innerHTML = `
      <h2 style="margin-bottom:14px;">Result</h2>

      <div style="
        font-size:26px;
        font-weight:800;
        margin-bottom:14px;
        color:${color};
      ">
        ${result.percentMin}% - ${result.percentMax}%
      </div>

      <div style="
        padding:12px 16px;
        border-radius:14px;
        font-size:18px;
        font-weight:800;
        background:${koBg};
        color:white;
        display:inline-block;
        min-width:220px;
        box-shadow:0 6px 18px rgba(0,0,0,0.35);
      ">
        💥 ${koText}
      </div>

      ${
        result.koChanceText && result.koChanceText !== "Je ne sais pas."
          ? `
            <div style="margin-top:12px;font-size:14px;opacity:0.85;">
              ${result.koChanceText}
            </div>
          `
          : ""
      }
    `
  }

  function setPickedPokemon(targetId, name) {

  // MINI GAME
  if (targetId === "__MINIGAME_ROSTER__") {
    if (miniGameApi) {
      miniGameApi.addRosterPokemon(name, getMovesFor(name))
    }
    closePicker()
    return
  }

  // NORMAL INPUTS
  const input = document.getElementById(targetId)
  if (input) {
    input.value = name
  }

  if (targetId === "attacker") {
    document.getElementById("attackerLabel").textContent = name
    document.getElementById("attackerImg").src = getSpriteUrl(name)
    refreshMoves()
  } else if (targetId === "defender") {
    document.getElementById("defenderLabel").textContent = name
    document.getElementById("defenderImg").src = getSpriteUrl(name)

    const weaknesses = getWeaknesses(name)
    const html = weaknesses.length
      ? weaknesses.map(w => `
        <span style="
          margin:4px;
          padding:4px 10px;
          border-radius:14px;
          font-size:12px;
          font-weight:700;
          display:inline-flex;
          align-items:center;
          gap:4px;
          background:${darkenColor(TYPE_COLORS[w.type], 0.2)};
          color:white;
        ">
          ${w.type}
          <span style="font-weight:800;">×${w.multiplier}</span>
        </span>
      `).join("")
      : "<span style='opacity:0.6;'>No weaknesses</span>"

    document.getElementById("defWeaknesses").innerHTML = `
      <div style="margin-top:10px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">Weaknesses</div>
        ${html}
      </div>
    `
  }

  refreshSpeed()
  runCalc()
}

  function openPicker(targetId) {
    console.log("OPEN PICKER CALLED", targetId)
    pickingTarget = targetId
    document.getElementById("pokeModalTitle").textContent =
  targetId === "attacker"
    ? "Select Attacker"
    : targetId === "defender"
      ? "Select Defender"
      : "Select Roster Pokémon"

    document.getElementById("pokeModal").style.display = "flex"
    document.getElementById("pokeSearch").value = ""
    picker.renderGrid("")
    document.getElementById("pokeSearch").focus()
  }

  function closePicker() {
    document.getElementById("pokeModal").style.display = "none"
    pickingTarget = null
  }
  // ===== CALC ITEM DROPDOWN (images + search) =====
const calcItemDropdown = document.getElementById("calcItemDropdown")
const calcItemSelected = document.getElementById("calcItemSelected")
const calcItemList = document.getElementById("calcItemList")

if (calcItemDropdown && calcItemSelected && calcItemList) {

  calcItemList.innerHTML = `
    <div style="padding:6px;">
      <input id="calcItemSearch" placeholder="Search item..."
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px;
          border-radius:10px;
          border:1px solid #333;
          background:#0b0b0b;
          color:inherit;
        " />
    </div>
    <div id="calcItemResults"></div>
  `

  const calcItemSearch = document.getElementById("calcItemSearch")
  const calcItemResults = document.getElementById("calcItemResults")

  function renderCalcItems(filterText = "") {
    const q = String(filterText || "").toLowerCase().trim()

    const filtered = CALC_ITEMS.filter(item =>
      item.toLowerCase().includes(q)
    )

    calcItemResults.innerHTML = filtered.map(item => `
      <div data-item="${item}"
        style="
          display:flex;
          align-items:center;
          gap:10px;
          padding:8px 10px;
          margin:6px;
          border-radius:8px;
          background:#1a1a1a;
          border:1px solid #333;
          cursor:pointer;
        ">
        <img src="${getItemImage(item)}"
             style="width:22px;height:22px;image-rendering:pixelated;" />
        <span>${item}</span>
      </div>
    `).join("")

    calcItemResults.querySelectorAll("[data-item]").forEach(el => {

      el.addEventListener("mouseenter", () => {
        el.style.background = "#222"
        el.style.border = "1px solid #555"
      })

      el.addEventListener("mouseleave", () => {
        el.style.background = "#1a1a1a"
        el.style.border = "1px solid #333"
      })

      el.addEventListener("click", () => {
        selectedItem = el.dataset.item

        calcItemSelected.innerHTML = `
          <img src="${getItemImage(selectedItem)}"
               style="width:18px;height:18px;image-rendering:pixelated;" />
          <span>${selectedItem}</span>
          <span style="margin-left:auto;">▾</span>
        `

        calcItemSearch.value = ""
        renderCalcItems("")
        calcItemList.style.display = "none"

        runCalc()
      })
    })
  }

  renderCalcItems("")

  calcItemSearch.addEventListener("input", (e) => {
    renderCalcItems(e.target.value || "")
  })

  calcItemSelected.addEventListener("click", () => {
    const opening = calcItemList.style.display !== "block"
    calcItemList.style.display = opening ? "block" : "none"

    if (opening) {
      calcItemSearch.value = ""
      renderCalcItems("")
      calcItemSearch.focus()
    }
  })

  document.addEventListener("click", (e) => {
    if (!calcItemDropdown.contains(e.target)) {
      calcItemList.style.display = "none"
      calcItemSearch.value = ""
      renderCalcItems("")
    }
  })

  calcItemSelected.textContent = "None ▾"
}

  // ===== Events =====
  document.getElementById("attackerBtn").addEventListener("click", () => openPicker("attacker"))
  document.getElementById("defenderBtn").addEventListener("click", () => openPicker("defender"))
  document.getElementById("pokeClose").addEventListener("click", closePicker)

  document.getElementById("pokeSearch").addEventListener("input", (e) => {
    picker.renderGrid(e.target.value || "")
  })

  document.getElementById("attackerLevel").addEventListener("input", () => {
    refreshSpeed()
    runCalc()
  })

  document.getElementById("defenderLevel").addEventListener("input", () => {
    refreshSpeed()
    runCalc()
  })

  document.getElementById("evToggle").addEventListener("change", () => {
    refreshSpeed()
    runCalc()
  })

  document.getElementById("abilityToggle").addEventListener("change", runCalc)

  ;["boostAtk", "boostSpa", "spreadToggle"].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    el.addEventListener("change", runCalc)
    el.addEventListener("input", runCalc)
  })

  const moveSelect = document.getElementById("move")
  moveSelect.addEventListener("change", () => {
    const spreadToggle = document.getElementById("spreadToggle")
    if (spreadToggle) spreadToggle.checked = isSpreadMove(moveSelect.value)
    runCalc()
  })

  function setupBoostControls(stat) {
    const minusBtn = document.getElementById(stat + "Minus")
    const plusBtn = document.getElementById(stat + "Plus")
    const hiddenInput = document.getElementById("boost" + stat.charAt(0).toUpperCase() + stat.slice(1))
    const display = document.getElementById("boost" + stat.charAt(0).toUpperCase() + stat.slice(1) + "Display")

    if (!minusBtn || !plusBtn || !hiddenInput || !display) return

    function update(delta) {
      let value = Number(hiddenInput.value)
      value += delta

      if (value > 6) value = 6
      if (value < -6) value = -6

      hiddenInput.value = value
      display.textContent = value > 0 ? `+${value}` : String(value)

      runCalc()
    }

    minusBtn.addEventListener("click", () => update(-1))
    plusBtn.addEventListener("click", () => update(1))
  }

  setupBoostControls("atk")
  setupBoostControls("spa")

  // ===== Init =====
  setPickedPokemon("attacker", defaultAttacker)
  setPickedPokemon("defender", defaultDefender)
  refreshMoves()
  refreshSpeed()
  runCalc()

// ===== INIT MINI GAME MODULE =====
if (miniGameSection) {
  miniGameApi = initMiniGame({
    container: miniGameSection,
    RAW_WAVES,
    calculateDamage,
    getSpriteUrl
  })

  window.openMiniGameRosterPicker = function () {
    openPicker("__MINIGAME_ROSTER__")
  }}}
