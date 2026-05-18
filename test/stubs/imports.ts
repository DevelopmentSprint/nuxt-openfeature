// Test-time stub for Nuxt's `#imports` virtual module. Tests using vi.mock('#imports', ...) replace this at runtime.
export const useFeatureFlag = (() => {}) as unknown as <T = unknown>(key: string, options?: { defaultValue?: unknown }) => T
export const useState = (() => ({ value: null })) as unknown as <T = unknown>(key: string, init?: () => T) => { value: T | null }
export const useRuntimeConfig = (() => ({ public: {} })) as unknown as () => Record<string, unknown>
export const defineNuxtPlugin = (<T>(fn: T) => fn) as unknown as <T>(fn: T) => T
