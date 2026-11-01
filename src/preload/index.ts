import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentEvent,
  CloseCodeApi,
  TerminalDataEvent,
  TerminalExitEvent,
  WindowState
} from '../shared/types'

const api: CloseCodeApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
  setActiveModel: (payload) => ipcRenderer.invoke('settings:set-active', payload),
  fetchModels: (payload) => ipcRenderer.invoke('settings:fetch-models', payload),
  setLanguage: (language) => ipcRenderer.invoke('settings:set-language', language),
  setEffort: (effort) => ipcRenderer.invoke('settings:set-effort', effort),
  setAppearance: (payload) => ipcRenderer.invoke('settings:set-appearance', payload),
  setSecondOpinion: (payload) => ipcRenderer.invoke('settings:set-second-opinion', payload),
  setApprovalPolicy: (policy) => ipcRenderer.invoke('settings:set-approval', policy),
  setCompactAt: (percent) => ipcRenderer.invoke('settings:set-compact', percent),
  setProxy: (proxyUrl) => ipcRenderer.invoke('settings:set-proxy', proxyUrl),
  addProject: () => ipcRenderer.invoke('project:add'),
  openProject: (path) => ipcRenderer.invoke('project:open', path),
  removeProject: (path) => ipcRenderer.invoke('project:remove', path),
  revokeAllowedRoot: (path) => ipcRenderer.invoke('access:revoke', path),
  listSkills: () => ipcRenderer.invoke('library:refresh'),
  setSkillEnabled: (id, enabled) => ipcRenderer.invoke('library:skill-enabled', id, enabled),
  openSkillsFolder: () => ipcRenderer.invoke('library:open', 'skills'),
  openAgentsFolder: () => ipcRenderer.invoke('library:open', 'agents'),
  revealPath: (path) => ipcRenderer.invoke('shell:reveal', path),
  readTree: (payload) => ipcRenderer.invoke('fs:tree', payload),
  captureScreen: (display) => ipcRenderer.invoke('screen:capture', display),
  readImage: (path) => ipcRenderer.invoke('images:read', path),
  getModelLoad: () => ipcRenderer.invoke('model:load'),
  getContext: () => ipcRenderer.invoke('chat:context'),
  getHistory: () => ipcRenderer.invoke('chat:history'),
  getTaskTitle: () => ipcRenderer.invoke('chat:title'),
  compactContext: () => ipcRenderer.invoke('chat:compact'),
  sendMessage: (payload) => ipcRenderer.invoke('chat:send', payload),
  secondOpinion: () => ipcRenderer.invoke('chat:second-opinion'),
  setPrivateSession: (enabled) => ipcRenderer.invoke('chat:set-private', enabled),
  cancel: () => ipcRenderer.invoke('chat:cancel'),
  resetChat: () => ipcRenderer.invoke('chat:reset'),
  respondApproval: (id, answer) => ipcRenderer.invoke('approval:respond', id, answer),
  answerQuestion: (id, answer) => ipcRenderer.invoke('question:respond', id, answer),
  getActivity: () => ipcRenderer.invoke('activity:get'),
  exportChat: (payload) => ipcRenderer.invoke('chat:export', payload),
  onAgentEvent: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, event: AgentEvent): void => listener(event)
    ipcRenderer.on('agent:event', handler)
    return () => {
      ipcRenderer.removeListener('agent:event', handler)
    }
  },
  getWindowState: () => ipcRenderer.invoke('window:state'),
  onWindowState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: WindowState): void => listener(state)
    ipcRenderer.on('window:state-changed', handler)
    return () => {
      ipcRenderer.removeListener('window:state-changed', handler)
    }
  },
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  getWindowBounds: () => ipcRenderer.invoke('window:bounds'),
  resizeWindow: (bounds) => ipcRenderer.send('window:resize', bounds),
  startTerminal: (options) => ipcRenderer.invoke('terminal:start', options),
  writeTerminal: (id, data) => ipcRenderer.send('terminal:write', id, data),
  resizeTerminal: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
  stopTerminal: (id) => ipcRenderer.send('terminal:stop', id),
  onTerminalData: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: TerminalDataEvent): void =>
      listener(payload)
    ipcRenderer.on('terminal:data', handler)
    return () => {
      ipcRenderer.removeListener('terminal:data', handler)
    }
  },
  onTerminalExit: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: TerminalExitEvent): void =>
      listener(payload)
    ipcRenderer.on('terminal:exit', handler)
    return () => {
      ipcRenderer.removeListener('terminal:exit', handler)
    }
  }
}

contextBridge.exposeInMainWorld('closecode', api)
