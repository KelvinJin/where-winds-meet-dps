import type { Migration, RawProfilesBlob } from "./types"

const BLADE_BOOST_ID_RENAMES: Readonly<Record<string, string>> = {
  modaoBoost: "moBladeBoost",
  hengDaoBoost: "hengBladeBoost",
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

export function migrateBladeBoostId(value: unknown): unknown {
  return typeof value === "string" ? (BLADE_BOOST_ID_RENAMES[value] ?? value) : value
}

function migrateWordEntry(entry: unknown): unknown {
  return isRecord(entry) && typeof entry.word === "string"
    ? { ...entry, word: migrateBladeBoostId(entry.word) }
    : entry
}

function migrateInventory(inventory: unknown): unknown {
  return Array.isArray(inventory)
    ? inventory.map((piece) =>
        isRecord(piece) && Array.isArray(piece.words)
          ? { ...piece, words: piece.words.map(migrateWordEntry) }
          : piece,
      )
    : inventory
}

export function migrateBladeBoostInputs(inputs: unknown): unknown {
  if (!isRecord(inputs)) return inputs

  const next: Record<string, unknown> = { ...inputs }
  if ("inventory" in inputs) next.inventory = migrateInventory(inputs.inventory)
  for (const [legacyId, currentId] of Object.entries(BLADE_BOOST_ID_RENAMES)) {
    if (!(legacyId in next)) continue
    if (!(currentId in next)) next[currentId] = next[legacyId]
    delete next[legacyId]
  }
  return next
}

export const V15__renameBladeBoostIds: Migration = {
  to: 15,
  name: "V15__renameBladeBoostIds",
  migrate(blob: RawProfilesBlob): RawProfilesBlob {
    const profiles = Array.isArray(blob.profiles)
      ? blob.profiles.map((profile) =>
          isRecord(profile)
            ? { ...profile, inputs: migrateBladeBoostInputs(profile.inputs) }
            : profile,
        )
      : blob.profiles
    return { ...blob, v: 15, profiles }
  },
}
