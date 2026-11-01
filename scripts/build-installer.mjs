import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(appRoot, 'release')
const installerDir = path.join(appRoot, 'resources', 'installer')
const buildDir = shortPath(fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-')))
const unpackedDir = path.join(buildDir, 'win-unpacked')
const pluginDir = path.join(installerDir, 'plugins', 'x86-unicode')
const cli = path.join(appRoot, 'node_modules', 'electron-builder', 'cli.js')
const rcedit = shortPath(path.join(appRoot, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'))
const iconPath = path.join(appRoot, 'resources', 'icon.ico')

const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
const electronPkg = JSON.parse(
  fs.readFileSync(path.join(appRoot, 'node_modules', 'electron', 'package.json'), 'utf8')
)
const version = pkg.version
const setupName = `CloseCode-Setup-${version}-x64.exe`
const offlineName = `CloseCode-Offline-${version}-x64.exe`
const portableName = `CloseCode-Portable-${version}-x64.exe`

const RUNTIME = {
  version: '45.0.0',
  bytes: 158223852,
  sha256: 'ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47',
  url: 'https://github.com/electron/electron/releases/download/v45.0.0/electron-v45.0.0-win32-x64.zip',
  mirror: 'https://npmmirror.com/mirrors/electron/45.0.0/electron-v45.0.0-win32-x64.zip'
}

if (electronPkg.version !== RUNTIME.version) {
  console.error(
    `electron ${electronPkg.version} is installed, but the runtime pin is ${RUNTIME.version}.`
  )
  console.error('Update the RUNTIME block in scripts/build-installer.mjs first.')
  process.exit(1)
}
if (!fs.existsSync(rcedit)) {
  console.error(`rcedit not found: ${rcedit}`)
  console.error('Run npm install so electron-builder brings electron-winstaller in.')
  process.exit(1)
}

fs.mkdirSync(releaseDir, { recursive: true })
fs.mkdirSync(pluginDir, { recursive: true })

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function walkFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

function shortPath(target) {
  if (process.platform !== 'win32' || !fs.existsSync(target)) return target
  const result = spawnSync('cmd', ['/d', '/c', `for %I in ("${target}") do @echo %~sI`], {
    encoding: 'utf8',
    windowsHide: true
  })
  const line = result.stdout
    ?.split(/\r?\n/)
    .map((entry) => entry.trim())
    .find(Boolean)
  return line && fs.existsSync(line) ? line : target
}

function nsisString(value) {
  return value.replace(/\$/g, '$$$$')
}

function findMakensis() {
  if (process.env.NSIS_MAKENSIS && fs.existsSync(process.env.NSIS_MAKENSIS)) {
    return process.env.NSIS_MAKENSIS
  }
  const cache = path.join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache')
  if (fs.existsSync(cache)) {
    for (const entry of fs.readdirSync(cache)) {
      if (!entry.startsWith('nsis-')) continue
      const root = path.join(cache, entry)
      for (const inner of fs.readdirSync(root)) {
        const candidate = path.join(root, inner, 'makensis.exe')
        if (fs.existsSync(candidate)) return candidate
      }
    }
  }
  const where = spawnSync('where', ['makensis'], { encoding: 'utf8' })
  const found = where.stdout?.split(/\r?\n/).find((line) => line.trim())
  if (found) return found.trim()
  console.error('makensis.exe not found.')
  console.error('Run `npx electron-builder --win nsis` once to download the NSIS toolchain,')
  console.error('or set NSIS_MAKENSIS to a makensis.exe path.')
  process.exit(1)
}

function findNsisPlugin(name) {
  if (process.env.NSIS_PLUGINS) {
    const candidate = path.join(process.env.NSIS_PLUGINS, `${name}.dll`)
    if (fs.existsSync(candidate)) return candidate
  }
  const cache = path.join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache')
  if (fs.existsSync(cache)) {
    for (const entry of fs.readdirSync(cache)) {
      if (!entry.startsWith('nsis-resources-')) continue
      const root = path.join(cache, entry)
      for (const inner of fs.readdirSync(root)) {
        const candidate = path.join(root, inner, 'plugins', 'x86-unicode', `${name}.dll`)
        if (fs.existsSync(candidate)) return candidate
      }
    }
  }
  const standard = path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files (x86)', 'NSIS', 'Plugins', 'x86-unicode', `${name}.dll`)
  if (fs.existsSync(standard)) return standard
  console.error(`${name}.dll not found in the NSIS plugin folders.`)
  process.exit(1)
}

function includeLine(file) {
  const rel = path.relative(unpackedDir, file)
  const relDir = path.dirname(rel)
  const installPath = relDir === '.' ? '$INSTDIR' : `$INSTDIR\\${nsisString(relDir)}`
  const source = nsisString(file)
  return {
    installPath,
    lines: [`File "/oname=${nsisString(path.basename(file))}" "${source}"`]
  }
}

function writePayloadInclude(fileName, files) {
  const lines = []
  let currentDir = null
  for (const file of files) {
    const entry = includeLine(file)
    if (entry.installPath !== currentDir) {
      lines.push(`SetOutPath "${entry.installPath}"`)
      currentDir = entry.installPath
    }
    lines.push(...entry.lines)
  }
  lines.push('')
  fs.writeFileSync(path.join(installerDir, fileName), `${lines.join('\r\n')}\r\n`, 'utf8')
}

function compileInstaller(defines, outRelative) {
  const makensis = findMakensis()
  const args = ['/INPUTCHARSET', 'UTF8', ...defines.map((define) => `/D${define}`), '/DOUT_FILE=' + outRelative, 'installer.nsi']
  console.log(`› compiling ${path.basename(outRelative)}`)
  run(makensis, args, { cwd: installerDir })
}

console.log('› packaging win-unpacked')
run(process.execPath, [cli, '--win', '--dir', `-c.directories.output=${buildDir}`])

if (!fs.existsSync(path.join(unpackedDir, 'CloseCode.exe'))) {
  console.error(`win-unpacked is missing CloseCode.exe: ${unpackedDir}`)
  process.exit(1)
}

const appAsar = path.join(unpackedDir, 'resources', 'app.asar')
const appUnpacked = path.join(unpackedDir, 'resources', 'app.asar.unpacked')
if (!fs.existsSync(appAsar)) {
  console.error(`win-unpacked is missing resources/app.asar: ${unpackedDir}`)
  process.exit(1)
}

const allFiles = walkFiles(unpackedDir).sort((a, b) => a.localeCompare(b))
const totalBytes = allFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0)
const installMb = Math.ceil(totalBytes / (1024 * 1024))
const installKb = Math.round(totalBytes / 1024)

const loaderFiles = allFiles.filter((file) => {
  const rel = path.relative(unpackedDir, file)
  if (rel === path.join('resources', 'app.asar')) return true
  return rel.startsWith(`${path.join('resources', 'app.asar.unpacked')}${path.sep}`) && !file.endsWith('.pdb')
})
const loaderBytes = loaderFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0)
const loaderMb = Math.ceil(loaderBytes / (1024 * 1024))
console.log(
  `› app payload: ${loaderFiles.length} files, ${(loaderBytes / (1024 * 1024)).toFixed(1)} MB ` +
    `(offline ${allFiles.length} files, ${installMb} MB installed)`
)

writePayloadInclude('payload.loader.nsh', loaderFiles)
writePayloadInclude('payload.offline.nsh', allFiles)

const nsisUnz = findNsisPlugin('nsisunz')
fs.copyFileSync(nsisUnz, path.join(pluginDir, 'nsisunz.dll'))

const commonDefines = [
  `APP_VERSION=${version}`,
  `PAYLOAD_FILES=${loaderFiles.length}`,
  `INSTALL_MB=${installMb}`,
  `PAYLOAD_KB=${installKb}`,
  `INSTALLER_ICON=${path.relative(installerDir, iconPath)}`,
  `RCEDIT_EXE=${rcedit}`
]

const setupPath = path.join(releaseDir, setupName)
compileInstaller(
  [
    ...commonDefines,
    'WEB_INSTALL',
    'PAYLOAD_INCLUDE=payload.loader.nsh',
    `PAYLOAD_MB=${loaderMb}`,
    `RUNTIME_URL=${RUNTIME.url}`,
    `RUNTIME_MIRROR=${RUNTIME.mirror}`,
    `RUNTIME_BYTES=${RUNTIME.bytes}`,
    `RUNTIME_MB=${Math.ceil(RUNTIME.bytes / (1024 * 1024))}`,
    `RUNTIME_SHA256=${RUNTIME.sha256}`,
    `RUNTIME_TAG=${RUNTIME.version}`
  ],
  path.relative(installerDir, setupPath)
)
if (!fs.existsSync(setupPath)) {
  console.error('makensis finished without producing the setup exe')
  process.exit(1)
}
console.log(`✓ ${setupPath} (${(fs.statSync(setupPath).size / (1024 * 1024)).toFixed(1)} MB)`)

const offlinePath = path.join(releaseDir, offlineName)
compileInstaller(
  [
    `APP_VERSION=${version}`,
    `PAYLOAD_INCLUDE=payload.offline.nsh`,
    `PAYLOAD_MB=${installMb}`,
    `PAYLOAD_FILES=${allFiles.length}`,
    `INSTALL_MB=${installMb}`,
    `PAYLOAD_KB=${installKb}`,
    `INSTALLER_ICON=${path.relative(installerDir, iconPath)}`
  ],
  path.relative(installerDir, offlinePath)
)
if (!fs.existsSync(offlinePath)) {
  console.error('makensis finished without producing the offline exe')
  process.exit(1)
}
console.log(`✓ ${offlinePath} (${(fs.statSync(offlinePath).size / (1024 * 1024)).toFixed(1)} MB)`)

console.log('› packaging portable')
run(process.execPath, [
  cli,
  '--win',
  'portable',
  `--prepackaged=${unpackedDir}`,
  `-c.directories.output=${buildDir}`
])
const portableBuilt = path.join(buildDir, portableName)
if (!fs.existsSync(portableBuilt)) {
  console.error(`portable exe was not produced: ${portableBuilt}`)
  process.exit(1)
}
const portablePath = path.join(releaseDir, portableName)
fs.copyFileSync(portableBuilt, portablePath)
console.log(`✓ ${portablePath} (${(fs.statSync(portablePath).size / (1024 * 1024)).toFixed(1)} MB)`)

try {
  fs.rmSync(buildDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 })
} catch {
  console.warn(`Could not remove temporary build folder: ${buildDir}`)
}

for (const name of fs.readdirSync(releaseDir)) {
  if (name.startsWith('CloseCode-Setup-') && name.endsWith('.blockmap')) {
    fs.rmSync(path.join(releaseDir, name), { force: true })
  }
}

const stale = path.join(installerDir, 'payload.generated.nsh')
if (fs.existsSync(stale)) fs.rmSync(stale)
