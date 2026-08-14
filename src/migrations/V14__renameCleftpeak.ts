// v13 -> v14 — rename the persisted set id to the corrected in-game name.
import type { Migration, RawProfilesBlob } from "./types"

const LEGACY_SET_ID = "shatteredRidge"
const CLEFTPEAK_SET_ID = "cleftpeak"

const isRec = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

export function migrateCleftpeakSetId(rawSet: unknown): unknown {
  return rawSet === LEGACY_SET_ID ? CLEFTPEAK_SET_ID : rawSet
}

export const V14__renameCleftpeak: Migration = {
  to: 14,
  name: "V14__renameCleftpeak",
  migrate(blob: RawProfilesBlob): RawProfilesBlob {
    const profiles = Array.isArray(blob.profiles)
      ? blob.profiles.map((profile) =>
          isRec(profile) && isRec(profile.inputs)
            ? {
                ...profile,
                inputs: {
                  ...profile.inputs,
                  set: migrateCleftpeakSetId(profile.inputs.set),
                },
              }
            : profile,
        )
      : blob.profiles
    return { ...blob, v: 14, profiles }
  },
}
