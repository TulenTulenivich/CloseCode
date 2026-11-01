import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(appRoot, 'release')
const cli = path.join(appRoot, 'node_modules', 'electron-builder', 'cli.js')

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closecode-build-'))

const result = spawnSync(process.execPath, [cli, '--win', `-c.directories.output=${outDir}`], {
  cwd: appRoot,
  stdio: 'inherit'
})
if (result.status !== 0) {
  console.error('electron-builder failed')
  process.exit(result.status ?? 1)
}

fs.mkdirSync(releaseDir, { recursive: true })
const artifacts = fs.readdirSync(outDir).filter((name) => /\.(exe|blockmap)$/.test(name))
if (artifacts.length === 0) {
  console.error(`No installers found in ${outDir}`)
  process.exit(1)
}

for (const name of artifacts) {
  const target = path.join(releaseDir, name)
  fs.copyFileSync(path.join(outDir, name), target)
  console.log(`✓ ${target}`)
}

try {
  fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
} catch {
  console.warn(`Could not remove temporary build folder: ${outDir}`)
}
