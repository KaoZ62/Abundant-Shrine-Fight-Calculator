import { Generations, Pokemon, Move, calculate } from "@smogon/calc"
import { pokemonData } from "./data.js"

const gen = Generations.get(5)

const IVS_31 = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const EVS_0 = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const EVS_85 = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 }

function clampInt(n) {
  return Math.max(0, Math.floor(n))
}

// Arrondi Gen 5 sur modificateurs 4096-based (ex: 3072 = 0.75)
function applyModifierGen5(baseDamage, modifier4096) {
  const x = baseDamage * modifier4096
  const int = Math.floor(x / 4096)
  const frac = x % 4096
  return frac <= 2048 ? int : int + 1
}

function buildAttacker({ attackerName, attackerLevel, evEnabled, boosts }) {
  const ability = pokemonData?.[attackerName]?.ability

  return new Pokemon(gen, attackerName, {
    level: attackerLevel,
    evs: evEnabled ? EVS_85 : EVS_0,
    ivs: IVS_31,
    nature: "Serious",
    boosts: boosts || {},
    ...(ability ? { ability } : {})
  })
}

function buildDefender({ defenderName, defenderLevel }) {
  return new Pokemon(gen, defenderName, {
    level: defenderLevel,
    evs: EVS_0,
    ivs: IVS_31,
    nature: "Serious"
  })
}

export function getSpeedInfo({
  attackerName,
  defenderName,
  attackerLevel,
  defenderLevel,
  evEnabled
}) {
  const attacker = buildAttacker({
    attackerName,
    attackerLevel,
    evEnabled,
    boosts: {}
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
  spreadHitsTwoTargets // ✅ new
}) {
  const attacker = buildAttacker({
    attackerName,
    attackerLevel,
    evEnabled,
    boosts
  })

  const defender = buildDefender({
    defenderName,
    defenderLevel
  })

  const move = new Move(gen, moveName)
  const result = calculate(gen, attacker, defender, move)

  const [rawMin, rawMax] = result.range()
  const hp = defender.stats.hp

  const mult = Number(damageMultiplier || 1.0)

  let min = clampInt(rawMin * mult)
  let max = clampInt(rawMax * mult)

  // ✅ Doubles spread (2 targets): apply 0.75 (3072/4096)
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
  } catch {
    // keep default
  }

  return {
    min,
    max,
    percentMin,
    percentMax,
    defenderHP: hp,
    ohkoText,
    koChanceText
  }
}