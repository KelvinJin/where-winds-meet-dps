import { defineSet } from "../../definitions/sets/setDef"
import { SET_ID } from "./ids"

// The real bonus is the deflect buff, gated on `siteKey` through
// `requiresSet`: `data/skills/buffs/cleftpeakDeflect.json`.
export const cleftpeak = defineSet({
  id: SET_ID.cleftpeak,
  name: "Cleftpeak",
  siteKey: "cleftpeak",
  panelBonus: { stat: "minPhys", value: 78 },
  formulaBonus: { generalDamageBoost: 0.05 },
})
