import { beforeEach, describe, expect, it } from "vitest"
import { importProfile, loadProfiles } from "../../src/storage"
import { runEngine } from "../../src/engine/dps"
import { withDerivedStats } from "../../src/engine/derivedInputs"
import { applyArmorSet, applyBowSet } from "../../src/engine/panel"
import {
  LATEST_PROFILES_VERSION,
  PROFILE_MIGRATIONS,
  runProfileMigrations,
  type RawProfilesBlob,
} from "../../src/migrations"
import {
  V15__renameBladeBoostIds,
  migrateBladeBoostId,
} from "../../src/migrations/V15__renameBladeBoostIds"
import type { StoredProfile } from "../../src/engine/types"
import storedProfileFile from "./testProfiles/v14/stonesplitStrength.json"

const PROFILES_KEY = "wwm.profiles"
const LEGACY_INPUTS_KEY = "wwm.inputs"

type StoredFile = { v: number; profile: StoredProfile }
const LEGACY = storedProfileFile as unknown as StoredFile

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const blobOf = (profile: StoredProfile): RawProfilesBlob => ({
  v: LEGACY.v,
  profiles: [profile],
  activeId: profile.id,
})

const wordsOf = (profile: StoredProfile): string[] =>
  profile.inputs.inventory.flatMap((piece) => piece.words.map((entry) => entry.word))

describe("the v14 fixture", () => {
  it("stores the previous Mo Blade gear-word id", () => {
    expect(LEGACY.v).toBe(14)
    expect(wordsOf(LEGACY.profile)).toContain("modaoBoost")
    expect(wordsOf(LEGACY.profile)).not.toContain("moBladeBoost")
  })
})

describe("V15 blade boost ids", () => {
  it("renames both previous ids and leaves other values unchanged", () => {
    expect(migrateBladeBoostId("modaoBoost")).toBe("moBladeBoost")
    expect(migrateBladeBoostId("hengDaoBoost")).toBe("hengBladeBoost")
    expect(migrateBladeBoostId("swordBoost")).toBe("swordBoost")
    expect(migrateBladeBoostId(null)).toBeNull()
  })

  it("migrates a real profile without changing the rest of its build", () => {
    const input = blobOf(clone(LEGACY.profile))
    const snapshot = clone(input)
    const migrated = V15__renameBladeBoostIds.migrate(input)
    const profile = migrated.profiles[0] as StoredProfile

    expect(input).toEqual(snapshot)
    expect(migrated.v).toBe(15)
    expect(wordsOf(profile)).toContain("moBladeBoost")
    expect(wordsOf(profile)).not.toContain("modaoBoost")
    expect(profile.inputs.equipped).toEqual(LEGACY.profile.inputs.equipped)
    expect(profile.inputs.mindMethods).toEqual(LEGACY.profile.inputs.mindMethods)
    expect(profile.inputs.martialArtsTalents).toEqual(LEGACY.profile.inputs.martialArtsTalents)
    expect(profile.inputs.combatSettings).toEqual(LEGACY.profile.inputs.combatSettings)
    expect(profile.inputs.breakthrough).toBe(LEGACY.profile.inputs.breakthrough)
    expect(profile.inputs.arsenal).toBe(LEGACY.profile.inputs.arsenal)
    expect(profile.inputs.set).toBe(LEGACY.profile.inputs.set)
    expect(profile.id).toBe(LEGACY.profile.id)
    expect(profile.name).toBe(LEGACY.profile.name)
    expect(V15__renameBladeBoostIds.migrate(migrated)).toEqual(migrated)
  })

  it("carries top-level values to their new fields and removes the previous keys", () => {
    const profile = clone(LEGACY.profile) as unknown as Record<string, unknown>
    const inputs = profile.inputs as Record<string, unknown>
    inputs.modaoBoost = 0.12
    inputs.hengDaoBoost = 0.34
    const inventory = inputs.inventory as Array<{ words: Array<{ word: string }> }>
    inventory[0].words[0].word = "hengDaoBoost"

    const migrated = V15__renameBladeBoostIds.migrate(blobOf(profile as unknown as StoredProfile))
    const after = (migrated.profiles[0] as { inputs: Record<string, unknown> }).inputs
    expect(after.moBladeBoost).toBe(0.12)
    expect(after.hengBladeBoost).toBe(0.34)
    expect(after.modaoBoost).toBeUndefined()
    expect(after.hengDaoBoost).toBeUndefined()
    expect(wordsOf(migrated.profiles[0] as StoredProfile)).toContain("hengBladeBoost")
    expect(wordsOf(migrated.profiles[0] as StoredProfile)).not.toContain("hengDaoBoost")
  })

  it("is registered as the latest migration", () => {
    expect(PROFILE_MIGRATIONS).toContain(V15__renameBladeBoostIds)
    expect(LATEST_PROFILES_VERSION).toBe(15)
    expect(runProfileMigrations(blobOf(clone(LEGACY.profile)))!.applied).toContain(
      "V15__renameBladeBoostIds",
    )
  })
})

describe("saved profile load", () => {
  beforeEach(() => localStorage.clear())

  it("persists the new gear-word id while preserving the inventory", () => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(blobOf(clone(LEGACY.profile))))
    const loaded = loadProfiles().profiles[0]
    const persisted = JSON.parse(localStorage.getItem(PROFILES_KEY)!)

    expect(wordsOf(loaded)).toContain("moBladeBoost")
    expect(loaded.inputs.inventory).toHaveLength(LEGACY.profile.inputs.inventory.length)
    expect(persisted.v).toBe(15)
    expect(JSON.stringify(persisted)).not.toContain("modaoBoost")
  })

  it("keeps the selected build playable", () => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(blobOf(clone(LEGACY.profile))))
    const loaded = loadProfiles().profiles[0]
    const result = runEngine(applyBowSet(applyArmorSet(withDerivedStats(loaded.inputs))))

    expect(result.dps).toBeGreaterThan(0)
    expect(result.warnings.some((warning) => /no default rotation/i.test(warning))).toBe(false)
  })

  it("is idempotent across repeated loads", () => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(blobOf(clone(LEGACY.profile))))
    const once = loadProfiles()
    expect(loadProfiles()).toEqual(once)
  })

  it("renames blade boost ids in a bare imported profile", () => {
    const imported = importProfile(JSON.stringify(LEGACY.profile))
    expect(wordsOf(imported)).toContain("moBladeBoost")
    expect(wordsOf(imported)).not.toContain("modaoBoost")
  })

  it("renames blade boost ids in the legacy inputs store", () => {
    localStorage.setItem(
      LEGACY_INPUTS_KEY,
      JSON.stringify({ v: 5, inputs: clone(LEGACY.profile.inputs) }),
    )
    const loaded = loadProfiles().profiles[0]
    expect(wordsOf(loaded)).toContain("moBladeBoost")
    expect(wordsOf(loaded)).not.toContain("modaoBoost")
  })
})
