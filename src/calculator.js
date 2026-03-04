import { Generations, Pokemon, Move, calculate } from "@smogon/calc"
import { pokemonData } from "./data.js"
import { abundantStats } from "./abundantStats.js"

const gen = Generations.get(5)
// --- Custom Move Base Power Rules (Abundant Shrine) ---
const MOVE_BP_OVERRIDES = {
  "Air Cutter": 60,
  "Assurance": 60,
  "Aura Sphere": 80,
  "Blizzard": 110,
  "Bubble": 40,
  "Chatter": 65,
  "Crabhammer": 100,
  "Draco Meteor": 130,
  "Dragon Pulse": 85,
  "Energy Ball": 90,
  "Fire Blast": 110,
  "Fire Pledge": 80,
  "Flamethrower": 90,
  "Frost Breath": 60,
  "Fury Cutter": 40,
  "Future Sight": 120,
  "Grass Pledge": 80,
  "Heat Wave": 95,
  "Hex": 65,
  "Hidden Power": 60,
  "Hurricane": 110,
  "Hydro Pump": 110,
  "Ice Beam": 90,
  "Incinerate": 60,
  "Knock Off": 65,
  "Leaf Storm": 130,
  "Lick": 30,
  "Low Sweep": 65,
  "Magma Storm": 100,
  "Meteor Mash": 90,
  "Muddy Water": 90,
  "Overheat": 130,
  "Pin Missile": 25,
  "Power Gem": 80,
  "Rock Tomb": 60,
  "Skull Bash": 130,
  "Smelling Salts": 70,
  "Smog": 30,
  "Snore": 50,
  "Storm Throw": 60,
  "Struggle Bug": 50,
  "Surf": 90,
  "Synchronoise": 120,
  "Techno Blast": 120,
  "Thief": 60,
  "Thunder": 110,
  "Thunderbolt": 90,
  "Vine Whip": 45,
  "Wake-Up Slap": 70,
  "Water Pledge": 80
}
// --- Constants ---
const NEUTRAL_ABILITY_OFF = "Illuminate" // Ability neutre utilisée quand Ability OFF

const IVS_31 = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const EVS_0 = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const EVS_85 = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }
const IVS_0 = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

// --- Utils ---
function normKey(s) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ") // NBSP -> normal space
    .trim()
}

function clampInt(n) {
  return Math.max(0, Math.floor(n))
}

// Gen 5 rounding for 4096-based modifiers (ex: 3072 = 0.75)
function applyModifierGen5(baseDamage, modifier4096) {
  const x = baseDamage * modifier4096
  const int = Math.floor(x / 4096)
  const frac = x % 4096
  return frac <= 2048 ? int : int + 1
}
function buildMove(moveName) {
  const name = normKey(moveName)

  let customBP = MOVE_BP_OVERRIDES[name]

  // Hidden Power Ice / Hidden Power Grass etc
  if (!customBP && name.startsWith("Hidden Power")) {
    customBP = MOVE_BP_OVERRIDES["Hidden Power"]
  }

  if (customBP !== undefined) {
    return new Move(gen, name, {
      overrides: { basePower: customBP }
    })
  }

  return new Move(gen, name)
}

// --- Builders ---
function buildAttacker({
  attackerName,
  attackerLevel,
  evEnabled,
  boosts,
  abilityEnabled
}) {
  const name = normKey(attackerName)

  const baseStats = abundantStats[name]
  if (!baseStats) {
    throw new Error(`Base stats not found for attacker: "${name}"`)
  }

  const pdata = pokemonData?.[name]
  const abilityFromData = pdata?.ability
  const natureFromData = pdata?.nature
  const finalNature = natureFromData || "Serious"

  // ✅ Final ability rules:
  // - Toggle ON: use pokemonData ability if present (no crash if missing)
  // - Toggle OFF: force a neutral ability so default abilities like Rivalry never affect damage
  const finalAbility = abilityEnabled
    ? (abilityFromData || undefined)
    : NEUTRAL_ABILITY_OFF


  return new Pokemon(gen, name, {
    level: attackerLevel,
    evs: evEnabled ? EVS_85 : EVS_0,
    ivs: IVS_31,
    nature: finalNature,
    boosts: boosts || {},
    ability: finalAbility,
    overrides: { baseStats }
  })
}

