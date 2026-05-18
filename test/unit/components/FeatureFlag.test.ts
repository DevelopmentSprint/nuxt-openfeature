// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'

const useFeatureFlagImpl = vi.fn<(key: string, options?: { defaultValue?: unknown }) => {
  value: Ref<unknown>
  enabled: Ref<boolean>
  pending: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<unknown>
}>()

vi.mock('#imports', () => ({
  useFeatureFlag: (key: string, options?: { defaultValue?: unknown }) => useFeatureFlagImpl(key, options)
}))

import FeatureFlag from '../../../src/runtime/components/FeatureFlag.vue'

const stub = (overrides: Partial<{ enabled: boolean, pending: boolean }>) => ({
  value: ref('any'),
  enabled: ref(overrides.enabled ?? false),
  pending: ref(overrides.pending ?? false),
  error: ref(null),
  refresh: vi.fn()
})

const Slotted = defineComponent({
  components: { FeatureFlag },
  props: { name: { type: String, required: true }, default: { type: Boolean, default: false } },
  setup(props) {
    return () => h(FeatureFlag, { name: props.name, default: props.default }, {
      default: () => h('span', { class: 'enabled-slot' }, 'on'),
      fallback: () => h('span', { class: 'fallback-slot' }, 'off')
    })
  }
})

beforeEach(() => {
  useFeatureFlagImpl.mockReset()
})

describe('FeatureFlag component', () => {
  it('renders the default slot when enabled and not pending', () => {
    useFeatureFlagImpl.mockReturnValue(stub({ enabled: true, pending: false }))
    const wrapper = mount(Slotted, { props: { name: 'flag-a' } })
    expect(wrapper.find('.enabled-slot').exists()).toBe(true)
    expect(wrapper.find('.fallback-slot').exists()).toBe(false)
  })

  it('renders the fallback slot when not enabled and not pending', () => {
    useFeatureFlagImpl.mockReturnValue(stub({ enabled: false, pending: false }))
    const wrapper = mount(Slotted, { props: { name: 'flag-a' } })
    expect(wrapper.find('.enabled-slot').exists()).toBe(false)
    expect(wrapper.find('.fallback-slot').exists()).toBe(true)
  })

  it('renders nothing while pending', () => {
    useFeatureFlagImpl.mockReturnValue(stub({ enabled: true, pending: true }))
    const wrapper = mount(Slotted, { props: { name: 'flag-a' } })
    expect(wrapper.find('.enabled-slot').exists()).toBe(false)
    expect(wrapper.find('.fallback-slot').exists()).toBe(false)
  })

  it('forwards name + default to useFeatureFlag', () => {
    useFeatureFlagImpl.mockReturnValue(stub({ enabled: true, pending: false }))
    mount(Slotted, { props: { name: 'flag-x', default: true } })
    expect(useFeatureFlagImpl).toHaveBeenCalledWith('flag-x', { defaultValue: true })
  })
})
