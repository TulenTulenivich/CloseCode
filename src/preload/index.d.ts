import type { CloseCodeApi } from '../shared/types'

declare global {
  interface Window {
    closecode: CloseCodeApi
  }
}

export {}
