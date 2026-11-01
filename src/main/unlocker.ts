import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { ProviderView, SettingsView } from '../shared/types'
import { getSettingsView, saveSettings, setActiveModel } from './settings'

export interface UnlockerStatus {
  alive: boolean
  port: number
  enabled: boolean
  googleAccount: {
    email: string | null
    hasToken: boolean
    authMethod: string | null
  } | null
}

const DEFAULT_UNLOCKER_PORT = 53129
let unlockerEnabled = true

export function isUnlockerEnabled(): boolean {
  return unlockerEnabled
}

export function applyUnlockerProxy(): void {
  if (unlockerEnabled) {
    process.env.HTTPS_PROXY = `http://127.0.0.1:${DEFAULT_UNLOCKER_PORT}`
    process.env.AG_LS_PROXY = `http://127.0.0.1:${DEFAULT_UNLOCKER_PORT}`
    process.env.NO_PROXY = 'localhost,127.0.0.1'
  } else {
    delete process.env.HTTPS_PROXY
    delete process.env.AG_LS_PROXY
  }
}

export function setUnlockerEnabled(enabled: boolean): void {
  unlockerEnabled = enabled
  applyUnlockerProxy()
}

export async function checkUnlockerAlive(port = DEFAULT_UNLOCKER_PORT): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: '/',
        timeout: 1500
      },
      (res) => {
        resolve(res.statusCode !== undefined)
      }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

export function getAntigravityGoogleSession(): {
  token: string
  email: string | null
  authMethod: string | null
} | null {
  try {
    const home = os.homedir()
    const tokenFile = path.join(home, '.gemini', 'jetski-standalone-oauth-token')
    if (fs.existsSync(tokenFile)) {
      const parsed = JSON.parse(fs.readFileSync(tokenFile, 'utf-8')) as Record<string, unknown>
      if (parsed?.token) {
        return {
          token: String(parsed.token),
          email: parsed.id_token_email ? String(parsed.id_token_email) : null,
          authMethod: parsed.auth_method ? String(parsed.auth_method) : 'consumer'
        }
      }
    }
    const credsFile = path.join(home, '.gemini', 'oauth_creds.json')
    if (fs.existsSync(credsFile)) {
      const parsed = JSON.parse(fs.readFileSync(credsFile, 'utf-8')) as Record<string, unknown>
      if (parsed?.access_token) {
        return {
          token: String(parsed.access_token),
          email: null,
          authMethod: 'oauth'
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

export async function getUnlockerStatus(): Promise<UnlockerStatus> {
  const alive = await checkUnlockerAlive()
  const google = getAntigravityGoogleSession()
  return {
    alive,
    port: DEFAULT_UNLOCKER_PORT,
    enabled: unlockerEnabled,
    googleAccount: google
      ? {
          email: google.email,
          hasToken: Boolean(google.token),
          authMethod: google.authMethod
        }
      : null
  }
}

export function importGoogleAntigravityProvider(): SettingsView {
  const session = getAntigravityGoogleSession()
  if (!session?.token) {
    throw new Error('Google OAuth сессия Antigravity не найдена в ~/.gemini')
  }

  const settings = getSettingsView()
  const providerId = 'google-antigravity'
  const label = session.email ? `Google (${session.email})` : 'Google (Antigravity Pro/Ultra)'
  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ]

  const existingIndex = settings.providers.findIndex((p: ProviderView) => p.id === providerId)
  const drafts = settings.providers.map((p: ProviderView) => ({
    id: p.id,
    label: p.label,
    kind: p.kind,
    baseUrl: p.baseUrl,
    models: p.models,
    apiKey: undefined as string | undefined
  }))

  if (existingIndex >= 0) {
    drafts[existingIndex].label = label
    drafts[existingIndex].models = models
    drafts[existingIndex].apiKey = session.token
  } else {
    drafts.unshift({
      id: providerId,
      label,
      kind: 'openai',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      models,
      apiKey: session.token
    })
  }

  saveSettings({
    providers: drafts,
    activeProviderId: providerId,
    activeModel: models[0]
  })

  return setActiveModel(providerId, models[0])
}
