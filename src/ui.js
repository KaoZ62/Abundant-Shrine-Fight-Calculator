import { pokemonList, boostOptions, damageMultipliers, pokemonData } from "./data.js"
import { calculateDamage, getSpeedInfo } from "./calculator.js"

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

      <!-- Top row: Attacker + level + move -->
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:center;">
        <label>Attacker:</label>

        <button id="attackerBtn" type="button"
          style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;border:1px solid #888;background:transparent;color:inherit;cursor:pointer;">
         <img id="attackerImg" alt="" style="width:40px;height:40px;object-fit:contain;image-rendering:pixelated;flex:0 0 40px;" />
          <span id="attackerLabel"></span>
        </button>
        <input id="attacker" type="hidden" value="${defaultAttacker}" />

        <label>Atk Lvl:</label>
        <input id="attackerLevel" type="number" min="1" max="100" value="50" style="width:70px;" />

        <label>Move:</label>
        <select id="move">${options(defaultMoves, defaultMove)}</select>
      </div>

      <!-- Middle row: toggles / boosts -->
      <div style="margin-top:12px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;align-items:center;">
        <label>
          <input type="checkbox" id="evToggle" checked />
          Strength Charm
        </label>

        <label>Boost Atk:</label>
        <select id="boostAtk">${numOptions(boostOptions, 0)}</select>

        <label>Boost SpA:</label>
        <select id="boostSpa">${numOptions(boostOptions, 0)}</select>

        <label>Damage Mult:</label>
        <select id="damageMult">${multiplierOptions(1.0)}</select>

        <label>
          <input type="checkbox" id="spreadToggle" />
          Doubles (2 targets / AOE move)
        </label>
      </div>

      <hr style="margin:22px 0;opacity:0.2;" />

      <!-- Defender row -->
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:center;">
        <label>Defender:</label>

        <button id="defenderBtn" type="button"
          style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;border:1px solid #888;background:transparent;color:inherit;cursor:pointer;">
          <img id="defenderImg" alt="" style="width:40px;height:40px;object-fit:contain;image-rendering:pixelated;flex:0 0 40px;" />
          <span id="defenderLabel"></span>
        </button>
        <input id="defender" type="hidden" value="${defaultDefender}" />

        <label>Def Lvl:</label>
        <input id="defenderLevel" type="number" min="1" max="100" value="50" style="width:70px;" />
      </div>

      <div id="speedInfo" style="margin-top:14px;opacity:0.9;"></div>

      <div style="margin-top:18px;">
        <button id="calc" style="padding:10px 18px;border-radius:10px;border:1px solid #888;background:transparent;color:inherit;cursor:pointer;">
          Calculate
        </button>
      </div>

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

        <div id="pokeGrid"
          style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));gap:10px;"></div>
      </div>
    </div>
  `

  // --- UI state ---
  let pickingTarget = null // "attacker" | "defender"

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
  let color = "#ccc"

  if (attackerSpe > defenderSpe) {
    text = "Attacker faster"
    color = "#4CAF50"
  } else if (defenderSpe > attackerSpe) {
    text = "Defender faster"
    color = "#FF5252"
  }

  document.getElementById("speedInfo").innerHTML =
    `<div><b>Speed:</b> <b style="color:${color};">${text}</b></div>`
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
      spreadHitsTwoTargets
    })

    const minPercent = Number(result.percentMin)
    const maxPercent = Number(result.percentMax)

    let color = "#FF5252" // rouge
    if (minPercent >= 100) color = "#4CAF50" // vert
    else if (minPercent < 100 && maxPercent >= 100) color = "#FF9800" // orange

    document.getElementById("result").innerHTML = `
      <h2 style="margin-bottom:10px;">Result</h2>
      <p style="font-size:22px; color:${color};">
        <b>${result.percentMin}% - ${result.percentMax}%</b>
      </p>
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
    renderGrid("")
    document.getElementById("pokeSearch").focus()
  }

  function closePicker() {
    document.getElementById("pokeModal").style.display = "none"
    pickingTarget = null
  }

  function renderGrid(query) {
    const q = (query || "").trim().toLowerCase()
    const filtered = q ? pokemonList.filter(n => n.toLowerCase().includes(q)) : pokemonList

    document.getElementById("pokeCount").textContent = `${filtered.length} Pokémon`

    const grid = document.getElementById("pokeGrid")
    grid.innerHTML = filtered
      .map(name => `
        <button type="button" data-name="${name}"
          style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;border:1px solid #333;background:#0b0b0b;color:inherit;cursor:pointer;text-align:left;">
          <img
  src="${getSpriteUrl(name)}"
  alt=""
  style="
    width:40px;
    height:40px;
    object-fit:contain;
    image-rendering:pixelated;
    flex:0 0 40px;
  "
/>
          <span style="font-size:14px;">${name}</span>
        </button>
      `)
      .join("")

    grid.querySelectorAll("button[data-name]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!pickingTarget) return
        setPickedPokemon(pickingTarget, btn.dataset.name)
        closePicker()
      })
    })
  }

  // --- Modal events ---
  document.getElementById("attackerBtn").addEventListener("click", () => openPicker("attacker"))
  document.getElementById("defenderBtn").addEventListener("click", () => openPicker("defender"))

  document.getElementById("pokeClose").addEventListener("click", closePicker)
  document.getElementById("pokeModal").addEventListener("click", (e) => {
    if (e.target && e.target.id === "pokeModal") closePicker()
  })
  document.getElementById("pokeSearch").addEventListener("input", (e) => {
    renderGrid(e.target.value || "")
  })

  // --- Other events (auto-calc) ---
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

  ;["move", "boostAtk", "boostSpa", "damageMult", "spreadToggle"].forEach(id => {
    const el = document.getElementById(id)
    el.addEventListener("change", runCalc)
    el.addEventListener("input", runCalc)
  })

  document.getElementById("calc").addEventListener("click", runCalc)

  // --- Init defaults ---
  setPickedPokemon("attacker", defaultAttacker)
  setPickedPokemon("defender", defaultDefender)
  refreshMoves()
  refreshSpeed()
  runCalc()
}