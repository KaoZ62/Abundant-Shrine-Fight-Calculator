import { pokemonList, boostOptions, damageMultipliers, pokemonData } from "./data.js"
import { calculateDamage, getSpeedInfo } from "./calculator.js"
import { getFavorites, isFavorite, toggleFavorite } from "./favorites.js"
import { createPicker } from "./picker.js"

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

function multiplierOptions(selectedValue) {
  return damageMultipliers
    .map(m => `<option value="${m.value}" ${Number(m.value) === Number(selectedValue) ? "selected" : ""}>${m.label}</option>`)
    .join("")
}

function options(list, selected) {
  return list.map(v => `<option ${v === selected ? "selected" : ""}>${v}</option>`).join("")
}

function getMovesFor(pokemonName) {
  return pokemonData?.[pokemonName]?.moves ?? []
}

export function renderUI() {
  const defaultAttacker = pokemonList[0]
  const defaultDefender = pokemonList[0]

  const defaultMoves = getMovesFor(defaultAttacker)
  const defaultMove = defaultMoves[0] ?? ""

  document.querySelector("#app").innerHTML = `
    <div style="max-width:860px;margin:0 auto;padding:24px;text-align:center;">
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
    style="
      width:22px;
      height:22px;
      padding:0;
      font-size:13px;
      border-radius:6px;
      line-height:1;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
    −
  </button>

  <span id="boostAtkDisplay"
    style="min-width:22px;text-align:center;font-weight:700;font-size:14px;">
    0
  </span>

  <button type="button" id="atkPlus"
    style="
      width:22px;
      height:22px;
      padding:0;
      font-size:13px;
      border-radius:6px;
      line-height:1;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
    +
  </button>

  <input type="hidden" id="boostAtk" value="0" />
</div>


<label>Boost SpA:</label>
<div style="display:flex;align-items:center;gap:6px;">
  <button type="button" id="spaMinus"
    style="
      width:22px;
      height:22px;
      padding:0;
      font-size:13px;
      border-radius:6px;
      line-height:1;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
    −
  </button>

  <span id="boostSpaDisplay"
    style="min-width:22px;text-align:center;font-weight:700;font-size:14px;">
    0
  </span>

  <button type="button" id="spaPlus"
    style="
      width:22px;
      height:22px;
      padding:0;
      font-size:13px;
      border-radius:6px;
      line-height:1;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
    +
  </button>

  <input type="hidden" id="boostSpa" value="0" />
</div>
<div style="flex-basis:100%;height:0;"></div>
        <label>Damage Mult:</label>
        <select id="damageMult">${multiplierOptions(1.0)}</select>

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
    style="
      width:56px;
      height:56px;
      object-fit:contain;
      image-rendering:pixelated;
      flex:0 0 56px;
    " />
  <span id="defenderLabel"
    style="font-size:18px;font-weight:700;">
  </span>
</button>
        </button>
        <input id="defender" type="hidden" value="${defaultDefender}" />

        <label>Def Lvl:</label>
        <input id="defenderLevel" type="number" min="1" max="100" value="50" style="width:70px;" />
      </div>

      <div id="speedInfo" style="margin-top:14px;font-size:18px;font-weight:700;"></div>

      <div id="result" style="margin-top:18px;"></div>
    </div>

    <!-- Modal Pokémon Picker -->
    <div id="pokeModal"
      style="position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);padding:18px;z-index:9999;">
      <div
        style="width:min(920px, 96vw);max-height:85vh;overflow:auto;background:#111;border:1px solid #444;border-radius:16px;padding:14px;">
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
    moveSelect.innerHTML = options(moves, moves.includes(current) ? current : (moves[0] ?? ""))
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
  let bg = "#ef6c00" // orange par défaut (tie)

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

    const damageMultiplier = Number(document.getElementById("damageMult").value || 1.0)
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
console.log("DEBUG STATS:", result.debug)
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
let koBg = "#c62828" // rouge quand ça ne KO pas

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
        <div style="
          margin-top:12px;
          font-size:14px;
          opacity:0.85;
        ">
          ${result.koChanceText}
        </div>
      `
      : ""
  }
`
  }

  function setPickedPokemon(targetId, name) {
    document.getElementById(targetId).value = name

    if (targetId === "attacker") {
      document.getElementById("attackerLabel").textContent = name
      document.getElementById("attackerImg").src = getSpriteUrl(name)
      refreshMoves()
    } else {
      document.getElementById("defenderLabel").textContent = name
      document.getElementById("defenderImg").src = getSpriteUrl(name)
    }

    refreshSpeed()
    runCalc()
  }

  function openPicker(targetId) {
    pickingTarget = targetId
    document.getElementById("pokeModalTitle").textContent =
      targetId === "attacker" ? "Select Attacker" : "Select Defender"

    document.getElementById("pokeModal").style.display = "flex"
    document.getElementById("pokeSearch").value = ""
    picker.renderGrid("")
    document.getElementById("pokeSearch").focus()
  }

  function closePicker() {
    document.getElementById("pokeModal").style.display = "none"
    pickingTarget = null
  }

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

  ;["move", "boostAtk", "boostSpa", "damageMult", "spreadToggle"].forEach(id => {
    const el = document.getElementById(id)
    el.addEventListener("change", runCalc)
    el.addEventListener("input", runCalc)
  })

function setupBoostControls(stat) {
    const minusBtn = document.getElementById(stat + "Minus")
    const plusBtn = document.getElementById(stat + "Plus")
    const hiddenInput = document.getElementById("boost" + stat.charAt(0).toUpperCase() + stat.slice(1))
    const display = document.getElementById("boost" + stat.charAt(0).toUpperCase() + stat.slice(1) + "Display")

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
  setPickedPokemon("attacker", defaultAttacker)
  setPickedPokemon("defender", defaultDefender)
  refreshMoves()
  refreshSpeed()
  runCalc()
}