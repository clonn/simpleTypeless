import { describe, it, expect } from 'vitest'
import {
  MODEL_PROFILES,
  getProfileById,
  getRecommendedProfile,
  getProfilesForRam
} from './models'

describe('models', () => {
  describe('MODEL_PROFILES', () => {
    it('should have 4 model profiles', () => {
      expect(MODEL_PROFILES).toHaveLength(4)
    })

    it('should have correct structure for each profile', () => {
      for (const profile of MODEL_PROFILES) {
        expect(profile).toHaveProperty('id')
        expect(profile).toHaveProperty('name')
        expect(profile).toHaveProperty('description')
        expect(profile).toHaveProperty('whisper')
        expect(profile).toHaveProperty('llm')
        expect(profile).toHaveProperty('minRam')
        expect(profile).toHaveProperty('recommended')

        // Whisper structure
        expect(profile.whisper).toHaveProperty('name')
        expect(profile.whisper).toHaveProperty('file')
        expect(profile.whisper).toHaveProperty('size')
        expect(profile.whisper).toHaveProperty('url')

        // LLM structure
        expect(profile.llm).toHaveProperty('name')
        expect(profile.llm).toHaveProperty('file')
        expect(profile.llm).toHaveProperty('size')
        expect(profile.llm).toHaveProperty('url')

        // Type checks
        expect(typeof profile.id).toBe('string')
        expect(typeof profile.name).toBe('string')
        expect(typeof profile.description).toBe('string')
        expect(typeof profile.minRam).toBe('number')
        expect(typeof profile.recommended).toBe('boolean')
      }
    })

    it('should have balanced profile', () => {
      const balanced = MODEL_PROFILES.find((p) => p.id === 'balanced')
      expect(balanced).toBeDefined()
      expect(balanced?.recommended).toBe(true)
      expect(balanced?.minRam).toBe(16)
    })

    it('should have lightweight profile', () => {
      const lightweight = MODEL_PROFILES.find((p) => p.id === 'lightweight')
      expect(lightweight).toBeDefined()
      expect(lightweight?.minRam).toBe(8)
    })

    it('should have english-optimized profile', () => {
      const english = MODEL_PROFILES.find((p) => p.id === 'english-optimized')
      expect(english).toBeDefined()
      expect(english?.minRam).toBe(12)
    })

    it('should have maximum-quality profile', () => {
      const maxQuality = MODEL_PROFILES.find((p) => p.id === 'maximum-quality')
      expect(maxQuality).toBeDefined()
      expect(maxQuality?.minRam).toBe(32)
    })

    it('should have only one recommended profile', () => {
      const recommendedProfiles = MODEL_PROFILES.filter((p) => p.recommended)
      expect(recommendedProfiles).toHaveLength(1)
      expect(recommendedProfiles[0].id).toBe('balanced')
    })

    it('should have valid URLs for all models', () => {
      for (const profile of MODEL_PROFILES) {
        expect(profile.whisper.url).toMatch(/^https?:\/\//)
        expect(profile.llm.url).toMatch(/^https?:\/\//)
      }
    })

    it('should have file extensions matching model types', () => {
      for (const profile of MODEL_PROFILES) {
        expect(profile.whisper.file).toMatch(/\.(bin|gguf)$/)
        expect(profile.llm.file).toMatch(/\.gguf$/)
      }
    })
  })

  describe('getProfileById', () => {
    it('should return balanced profile for valid id', () => {
      const profile = getProfileById('balanced')
      expect(profile).toBeDefined()
      expect(profile?.id).toBe('balanced')
    })

    it('should return lightweight profile for valid id', () => {
      const profile = getProfileById('lightweight')
      expect(profile).toBeDefined()
      expect(profile?.id).toBe('lightweight')
    })

    it('should return english-optimized profile for valid id', () => {
      const profile = getProfileById('english-optimized')
      expect(profile).toBeDefined()
      expect(profile?.id).toBe('english-optimized')
    })

    it('should return maximum-quality profile for valid id', () => {
      const profile = getProfileById('maximum-quality')
      expect(profile).toBeDefined()
      expect(profile?.id).toBe('maximum-quality')
    })

    it('should return undefined for invalid id', () => {
      const profile = getProfileById('non-existent')
      expect(profile).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const profile = getProfileById('')
      expect(profile).toBeUndefined()
    })
  })

  describe('getRecommendedProfile', () => {
    it('should return the balanced profile', () => {
      const profile = getRecommendedProfile()
      expect(profile).toBeDefined()
      expect(profile.id).toBe('balanced')
      expect(profile.recommended).toBe(true)
    })

    it('should always return a profile', () => {
      const profile = getRecommendedProfile()
      expect(profile).toBeDefined()
      expect(profile).not.toBeNull()
    })
  })

  describe('getProfilesForRam', () => {
    it('should return only lightweight for 8GB RAM', () => {
      const profiles = getProfilesForRam(8)
      expect(profiles.length).toBeGreaterThan(0)
      expect(profiles.every((p) => p.minRam <= 8)).toBe(true)
      expect(profiles.some((p) => p.id === 'lightweight')).toBe(true)
    })

    it('should return lightweight and english-optimized for 12GB RAM', () => {
      const profiles = getProfilesForRam(12)
      expect(profiles.length).toBeGreaterThan(0)
      expect(profiles.every((p) => p.minRam <= 12)).toBe(true)
      expect(profiles.some((p) => p.id === 'lightweight')).toBe(true)
      expect(profiles.some((p) => p.id === 'english-optimized')).toBe(true)
    })

    it('should return all except maximum-quality for 16GB RAM', () => {
      const profiles = getProfilesForRam(16)
      expect(profiles.length).toBe(3)
      expect(profiles.every((p) => p.minRam <= 16)).toBe(true)
      expect(profiles.some((p) => p.id === 'balanced')).toBe(true)
      expect(profiles.some((p) => p.id === 'lightweight')).toBe(true)
      expect(profiles.some((p) => p.id === 'english-optimized')).toBe(true)
      expect(profiles.some((p) => p.id === 'maximum-quality')).toBe(false)
    })

    it('should return all profiles for 32GB+ RAM', () => {
      const profiles = getProfilesForRam(32)
      expect(profiles).toHaveLength(4)
      expect(profiles.some((p) => p.id === 'maximum-quality')).toBe(true)
    })

    it('should return empty array for 0GB RAM', () => {
      const profiles = getProfilesForRam(0)
      expect(profiles).toHaveLength(0)
    })

    it('should return empty array for negative RAM', () => {
      const profiles = getProfilesForRam(-1)
      expect(profiles).toHaveLength(0)
    })

    it('should return all matching profiles preserving array order', () => {
      const profiles = getProfilesForRam(32)
      const ids = profiles.map((p) => p.id)
      expect(ids).toEqual(['balanced', 'lightweight', 'english-optimized', 'maximum-quality'])
    })
  })
})
