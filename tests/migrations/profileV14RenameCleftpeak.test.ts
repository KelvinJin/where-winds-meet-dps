import { describe, expect, it } from "vitest"
import {
  LATEST_PROFILES_VERSION,
  PROFILE_MIGRATIONS,
  runProfileMigrations,
  type RawProfilesBlob,
} from "../../src/migrations"
import {
  V14__renameCleftpeak,
  migrateCleftpeakSetId,
} from "../../src/migrations/V14__renameCleftpeak"
import type { StoredProfile } from "../../src/engine/types"
import storedProfileFile from "./testProfiles/v13/stonesplitStrength.json"

type StoredFile = { v: number; profile: StoredProfile }
const LEGACY = storedProfileFile as unknown as StoredFile

const blobOf = (profile: StoredProfile): RawProfilesBlob => ({
  v: LEGACY.v,
  profiles: [profile],
  activeId: profile.id,
})

describe("V14 Cleftpeak set rename", () => {
  it("is registered at version 14", () => {
    expect(PROFILE_MIGRATIONS).toContain(V14__renameCleftpeak)
    expect(V14__renameCleftpeak.to).toBe(14)
  })

  it("renames the old persisted set id", () => {
    expect(LEGACY.v).toBe(13)
    expect(LEGACY.profile.inputs.set).toBe("shatteredRidge")

    const result = runProfileMigrations(blobOf(LEGACY.profile))!
    expect(result.applied).toContain("V14__renameCleftpeak")
    expect(result.blob.v).toBe(LATEST_PROFILES_VERSION)
    expect((result.blob.profiles[0] as StoredProfile).inputs.set).toBe("cleftpeak")
  })

  it("leaves other and missing set values unchanged", () => {
    expect(migrateCleftpeakSetId("jadeware")).toBe("jadeware")
    expect(migrateCleftpeakSetId(null)).toBeNull()
    expect(migrateCleftpeakSetId(undefined)).toBeUndefined()
  })
})
