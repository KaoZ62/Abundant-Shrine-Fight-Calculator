import { Generations, Pokemon, Move, calculate } from "@smogon/calc"
import { pokemonData } from "./data.js"
import { abundantStats } from "./abundantStats.js"

const gen = Generations.get(5)
console.log("GEN USED:", gen.num)

// --- Constants ---
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

  // Ability is optional: if toggle ON but no ability in data => ignore (no crash)
  const finalAbility = abilityEnabled && abilityFromData ? abilityFromData : undefined

  // Nature: use data if present, else Serious
  const finalNature = natureFromData || "Serious"

  console.log("[Attacker name]", JSON.stringify(name))
console.log("[pokemonData key exists?]", Boolean(pokemonData?.[name]))
console.log("[natureFromData]", pokemonData?.[name]?.nature)
console.log("[finalNature]", finalNature)

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
    move = new Move(gen, mvName)
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

    const [rawMin, rawMax] = result.range()
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