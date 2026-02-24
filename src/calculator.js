import { Generations, Pokemon, Move, calculate } from "@smogon/calc"
import { pokemonData } from "./data.js"
import { abundantStats } from "./abundantStats.js"

const gen = Generations.get(5)
console.log("GEN USED:", gen.num)
console.log("LIVE TEST 12345")

const IVS_31 = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const EVS_0 = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const EVS_85 = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }

function clampInt(n) {
  return Math.max(0, Math.floor(n))
}

function applyModifierGen5(baseDamage, modifier4096) {
  const x = baseDamage * modifier4096
  const int = Math.floor(x / 4096)
  const frac = x % 4096
  return frac <= 2048 ? int : int + 1
}

function buildAttacker({
  attackerName,
  attackerLevel,
  evEnabled,
  boosts,
  abilityEnabled
}) {
  const baseStats = abundantStats[attackerName]
  if (!baseStats) {
    throw new Error(`Base stats not found for attacker: "${attackerName}"`)
  }

  const abilityFromData = pokemonData?.[attackerName]?.ability

  const finalAbility =
    abilityEnabled && abilityFromData
      ? abilityFromData
      : undefined

  return new Pokemon(gen, attackerName, {
    level: attackerLevel,
    evs: evEnabled ? EVS_85 : EVS_0,
    ivs: IVS_31,
    nature: pokemonData?.[attackerName]?.nature || "Serious",
    boosts: boosts || {},
    ability: finalAbility,
    overrides: { baseStats }
  })
}

function buildDefender({ defenderName, defenderLevel }) {
  const baseStats = abundantStats[defenderName]
  if (!baseStats) {
    throw new Error(`Base stats not found for defender: "${defenderName}"`)
  }

  return new Pokemon(gen, defenderName, {
    level: defenderLevel,
    evs: EVS_0,
    ivs: IVS_31,
    nature: "Serious",
    overrides: { baseStats }
  })
}

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

  /* ===== Validation Move ===== */

  let move
  try {
    move = new Move(gen, moveName)
  } catch {
    return {
      error: true,
      errorType: "move",
      message: "Move Not Defined"
    }
  }

  /* ===== Warning Ability non bloquant ===== */

  let warning = null

  if (abilityEnabled) {
    const abilityFromData = pokemonData?.[attackerName]?.ability
    if (!abilityFromData) {
      warning = `No ability defined for ${attackerName}`
    }
  }

  /* ===== Calcul ===== */

  try {
    const attacker = buildAttacker({
      attackerName,
      attackerLevel,
      evEnabled,
      boosts,
      abilityEnabled
    })

    const defender = buildDefender({
      defenderName,
      defenderLevel
    })

    const result = calculate(gen, attacker, defender, move)

    const [rawMin, rawMax] = result.range()
    const hp = defender.stats.hp

    const mult = Number(damageMultiplier || 1.0)

    let min = clampInt(rawMin * mult)
    let max = clampInt(rawMax * mult)

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
      warning
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