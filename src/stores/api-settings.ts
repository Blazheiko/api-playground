import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ApiSettings {
  baseUrl: string
  globalHeaders: Record<string, string>
  enableGlobalHeaders: boolean
}

export const useApiSettingsStore = defineStore('api-settings', () => {
  // State
  const baseUrl = ref<string>('http://127.0.0.1:8088')
  const globalHeaders = ref<Record<string, string>>({})
  const enableGlobalHeaders = ref<boolean>(true)

  // Computed properties
  const settings = computed<ApiSettings>(() => ({
    baseUrl: baseUrl.value,
    globalHeaders: enableGlobalHeaders.value ? globalHeaders.value : {},
    enableGlobalHeaders: enableGlobalHeaders.value,
  }))

  // Actions
  const setBaseUrl = (url: string) => {
    baseUrl.value = url
    saveToLocalStorage()
  }

  const setGlobalHeaders = (headers: Record<string, string>) => {
    globalHeaders.value = headers
    saveToLocalStorage()
  }

  const addGlobalHeader = (key: string, value: string) => {
    globalHeaders.value[key] = value
    saveToLocalStorage()
  }

  const removeGlobalHeader = (key: string) => {
    delete globalHeaders.value[key]
    saveToLocalStorage()
  }

  const setEnableGlobalHeaders = (enabled: boolean) => {
    enableGlobalHeaders.value = enabled
    saveToLocalStorage()
  }

  const resetToDefaults = () => {
    baseUrl.value = 'http://127.0.0.1:8088'
    globalHeaders.value = {}
    enableGlobalHeaders.value = true
    saveToLocalStorage()
  }

  // Save to localStorage
  const saveToLocalStorage = () => {
    try {
      const settingsData = {
        baseUrl: baseUrl.value,
        globalHeaders: globalHeaders.value,
        enableGlobalHeaders: enableGlobalHeaders.value,
      }
      localStorage.setItem('api-settings', JSON.stringify(settingsData))
      console.log('API settings saved to localStorage:', settingsData)
    } catch (error) {
      console.error('Error saving API settings to localStorage:', error)
    }
  }

  // Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('api-settings')
      if (saved) {
        const settingsData = JSON.parse(saved) as ApiSettings
        baseUrl.value = settingsData.baseUrl || 'http://127.0.0.1:8088'
        globalHeaders.value = settingsData.globalHeaders || {}
        enableGlobalHeaders.value =
          settingsData.enableGlobalHeaders !== undefined ? settingsData.enableGlobalHeaders : true
        console.log('API settings loaded from localStorage:', settingsData)
      } else {
        console.log('No API settings found in localStorage, using defaults')
      }
    } catch (error) {
      console.error('Error loading API settings from localStorage:', error)
      resetToDefaults()
    }
  }

  // Initialize settings on store creation
  loadFromLocalStorage()

  return {
    // State
    baseUrl,
    globalHeaders,
    enableGlobalHeaders,
    settings,

    // Actions
    setBaseUrl,
    setGlobalHeaders,
    addGlobalHeader,
    removeGlobalHeader,
    setEnableGlobalHeaders,
    resetToDefaults,
    loadFromLocalStorage,
  }
})
