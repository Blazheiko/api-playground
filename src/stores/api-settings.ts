import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BASE_URL = 'http://127.0.0.1:8088'

export interface ApiSettings {
  baseUrl: string
  pathPrefix: string
  globalHeaders: Record<string, string>
  enableGlobalHeaders: boolean
}

export const useApiSettingsStore = defineStore('api-settings', () => {
  // State
  const baseUrl = ref<string>(BASE_URL)
  const pathPrefix = ref<string>('')
  const globalHeaders = ref<Record<string, string>>({})
  const enableGlobalHeaders = ref<boolean>(true)

  // Computed properties
  const settings = computed<ApiSettings>(() => ({
    baseUrl: baseUrl.value,
    globalHeaders: enableGlobalHeaders.value ? globalHeaders.value : {},
    enableGlobalHeaders: enableGlobalHeaders.value,
    pathPrefix: pathPrefix.value,
  }))

  // Actions
  const setBaseUrl = (url: string) => {
    baseUrl.value = url
    saveToLocalStorage()
  }

  const setPathPrefix = (prefix: string) => {
    pathPrefix.value = prefix
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
    baseUrl.value = BASE_URL
    globalHeaders.value = {}
    enableGlobalHeaders.value = true
    saveToLocalStorage()
  }

  // Save to localStorage
  const saveToLocalStorage = () => {
    try {
      const settingsData = {
        baseUrl: baseUrl.value,
        pathPrefix: pathPrefix.value,
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
        baseUrl.value = settingsData.baseUrl || BASE_URL
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
    pathPrefix,
    globalHeaders,
    enableGlobalHeaders,
    settings,

    // Actions
    setBaseUrl,
    setPathPrefix,
    setGlobalHeaders,
    addGlobalHeader,
    removeGlobalHeader,
    setEnableGlobalHeaders,
    resetToDefaults,
    loadFromLocalStorage,
  }
})
