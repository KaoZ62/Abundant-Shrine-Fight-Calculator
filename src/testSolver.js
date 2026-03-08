import { createBattleState } from "./solver/state/createBattleState.js"
import { beamSearchSolver } from "./solver/solver/beamSearchSolver.js"

const state = createBattleState({
  playerTeam: [
    { name: "Arcanine", level: 50 },
    { name: "Garchomp", level: 50 },
    { name: "Whimsicott", level: 50 },
    { name: "Growlithe", level: 50 }
  ],
  waveData: {
    level: 50,
    defenders: ["Salamence", "Hydreigon"]
  }
})

const result = beamSearchSolver(state)

console.log(result)