function buildDefender({ defenderName, defenderLevel }) {
  const name = normKey(defenderName)

  const baseStats = abundantStats[name]
  if (!baseStats) {
    throw new Error(`Base stats not found for defender: "${name}"`)
  }

  return new Pokemon(gen, name, {
    level: defenderLevel,
    evs: EVS_0,
    ivs: IVS_0,
    nature: "Serious",
    overrides: { baseStats }
  })
}

// --- Public API ---
export function getSpeedInfo({
  attackerName,
  defenderName,
  attackerLevel,
  defenderLevel,
  evEnabled
}) {
  try {
    const attacker = buildAttacker({
      attackerName,
      attackerLevel,
      evEnabled,
      boosts: {},
      abilityEnabled: false
    })

    const defender = buildDefender({
      defenderName,
      defenderLevel
    })

    const attackerSpe = attacker.stats.spe
    const defenderSpe = defender.stats.spe

    let text = "Speed tie"
    if (attackerSpe > defenderSpe) text = "Attacker faster"
    else if (attackerSpe < defenderSpe) text = "Defender faster"

    return { attackerSpe, defenderSpe, text }
  } catch {
    return { attackerSpe: 0, defenderSpe: 0, text: "Je ne sais pas." }
  }
}

export function calculateDamage({
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
}) {
  const atkName = normKey(attackerName)
  const defName = normKey(defenderName)
  const mvName = normKey(moveName)

   // --- Validate Move via engine ---
 let move
try {
  move = buildMove(mvName)
} catch {
  return {
    error: true,
    errorType: "move",
    message: "Move Not Defined"
  }
}

  // --- Non-blocking warning if ability toggle ON but no ability in data ---
  let warning = null
  if (abilityEnabled) {
    const abilityFromData = pokemonData?.[atkName]?.ability
    if (!abilityFromData) {
      warning = `No ability defined for ${atkName}`
    }
  }

  // --- Calculate ---
  try {
    const attacker = buildAttacker({
      attackerName: atkName,
      attackerLevel,
      evEnabled,
      boosts,
      abilityEnabled
    })

    const defender = buildDefender({
      defenderName: defName,
      defenderLevel
    })

   const result = calculate(gen, attacker, defender, move)



let [rawMin, rawMax] = result.range()
const hp = defender.stats.hp



    const mult = Number(damageMultiplier || 1.0)

    let min = clampInt(rawMin * mult)
    let max = clampInt(rawMax * mult)

    // Doubles spread (2 targets): apply 0.75 (3072/4096)
    if (spreadHitsTwoTargets) {
      min = applyModifierGen5(min, 3072)
      max = applyModifierGen5(max, 3072)
    }

    const percentMin = ((min / hp) * 100).toFixed(1)
    const percentMax = ((max / hp) * 100).toFixed(1)

    let ohkoText = "Je ne sais pas."
    if (min >= hp) ohkoText = "OHKO garanti"
    else if (max < hp) ohkoText = "Pas OHKO"
    else ohkoText = "OHKO sur roll"

    let koChanceText = "Je ne sais pas."
    try {
      const kc = result.kochance?.()
      if (typeof kc === "string") koChanceText = kc
      else if (kc && typeof kc.text === "string") koChanceText = kc.text
    } catch {}

    return {
      min,
      max,
      percentMin,
      percentMax,
      defenderHP: hp,
      ohkoText,
      koChanceText,
      warning,

      // 🔍 DEBUG INFO
      debug: {
        attacker: {
          name: attacker.name,
          nature: attacker.nature,
          ability: attacker.ability,
          evs: attacker.evs,
          stats: attacker.stats
        },
        defender: {
          name: defender.name,
          nature: defender.nature,
          ability: defender.ability,
          evs: defender.evs,
          stats: defender.stats
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)

    let errorType = "unknown"
    if (msg.includes("Base stats")) errorType = "stats"

    return {
      error: true,
      errorType,
      message: msg
    }
  }
}