import { create } from 'zustand'
import { AppSettings, ThemeMode, TicketFilters, Priority, StateType } from '../types'
import { STORAGE_KEYS } from '../constants'

interface AppStore {
  settings: AppSettings
  filters: TicketFilters
  updateSettings: (settings: Partial<AppSettings>) => void
  updateFilters: (filters: Partial<TicketFilters>) => void
  resetFilters: () => void
}

const DEFAULT_FILTERS: TicketFilters = {
  stateTypes: [] as StateType[],
  stateNames: [],
  priorities: [] as Priority[],
  teamIds: [],
  assigneeIds: [],
  creatorIds: [],
  labelNames: [],
  createdAfter: undefined,
  createdBefore: undefined,
  updatedAfter: undefined,
  updatedBefore: undefined,
  minTimeInStatus: undefined,
  maxTimeInStatus: undefined,
  searchQuery: ''
}

// A saved key in localStorage always wins; the env var (.env.local) is the fallback
// so the app works out of the box without pasting a key into Settings.
const initialLinearKey =
  localStorage.getItem(STORAGE_KEYS.LINEAR_API_KEY) || import.meta.env.VITE_LINEAR_API_KEY || ''
const initialAnthropicKey =
  localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY) || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const initialThemeMode: ThemeMode =
  localStorage.getItem(STORAGE_KEYS.THEME_MODE) === 'light' ? 'light' : 'dark'

export const useAppStore = create<AppStore>((set) => ({
  settings: {
    linearApiKey: initialLinearKey,
    anthropicApiKey: initialAnthropicKey,
    themeMode: initialThemeMode
  },
  filters: DEFAULT_FILTERS,

  updateSettings: (newSettings) => {
    if (newSettings.linearApiKey !== undefined) {
      localStorage.setItem(STORAGE_KEYS.LINEAR_API_KEY, newSettings.linearApiKey)
    }
    if (newSettings.anthropicApiKey !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ANTHROPIC_API_KEY, newSettings.anthropicApiKey)
    }
    if (newSettings.themeMode !== undefined) {
      localStorage.setItem(STORAGE_KEYS.THEME_MODE, newSettings.themeMode)
    }
    set((state) => ({ settings: { ...state.settings, ...newSettings } }))
  },

  updateFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS })
}))
