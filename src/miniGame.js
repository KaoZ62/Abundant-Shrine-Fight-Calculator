// miniGame.js
import { Generations, Move, Pokemon } from "@smogon/calc"
import { getSpeedInfo } from "./calculator.js"

export function initMiniGame({ container, RAW_WAVES, calculateDamage, getSpriteUrl }) {
  container.innerHTML = `
<div style="max-width:1100px;margin:0 auto;">

  <h2 style="text-align:center;margin-bottom:20px;">Mini Game</h2>

    <!-- ===== ROSTER (TOP) ===== -->
  <div>
    <h3 style="margin-bottom:10px;">Roster</h3>

    <!-- ✅ EDIT ROSTER (où tu modifies + Validate) -->
    <div id="rosterContainer"
      style="
        display:flex;
        gap:12px;
        overflow-x:auto;
        padding-bottom:6px;
      ">
    </div>

    <!-- ✅ VALIDATED TEAM -->
    <div style="margin-top:16px;">
      
      <div id="validatedTeamContainer"
        style="
          display:flex;
          gap:12px;
          overflow-x:auto;
          padding-bottom:6px;
        ">
      </div>
    </div>

        <div style="display:flex;gap:12px;margin-top:12px;align-items:center;justify-content:center;">
      
      <button id="miniAddRosterBtn"
        style="padding:6px 14px;border-radius:8px;border:1px solid #444;background:#1a1a1a;color:inherit;cursor:pointer;">
        Add Pokémon
      </button>

      <div id="miniItemDropdown" style="position:relative; min-width:220px;">
        <div id="miniItemSelected"
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

        <div id="miniItemList"
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

    </div>
  </div>
    <!-- ===== SETTINGS ===== -->
  <div style="
    margin-top:30px;
    display:flex;
    gap:40px;
    flex-wrap:wrap;
    justify-content:center;
    align-items:center;
    text-align:center;
  ">
    
    <div>
      <label>Wave:</label><br/>
      <select id="animalSelect"></select>
    </div>

    <div>
      <label>Phase:</label><br/>
      <select id="phaseSelect"></select>
    </div>

  </div>

  <!-- ===== WAVES ===== -->
  <div id="miniOutput" style="margin-top:30px;"></div>

</div>
`
    const gen = Generations.get(5)

  // ✅ multi-items team-wide
  let teamItems = []
  const roster = []
  let activePokemon = []
  const validatedTeam = []
  // ✅ items dispo pour l'équipe (tu peux en ajouter/enlever si tu veux)
const ALL_TEAM_ITEMS = [
  "Expert Belt",
  "Muscle Band",
  "Wise Glasses",
  "Flame Plate",
  "Splash Plate",
  "Zap Plate",
  "Meadow Plate",
  "Icicle Plate",
  "Fist Plate",
  "Toxic Plate",
  "Earth Plate",
  "Sky Plate",
  "Mind Plate",
  "Insect Plate",
  "Stone Plate",
  "Spooky Plate",
  "Draco Plate",
  "Dread Plate",
  "Iron Plate",
  "Life Orb",
  "Choice Band",
  "Choice Specs"
]

const animalSelect = container.querySelector("#animalSelect")
const phaseSelect = container.querySelector("#phaseSelect")
const miniOutput = container.querySelector("#miniOutput")
const teamItemSelect = container.querySelector("#teamItemSelect")
const validatedTeamContainer = container.querySelector("#validatedTeamContainer")
const rosterContainer = container.querySelector("#rosterContainer")
const miniAddRosterBtn = container.querySelector("#miniAddRosterBtn")
const miniItemDropdown = container.querySelector("#miniItemDropdown")
const miniItemSelected = container.querySelector("#miniItemSelected")
const miniItemList = container.querySelector("#miniItemList")
function getItemImage(name) {
  if (name === "None") return ""
  const imgName = name.toLowerCase().replace(/ /g, "-")
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${imgName}.png`
}

function renderMiniItemSelected() {
  if (!teamItems.length) {
    miniItemSelected.innerHTML = `
      <span style="opacity:0.7;">None</span>
      <button id="openItemDropdownBtn"
        style="
          margin-left:auto;
          padding:4px 8px;
          border-radius:6px;
          border:1px solid #444;
          background:#222;
          color:white;
          cursor:pointer;
        ">
        + Add item
      </button>
    `
  } else {
    miniItemSelected.innerHTML = `
      ${teamItems.map(item => `
        <span data-remove="${item}"
          style="
            display:flex;
            align-items:center;
            gap:6px;
            background:#222;
            padding:4px 8px;
            border-radius:8px;
            font-size:13px;
            cursor:pointer;
            border:1px solid #333;
          ">
          <img src="${getItemImage(item)}"
               style="width:18px;height:18px;image-rendering:pixelated;">
          ${item}
          <span style="color:#ff5252;font-weight:700;">✕</span>
        </span>
      `).join("")}

      <button id="openItemDropdownBtn"
        style="
          padding:4px 8px;
          border-radius:6px;
          border:1px solid #444;
          background:#222;
          color:white;
          cursor:pointer;
        ">
        + Add item
      </button>
    `
  }

  // Remove item
  miniItemSelected.querySelectorAll("[data-remove]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation()
      const item = el.dataset.remove
      teamItems = teamItems.filter(i => i !== item)
      renderMiniItemSelected()
      renderMiniGame()
    })
  })

  // Open dropdown button
  const btn = miniItemSelected.querySelector("#openItemDropdownBtn")
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      miniItemList.style.display = "block"
    })
  }
}

function renderMiniItemList() {

  miniItemList.innerHTML = `
    <div style="padding:8px;">
      <input 
        type="text" 
        id="miniItemSearch"
        placeholder="Search item..."
        style="
  width:100%;
  padding:6px 8px;
  border-radius:6px;
  border:1px solid #444;
  background:#1a1a1a;
  color:white;
  box-sizing:border-box;
"
      />
    </div>
    <div id="miniItemOptions"></div>
  `

  const optionsContainer = miniItemList.querySelector("#miniItemOptions")
  const searchInput = miniItemList.querySelector("#miniItemSearch")

  function renderOptions(filter = "") {
    const filteredItems = ALL_TEAM_ITEMS.filter(item =>
      item.toLowerCase().includes(filter.toLowerCase())
    )

    optionsContainer.innerHTML = filteredItems.map(item => `
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
        "
      >
        <img src="${getItemImage(item)}"
             style="width:22px;height:22px;image-rendering:pixelated;">
        <span>${item}</span>
      </div>
    `).join("")

    optionsContainer.querySelectorAll("[data-item]").forEach(el => {

      el.addEventListener("mouseenter", () => {
        el.style.background = "#222"
        el.style.border = "1px solid #555"
      })

      el.addEventListener("mouseleave", () => {
        el.style.background = "#1a1a1a"
        el.style.border = "1px solid #333"
      })

     el.addEventListener("click", (e) => {
  e.stopPropagation()
  const item = el.dataset.item

  if (teamItems.includes(item)) {
    teamItems = teamItems.filter(i => i !== item)
  } else {
    teamItems.push(item)
  }

  // 🔄 RESET SEARCH
  searchInput.value = ""
  renderOptions()

  renderMiniItemSelected()
  renderMiniGame()
  miniItemList.style.display = "none"
})

    })
  }

  renderOptions()

  searchInput.addEventListener("input", () => {
    renderOptions(searchInput.value)
  })
}

if (miniItemSelected) {
  miniItemSelected.addEventListener("click", () => {
    miniItemList.style.display =
      miniItemList.style.display === "block" ? "none" : "block"
  })

  document.addEventListener("click", (e) => {
    if (!miniItemDropdown.contains(e.target)) {
      miniItemList.style.display = "none"
    }
  })
}

renderMiniItemSelected()
renderMiniItemList()

// ✅ affiche + remplit la liste des items
if (teamItemSelect) {
  teamItemSelect.style.display = "inline-block"
  teamItemSelect.innerHTML = ALL_TEAM_ITEMS
    .map(i => `<option value="${i}">${i}</option>`)
    .join("")
}
// ===== INIT SELECT OPTIONS =====

const uniqueAnimals = [...new Set(RAW_WAVES.map(w => w.animal))]
animalSelect.innerHTML = uniqueAnimals
  .map(a => `<option value="${a}">${a}</option>`)
  .join("")

const uniquePhases = [...new Set(RAW_WAVES.map(w => w.phase))]
  .sort((a,b) => a - b)

phaseSelect.innerHTML = uniquePhases
  .map(p => `<option value="${p}">${p}</option>`)
  .join("")

  if (!animalSelect || !phaseSelect || !miniOutput) return null

  // ================= TYPE BOOST ITEMS =================
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

  // ================= ITEM MULTIPLIER (CUMUL) =================
 function getItemMultiplier(teamItemsList, move, defenderName) {
  let multiplier = 1.0

  let defender

try {
  defender = new Pokemon(gen, defenderName)
} catch {
  return 1.0
}

  for (const item of teamItemsList) {
    if (item === "Life Orb") multiplier *= 1.3

    if (item === "Choice Band" && move.category === "Physical")
      multiplier *= 1.5

    if (item === "Choice Specs" && move.category === "Special")
      multiplier *= 1.5

    if (item === "Muscle Band" && move.category === "Physical")
      multiplier *= 1.1

    if (item === "Wise Glasses" && move.category === "Special")
      multiplier *= 1.1

    if (item === "Expert Belt") {
      try {
        const typeData = gen.types.get(move.type)
        const effectiveness = typeData.effectiveness(defender.types)
        if (effectiveness > 1) multiplier *= 1.2
      } catch {}
    }

   if (TYPE_BOOST_ITEMS[item]) {
  const expectedType = TYPE_BOOST_ITEMS[item]

  // move.type peut être une string ou un objet selon @smogon/calc
  const actualType =
    typeof move.type === "string"
      ? move.type
      : move.type?.name

  if (
    actualType &&
    actualType.toLowerCase() === expectedType.toLowerCase()
  ) {
    multiplier *= 1.2
  }
}
  }

  return multiplier
}

  // ================= VALIDATED TEAM RENDER =================
function renderRoster() {
  if (!rosterContainer) return

  rosterContainer.innerHTML = roster.map((p, index) => `
    <div class="miniRosterMember"
      data-name="${p.name}"
      style="
        border:2px solid ${activePokemon === p.name ? "#2e7d32" : "#444"};
        border-radius:12px;
        padding:10px;
        background:${activePokemon === p.name ? "#1f2e1f" : "#1a1a1a"};
        width:220px;
        flex:0 0 auto;
        cursor:pointer;
      ">

      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${getSpriteUrl(p.name)}"
             style="width:48px;height:48px;image-rendering:pixelated;" />
        <div style="font-weight:700;">${p.name}</div>

        <button data-index="${index}" class="removeRosterBtn"
          style="margin-left:auto;background:#c62828;border:none;color:white;padding:4px 6px;border-radius:6px;cursor:pointer;">
          ✕
        </button>
      </div>

      <div style="margin-top:8px;">
        <label>
          <input type="checkbox"
            class="rosterCharmToggle"
            data-index="${index}"
            ${p.strengthCharm ? "checked" : ""} />
          Strength Charm
        </label>
      </div>

      <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
        ${(p.moves ?? []).map(m => `
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
            <input type="checkbox"
              class="rosterMoveCheckbox"
              data-index="${index}"
              data-move="${m}"
              ${(p.priorityMoves ?? []).includes(m) ? "checked" : ""}/>
            ${m}
          </label>
        `).join("")}
      </div>

      <button class="validatePokemonBtn" data-index="${index}"
        style="margin-top:10px;width:100%;padding:7px 10px;border-radius:8px;border:none;background:#1976d2;color:white;font-weight:700;cursor:pointer;">
        Validate
      </button>

    </div>
  `).join("")


  // ================= REMOVE =================
  rosterContainer.querySelectorAll(".removeRosterBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const i = Number(btn.dataset.index)
      const removed = roster[i]

      if (removed && activePokemon === removed.name) {
        activePokemon = null
      }

      roster.splice(i, 1)
      renderRoster()
      renderMiniGame()
    })
  })

  // ================= STRENGTH CHARM =================
  rosterContainer.querySelectorAll(".rosterCharmToggle").forEach(cb => {
    cb.addEventListener("change", () => {
      const i = Number(cb.dataset.index)
      roster[i].strengthCharm = cb.checked
      renderMiniGame()
    })
  })

  // ================= MOVES =================
  rosterContainer.querySelectorAll(".rosterMoveCheckbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const i = Number(cb.dataset.index)
      const move = cb.dataset.move

      roster[i].priorityMoves ??= []

      if (cb.checked) {
        if (!roster[i].priorityMoves.includes(move)) {
          roster[i].priorityMoves.push(move)
        }
      } else {
        roster[i].priorityMoves =
          roster[i].priorityMoves.filter(m => m !== move)
      }

      renderMiniGame()
    })
  })

  // ================= VALIDATE =================
  rosterContainer.querySelectorAll(".validatePokemonBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()

      const i = Number(btn.dataset.index)
      const member = roster[i]
      if (!member) return

      validatedTeam.push(member)
      roster.splice(i, 1)

      if (activePokemon === member.name) {
        activePokemon = null
      }

      renderRoster()
      renderValidatedTeam()
      renderMiniGame()
    })
  })
}
function renderValidatedTeam() {
  if (!validatedTeamContainer) return

  validatedTeamContainer.innerHTML = validatedTeam.map((p, index) => `
    <div class="miniValidatedMember"
      data-name="${p.name}"
      style="
        border:2px solid ${activePokemon.includes(p.name) ? "#2e7d32" : "#444"};
        border-radius:12px;
        padding:8px;
        background:${activePokemon.includes(p.name) ? "#1f2e1f" : "#1a1a1a"};
        width:140px;
        flex:0 0 auto;
        text-align:center;
        position:relative;
        cursor:pointer;
      ">

      <button data-index="${index}" class="removeValidatedBtn"
        style="position:absolute;top:6px;right:6px;background:#c62828;border:none;color:white;padding:2px 6px;border-radius:6px;cursor:pointer;">
        ✕
      </button>

      <button data-index="${index}" class="editValidatedBtn"
        style="position:absolute;top:6px;left:6px;background:#1976d2;border:none;color:white;padding:2px 6px;border-radius:6px;cursor:pointer;">
        ✎
      </button>

      <img src="${getSpriteUrl(p.name)}"
           style="width:56px;height:56px;image-rendering:pixelated;" />

      <div style="font-weight:700;margin-top:6px;">${p.name}</div>

      <div style="margin-top:6px;font-size:12px;opacity:0.9;text-align:left;">
        ${
          p.priorityMoves?.length
            ? `<ul style="margin:0;padding-left:16px;">
                ${p.priorityMoves.map(m => `<li>${m}</li>`).join("")}
               </ul>`
            : `<div>No priority moves</div>`
        }
      </div>
    </div>
  `).join("")

  // ✅ CLICK -> set activePokemon (mais pas si click sur bouton)
  validatedTeamContainer.querySelectorAll(".miniValidatedMember").forEach(el => {
  el.addEventListener("click", (e) => {

    if (e.target.closest("button")) return

    const name = el.dataset.name

    if (activePokemon.includes(name)) {
      // deselect
      activePokemon = activePokemon.filter(n => n !== name)
    } else {
      // select
      activePokemon.push(name)
    }

    renderValidatedTeam()
    renderMiniGame()
  })
})

  // remove validated
  validatedTeamContainer.querySelectorAll(".removeValidatedBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const i = Number(btn.dataset.index)
      const removed = validatedTeam[i]
      if (!removed) return

      if (activePokemon === removed.name) activePokemon = null

      validatedTeam.splice(i, 1)
      renderValidatedTeam()
      renderMiniGame()
    })
  })

  // edit validated -> back to roster
  validatedTeamContainer.querySelectorAll(".editValidatedBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const i = Number(btn.dataset.index)
      const member = validatedTeam[i]
      if (!member) return

      if (activePokemon === member.name) activePokemon = null

      roster.push(member)
      validatedTeam.splice(i, 1)

      renderRoster()
      renderValidatedTeam()
      renderMiniGame()
    })
  })
}
  // ================= OHKO =================
  function computeWaveOHKO(defenderName, level) {
  const results = []

  function attackerIsFaster(attackerName, defenderName, attackerLevel, defenderLevel, evEnabled) {
    try {
      const { attackerSpe, defenderSpe } = getSpeedInfo({
        attackerName,
        defenderName,
        attackerLevel,
        defenderLevel,
        evEnabled
      })
      return attackerSpe > defenderSpe
    } catch {
      return true
    }
  }

  const ITEM_PRIORITY = [
    "Expert Belt","Muscle Band","Wise Glasses",
    "Flame Plate","Splash Plate","Zap Plate","Meadow Plate",
    "Icicle Plate","Fist Plate","Toxic Plate","Earth Plate",
    "Sky Plate","Mind Plate","Insect Plate","Stone Plate",
    "Spooky Plate","Draco Plate","Dread Plate","Iron Plate",
    "Life Orb","Choice Band","Choice Specs"
  ]

  const sortedItems = ITEM_PRIORITY.filter(i => teamItems.includes(i))

  function toNum(x) {
    return Number(String(x).replace("%", "").trim())
  }

 const teamToUse = activePokemon.length > 0
  ? validatedTeam.filter(p => activePokemon.includes(p.name))
  : validatedTeam

for (const member of teamToUse) {
    for (const moveName of member.priorityMoves || []) {

      let moveObj
      try {
        moveObj = new Move(gen, moveName)
      } catch {
        continue
      }

      let bestGuaranteed = null
      let bestPossible = null

      function evaluate(min, max, itemUsed) {
        const faster = attackerIsFaster(
          member.name,
          defenderName,
          50,
          level,
          member.strengthCharm
        )

        // GUARANTEED
        if (min >= 100) {
          if (!bestGuaranteed) {
            bestGuaranteed = {
              attacker: member.name,
              move: moveName,
              item: itemUsed,
              status: faster ? "guaranteedFast" : "guaranteedSlow"
            }
          }
          return
        }

        // POSSIBLE
        if (max >= 100) {
          if (!bestPossible || max > bestPossible.max) {
            bestPossible = {
              attacker: member.name,
              move: moveName,
              item: itemUsed,
              max,
              status: faster ? "possibleFast" : "possibleSlow"
            }
          }
        }
      }

      // 1️⃣ Test sans item
      const base = calculateDamage({
        attackerName: member.name,
        defenderName,
        moveName,
        attackerLevel: 50,
        defenderLevel: level,
        evEnabled: member.strengthCharm,
        boosts: {},
        damageMultiplier: 1.0,
        spreadHitsTwoTargets: false,
        abilityEnabled: false
      })

      if (!base?.error) {
        evaluate(toNum(base.percentMin), toNum(base.percentMax), null)
      }

      // 2️⃣ Test items
      for (const item of sortedItems) {
        const multiplier = getItemMultiplier([item], moveObj, defenderName)

        const res = calculateDamage({
          attackerName: member.name,
          defenderName,
          moveName,
          attackerLevel: 50,
          defenderLevel: level,
          evEnabled: member.strengthCharm,
          boosts: {},
          damageMultiplier: multiplier,
          spreadHitsTwoTargets: false,
          abilityEnabled: false
        })

        if (!res?.error) {
          evaluate(toNum(res.percentMin), toNum(res.percentMax), item)
        }
      }

      // 3️⃣ Choix final
      if (bestGuaranteed) {
        results.push(bestGuaranteed)
      } else if (bestPossible) {
        results.push(bestPossible)
      }

    }
  }

  return results
}
  // ================= MINI GAME RENDER =================
 function renderMiniGame() {
  const selectedAnimal = animalSelect.value
  const selectedPhase = Number(phaseSelect.value)

  const filtered = RAW_WAVES.filter(
    row =>
      Number(row.phase) === selectedPhase &&
      String(row.animal).trim() === String(selectedAnimal).trim()
  )

 if (!filtered.length) {
  miniOutput.innerHTML = `
    <div style="margin-bottom:16px;padding:12px;border-radius:12px;background:#111;border:1px solid #333;font-size:13px;line-height:1.6;">
      <div style="font-weight:700;margin-bottom:6px;">Color Legend</div>

      <div style="display:flex;flex-wrap:wrap;gap:14px;">
        <div><span style="color:#2e7d32;font-weight:700;">■</span> Guaranteed OHKO (moves first)</div>
<div><span style="color:#9c27b0;font-weight:700;">■</span> Guaranteed OHKO but slower</div>
<div><span style="color:#ff9800;font-weight:700;">■</span> Possible OHKO (moves first)</div>
<div><span style="color:#c62828;font-weight:700;">■</span> Possible OHKO but slower</div>
      </div>
    </div>

    <div style="color:#ff9800;">No waves found</div>
  `
  return
}

  const wavesGrouped = {}
  filtered.forEach(row => {
    if (!wavesGrouped[row.wave]) {
      wavesGrouped[row.wave] = { level: row.level, defenders: [] }
    }
    wavesGrouped[row.wave].defenders.push(row.defender)
  })

  miniOutput.innerHTML = `
  <div style="margin-bottom:16px;padding:12px;border-radius:12px;background:#111;border:1px solid #333;font-size:13px;line-height:1.6;">
    <div style="font-weight:700;margin-bottom:6px;">Color Legend</div>

    <div style="display:flex;flex-wrap:wrap;gap:14px;">
      <div><span style="color:#2e7d32;font-weight:700;">■</span> Guaranteed OHKO (moves first)</div>
<div><span style="color:#9c27b0;font-weight:700;">■</span> Guaranteed OHKO but slower</div>
<div><span style="color:#ff9800;font-weight:700;">■</span> Possible OHKO (moves first)</div>
<div><span style="color:#c62828;font-weight:700;">■</span> Possible OHKO but slower</div>
    </div>
  </div>
` + Object.entries(wavesGrouped)
    .map(([waveNumber, data]) => {
      const teamItemsText = teamItems.length ? teamItems.join(" + ") : "None"
      return `
        <div style="
          margin-bottom:20px;
          padding:14px;
          border-radius:14px;
          background:#1a1a1a;
          border:1px solid #444;
        ">
          <div style="font-weight:700;margin-bottom:8px;">
            Phase ${selectedPhase} – Wave ${waveNumber}
          </div>

          <div style="font-size:12px;opacity:0.85;margin-bottom:14px;">
  Team Items: <b>${teamItemsText}</b><br/>
  Abilities: <b style="color:#c62828;">Disabled</b>
</div>

          <div style="
            display:grid;
            grid-template-columns: repeat(3, 1fr);
            gap:14px;
          ">
            ${data.defenders.map(name => {
              const ohkoResults = computeWaveOHKO(name, data.level)

              return `
                <div style="
                  padding:10px;
                  border-radius:12px;
                  background:#111;
                  border:1px solid #333;
                ">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                    <img src="${getSpriteUrl(name)}"
                         style="width:50px;height:50px;image-rendering:pixelated;" />
                    <div style="font-weight:700;">
                      ${name} (Lvl ${data.level})
                    </div>
                  </div>

                  ${
  ohkoResults.length
    ? ohkoResults.map(r => `
        <div style="
          margin-left:60px;
          margin-bottom:6px;
          font-size:13px;
          font-weight:600;
color:${
  r.status === "guaranteedFast"
    ? "#2e7d32"   // vert
    : r.status === "guaranteedSlow"
      ? "#9c27b0" // violet
      : r.status === "possibleFast"
        ? "#ff9800" // orange
        : r.status === "possibleSlow"
          ? "#c62828" // rouge
          : "#c62828"
};

        ">
          ${r.attacker} – ${r.move}${r.item ? ` <span style="opacity:0.8;font-weight:500;">(${r.item})</span>` : ""}
        </div>
      `).join("")
    : ""
}

                </div>
              `
            }).join("")}
          </div>
        </div>
      `
          })
    .join("")
}
  // ================= EVENTS =================
  animalSelect.addEventListener("change", renderMiniGame)
  phaseSelect.addEventListener("change", renderMiniGame)

  

  renderMiniItemSelected()
renderMiniItemList()
renderMiniGame()
renderRoster()
renderValidatedTeam()
if (miniAddRosterBtn) {
  miniAddRosterBtn.addEventListener("click", () => {
    if (typeof window.openMiniGameRosterPicker === "function") {
      window.openMiniGameRosterPicker()
    }
  })
}
  return {
  validatedTeam,
  renderMiniGame,
  renderValidatedTeam,

  // ✅ API: ajouter un Pokémon au roster avec ses moves
  addRosterPokemon(name, moves) {
  if (!name) return
  if (roster.find(p => p.name === name)) return

  roster.push({
    name,
    moves: Array.isArray(moves) ? moves : [],
    priorityMoves: [],
    strengthCharm: false
  })

  renderRoster()
  renderMiniGame()
}
}}